// 1. External imports
import { ApiError } from "@google/genai";
import { renderToBuffer } from "@react-pdf/renderer";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

// 2. Internal imports
import { gemini } from "@/lib/gemini";
import { createInsforgeServer } from "@/lib/insforge-server";
import { hasMinimumResumeData } from "@/lib/profile-completion";
import type { ProfileRow } from "@/lib/profile-transform";
import {
  resumeContentSchema,
  workExperienceCountMatches,
  type ResumeContent,
} from "@/lib/resume-generation-schema";
import { ResumePdfDocument } from "@/lib/resume-pdf-template";

// 3. Type definitions

// Specific, actionable — shown before any AI call, so an empty/near-empty
// profile costs nothing (architecture.md's Feature 08 decision, Decision 8).
const MINIMUM_DATA_ERROR =
  "Add at least your name and either a job title or work experience before generating a resume.";
// Every failure from the AI call onward collapses to this one generic,
// friendly message (Decision 13) — quota/timeout, a malformed or
// schema-invalid response, a workExperience length mismatch, or a PDF
// render error all look the same to the user; the real cause is only in
// the server log, prefixed [api/resume/generate].
const GENERATION_FAILED_ERROR = "Resume generation is temporarily unavailable. Please try again in a moment.";
const SAVE_FAILED_ERROR = "Failed to save the generated resume. Please try again.";
const STORAGE_CLEANUP_ATTEMPTS = 2;

