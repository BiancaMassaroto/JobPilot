// Filter/search semantics match architecture.md's Filter + Sort + Pagination
// decision (Feature 11), Decisions 2-3. Applied client-side, over the jobs
// app/find-jobs/page.tsx already loads unpaginated (Feature 10).

import { MATCH_THRESHOLD } from "@/lib/utils";
import type { Job } from "@/types";

export type FilterOption = "all" | "high" | "low";

export function filterJobs(jobs: Job[], filterBy: FilterOption): Job[] {
  switch (filterBy) {
    case "high":
      return jobs.filter((job) => job.matchScore >= MATCH_THRESHOLD);
    case "low":
      return jobs.filter((job) => job.matchScore < MATCH_THRESHOLD);
    case "all":
      return jobs;
  }
}

export function searchJobs(jobs: Job[], query: string): Job[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return jobs;
  }
  return jobs.filter(
    (job) => job.company.toLowerCase().includes(trimmed) || job.role.toLowerCase().includes(trimmed),
  );
}
