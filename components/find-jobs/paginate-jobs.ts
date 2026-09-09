// Pagination semantics match architecture.md's Filter + Sort + Pagination
// decision (Feature 11), Decisions 5-6. Scoped here, not lib/utils.ts,
// since this page is still JOBS_PAGE_SIZE's only consumer (unlike
// MATCH_THRESHOLD, which Feature 10 already shares across two features).

import type { Job } from "@/types";

export const JOBS_PAGE_SIZE = 20;

export function paginateJobs(jobs: Job[], page: number): Job[] {
  const start = (page - 1) * JOBS_PAGE_SIZE;
  return jobs.slice(start, start + JOBS_PAGE_SIZE);
}

// Always shows page 1 and the last page, the current page and its immediate
// neighbors, and collapses any larger gap into a single "…" marker (a
// negative number, unique per gap so React keys don't collide). No
// ellipsis at all when every page already fits without one.
export function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);

  const result: (number | "ellipsis")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });
  return result;
}
