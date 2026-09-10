// 1. External imports
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";
import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobActions } from "@/components/job-details/JobActions";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobInfo } from "@/components/job-details/JobInfo";
import { MatchScore } from "@/components/job-details/MatchScore";
import { fromJobDetailRow, type JobDetailRow } from "@/lib/job-transform";
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions
type Props = {
  params: Promise<{ id: string }>;
};

// 4. Component
// Feature 12 — job data is already fully available from Phase 3's schema
// (architecture.md's jobs table), so it's wired to real data immediately.
// Feature 13 added company_research/company_researched_at to the select so
// a saved dossier survives a fresh page load (architecture.md's Feature 13
// decision, Decision 17a) — not just the same-session click flow.
export default async function JobDetailsPage({ params }: Props) {
  const { id } = await params;

  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  // proxy.ts already guards /find-jobs/* — this is a defensive fallback,
  // not the primary gate (matches app/find-jobs/page.tsx's own pattern).
  if (!user) {
    redirect("/login");
  }

  const { data: jobRow, error } = await insforge.database
    .from("jobs")
    .select(
      "id, title, company, location, salary, job_type, found_at, about_role, match_score, match_reason, matched_skills, missing_skills, external_apply_url, company_research, company_researched_at",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[find-jobs/[id]/page]", error);
    throw new Error("Failed to load job");
  }

  if (!jobRow) {
    notFound();
  }

  const job = fromJobDetailRow(jobRow as JobDetailRow);

  return (
    <>
      <Navbar isAuthenticated />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-8">
        <Link
          href="/find-jobs"
          className="flex w-fit items-center gap-1 text-sm font-medium text-text-secondary hover:text-text-primary"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <JobInfo job={job} />
        <MatchScore matchReason={job.matchReason} matchedSkills={job.matchedSkills} missingSkills={job.missingSkills} />
        <JobDescription aboutRole={job.aboutRole} externalApplyUrl={job.externalApplyUrl} />
        <CompanyResearch jobId={job.id} company={job.company} initialDossier={job.companyResearch} />
        <JobActions company={job.company} externalApplyUrl={job.externalApplyUrl} />
      </main>
    </>
  );
}
