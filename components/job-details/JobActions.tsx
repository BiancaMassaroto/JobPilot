// 1. External imports
// (none)

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  company: string;
  externalApplyUrl: string | null;
};

// 4. Component
export function JobActions({ company, externalApplyUrl }: Props) {
  // Defensive fallback — every job this app saves sets external_apply_url
  // from Adzuna's redirect_url (see app/api/agent/find/route.ts), but the
  // DB column itself is nullable, so a legacy or malformed row shouldn't
  // render a dead link.
  if (!externalApplyUrl) {
    return (
      <div className="flex w-full items-center justify-center rounded-xl border border-border bg-surface-secondary px-4 py-4 text-sm font-medium text-text-muted">
        No application link available for this job.
      </div>
    );
  }

  return (
    <a
      href={externalApplyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center justify-center rounded-xl bg-accent px-4 py-4 text-base font-semibold text-accent-foreground hover:bg-accent-dark"
    >
      Apply Now at {company}
    </a>
  );
}
