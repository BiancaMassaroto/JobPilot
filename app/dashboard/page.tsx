// 1. External imports
import { redirect } from "next/navigation";
import { Building2, Search, Target } from "lucide-react";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { BarChartCard } from "@/components/dashboard/BarChartCard";
import { LineChartCard } from "@/components/dashboard/LineChartCard";
import { buildDashboardStats, type DashboardStatsJobRow } from "@/lib/dashboard-stats";
import { buildRecentActivity, type AgentRunRow, type ResearchedJobRow } from "@/lib/recent-activity";
import {
  getCompanyResearchActivity,
  getJobsFoundOverTime,
  getMatchScoreDistribution,
} from "@/lib/posthog-query";
import { computeChartAxis } from "@/lib/utils";
import { createInsforgeServer } from "@/lib/insforge-server";

// 4. Component
// Feature 14 built the full UI against context/designs/dashboard.png with
// mock data everywhere. Feature 15 swapped the Stats Bar for real InsForge
// data; Feature 16 did the same for Recent Activity; Feature 17 (this
// build) does the same for the three charts, against real PostHog data —
// see architecture.md's Feature 17 decision. Replaces the Feature 05
// placeholder wholesale, not extended — see progress-tracker.md's note.
export default async function DashboardPage() {
  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  // proxy.ts already guards this route — this is a defensive fallback, not
  // the primary gate. Same pattern as app/find-jobs/page.tsx.
  if (!user) {
    redirect("/login");
  }

  // All six reads run in one Promise.all (architecture.md's Feature 17
  // decision, Decision 9) — the three InsForge reads and the three new
  // PostHog reads are fully independent. Safe to mix: InsForge errors are
  // inspected after resolution (unchanged below), PostHog reads never
  // reject, they resolve to null on failure (Decision 6).
  const [
    jobsForStats,
    completedRuns,
    researchedJobs,
    jobsFoundOverTime,
    matchScoreDistribution,
    companyResearchActivity,
  ] = await Promise.all([
    insforge.database
      .from("jobs")
      .select("match_score, found_at, company_research")
      .eq("user_id", user.id),
    // Only "completed" runs have a defined Recent Activity format
    // (build-plan.md's Feature 16 Format bullet) — a still-running or
    // failed run is filtered out here rather than fetched and discarded.
    insforge.database
      .from("agent_runs")
      .select("id, status, job_title_searched, jobs_found, started_at, completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(10),
    // company_researched_at, not company_research IS NOT NULL — the jsonb
    // column alone carries no time to sort by (build-plan.md's Feature 16
    // note).
    insforge.database
      .from("jobs")
      .select("id, company, company_researched_at")
      .eq("user_id", user.id)
      .not("company_researched_at", "is", null)
      .order("company_researched_at", { ascending: false })
      .limit(10),
    getJobsFoundOverTime(user.id),
    getMatchScoreDistribution(user.id),
    getCompanyResearchActivity(user.id),
  ]);

  if (jobsForStats.error) {
    console.error("[dashboard/page]", jobsForStats.error);
    throw new Error("Failed to load dashboard stats");
  }
  if (completedRuns.error) {
    console.error("[dashboard/page]", completedRuns.error);
    throw new Error("Failed to load recent activity");
  }
  if (researchedJobs.error) {
    console.error("[dashboard/page]", researchedJobs.error);
    throw new Error("Failed to load recent activity");
  }

  const stats = buildDashboardStats((jobsForStats.data as DashboardStatsJobRow[] | null) ?? []);
  const recentActivity = buildRecentActivity(
    (completedRuns.data as AgentRunRow[] | null) ?? [],
    (researchedJobs.data as ResearchedJobRow[] | null) ?? [],
  );

  const jobsFoundAxis = computeChartAxis((jobsFoundOverTime ?? []).map((d) => d.value));
  const matchScoreAxis = computeChartAxis((matchScoreDistribution ?? []).map((d) => d.value));
  const companyResearchAxis = computeChartAxis((companyResearchActivity ?? []).map((d) => d.value));

  return (
    <>
      <Navbar isAuthenticated />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-8">
        <StatsBar stats={stats} />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <RecentActivity entries={recentActivity} />
          <BarChartCard
            title="Company Research Activity"
            data={companyResearchActivity}
            maxValue={companyResearchAxis.maxValue}
            yAxisTicks={companyResearchAxis.ticks}
            color="info"
            emptyIcon={Building2}
            emptyMessage="No company research yet. Research a company from a job's details page to see this chart."
          />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1.85fr_1fr]">
          <LineChartCard
            title="Jobs Found Over Time"
            data={jobsFoundOverTime}
            maxValue={jobsFoundAxis.maxValue}
            yAxisTicks={jobsFoundAxis.ticks}
            emptyIcon={Search}
            emptyMessage="No jobs found yet. Run a search to see this chart."
          />
          <BarChartCard
            title="Match Score Distribution"
            data={matchScoreDistribution}
            maxValue={matchScoreAxis.maxValue}
            yAxisTicks={matchScoreAxis.ticks}
            color="success"
            emptyIcon={Target}
            emptyMessage="No scored jobs yet. Run a search to see this chart."
          />
        </div>
      </main>
    </>
  );
}
