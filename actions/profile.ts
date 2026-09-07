"use server";

// 1. External imports
import { ApiError } from "@google/genai";
import { revalidatePath } from "next/cache";
import { PDFParse } from "pdf-parse";
import { getData as getPdfWorkerData } from "pdf-parse/worker";
import { z } from "zod";

// 2. Internal imports
import { gemini } from "@/lib/gemini";
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { calculateProfileCompletion } from "@/lib/profile-completion";
import {
  extractedProfileSchema,
  normalizeStringList,
  normalizeWorkExperience,
} from "@/lib/profile-extraction-schema";
import {
  parseYearsExperience,
  splitCommaList,
  toAcademicExperienceRecords,
  toEducationRecord,
  toWorkExperienceRecords,
} from "@/lib/profile-transform";
import type { ExtractableProfileFields } from "@/types";

// pdf-parse (built on pdfjs-dist) defaults to spinning up a real worker the
// way it would in a browser. In this project's Next.js (Turbopack) dev
// server, that worker chunk isn't resolvable at the path pdfjs-dist
// expects, and the "fake worker" fallback also fails — confirmed live:
// "Setting up fake worker failed: Cannot find module
// '.../.next/dev/server/chunks/ssr/pdf.worker.mjs'". Pointing the worker at
// pdf-parse's self-contained base64 data URL (getData(), not getPath() —
// getPath() returns a filesystem path relative to the bundled runtime file,
// which hits the exact same bundler-relocation problem) sidesteps this
// entirely: no worker file ever needs to be resolved on disk. Must run
// before any `new PDFParse(...)` call below.
PDFParse.setWorker(getPdfWorkerData());

// 3. Type definitions
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;
// A long CV or a PDF with an embedded cover letter has no other stated
// ceiling — maxOutputTokens already caps the response side, the request
// side needs the same treatment.
const MAX_EXTRACTION_TEXT_CHARS = 15_000;

const UNREADABLE_PDF_ERROR = "Could not extract text from this PDF. Please try a different file.";
const EXTRACTION_FAILED_ERROR =
  "Could not extract profile details from this resume. Please try again or fill in the form manually.";
// Distinct from EXTRACTION_FAILED_ERROR — a 429 means the request never
// really ran, not that this resume couldn't be parsed. Confirmed live: the
// provisioned GEMINI_API_KEY is free-tier, capped at 20 requests/day for
// gemini-3.6-flash (see library-docs.md's Gemini section).
const EXTRACTION_QUOTA_ERROR =
  "Extraction is temporarily unavailable (usage limit reached). Please try again later, or fill in the form manually.";

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured profile data from a resume's raw text for a job search assistant.

Rules:
- Only use information stated in the resume text. Never invent or guess a value that isn't there — leave a string "" or an array [] instead.
- workExperience: list at most the 3 most recent roles, most recent first. If the resume lists more than 3, keep only the 3 most recent.
- startDate/endDate use the "YYYY-MM" format. If a role is the candidate's current job (e.g. "Present", "Current", no end date given), set currentlyWorkingHere to true and endDate to "".
- education.highestDegree must be exactly one of: high_school, associate, bachelor, master, doctorate, other. Map free text like "BS" or "Bachelor of Science" to the closest match; use "other" if nothing fits or no degree is stated. If multiple degrees are listed, keep only the highest or most recent.
- yearsExperience must be a bare integer as a string (e.g. "5"), never a range or a "+". Leave "" if not determinable.
- experienceLevel: infer from years of experience and seniority language in job titles only when the resume gives a clear signal (student, junior, mid, senior, lead). If the resume doesn't give enough signal to guess reasonably, return null — do not guess.
- Never include the candidate's email address or any job-seeking preferences (desired titles, salary, remote preference, locations) — this resume only describes what they have done, not what they want next.

