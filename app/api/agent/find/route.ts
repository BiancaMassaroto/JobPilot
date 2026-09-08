// Feature 10 — Adzuna Job Discovery. This route is its own auth gate:
// proxy.ts's PROTECTED_ROUTES doesn't cover /api/* at all (architecture.md's
// Adzuna Job Discovery decision, Decision 10).

// 1. External imports
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// 2. Internal imports
import { discoverJobs } from "@/agent/adzuna";
import { scoreJobs } from "@/agent/matcher";
import { mapAdzunaJobType } from "@/lib/adzuna";
import { logAgentError } from "@/lib/agent-logs";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import type { ProfileRow } from "@/lib/profile-transform";
import { MATCH_THRESHOLD } from "@/lib/utils";
import type { FindJobsRequestBody, FindJobsResponseData } from "@/types";

// 3. Type definitions
type Insforge = Awaited<ReturnType<typeof createInsforgeServer>>;

// Decision 2a — before any Adzuna or Gemini call, nothing costs anything.
const MINIMAL_PROFILE_ERROR =
  "Add at least your skills or a job title to your profile before searching for jobs.";
// Decision 9 — never the raw Adzuna/Gemini error text.
const SEARCH_FAILED_ERROR = "Couldn't search for jobs right now. Please try again.";
// Decision 9c — this server's own DB write failing, not an upstream service.
const INTERNAL_ERROR = "Something went wrong while starting your search. Please try again.";

// 4. Component (Route Handler)

