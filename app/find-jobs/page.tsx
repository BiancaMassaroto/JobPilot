// 1. External imports
import { redirect } from "next/navigation";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";
import { SearchControls } from "@/components/find-jobs/SearchControls";
import { JobsListSection } from "@/components/find-jobs/JobsListSection";
import { fromJobRow, type JobRow } from "@/lib/job-transform";
import { createInsforgeServer } from "@/lib/insforge-server";

// 3. Type definitions
// (none)

// 4. Component
// Feature 10 — swaps Feature 09's MOCK_JOBS for a real, unpaginated DB read.
// Feature 11 still owns filter/sort/pagination (architecture.md's Adzuna Job
// Discovery decision, Decision 12).
export default async function FindJobsPage() {
  const insforge = await createInsforgeServer();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  // proxy.ts already guards this route — this is a defensive fallback, not
  // the primary gate.
  if (!user) {
    redirect("/login");
  }

  const { data: jobRows, error } = await insforge.database
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .order("found_at", { ascending: false });

  if (error) {
    console.error("[find-jobs/page]", error);
    throw new Error("Failed to load jobs");
  }

  const jobs = ((jobRows as JobRow[] | null) ?? []).map(fromJobRow);

  return (
    <>
      <Navbar isAuthenticated />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-8">
        <SearchControls />
        <JobsListSection jobs={jobs} />
      </main>
    </>
  );
}
