"use client";

// 1. External imports
import { useMemo, useState } from "react";
import { Building2 } from "lucide-react";

// 2. Internal imports
import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { sortJobs, type SortOption } from "@/components/find-jobs/sort-jobs";
import type { Job } from "@/types";

// 3. Type definitions
type Props = {
  jobs: Job[];
};

// 4. Component
export function JobsListSection({ jobs }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>("matchScore");
  const sortedJobs = useMemo(() => sortJobs(jobs, sortBy), [jobs, sortBy]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <JobFilters sortBy={sortBy} onSortChange={setSortBy} />
      {jobs.length === 0 ? (
        <JobsEmptyState />
      ) : (
        <>
          <div className="overflow-x-auto">
            <JobsTable jobs={sortedJobs} />
          </div>
          <JobsPagination jobCount={jobs.length} />
        </>
      )}
    </section>
  );
}

// Not exported — used only within this section. Shown before the first
// search ever runs (or after one that saved nothing new) instead of an
// empty table with no rows and pagination text that would lie about there
// being any results.
function JobsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
        <Building2 aria-hidden="true" className="h-5 w-5 text-text-muted" />
      </span>
      <p className="text-sm text-text-secondary">No jobs found yet. Run a search to get started.</p>
    </div>
  );
}
