"use server";

// 1. External imports
import { revalidatePath } from "next/cache";
import { z } from "zod";

// 2. Internal imports
import { createInsforgeServer } from "@/lib/insforge-server";
import { createPostHogServer } from "@/lib/posthog-server";
import { calculateProfileCompletion } from "@/lib/profile-completion";
import {
  parseYearsExperience,
  splitCommaList,
  toEducationRecord,
  toWorkExperienceRecords,
} from "@/lib/profile-transform";

// 3. Type definitions
const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024;

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
  experienceLevel: z.enum(["junior", "mid", "senior", "lead"]),
  yearsExperience: z.string(),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  workExperience: z.array(workExperienceEntrySchema).max(3),
  education: educationInfoSchema,
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