async function removeStorageObject(
  insforge: Awaited<ReturnType<typeof createInsforgeServer>>,
  path: string,
): Promise<void> {
  for (let attempt = 1; attempt <= STORAGE_CLEANUP_ATTEMPTS; attempt += 1) {
    const { error } = await insforge.storage.from("resumes").remove(path);
    if (!error) {
      return;
    }
    console.error("[api/resume/generate] storage cleanup failed", { path, attempt, error });
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

const GENERATION_SYSTEM_PROMPT = `You are writing resume content for a job search assistant, from a candidate's structured profile data.

Rules:
- Only use information given in the profile below. Never invent an employer, skill, date, or achievement that isn't stated.
- professionalSummary: one paragraph, 2 to 4 sentences, synthesizing the candidate's current title, years of experience, and skills into a compelling professional summary. No personal pronouns ("I", "my").
- workExperience: return exactly one entry per role listed in the profile below, in the same order. For each role, rewrite its key responsibilities into 2 to 4 tight, resume-style bullet points (sentence fragments, not full sentences, no personal pronouns).

Return ONLY valid JSON matching the provided schema.`;

// 4. Component (Route Handler)
export const runtime = "nodejs";

export async function POST() {
  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: profileRow, error: profileError } = await insforge.database
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError) {
      console.error("[api/resume/generate]", profileError);
      return NextResponse.json({ success: false, error: "Failed to load your profile" }, { status: 500 });
    }

    if (!profileRow || !hasMinimumResumeData(profileRow)) {
      return NextResponse.json({ success: false, error: MINIMUM_DATA_ERROR }, { status: 400 });
    }
    const profile = profileRow;

    const workExperienceForPrompt = (profile.work_experience ?? []).map((role) => ({
      companyName: role.company_name,
      jobTitle: role.job_title,
      keyResponsibilities: role.key_responsibilities,
    }));

    let rawResponseText: string;
    let finishReason: string | undefined;
    try {
      const response = await gemini.models.generateContent({
        // Same model as Feature 07's extraction call, for the same reason —
        // gemini-2.5-flash was live-confirmed dead (404) during that build.
        // See architecture.md's Feature 07 decision, item 3, and lib/gemini.ts.
        model: "gemini-3.6-flash",
        contents: `${GENERATION_SYSTEM_PROMPT}\n\nPROFILE:\n${JSON.stringify({
          currentTitle: profile.current_title,
          yearsExperience: profile.years_experience,
          experienceLevel: profile.experience_level,
          skills: profile.skills,
          workExperience: workExperienceForPrompt,
          education: profile.education,
        })}`,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(resumeContentSchema),
          // 0.7, not the 0.3 used for extraction — natural variation is
          // wanted here, this isn't a deterministic extraction task.
          temperature: 0.7,
          // 8000, not a smaller budget: gemini-3.6-flash is a thinking
          // model whose thinking tokens count against this same budget,
          // confirmed live during Feature 07's build (see
          // library-docs.md's Gemini section) — a smaller budget risks the
          // same silent mid-JSON truncation that build had to correct.
          maxOutputTokens: 8000,
        },
      });
      finishReason = response.candidates?.[0]?.finishReason;
      if (!response.text) {
        throw new Error(`Gemini returned an empty response (finishReason: ${finishReason})`);
      }
      rawResponseText = response.text;
    } catch (error) {
      console.error("[api/resume/generate]", error);
      if (isQuotaExceededError(error)) {
        return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 503 });
      }
      return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 502 });
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(rawResponseText);
    } catch (error) {
      if (finishReason === "MAX_TOKENS") {
        console.error("[api/resume/generate] Gemini response truncated by maxOutputTokens", error);
      } else {
        console.error("[api/resume/generate]", error);
      }
      return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 502 });
    }

    const parseResult = resumeContentSchema.safeParse(rawJson);
    if (!parseResult.success) {
      console.error("[api/resume/generate]", parseResult.error);
      return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 502 });
    }

    const content: ResumeContent = parseResult.data;
    const expectedRoleCount = (profile.work_experience ?? []).length;
    if (!workExperienceCountMatches(content, expectedRoleCount)) {
      console.error("[api/resume/generate] workExperience length mismatch", {
        expected: expectedRoleCount,
        got: content.workExperience.length,
      });
      return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 502 });
    }

    let buffer: Buffer;
    try {
      // Called as a plain function, not createElement/JSX: ResumePdfDocument
      // returns a <Document> element directly, and renderToBuffer's types
      // require exactly that (ReactElement<DocumentProps>), not an element
      // for a wrapping component — confirmed against the installed
      // @react-pdf/renderer types.
      buffer = await renderToBuffer(ResumePdfDocument({ profile, email: user.email, content }));
    } catch (error) {
      console.error("[api/resume/generate]", error);
      return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 500 });
    }

    const path = `${user.id}/resume-${crypto.randomUUID()}.pdf`;
    // Buffer's underlying ArrayBufferLike isn't assignable to BlobPart's
    // stricter ArrayBuffer type — wrap in a fresh Uint8Array to satisfy it,
    // confirmed against the installed TS lib types.
    const { data: uploadData, error: uploadError } = await insforge.storage
      .from("resumes")
      .upload(path, new Blob([new Uint8Array(buffer)], { type: "application/pdf" }));

    if (uploadError || !uploadData) {
      console.error("[api/resume/generate]", uploadError);
      return NextResponse.json({ success: false, error: SAVE_FAILED_ERROR }, { status: 500 });
    }

    const previousStorageKey = profile.resume_storage_key;
    const pointerUpdate = insforge.database
      .from("profiles")
      .update({
        resume_pdf_url: uploadData.url,
        // Saved alongside the URL, not re-derived from it later — see
        // lib/profile-transform.ts's ProfileRow.resume_storage_key comment.
        resume_storage_key: uploadData.key,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    const conditionedPointerUpdate =
      previousStorageKey === null
        ? pointerUpdate.is("resume_storage_key", null)
        : pointerUpdate.eq("resume_storage_key", previousStorageKey);
    const { data: updatedProfile, error: updateError } = await conditionedPointerUpdate
      .select("resume_storage_key")
      .maybeSingle<{ resume_storage_key: string }>();

    if (updateError || !updatedProfile) {
      console.error("[api/resume/generate]", updateError);
      await removeStorageObject(insforge, uploadData.key);
      return NextResponse.json({ success: false, error: SAVE_FAILED_ERROR }, { status: 500 });
    }

    if (previousStorageKey && previousStorageKey !== uploadData.key) {
      await removeStorageObject(insforge, previousStorageKey);
    }

    revalidatePath("/profile");
    return NextResponse.json({
      success: true,
      data: { resumePdfUrl: uploadData.url, resumeStorageKey: uploadData.key },
    });
  } catch (error) {
    console.error("[api/resume/generate]", error);
    return NextResponse.json({ success: false, error: GENERATION_FAILED_ERROR }, { status: 500 });
  }
}
