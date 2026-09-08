// Adzuna API client — job search only. Country detection and dedup live in
// agent/adzuna.ts (agent code, not a third party client). See
// context/library-docs.md's "Adzuna API" section and architecture.md's
// Adzuna Job Discovery decision.

// 1. External imports
// (none)

// 2. Internal imports
// (none)

// 3. Type definitions
export type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: "0" | "1";
  contract_type?: "permanent" | "contract";
  contract_time?: "full_time" | "part_time";
  created?: string;
  category?: { tag: string; label: string };
};

type AdzunaSearchResponse = {
  results?: AdzunaJob[];
};

// 4. Component (n/a — pure API client module)

export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: jobTitle,
    // Always filter to IT jobs — never search Adzuna without this.
    category: "it-jobs",
    results_per_page: "10",
    "content-type": "application/json",
  });

  if (location) {
    params.set("where", location);
  }

  const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`);

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = (await response.json()) as AdzunaSearchResponse;
  return data.results ?? [];
}

// Corrected at Feature 10's cross check (see context/library-docs.md's
// Adzuna section): job_type must come from contract_time (full/part time),
// not contract_type (permanent/contract) — the original draft mapped it
// from contract_type alone, which would write "permanent" and fail the
// jobs.job_type CHECK constraint for every ordinary listing.
export function mapAdzunaJobType(job: AdzunaJob): "fulltime" | "parttime" | "contract" {
  if (job.contract_type === "contract") return "contract";
  if (job.contract_time === "part_time") return "parttime";
  return "fulltime";
}