Return ONLY valid JSON matching the provided schema.`;

const workExperienceEntrySchema = z.object({
  companyName: z.string(),
  jobTitle: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  currentlyWorkingHere: z.boolean(),
  keyResponsibilities: z.string(),
});

const educationInfoSchema = z.object({
  highestDegree: z.string(),
  fieldOfStudy: z.string(),
  institutionName: z.string(),
  graduationYear: z.string(),
});

const MAX_ACADEMIC_EXPERIENCE_ENTRIES = 5;

// Requested directly (not a numbered feature) — student-only academic
// experience (awards, exchange programs, undergraduate research / IC "com
// ou sem bolsa"). Not counted toward profile completion (see
// lib/profile-completion.ts) and not part of AI extraction (Feature 07) —
// manual entry only, both deliberate calls the engineer made, not
// inferred. See types/index.ts's AcademicExperienceEntry.
const academicExperienceEntrySchema = z.object({
  type: z.enum(["award", "exchange_program", "undergraduate_research", "other"]),
  title: z.string(),
  institution: z.string(),
  year: z.string(),
  funded: z.boolean(),
  description: z.string(),
});

// email is accepted here only so parsing doesn't fail on the field the form
// sends — it's always overwritten from the session user below, never trusted
// from client input.
const profileFormSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedinUrl: z.string(),
  portfolioUrl: z.string(),
  workAuthorization: z.enum(["citizen", "permanent_resident", "visa_required"]),
  currentTitle: z.string(),
  experienceLevel: z.enum(["student", "junior", "mid", "senior", "lead"]),
  yearsExperience: z.string(),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  workExperience: z.array(workExperienceEntrySchema).max(3),
  education: educationInfoSchema,
  academicExperience: z.array(academicExperienceEntrySchema).max(MAX_ACADEMIC_EXPERIENCE_ENTRIES),
  jobTitlesSeeking: z.string(),
  remotePreference: z.enum(["remote", "onsite", "hybrid", "any"]),
  salaryExpectation: z.string(),
  preferredLocations: z.string(),
});

export type SaveProfileState = {
  success: boolean;
  error?: string;
};

// 4. Component (Server Action)
export async function saveProfileAction(
  _previousState: SaveProfileState,
  formData: FormData,
): Promise<SaveProfileState> {
  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    // proxy.ts already guards /profile — this is a paranoia return, not a
    // real second control-flow path (see architecture.md's Feature 06 decision).
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const rawProfile = formData.get("profile");
    if (typeof rawProfile !== "string") {
      return { success: false, error: "Missing profile data" };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawProfile);
    } catch {
      return { success: false, error: "Could not read profile data" };
    }

    const parseResult = profileFormSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      console.error("[actions/profile]", parseResult.error);
      return { success: false, error: "Some profile fields are invalid" };
    }
    const profile = parseResult.data;

    const { data: existingProfile, error: readError } = await insforge.database
      .from("profiles")
      .select("is_complete")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      console.error("[actions/profile]", readError);
      return { success: false, error: "Failed to load your existing profile" };
    }

    let uploadedResumePath: string | undefined;
    let uploadedResumeUrl: string | undefined;
    const resumeFile = formData.get("resume");
    if (resumeFile instanceof File && resumeFile.size > 0) {
      if (resumeFile.type !== "application/pdf") {
        return { success: false, error: "Resume must be a PDF file" };
      }
      if (resumeFile.size > MAX_RESUME_SIZE_BYTES) {
        return { success: false, error: "Resume is too large. Maximum size is 5MB." };
      }

      uploadedResumePath = `${user.id}/resume-${crypto.randomUUID()}.pdf`;
      const { data: uploadData, error: uploadError } = await insforge.storage
        .from("resumes")
        .upload(uploadedResumePath, resumeFile);

      if (uploadError || !uploadData) {
        console.error("[actions/profile]", uploadError);
        return { success: false, error: "Failed to upload resume" };
      }
      uploadedResumeUrl = uploadData.url;
    }

    const completion = calculateProfileCompletion(profile);
    const isComplete = completion.missingFields.length === 0;
    const wasComplete = existingProfile?.is_complete ?? false;

    const { error: upsertError } = await insforge.database.from("profiles").upsert(
      {
        id: user.id,
        full_name: profile.fullName,
        email: user.email,
        phone: profile.phone,
        location: profile.location,
        linkedin_url: profile.linkedinUrl,
        portfolio_url: profile.portfolioUrl,
        work_authorization: profile.workAuthorization,
        current_title: profile.currentTitle,
        experience_level: profile.experienceLevel,
        years_experience: parseYearsExperience(profile.yearsExperience),
        skills: profile.skills,
        industries: profile.industries,
        work_experience: toWorkExperienceRecords(profile.workExperience),
        education: toEducationRecord(profile.education),
        academic_experience: toAcademicExperienceRecords(profile.academicExperience),
        job_titles_seeking: splitCommaList(profile.jobTitlesSeeking),
        remote_preference: profile.remotePreference,
        salary_expectation: profile.salaryExpectation.trim() || null,
        preferred_locations: splitCommaList(profile.preferredLocations),
        is_complete: isComplete,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (upsertError) {
     console.error("[actions/profile]", upsertError);
     if (uploadedResumePath) {
       const { error: removeError } = await insforge.storage
         .from("resumes")
         .remove(uploadedResumePath);
       if (removeError) {
         console.error("[actions/profile]", removeError);
       }
     }
     return { success: false, error: "Failed to save profile" };
    }

    if (uploadedResumePath && uploadedResumeUrl) {
     const { error: resumeUrlError } = await insforge.database.from("profiles").upsert(
       {
         id: user.id,
         resume_pdf_url: uploadedResumeUrl,
         // uploadedResumePath is the exact key already used for the upload
         // above — saved directly, not re-derived from the URL later. See
         // architecture.md's Feature 08 decision, Decision 12's second
         // correction (this was the same gap that made viewing a
         // Feature 08-generated resume 404 before it was added there).
         resume_storage_key: uploadedResumePath,
         updated_at: new Date().toISOString(),
       },
       { onConflict: "id" },
     );

     if (resumeUrlError) {
       console.error("[actions/profile]", resumeUrlError);
       const { error: removeError } = await insforge.storage
         .from("resumes")
         .remove(uploadedResumePath);
       if (removeError) {
         console.error("[actions/profile]", removeError);
       }
       return { success: false, error: "Failed to save profile" };
     }
    }

    if (isComplete && !wasComplete) {
      const posthog = createPostHogServer();
      posthog.capture({
        distinctId: user.id,
        event: "profile_completed",
        properties: { userId: user.id },
      });
      await posthog.shutdown();
    }

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: "Failed to save profile" };
  }
}

export type ExtractProfileState = {
  success: boolean;
  data?: ExtractableProfileFields;
  error?: string;
};

// Always extracts from the freshly selected File already sitting on the
// hidden name="resume" input — never from a previously saved
// resume_pdf_url (see architecture.md's Feature 07 decision, Decision 5). No
// DB write, no revalidatePath: this only feeds ProfileForm's local state,
// Save Profile is a separate, later action.
export async function extractProfileFromResumeAction(
  _previousState: ExtractProfileState,
  formData: FormData,
): Promise<ExtractProfileState> {
  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();

    // proxy.ts already guards /profile — this is a paranoia return, not a
    // real second control-flow path (same as saveProfileAction above).
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const resumeFile = formData.get("resume");
    if (!(resumeFile instanceof File) || resumeFile.size === 0) {
      return { success: false, error: "Please select a resume file first" };
    }
    if (resumeFile.type !== "application/pdf") {
      return { success: false, error: "Resume must be a PDF file" };
    }
    if (resumeFile.size > MAX_RESUME_SIZE_BYTES) {
      return { success: false, error: "Resume is too large. Maximum size is 5MB." };
    }

    let extractedText: string;
    try {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      extractedText = parsed.text;
    } catch (error) {
      // A corrupted or password-protected PDF throws here — same bucket as
      // the too-short case below, not a separate error path.
      console.error("[actions/profile]", error);
      return { success: false, error: UNREADABLE_PDF_ERROR };
    }

    if (extractedText.trim().length < 50) {
      return { success: false, error: UNREADABLE_PDF_ERROR };
    }

    const truncatedText = extractedText.slice(0, MAX_EXTRACTION_TEXT_CHARS);

    let rawResponseText: string;
    let finishReason: string | undefined;
    try {
      const response = await gemini.models.generateContent({
        // gemini-2.5-flash (architecture.md's original Feature 07 decision)
        // returned 404 "no longer available to new users" when this was
        // built and smoke-tested live against the real API — Google's own
        // error pointed at gemini-3.6-flash as the replacement, confirmed
        // working end to end. gemini-3.6-flash is a thinking model (its
        // thinking tokens count against maxOutputTokens, unlike the
        // non-thinking budget gemini-2.5-flash was assumed to have) — a
        // live run's usageMetadata showed ~1300 thinking tokens alone for a
        // short sample resume, and a real multi-page resume ran noticeably
        // higher still (truncated a 3000 budget live). maxOutputTokens is
        // 8000, not the originally-decided 800, to leave real headroom.
        // Passing thinkingConfig: { thinkingBudget: 0 } to disable thinking
        // was tried and rejected by the API (400 INVALID_ARGUMENT) — this
        // model does not support turning it off. See library-docs.md's
        // Gemini section.
        model: "gemini-3.6-flash",
        contents: `${EXTRACTION_SYSTEM_PROMPT}\n\nRESUME TEXT:\n"""\n${truncatedText}\n"""`,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: z.toJSONSchema(extractedProfileSchema),
          temperature: 0.3,
          maxOutputTokens: 8000,
        },
      });
      finishReason = response.candidates?.[0]?.finishReason;
      if (!response.text) {
        throw new Error(`Gemini returned an empty response (finishReason: ${finishReason})`);
      }
      rawResponseText = response.text;
    } catch (error) {
      console.error("[actions/profile]", error);
      if (isQuotaExceededError(error)) {
        return { success: false, error: EXTRACTION_QUOTA_ERROR };
      }
      return { success: false, error: EXTRACTION_FAILED_ERROR };
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(rawResponseText);
    } catch (error) {
      // A response cut off by the token budget (finishReason "MAX_TOKENS")
      // reads to JSON.parse as ordinary malformed JSON — logged separately
      // so a truncation problem doesn't look identical to every other
      // parse failure when debugging.
      if (finishReason === "MAX_TOKENS") {
        console.error("[actions/profile] Gemini response truncated by maxOutputTokens", error);
      } else {
        console.error("[actions/profile]", error);
      }
      return { success: false, error: EXTRACTION_FAILED_ERROR };
    }

    const parseResult = extractedProfileSchema.safeParse(rawJson);
    if (!parseResult.success) {
      console.error("[actions/profile]", parseResult.error);
      return { success: false, error: EXTRACTION_FAILED_ERROR };
    }

    const extracted = parseResult.data;
    const data: ExtractableProfileFields = {
      ...extracted,
      skills: normalizeStringList(extracted.skills),
      industries: normalizeStringList(extracted.industries),
      workExperience: normalizeWorkExperience(extracted.workExperience),
    };

    return { success: true, data };
  } catch (error) {
    console.error("[actions/profile]", error);
    return { success: false, error: EXTRACTION_FAILED_ERROR };
  }
}
