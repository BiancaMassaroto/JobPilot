// 2. Internal imports
import type { BarDatum } from "@/components/dashboard/BarChartCard";
import type { LinePoint } from "@/components/dashboard/LineChartCard";

// 3. Type definitions
type PostHogQueryResponse = {
  results?: unknown[][] | null;
  error?: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The Query API's app/read host — confirmed live (architecture.md's Feature
// 17 decision) as distinct from NEXT_PUBLIC_POSTHOG_HOST, which is the
// ingestion host posthog-js/posthog-node capture events against
// ("us.i.posthog.com"). Hardcoded rather than a new env var, same "fixed
// platform URL, only credentials are configurable" precedent as
// lib/adzuna.ts's hardcoded api.adzuna.com base.
const POSTHOG_API_HOST = "https://us.posthog.com";

// 4. queryPostHog — the shared low-level fetch helper. Never throws: any
// failure (missing config, network error, timeout, a non-200, an
// unparsable body, or PostHog's own `error` field) is logged and resolves
// to null, so a PostHog outage degrades one chart card instead of the
// whole /dashboard page (architecture.md's Feature 17 decision, Decision
// 6) — deliberately different from this project's InsForge read
// convention, which still throws on a DB error.
async function queryPostHog(hogql: string, name: string): Promise<unknown[][] | null> {
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!projectId || !apiKey) {
    console.error("[lib/posthog-query] Missing POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY");
    return null;
  }

  try {
    const response = await fetch(`${POSTHOG_API_HOST}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql }, name }),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error("[lib/posthog-query]", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as PostHogQueryResponse;
    if (data.error) {
      console.error("[lib/posthog-query]", data.error);
      return null;
    }

    return data.results ?? [];
  } catch (error) {
    console.error("[lib/posthog-query]", error);
    return null;
  }
}

// userId always comes from insforge.auth.getCurrentUser() server-side, never
// a request param — this is defense in depth before it's interpolated into
// a HogQL string, not a response to a real attacker-controlled input
// (architecture.md's Feature 17 decision, Decision 5).
function isValidUserId(userId: string): boolean {
  return UUID_PATTERN.test(userId);
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
}

function formatWeekdayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short" });
}

// Buckets a list of raw event timestamps into `days` consecutive UTC
// calendar days ending today (a rolling window, matching the convention
// lib/dashboard-stats.ts already uses for its own trend windows), zero
// filling any day with no events so a line/bar chart doesn't compress
// unevenly around gaps.
function bucketByDay(
  rows: unknown[][],
  days: number,
  labelFor: (date: Date) => string,
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const timestamp = String(row[0]);
    const count = Number(row[1]);
    if (!Number.isFinite(count)) continue;
    const key = toUtcDateKey(new Date(timestamp));
    counts.set(key, (counts.get(key) ?? 0) + count);
  }

  const today = new Date();
  const buckets: { label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * ONE_DAY_MS);
    const key = toUtcDateKey(date);
    buckets.push({ label: labelFor(date), value: counts.get(key) ?? 0 });
  }
  return buckets;
}

// Half-open intervals, upper bound exclusive except the final bucket
// (closed, so a perfect 100 lands in it) — the same inclusive-lower-bound
// convention MATCH_THRESHOLD's own `>=` check already establishes.
const MATCH_SCORE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "50-60%", min: 50, max: 60 },
  { label: "60-70%", min: 60, max: 70 },
  { label: "70-80%", min: 70, max: 80 },
  { label: "80-90%", min: 80, max: 90 },
  { label: "90-100%", min: 90, max: 101 },
];

// Jobs Found Over Time — last 30 days, day bucketed, every 30 real points
// plotted (LineChartCard sparse-labels the x-axis itself; see its own
// interval logic). null on a failed query, distinct from [] (no jobs
// found yet) — see architecture.md's Feature 17 decision, Decision 7.
export async function getJobsFoundOverTime(userId: string): Promise<LinePoint[] | null> {
  if (!isValidUserId(userId)) {
    console.error("[lib/posthog-query] getJobsFoundOverTime: invalid userId");
    return null;
  }

  const rows = await queryPostHog(
    `SELECT toDate(timestamp) AS day, count() AS count FROM events WHERE event = 'job_found' AND distinct_id = '${userId}' AND timestamp >= now() - INTERVAL 30 DAY GROUP BY day ORDER BY day`,
    "dashboard: jobs found over time",
  );
  if (rows === null) return null;
  if (rows.length === 0) return [];

  return bucketByDay(rows, 30, formatDayLabel);
}

// Company Research Activity — last 7 days, day bucketed, weekday labeled
// (safe here specifically because the window is exactly 7 days, so no two
// bucketed days share a weekday label).
export async function getCompanyResearchActivity(userId: string): Promise<BarDatum[] | null> {
  if (!isValidUserId(userId)) {
    console.error("[lib/posthog-query] getCompanyResearchActivity: invalid userId");
    return null;
  }

  const rows = await queryPostHog(
    `SELECT toDate(timestamp) AS day, count() AS count FROM events WHERE event = 'company_researched' AND distinct_id = '${userId}' AND timestamp >= now() - INTERVAL 7 DAY GROUP BY day ORDER BY day`,
    "dashboard: company research activity",
  );
  if (rows === null) return null;
  if (rows.length === 0) return [];

  return bucketByDay(rows, 7, formatWeekdayLabel);
}

// Match Score Distribution — no date window (build-plan.md states one for
// the other two charts and conspicuously not this one; read as
// deliberate, this is a cumulative distribution, not a time series).
// Excludes any job_found event scored under 50 (Feature 10 saves every
// scored job regardless of score, but build-plan.md's five ranges start
// at 50 with no catch-all bucket — followed literally; see
// architecture.md's Feature 17 decision, Decision 4, and its Follow-up).
export async function getMatchScoreDistribution(userId: string): Promise<BarDatum[] | null> {
  if (!isValidUserId(userId)) {
    console.error("[lib/posthog-query] getMatchScoreDistribution: invalid userId");
    return null;
  }

  const rows = await queryPostHog(
    `SELECT properties.matchScore AS matchScore, count() AS count FROM events WHERE event = 'job_found' AND distinct_id = '${userId}' AND properties.matchScore >= 50 GROUP BY matchScore`,
    "dashboard: match score distribution",
  );
  if (rows === null) return null;
  if (rows.length === 0) return [];

  const scores = rows
    .map((row) => ({ score: Number(row[0]), count: Number(row[1]) }))
    .filter(({ score, count }) => Number.isFinite(score) && Number.isFinite(count));
  return MATCH_SCORE_BUCKETS.map(({ label, min, max }) => ({
    label,
    value: scores
      .filter(({ score }) => score >= min && score < max)
      .reduce((total, { count }) => total + count, 0),
  }));
}
