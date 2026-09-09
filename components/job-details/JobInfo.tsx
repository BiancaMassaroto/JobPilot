// 1. External imports
import { Briefcase, Building2, Calendar, DollarSign, ExternalLink, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// 2. Internal imports
import { formatRelativeTime } from "@/lib/utils";
import type { JobDetail, JobType } from "@/types";

// 3. Type definitions
type Props = {
  job: JobDetail;
};

// Pixel-sampled from context/designs/job-details.png (all four already
// exact matches for existing tokens — see progress-tracker.md's Feature 12
// notes): salary green, location blue, job type purple, date found neutral.
const JOB_TYPE_LABELS: Record<JobType, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contract: "Contract",
};

// 4. Component
export function JobInfo({ job }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-secondary">
            <Building2 className="h-6 w-6 text-text-muted" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>{job.company}</span>
              <span className="text-text-muted">•</span>
              <span className="rounded-full bg-success-lightest px-3 py-1 text-sm font-medium text-success-foreground">
                {job.matchScore}% Match Score
              </span>
            </div>
          </div>
        </div>
        {job.externalApplyUrl ? (
          <a
            href={job.externalApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View Job Post
          </a>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <InfoStat
          icon={DollarSign}
          iconBg="bg-success-lightest"
          iconColor="text-success"
          value={job.salaryEstimate}
          label="Salary Est."
        />
        <InfoStat
          icon={MapPin}
          iconBg="bg-info-lightest"
          iconColor="text-info-medium"
          value={job.location ?? "—"}
          label="Location"
        />
        <InfoStat
          icon={Briefcase}
          iconBg="bg-accent-muted"
          iconColor="text-accent"
          value={job.jobType ? JOB_TYPE_LABELS[job.jobType] : "—"}
          label="Job Type"
        />
        <InfoStat
          icon={Calendar}
          iconBg="bg-surface-secondary"
          iconColor="text-text-secondary"
          value={formatRelativeTime(job.foundAt)}
          label="Date Found"
        />
      </div>
    </div>
  );
}

// Not exported — used only within this component, same "local helper"
// pattern as JobsTable.tsx's MatchScoreBar/SourceBadge.
type InfoStatProps = {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
};

function InfoStat({ icon: Icon, iconBg, iconColor, value, label }: InfoStatProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-text-primary">{value}</span>
        <span className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</span>
      </div>
    </div>
  );
}
