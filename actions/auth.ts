"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";
import { OAUTH_VERIFIER_COOKIE } from "@/lib/auth-constants";

async function getAppOrigin(): Promise<string> {
  // NEXT_PUBLIC_APP_URL is deployer-set, not client-controlled — always prefer
  // it over the request's Host header, which a proxy/CDN can forward spoofed.
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredAppUrl) {
    const appUrl = new URL(configuredAppUrl);
    if (
      !["http:", "https:"].includes(appUrl.protocol) ||
      appUrl.username ||
      appUrl.password ||
      appUrl.pathname !== "/" ||
      appUrl.search ||
      appUrl.hash
    ) {
      throw new Error(
        "NEXT_PUBLIC_APP_URL must be an HTTP(S) origin without a path or credentials",
      );
    }
    return appUrl.origin;
  }

  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required outside local development",
    );
  }

  const headersList = await headers();
  const host = headersList.get("host");
  if (!host || !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
    throw new Error(
      "A loopback Host header is required for the local development fallback",
    );
  }

  return `http://${host}`;
}

// Returns Promise<never>, not the { success, error? } shape code-standards.md
// requires for Server Actions generally — this one's only job is to redirect,
// on both the success and failure path, and redirect() itself always throws.
// There's no path where it returns a value for a caller to read.
export async function signInWithOAuthAction(
  provider: "google" | "github",
): Promise<never> {
  let redirectUrl = "/login?error=oauth_failed";

  try {
    const cookieStore = await cookies();
    const auth = createAuthActions({ cookies: cookieStore });
    const origin = await getAppOrigin();

    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo: `${origin}/callback`,
      skipBrowserRedirect: true,
    });

    if (error || !data.url) {
      console.error("[actions/auth]", error);
    } else {
      if (data.codeVerifier) {
        cookieStore.set(OAUTH_VERIFIER_COOKIE, data.codeVerifier, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 10,
        });
      }
      redirectUrl = data.url;
    }
  } catch (error) {
    console.error("[actions/auth]", error);
  }

  redirect(redirectUrl);
}

// Same Promise<never> exception as signInWithOAuthAction above — always
// redirects, never returns a value. Pair calls to this with resetIdentity()
// on the client side (see components/auth/SignOutButton.tsx) so PostHog's
// browser identity is unlinked on sign-out, not just the InsForge session.
export async function signOutAction(): Promise<never> {
  try {
    const cookieStore = await cookies();
    const auth = createAuthActions({ cookies: cookieStore });
    await auth.signOut();
  } catch (error) {
    console.error("[actions/auth]", error);
  }

  redirect("/login");
}
