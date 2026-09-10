// SSRF-guarded homepage URL resolution — architecture.md's Feature 13
// decision, Decision 4. Never fetch(redirectUrl, { redirect: "follow" }) on
// employer-controlled input: an unguarded automatic follow lets a crafted
// redirect chain make this server request an internal/reserved address.
// resolveEmployerHomepageUrl() never throws and returns null when neither the
// resolved homepage nor the guessed fallback passes the safety checks.

// 1. External imports
import { lookup } from "node:dns/promises";

// 2. Internal imports
// (none)

// 3. Type definitions
const MAX_HOPS = 5;

// Loopback, link-local (including the cloud metadata address
// 169.254.169.254), private ranges, and other reserved ranges — see
// architecture.md's Feature 13 decision, Decision 4.
const BLOCKED_IPV4_CIDRS = [
  "127.0.0.0/8",
  "169.254.0.0/16",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "0.0.0.0/8",
  "224.0.0.0/4",
];

// 4. Component (n/a — pure helper module)

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    result = (result << 8) | n;
  }
  return result >>> 0;
}

function isIPv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(range);
  if (ipInt === null || rangeInt === null) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function ipv6ToBytes(address: string): number[] | null {
  const parts = address.toLowerCase().split("::");
  if (parts.length > 2) return null;

  const parsePart = (part: string): number[] => {
    if (!part) return [];
    const values: number[] = [];
    for (const segment of part.split(":")) {
      if (segment.includes(".")) {
        const ipv4 = ipv4ToInt(segment);
        if (ipv4 === null) return [];
        values.push((ipv4 >>> 24) & 0xff, (ipv4 >>> 16) & 0xff, (ipv4 >>> 8) & 0xff, ipv4 & 0xff);
      } else if (/^[0-9a-f]{1,4}$/.test(segment)) {
        const value = Number.parseInt(segment, 16);
        values.push((value >>> 8) & 0xff, value & 0xff);
      } else {
        return [];
      }
    }
    return values;
  };

  const left = parsePart(parts[0]);
  const right = parts.length === 2 ? parsePart(parts[1]) : [];
  if (left.length === 0 && parts[0] !== "") return null;
  if (right.length === 0 && parts.length === 2 && parts[1] !== "") return null;
  if (parts.length === 1) return left.length === 16 ? left : null;
  if (left.length + right.length >= 16) return null;
  return [...left, ...Array.from({ length: 16 - left.length - right.length }, () => 0), ...right];
}

function isBlockedAddress(address: string, family: number): boolean {
  if (family === 4) {
    return BLOCKED_IPV4_CIDRS.some((cidr) => isIPv4InCidr(address, cidr));
  }
  const bytes = ipv6ToBytes(address);
  if (!bytes) return true;
  if (bytes.every((byte) => byte === 0)) return true; // unspecified
  if (bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1) return true; // loopback
  if (bytes[0] === 0xff) return true; // multicast
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // link-local
  if ((bytes[0] & 0xfe) === 0xfc) return true; // unique local
  if (bytes.slice(0, 10).every((byte) => byte === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    const mappedIpv4 = `${bytes[12]}.${bytes[13]}.${bytes[14]}.${bytes[15]}`;
    return BLOCKED_IPV4_CIDRS.some((cidr) => isIPv4InCidr(mappedIpv4, cidr));
  }
  return false;
}

// Re-resolves and re-validates immediately before the hop it guards —
// Decision 4's concrete mechanism for "perform the actual request against
// the resolved IP you validated." This minimizes, but doesn't fully
// eliminate, a DNS-rebinding window between this check and the actual
// connect — an accepted, documented limitation (see architecture.md), not
// solved with connection-level IP pinning.
export async function isUrlSafe(urlString: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;

  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;

  // Reject if ANY resolved address is blocked — a hostname can resolve to
  // multiple IPs, some public and some not.
  return !addresses.some((entry) => isBlockedAddress(entry.address, entry.family));
}

async function followRedirectsSafely(startUrl: string): Promise<string | null> {
  let currentUrl = startUrl;

  for (let hop = 0; hop < MAX_HOPS; hop += 1) {
    if (!(await isUrlSafe(currentUrl))) {
      return null;
    }

    let response: Response;
    try {
      response = await fetch(currentUrl, { redirect: "manual" });
    } catch {
      return null;
    }

    // A non-redirect response (2xx, 4xx, ...) ends the chain — this is the
    // real destination.
    if (response.status < 300 || response.status >= 400) {
      return currentUrl;
    }

    const location = response.headers.get("location");
    if (!location) {
      return null;
    }

    try {
      currentUrl = new URL(location, currentUrl).toString();
    } catch {
      return null;
    }
  }

  // Exceeded MAX_HOPS — abort following.
  return null;
}

function cleanCompanyName(companyName: string): string {
  return companyName
    // Live-tested during this build: "Stripe, Inc." left a stray comma
    // ("stripe,") because the original pattern only consumed whitespace
    // before the suffix, not a preceding comma — `,?` added to also
    // consume "Stripe, Inc." -> "Stripe", not just "Stripe Inc." -> "Stripe".
    .replace(/\s*,?\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?).*$/i, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function fallbackHomepageUrl(companyName: string): string {
  return `https://www.${cleanCompanyName(companyName)}.com`;
}

// Strips a subdomain down to the root domain (e.g. jobs.stripe.com ->
// stripe.com). Not fully correct for multi-part TLDs (co.uk, com.au) — a
// documented limitation, same class as Decision 4's other accepted scope
// notes, not solved with a public-suffix-list dependency this project
// doesn't otherwise need.
function toRootDomainHomepage(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const parts = url.hostname.split(".");
    const rootDomain = parts.length > 2 ? parts.slice(-2).join(".") : url.hostname;
    return `https://${rootDomain}`;
  } catch {
    return null;
  }
}

async function safeFallbackHomepageUrl(companyName: string): Promise<string | null> {
  const fallback = fallbackHomepageUrl(companyName);
  return (await isUrlSafe(fallback)) ? fallback : null;
}

export async function resolveEmployerHomepageUrl(
  redirectUrl: string | null,
  companyName: string,
): Promise<string | null> {
  if (!redirectUrl) {
    return safeFallbackHomepageUrl(companyName);
  }

  const resolved = await followRedirectsSafely(redirectUrl);
  if (!resolved) {
    return safeFallbackHomepageUrl(companyName);
  }

  const homepage = toRootDomainHomepage(resolved);
  if (!homepage || homepage.includes("adzuna.com")) {
    return safeFallbackHomepageUrl(companyName);
  }

  return (await isUrlSafe(homepage)) ? homepage : safeFallbackHomepageUrl(companyName);
}