async function markRunFailed(insforge: Insforge, runId: string): Promise<void> {
  const { error } = await insforge.database
    .from("agent_runs")
    .update({ status: "failed", completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) {
    console.error("[api/agent/find] failed to mark run as failed", error);
  }
}

async function markRunCompleted(insforge: Insforge, runId: string, jobsFound: number): Promise<void> {
  const { error } = await insforge.database
    .from("agent_runs")
    .update({ status: "completed", jobs_found: jobsFound, completed_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) {
    console.error("[api/agent/find] failed to mark run as completed", error);
  }
}

export async function POST(req: NextRequest) {
  const insforge = await createInsforgeServer();
  let posthog: ReturnType<typeof createPostHogServer> | undefined;

  try {
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    let rawBody: Partial<FindJobsRequestBody> = {};
    try {
      rawBody = (await req.json()) as Partial<FindJobsRequestBody>;
    } catch {
      // Falls through to the empty-jobTitle check below.
    }
    const jobTitle = typeof rawBody.jobTitle === "string" ? rawBody.jobTitle.trim() : "";
    // Decision 9d — a missing key (not just an empty string) is coerced to
    // "" before it ever reaches detectAdzunaCountry().
    const location = typeof rawBody.location === "string" ? rawBody.location.trim() : "";

    if (jobTitle.length === 0) {
      return NextResponse.json({ success: false, error: "Job title is required." }, { status: 400 });
    }

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      console.error("[api/agent/find]", profileError);
      return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
    }

    const hasSkills = Boolean(profileRow?.skills && profileRow.skills.length > 0);
    const hasTitle = Boolean(profileRow?.current_title && profileRow.current_title.trim().length > 0);
    if (!profileRow || (!hasSkills && !hasTitle)) {
      return NextResponse.json({ success: false, error: MINIMAL_PROFILE_ERROR }, { status: 400 });
    }

    const { data: run, error: runError } = await insforge.database
      .from("agent_runs")
      .insert({
        user_id: user.id,
        status: "running",
        job_title_searched: jobTitle,
        location_searched: location || null,
      })
      .select("id")
      .single<{ id: string }>();

    if (runError || !run) {
      // No run_id exists yet — log to the server console only, never
      // logAgentError() (Decision 9c).
      console.error("[api/agent/find]", runError);
      return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
    }

    posthog = createPostHogServer();
    posthog.capture({
      distinctId: user.id,
      event: "job_search_started",
      properties: { userId: user.id, jobTitle, location },
    });

    const discoverResult = await discoverJobs(jobTitle, location, user.id, run.id);
    if (!discoverResult.success) {
      await markRunFailed(insforge, run.id);
      return NextResponse.json({ success: false, error: SEARCH_FAILED_ERROR }, { status: 502 });
    }

    const { adzunaResults, newResults } = discoverResult;

    if (newResults.length === 0) {
      await markRunCompleted(insforge, run.id, 0);
      const data: FindJobsResponseData = {
        jobsFound: 0,
        strongMatches: 0,
        adzunaResultCount: adzunaResults.length,
        jobTitle,
        location,
      };
      return NextResponse.json({ success: true, data });
    }

    const scoreResult = await scoreJobs(newResults, profileRow, user.id, run.id);
    if (!scoreResult.success) {
      await markRunFailed(insforge, run.id);
      return NextResponse.json({ success: false, error: SEARCH_FAILED_ERROR }, { status: 502 });
    }

    let savedCount = 0;
    let strongMatches = 0;

    // Inserted one job at a time, not one bulk insert — one bad row can't
    // take the rest of the batch down with it (Decision 8).
    for (let index = 0; index < newResults.length; index += 1) {
      const adzunaJob = newResults[index];
      const matchResult = scoreResult.resultsByIndex.get(index);

      if (!matchResult) {
        await logAgentErrorForSkippedJob(user.id, run.id, adzunaJob, "No match result returned by Gemini");
        continue;
      }

      const { data: insertedJob, error: insertError } = await insforge.database
        .from("jobs")
        .insert({
          user_id: user.id,
          run_id: run.id,
          source: "search",
          source_url: adzunaJob.redirect_url,
          external_apply_url: adzunaJob.redirect_url,
          title: adzunaJob.title,
          company: adzunaJob.company.display_name,
          location: adzunaJob.location.display_name,
          salary: adzunaJob.salary_min
            ? `$${Math.round(adzunaJob.salary_min / 1000)}k - $${Math.round(
                (adzunaJob.salary_max ?? adzunaJob.salary_min) / 1000,
              )}k`
            : null,
          job_type: mapAdzunaJobType(adzunaJob),
          about_role: adzunaJob.description,
          match_score: matchResult.matchScore,
          match_reason: matchResult.matchReason,
          matched_skills: matchResult.matchedSkills,
          missing_skills: matchResult.missingSkills,
          found_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !insertedJob) {
        await logAgentErrorForSkippedJob(user.id, run.id, adzunaJob, "Failed to save job", insertError);
        continue;
      }

      savedCount += 1;
      if (matchResult.matchScore >= MATCH_THRESHOLD) {
        strongMatches += 1;
      }
      posthog.capture({
        distinctId: user.id,
        event: "job_found",
        properties: { userId: user.id, source: "search", matchScore: matchResult.matchScore },
      });
    }

    await markRunCompleted(insforge, run.id, savedCount);
    revalidatePath("/find-jobs");

    const data: FindJobsResponseData = {
      jobsFound: savedCount,
      strongMatches,
      adzunaResultCount: adzunaResults.length,
      jobTitle,
      location,
    };
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[api/agent/find]", error);
    return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
  } finally {
    // Covers every return path above, including the failure branches — a
    // client created before any of them still shuts down cleanly even when
    // it fired zero job_found events (Decision 13).
    if (posthog) {
      await posthog.shutdown();
    }
  }
}

async function logAgentErrorForSkippedJob(
  userId: string,
  runId: string,
  adzunaJob: { title: string; company: { display_name: string } },
  message: string,
  error?: unknown,
): Promise<void> {
  await logAgentError(
    userId,
    runId,
    null,
    `${message}: "${adzunaJob.title}" at ${adzunaJob.company.display_name}`,
    error ?? new Error("skipped"),
  );
}
