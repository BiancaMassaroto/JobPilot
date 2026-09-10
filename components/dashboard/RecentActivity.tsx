// 1. External imports
import { Clock } from "lucide-react";

// 3. Type definitions
export type ActivityDotColor = "accent" | "info" | "success";

export type ActivityEntry = {
  id: string;
  text: string;
  timestamp: string;
  dotColor: ActivityDotColor;
};

type Props = {
  entries: ActivityEntry[];
};

// Outer ring / inner dot pairs — ui-tokens.md's "Activity Dots" table,
// pixel-confirmed against dashboard.png's five sample rows.
const DOT_STYLES: Record<ActivityDotColor, { ring: string; dot: string }> = {
  accent: { ring: "bg-accent-light", dot: "bg-accent" },
  info: { ring: "bg-info-light", dot: "bg-info" },
  success: { ring: "bg-success-light", dot: "bg-success-alt" },
};

// 4. Component
export function RecentActivity({ entries }: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-base font-semibold text-text-primary">Recent Activity</h2>
      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col divide-y divide-border border-t border-border">
          {entries.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}

// Not exported, local to this file. Feature 14's mock data always had 5
// rows, so this state never came up until Feature 16 wired real data — a
// brand-new user with no searches or research yet needs one per
// ui-rules.md's Empty States rule. Same icon-badge-plus-caption shape as
// find-jobs's JobsEmptyState, scaled down for this smaller card.
function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 border-t border-border px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
        <Clock className="h-4 w-4 text-text-muted" aria-hidden />
      </span>
      <p className="text-sm text-text-secondary">
        No activity yet. Run a search or research a company to get started.
      </p>
    </div>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const styles = DOT_STYLES[entry.dotColor];
  return (
    <li className="flex items-start gap-3 py-4">
      <span
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-surface ${styles.ring}`}
      >
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
      </span>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-text-primary">{entry.text}</p>
        <p className="text-xs text-text-muted">{entry.timestamp}</p>
      </div>
    </li>
  );
}
