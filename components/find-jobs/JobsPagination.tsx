"use client";

// 1. External imports
// (none)

// 2. Internal imports
import { JOBS_PAGE_SIZE, getPageNumbers } from "@/components/find-jobs/paginate-jobs";

// 3. Type definitions
type Props = {
  totalCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
};

// 4. Component
export function JobsPagination({ totalCount, currentPage, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / JOBS_PAGE_SIZE));
  const rangeStart = (currentPage - 1) * JOBS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * JOBS_PAGE_SIZE, totalCount);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-secondary">
        Showing <span className="font-semibold text-text-primary">{rangeStart}</span> to{" "}
        <span className="font-semibold text-text-primary">{rangeEnd}</span> of{" "}
        <span className="font-semibold text-text-primary">{totalCount}</span> results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-surface"
        >
          Previous
        </button>
        {pageNumbers.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1 text-sm text-text-muted">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? "page" : undefined}
              className={
                page === currentPage
                  ? "rounded-lg border border-accent-light bg-accent-muted px-3 py-1.5 text-sm font-medium text-accent"
                  : "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
              }
            >
              {page}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-surface"
        >
          Next
        </button>
      </div>
    </div>
  );
}
