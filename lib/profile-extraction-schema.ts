// Shared zod schema for AI Profile Extraction (Feature 07) — the one
// definition that drives both what Gemini is asked to return
// (extractProfileFromResumeAction derives Gemini's responseJsonSchema from
// this via z.toJSONSchema()) and what the response is validated against.
// Two hand-maintained copies of this shape drifted apart in an earlier
// draft — see architecture.md's Feature 07 decision, Decision 8.

// 1. External imports
import { z } from "zod";

// 2. Internal imports
// (none)

// 3. Type definitions
const MONTH_DATE_PATTERN = /^\d{4}-\d{2}$/;

const workExperienceEntrySchema = z.object({
  companyName: z.string(),
  jobTitle: z.string(),
  // WorkExperienceRoleCard's type="month" inputs render blank on anything
  // else — .catch("") makes a malformed date fall back to empty instead of
  // failing the whole extraction (confirmed live: Gemini sometimes writes
  // "Present" into endDate even when currentlyWorkingHere is already true;
  // see normalizeWorkExperience below for that cross-field cleanup, which
  // .catch() alone can't express).
  startDate: z.string().regex(MONTH_DATE_PATTERN).catch(""),
  endDate: z.string().regex(MONTH_DATE_PATTERN).catch(""),
  currentlyWorkingHere: z.boolean(),
  keyResponsibilities: z.string(),
});

const educationInfoSchema = z.object({
  // Matches ProfileForm.tsx's HIGHEST_DEGREE_OPTIONS exactly — the model
  // maps free text to the closest one, "other" when nothing fits or nothing
  // is stated.
  highestDegree: z.enum(["high_school", "associate", "bachelor", "master", "doctorate", "other"]),
  fieldOfStudy: z.string(),
  institutionName: z.string(),
  graduationYear: z.string(),
});

// Every field is non-optional, defaulting to ""/[] — the prompt still asks
// Gemini to never fabricate a value it doesn't have, but this is what
// actually guarantees ProfileForm can safely spread the result.
export const extractedProfileSchema = z.object({
  fullName: z.string(),
  phone: z.string(),
  location: z.string(),
  linkedinUrl: z.string(),
  portfolioUrl: z.string(),
  currentTitle: z.string(),
  // A bare non-negative integer string or "" — never free text like "5+" or
  // "5-7 years" (the field feeds a type="number" input, which silently
  // blanks on anything else). .catch("") for the same malformed-falls-back
  // -to-empty reason as the date fields above.
  yearsExperience: z.string().regex(/^\d+$/).catch(""),
  skills: z.array(z.string()),
  industries: z.array(z.string()),
  // .max(3) is enforced on the schema itself, not just a prompt
  // instruction — otherwise a model that ignores the instruction pushes an
  // uncapped array into ProfileForm's state, and the only place it would
  // ever surface is later, opaquely, as saveProfileAction's own .max(3)
  // rejecting the whole save.
  workExperience: z.array(workExperienceEntrySchema).max(3),
  education: educationInfoSchema,
  // null means "the resume gave no reliable signal, leave the form's
  // current value alone" — excluded from the "always a concrete value" rule
  // above because forcing a guess onto an ambiguous resume is worse than
  // leaving the form's existing value alone.
  experienceLevel: z.enum(["student", "junior", "mid", "senior", "lead"]).nullable(),
});

export type ExtractedProfile = z.infer<typeof extractedProfileSchema>;
type ExtractedWorkExperience = ExtractedProfile["workExperience"][number];

// 4. Component (n/a — pure schema module)

// "Present"/"Current"/no end date on the most recent role means
// currentlyWorkingHere: true, endDate: "" — but the schema's per-field
// .catch("") can't see across fields, and Gemini has been observed (live,
// verified) to still write "Present" into endDate even once
// currentlyWorkingHere is correctly true. Enforced here instead of trusting
// the prompt alone.
export function normalizeWorkExperience(
  entries: ExtractedWorkExperience[],
): ExtractedWorkExperience[] {
  return entries.map((entry) =>
    entry.currentlyWorkingHere ? { ...entry, endDate: "" } : entry,
  );
}

// Trims, case-normalizes, and de-duplicates a skills/industries list —
// Gemini isn't asked to stay consistent on its own (e.g. "JavaScript" vs
// "javascript" across two resume sections).
export function normalizeStringList(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}
