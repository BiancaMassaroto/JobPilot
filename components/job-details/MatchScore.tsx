// 1. External imports
import { Check, Sparkles, X } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  matchReason: string | null;
  matchedSkills: string[];
  missingSkills: string[];
};

// 4. Component
export function MatchScore({ matchReason, matchedSkills, missingSkills }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-lightest">
            <Sparkles className="h-5 w-5 text-success-alt" />
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">AI Match Reasoning</h2>
        </div>
        <p className="text-sm leading-6 text-text-primary">
          {matchReason ?? "No match reasoning available for this job yet."}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">
          Required Skills vs Your Profile
        </h2>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">You have</span>
          {matchedSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} variant="matched" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No matched skills found.</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-muted">Gap skills</span>
          {missingSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((skill) => (
                <SkillBadge key={skill} skill={skill} variant="missing" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No skill gaps — great match!</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Not exported — used only within this component. Colors per ui-tokens.md's
// Skills Badges table: matched reuses the same bg-success-lightest/
// text-success-foreground pairing as the header's match-score pill, missing
// uses bg-accent-muted/text-accent (not red — pixel-sampled against
// job-details.png, see progress-tracker.md's Feature 12 notes).
type SkillBadgeProps = {
  skill: string;
  variant: "matched" | "missing";
};

function SkillBadge({ skill, variant }: SkillBadgeProps) {
  const isMatched = variant === "matched";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
        isMatched ? "bg-success-lightest text-success-foreground" : "bg-accent-muted text-accent"
      }`}
    >
      {isMatched ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {skill}
    </span>
  );
}
