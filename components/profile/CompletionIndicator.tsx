// 1. External imports
import { AlertCircle } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  completionPercentage: number;
  missingFields: string[];
};

// 4. Component
export function CompletionIndicator({ completionPercentage, missingFields }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (completionPercentage / 100) * circumference;

  return (
    <section className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" className="h-5 w-5 text-error" />
          <h2 className="text-base font-semibold text-text-primary">Profile needs attention</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Complete the missing fields to improve your chance of getting tailored matches and
          generating quality resumes.
        </p>
        <div className="flex flex-wrap gap-2">
          {missingFields.map((field) => (
            <span
              key={field}
              className="rounded-full bg-error-lightest px-3 py-1 text-xs font-semibold tracking-wide text-error uppercase"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <svg
        role="img"
        aria-label={`Profile ${completionPercentage}% complete`}
        width="128"
        height="128"
        viewBox="0 0 128 128"
        className="shrink-0"
      >
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          className="stroke-error-light"
          strokeWidth="12"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          className="origin-center -rotate-90 stroke-error"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text
          x="64"
          y="64"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-text-primary text-2xl font-bold"
        >
          {completionPercentage}%
        </text>
      </svg>
    </section>
  );
}
