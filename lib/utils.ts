// Feature 10 (Adzuna Job Discovery) — the single source of truth for what
// counts as a "strong match." See architecture.md's Adzuna Job Discovery
// decision, Decision 7. Never re-hardcode 70 anywhere else.
export const MATCH_THRESHOLD = 70;

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  // Minute-level granularity added at Feature 16 — dashboard.png's Recent
  // Activity mock shows "10 mins ago," a precision the previous
  // under-1-hour "Just now" bucket couldn't produce. Only splits that one
  // bucket further; hour/day behavior below is unchanged.
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "Yesterday";
  }
  return `${diffDays} days ago`;
}

// Feature 17 (Analytics Charts) — real PostHog data replaces the fixed
// maxValue/yAxisTicks the Feature 14 mock hardcoded per chart, so the axis
// now scales to whatever a real user's data actually is. Returns exactly 5
// evenly spaced integer ticks (matching the mock's own top-to-bottom shape,
// e.g. [100, 75, 50, 25, 0]). Every value here is a non-negative event
// count, always an integer — `step` is kept an integer >= 1 for exactly
// that reason: a live smoke test caught the first version of this (a
// fractional "nice number" step, e.g. 1/2/5/10 scaling) producing
// duplicate rounded ticks (e.g. [2, 2, 1, 1, 0]) for a small real max like
// 2. An integer step can never collide like that.
export function computeChartAxis(values: number[]): { maxValue: number; ticks: number[] } {
  const rawMax = Math.max(0, ...values);
  const step = Math.max(1, Math.ceil(rawMax / 4));
  return { maxValue: step * 4, ticks: [4, 3, 2, 1, 0].map((n) => n * step) };
}
