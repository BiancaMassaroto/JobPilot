// 2. Internal imports
import type { StatDatum } from "@/components/dashboard/StatsBar";

// 3. Type definitions
export type DashboardStatsJobRow = {
  match_score: number | null;
  found_at: string;
  company_research: unknown | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;

// 4. Pure transform — takes the already-fetched jobs rows for one user and
// computes every Stats Bar value from them in JS, the same "fetch once,
// compute in JS" approach this project already uses for activity timestamps
// (see build-plan.md's Feature 16 note on agent_runs/jobs having no
// created_at column). No aggregate SQL needed.
export function buildDashboardStats(rows: DashboardStatsJobRow[]): StatDatum[] {
  const now = Date.now();
  const sevenDaysAgo = now - ONE_WEEK_MS;
  const fourteenDaysAgo = now - 2 * ONE_WEEK_MS;

  const companiesResearched = rows.filter((row) => row.company_research !== null).length;

  const thisWeekRows = rows.filter((row) => new Date(row.found_at).getTime() >= sevenDaysAgo);
  const lastWeekRows = rows.filter((row) => {
    const foundAt = new Date(row.found_at).getTime();
    return foundAt >= fourteenDaysAgo && foundAt < sevenDaysAgo;
  });

  const avgMatchRate = average(rows.map((row) => row.match_score));
  const thisWeekAvgMatchRate = average(thisWeekRows.map((row) => row.match_score));
  const lastWeekAvgMatchRate = average(lastWeekRows.map((row) => row.match_score));

  return [
    {
      label: "Total Jobs Found",
      value: String(rows.length),
      trend: computeCountTrend(thisWeekRows.length, lastWeekRows.length),
    },
    {
      label: "Avg. Match Rate",
      value: avgMatchRate === null ? "—" : `${Math.round(avgMatchRate)}%`,
      trend: computeRateTrend(thisWeekAvgMatchRate, lastWeekAvgMatchRate),
    },
    {
      label: "Companies Researched",
      value: String(companiesResearched),
      subtitle: "Total researched",
    },
    {
      label: "Jobs This Week",
      value: String(thisWeekRows.length),
      subtitle: "New this week",
    },
  ];
}

function average(values: (number | null)[]): number | null {
  const scored = values.filter((value): value is number => value !== null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, value) => sum + value, 0) / scored.length;
}

// Relative % change — right for a count (Total Jobs Found), where "12 vs 3"
// reads naturally as growth. No baseline to compare against when last
// week's count is 0 (division by zero) — return undefined so the card
// falls back to a plain subtitle instead of showing a meaningless "+∞%" or
// a misleading flat "+100%".
function computeCountTrend(
  thisWeek: number,
  lastWeek: number,
): { value: string; description: string } | undefined {
  if (lastWeek === 0) return undefined;
  const changePercent = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  return { value: formatSigned(changePercent, "%"), description: "vs last week" };
}

// Percentage-point difference — right for a rate (Avg. Match Rate), where
// "82% vs 79%" should read as "+3", not the relative-growth "+4%" a
// percent-of-a-percent calculation would produce. Undefined (not 0) when
// either week has no scored jobs to average — there's nothing real to
// compare, not a genuine "no change."
function computeRateTrend(
  thisWeek: number | null,
  lastWeek: number | null,
): { value: string; description: string } | undefined {
  if (thisWeek === null || lastWeek === null) return undefined;
  const diffPoints = Math.round(thisWeek - lastWeek);
  return { value: formatSigned(diffPoints, "%"), description: "vs last week" };
}

function formatSigned(value: number, suffix: string): string {
  return `${value > 0 ? "+" : ""}${value}${suffix}`;
}
