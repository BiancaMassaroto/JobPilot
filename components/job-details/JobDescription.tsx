// 1. External imports
import { FileText } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  aboutRole: string | null;
  externalApplyUrl: string | null;
};

// Adzuna's description is a documented snippet, not the full posting
// (context/library-docs.md's Adzuna API section: "Adzuna description is a
// snippet — not full description") — it's routinely cut off mid-sentence
// with no explicit "truncated" flag from the API. A literal trailing "..."
// is checked first since it still ends in "." (would otherwise read as a
// complete sentence); otherwise any ending without real terminal
// punctuation is treated as cut off.
function looksTruncated(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/\.{3,}$|…$/.test(trimmed)) return true;
  return !/[.!?]["')]?$/.test(trimmed);
}

// 4. Component
export function JobDescription({ aboutRole, externalApplyUrl }: Props) {
  const isTruncated = aboutRole !== null && looksTruncated(aboutRole);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <FileText className="h-5 w-5 text-text-secondary" />
        </span>
        <h2 className="text-base font-semibold text-text-primary">Job Description</h2>
      </div>
      <p className="text-sm leading-6 whitespace-pre-line text-text-primary">
        {aboutRole ?? "No description provided for this job."}
      </p>
      {isTruncated ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4">
          <p className="text-sm text-text-secondary">
            This job board provided a preview that ends mid-sentence. Open the original listing to read the
            full description.
          </p>
          {externalApplyUrl ? (
            <a
              href={externalApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary"
            >
              View Full Job Post
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
