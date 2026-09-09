// Sort semantics match build-plan.md's Feature 11 spec exactly (Match Score
// descending, Newest/Oldest by found_at) — applied client-side, over real
// DB-backed jobs as of Feature 10/11 (see filter-jobs.ts/paginate-jobs.ts
// for the sibling filter/search/pagination helpers this now runs alongside
// in JobsListSection's pipeline).

import type { Job } from "@/types";

export type SortOption = "matchScore" | "newest" | "oldest";

export function sortJobs(jobs: Job[], sortBy: SortOption): Job[] {
  const sorted = [...jobs];
  switch (sortBy) {
    case "matchScore":
      return sorted.sort((a, b) => b.matchScore - a.matchScore);
    case "newest":
      return sorted.sort((a, b) => b.foundAt.getTime() - a.foundAt.getTime());
    case "oldest":
      return sorted.sort((a, b) => a.foundAt.getTime() - b.foundAt.getTime());
  }
}
