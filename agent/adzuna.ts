// Feature 10 — Adzuna Job Discovery agent code. Never imports from
// components/ or actions/ (architecture.md's Invariants). See
// architecture.md's Adzuna Job Discovery decision, Decisions 4-5.

// 1. External imports
// (none)

// 2. Internal imports
import { searchJobs, type AdzunaJob } from "@/lib/adzuna";
import { logAgentError } from "@/lib/agent-logs";
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions
export type AdzunaCountry = "us" | "gb" | "au" | "ca";

export type DiscoverJobsResult =
  | { success: true; adzunaResults: AdzunaJob[]; newResults: AdzunaJob[] }
  | { success: false; error: string };

// A small hardcoded keyword map, not a geocoding call — disproportionate for
// four supported countries. Documented limitation, not a bug: an ambiguous
// city name shared across countries (e.g. "London, Ontario") is misdetected.
const COUNTRY_KEYWORDS: Record<Exclude<AdzunaCountry, "us">, string[]> = {
  gb: ["uk", "united kingdom", "england", "scotland", "london", "manchester"],
  au: ["australia", "sydney", "melbourne", "brisbane"],
  ca: ["canada", "toronto", "vancouver", "montreal"],
};

// 4. Component (n/a — agent module)

export function detectAdzunaCountry(location: string): AdzunaCountry {
  const normalized = location.toLowerCase().trim();
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);

  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS) as Array<
    [Exclude<AdzunaCountry, "us">, string[]]
  >) {
    if (
      keywords.some((keyword) => {
        const keywordTokens = keyword.split(" ");
        return tokens.some((_, index) =>
          keywordTokens.every((token, offset) => tokens[index + offset] === token),
        );
      })
    ) {
      return country;
    }
  }
  return "us";
}

// Calls Adzuna, then drops any result already saved for this user under the
// same source_url (Decision 5) before it's ever sent to Gemini for scoring.
export async function discoverJobs(
  jobTitle: string,
  location: string,
  userId: string,
  runId: string,
): Promise<DiscoverJobsResult> {
  try {
    const country = detectAdzunaCountry(location);
    const adzunaResults = await searchJobs(jobTitle, location, country);

    if (adzunaResults.length === 0) {
      return { success: true, adzunaResults, newResults: [] };
    }

    const insforge = await createInsforgeServer();
    const redirectUrls = adzunaResults.map((job) => job.redirect_url);
    const { data: existingJobs, error: existingJobsError } = await insforge.database
      .from("jobs")
      .select("source_url")
      .eq("user_id", userId)
      .in("source_url", redirectUrls);

    if (existingJobsError) {
      throw existingJobsError;
    }

    const existingUrls = new Set(
      (existingJobs as Array<{ source_url: string }> | null)?.map((row) => row.source_url) ?? [],
    );
    const newResults = adzunaResults.filter((job) => !existingUrls.has(job.redirect_url));

    return { success: true, adzunaResults, newResults };
  } catch (error) {
    await logAgentError(userId, runId, null, "Adzuna job discovery failed", error);
    return { success: false, error: String(error) };
  }
}
