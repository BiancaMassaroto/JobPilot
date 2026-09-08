// Feature 10 (Adzuna Job Discovery) — the single source of truth for what
// counts as a "strong match." See architecture.md's Adzuna Job Discovery
// decision, Decision 7. Never re-hardcode 70 anywhere else.
export const MATCH_THRESHOLD = 70;

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return "Just now";
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  return `${diffDays} days ago`;
}
