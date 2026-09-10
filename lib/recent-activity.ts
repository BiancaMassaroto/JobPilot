// 2. Internal imports
import { formatRelativeTime } from "@/lib/utils";
import type { ActivityEntry } from "@/components/dashboard/RecentActivity";

// 3. Type definitions
export type AgentRunRow = {
  id: string;
  status: "running" | "completed" | "failed";
  job_title_searched: string;
  jobs_found: number;
  started_at: string;
  completed_at: string | null;
};

export type ResearchedJobRow = {
  id: string;
  company: string;
  company_researched_at: string | null;
};

const RECENT_ACTIVITY_LIMIT = 5;

// 4. Pure transform — merges two already-fetched row sets (agent_runs,
// jobs) into one sorted, formatted activity feed. Neither table has a
// created_at column (build-plan.md's Feature 16 note) — each row's own
// activity timestamp does the sorting instead.
export function buildRecentActivity(
  agentRuns: AgentRunRow[],
  researchedJobs: ResearchedJobRow[],
  now: Date = new Date(),
): ActivityEntry[] {
  // Only "completed" runs have a defined format (build-plan.md's Format
  // bullet names exactly two cases: agent_run completed, company_research
  // populated) — a still-running or failed run has no activity text to
  // show, so it's left out of the feed rather than guessed at. The query
  // in app/dashboard/page.tsx already filters to status = "completed"; this
  // filter stays as a defensive second layer, same "app-level filter on
  // top of the query" habit this project already uses for RLS.
  const runEntries = agentRuns
    .filter((run) => run.status === "completed")
    .map((run) => {
      const activityAt = new Date(run.completed_at ?? run.started_at);
      const jobsFound = run.jobs_found;
      return {
        id: `run-${run.id}`,
        text: `Found ${jobsFound} job${jobsFound === 1 ? "" : "s"} for ${run.job_title_searched}`,
        timestamp: formatRelativeTime(activityAt, now),
        dotColor: "success" as const,
        activityAt,
      };
    });

  const researchEntries = researchedJobs
    .filter((job) => job.company_researched_at !== null)
    .map((job) => {
      // Narrowed by the filter above; TS can't see that across the map call.
      const activityAt = new Date(job.company_researched_at as string);
      return {
        id: `research-${job.id}`,
        text: `Researched ${job.company}`,
        timestamp: formatRelativeTime(activityAt, now),
        dotColor: "info" as const,
        activityAt,
      };
    });

  return [...runEntries, ...researchEntries]
    .sort((a, b) => b.activityAt.getTime() - a.activityAt.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((entry) => ({
      id: entry.id,
      text: entry.text,
      timestamp: entry.timestamp,
      dotColor: entry.dotColor,
    }));
}
