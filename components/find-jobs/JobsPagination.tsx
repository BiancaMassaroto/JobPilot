// 1. External imports
// (none)

// 2. Internal imports
// (none)

// 3. Type definitions
// (none)

// 4. Component
type Props = {
  jobCount: number;
};

export function JobsPagination({ jobCount }: Props) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-text-secondary">
        Showing <span className="font-semibold text-text-primary">1</span> to{" "}
        <span className="font-semibold text-text-primary">{jobCount}</span> of{" "}
        <span className="font-semibold text-text-primary">{jobCount}</span>{" "}
        results
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-muted disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded-lg border border-accent-light bg-accent-muted px-3 py-1.5 text-sm font-medium text-accent"
        >
          1
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          2
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          3
        </button>
        <span className="px-1 text-sm text-text-muted">...</span>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          8
        </button>
        <button
          type="button"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          Next
        </button>
      </div>
    </div>
  );
}
