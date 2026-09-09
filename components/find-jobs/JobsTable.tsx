// 1. External imports
import { Building2 } from "lucide-react";
import Link from "next/link";

// 2. Internal imports
import { formatRelativeTime } from "@/lib/utils";
import type { Job, JobSource } from "@/types";

// 3. Type definitions
type Props = {
  jobs: Job[];
};

// 4. Component
export function JobsTable({ jobs }: Props) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-border">
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Company
          </th>
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Role
          </th>
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Match Score
          </th>
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Salary Est.
          </th>
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Source
          </th>
          <th className="px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Date Found
          </th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="relative border-b border-border last:border-b-0 hover:bg-surface-secondary">
            <td className="px-6 py-4">
              <Link
                href={`/find-jobs/${job.id}`}
                className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                aria-label={`View details for ${job.role} at ${job.company}`}
              />
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-tertiary">
                  <Building2 className="h-4 w-4 text-text-secondary" />
                </span>
                <span className="text-sm font-semibold text-text-primary">{job.company}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-text-primary">{job.role}</td>
            <td className="px-6 py-4">
              <MatchScoreBar score={job.matchScore} />
            </td>
            <td className="px-6 py-4 text-sm text-text-primary">{job.salaryEstimate}</td>
            <td className="px-6 py-4">
              <SourceBadge source={job.source} />
            </td>
            <td className="px-6 py-4 text-sm text-text-secondary">
              {formatRelativeTime(job.foundAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Not exported — used only within this table. Thresholds are pixel-sampled
// from context/designs/find-jobs.png (94/96/91% green, 85/88% blue, 72%
// orange), not the ranges previously written in ui-tokens.md/ui-rules.md —
// see progress-tracker.md's Feature 09 notes for the correction.
function MatchScoreBar({ score }: { score: number }) {
  const barColor =
    score >= 90 ? "bg-success-alt" : score >= 80 ? "bg-info-medium" : score >= 50 ? "bg-warning" : "bg-text-muted";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-24 overflow-hidden rounded-full bg-border-light">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-semibold text-text-primary">{score}%</span>
    </div>
  );
}

// Not exported — used only within this table. Not present in
// find-jobs.png, added directly per the engineer's request, reusing this
// page's own existing pill-badge pattern rather than inventing new colors:
// "search" reuses the Tailored badge pairing (bg-accent-light/text-accent,
// ui-tokens.md's Status Badges), "url" reuses the Low Match pairing
// (bg-surface-secondary/text-text-secondary) — see progress-tracker.md's
// Feature 09 notes.
function SourceBadge({ source }: { source: JobSource }) {
  const isSearch = source === "search";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isSearch ? "bg-accent-light text-accent" : "bg-surface-secondary text-text-secondary"
      }`}
    >
      {isSearch ? "Search" : "URL"}
    </span>
  );
}
