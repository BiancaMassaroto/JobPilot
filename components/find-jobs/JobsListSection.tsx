"use client";

// 1. External imports
import { useMemo, useState } from "react";
import { Building2, SearchX } from "lucide-react";

// 2. Internal imports
import { JobFilters } from "@/components/find-jobs/JobFilters";
import { JobsTable } from "@/components/find-jobs/JobsTable";
import { JobsPagination } from "@/components/find-jobs/JobsPagination";
import { filterJobs, searchJobs, type FilterOption } from "@/components/find-jobs/filter-jobs";
import { sortJobs, type SortOption } from "@/components/find-jobs/sort-jobs";
import { paginateJobs } from "@/components/find-jobs/paginate-jobs";
import type { Job } from "@/types";

// 3. Type definitions
type Props = {
  jobs: Job[];
};

// 4. Component
export function JobsListSection({ jobs }: Props) {
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("matchScore");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter -> search -> sort, per architecture.md's Filter + Sort +
  // Pagination decision (Feature 11), Decision 4. Pagination itself is
  // derived separately below, since JobsPagination needs the pre-slice
  // count to render "Showing X to Y of Z".
  const visibleJobs = useMemo(() => {
    const filtered = filterJobs(jobs, filterBy);
    const searched = searchJobs(filtered, searchQuery);
    return sortJobs(searched, sortBy);
  }, [jobs, filterBy, searchQuery, sortBy]);

  const pagedJobs = useMemo(() => paginateJobs(visibleJobs, currentPage), [visibleJobs, currentPage]);

  // Changing the filter, search text, or sort order resets pagination to
  // page 1 (Decision 4) — avoids landing on a page that no longer exists
  // once the result count shrinks.
  function handleFilterChange(next: FilterOption) {
    setFilterBy(next);
    setCurrentPage(1);
  }

  function handleSearchChange(next: string) {
    setSearchQuery(next);
    setCurrentPage(1);
  }

  function handleSortChange(next: SortOption) {
    setSortBy(next);
    setCurrentPage(1);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <JobFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        filterBy={filterBy}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />
      {jobs.length === 0 ? (
        <JobsEmptyState />
      ) : visibleJobs.length === 0 ? (
        <NoMatchesEmptyState />
      ) : (
        <>
          <div className="overflow-x-auto">
            <JobsTable jobs={pagedJobs} />
          </div>
          <JobsPagination
            totalCount={visibleJobs.length}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
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

// Not exported — used only within this section. Distinct from
// JobsEmptyState: this covers saved jobs existing but the current
// filter/search narrowing them to nothing, per architecture.md's Filter +
// Sort + Pagination decision, Decision 10.
function NoMatchesEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary">
        <SearchX aria-hidden="true" className="h-5 w-5 text-text-muted" />
      </span>
      <p className="text-sm text-text-secondary">No jobs match your filters. Try adjusting them.</p>
    </div>
  );
}
