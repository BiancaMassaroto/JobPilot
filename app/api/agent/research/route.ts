// Feature 13 — Company Research Agent. This route is its own auth gate:
// proxy.ts's PROTECTED_ROUTES doesn't cover /api/* at all (same precedent
// as Feature 10's /api/agent/find — see architecture.md's Feature 13
// decision, Decision 12).

// 1. External imports
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// 2. Internal imports
import { researchCompany } from "@/agent/research";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import type { ProfileRow } from "@/lib/profile-transform";
import type { CompanyResearchDossier } from "@/types";

// 3. Type definitions
// Decision 10 — never the raw Gemini/Stagehand error text.
const RESEARCH_FAILED_ERROR = "Couldn't research this company right now. Please try again.";
// This server's own DB write/read failing, not an upstream service.
const INTERNAL_ERROR = "Something went wrong. Please try again.";

type ResearchJobRow = {
  id: string;
  title: string;
  company: string;
  source_url: string | null;
  about_role: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
};

// Decision 9 — the route stays open for the whole run (homepage extract →
// up to 3 sub-page extracts → session close → Gemini synthesis): Browserbase's
// own session budget is 120s, plus headroom for the synthesis call that runs
// after the browser closes. Whether the real deployment target honors this
// is flagged as a Follow-up in architecture.md's Feature 13 decision, not
// assumed here.
export const maxDuration = 180;

// 4. Component (Route Handler)
export async function POST(req: NextRequest) {
  const insforge = await createInsforgeServer();

  try {
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    let rawBody: { jobId?: unknown } = {};
    try {
      rawBody = (await req.json()) as { jobId?: unknown };
    } catch {
      // Falls through to the missing-jobId check below.
    }
    const jobId = typeof rawBody.jobId === "string" ? rawBody.jobId.trim() : "";
    if (jobId.length === 0) {
      return NextResponse.json({ success: false, error: "jobId is required." }, { status: 400 });
    }

    // Ownership-scoped in the same query as the lookup — "doesn't exist" and
    // "isn't yours" both render as 404, never distinguished (Decision 11-12).
    const { data: jobRow, error: jobError } = await insforge.database
      .from("jobs")
      .select("id, title, company, source_url, about_role, matched_skills, missing_skills")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle<ResearchJobRow>();

    if (jobError) {
      console.error("[api/agent/research]", jobError);
      return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
    }
    if (!jobRow) {
      return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
    }

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      console.error("[api/agent/research]", profileError);
      return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
    }
    if (!profileRow) {
      return NextResponse.json(
        { success: false, error: "Please complete your profile before researching a company." },
        { status: 400 },
      );
    }

    const result = await researchCompany(
      {
        title: jobRow.title,
        company: jobRow.company,
        sourceUrl: jobRow.source_url,
        aboutRole: jobRow.about_role,
        matchedSkills: jobRow.matched_skills ?? [],
        missingSkills: jobRow.missing_skills ?? [],
      },
      profileRow,
      user.id,
      jobRow.id,
    );

    if (!result.success) {
      // Decision 7/10 — the existing dossier (if any) is left completely
      // untouched; this route never writes to `jobs` on a failed run.
      return NextResponse.json({ success: false, error: RESEARCH_FAILED_ERROR }, { status: 502 });
    }

    const { error: updateError } = await insforge.database
      .from("jobs")
      .update({
        company_research: result.dossier,
        company_researched_at: new Date().toISOString(),
      })
      .eq("id", jobRow.id)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[api/agent/research]", updateError);
      return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
    }

    const posthog = createPostHogServer();
    posthog.capture({
      distinctId: user.id,
      event: "company_researched",
      properties: { userId: user.id, jobId: jobRow.id, company: jobRow.company },
    });
    await posthog.shutdown();

    revalidatePath(`/find-jobs/${jobRow.id}`);

    const dossier: CompanyResearchDossier = result.dossier;
    return NextResponse.json({ success: true, data: { dossier } });
  } catch (error) {
    console.error("[api/agent/research]", error);
    return NextResponse.json({ success: false, error: INTERNAL_ERROR }, { status: 500 });
  }
}
