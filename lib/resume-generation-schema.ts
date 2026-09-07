// Shared zod schema for Resume PDF Generation (Feature 08) — drives both
// Gemini's responseJsonSchema (via z.toJSONSchema(), same pattern as
// lib/profile-extraction-schema.ts) and validates its prose-only response
// (professional summary + per-role bullets). See architecture.md's Feature
// 08 decision, Decision 3 — provider corrected to Gemini project-wide,
// Decision 1.

// 1. External imports
import { z } from "zod";

// 2. Internal imports
// (none)

// 3. Type definitions

// Gemini is asked for exactly two things: a professional summary paragraph,
// and polished bullets per work-experience entry. Everything else on the
// resume (name, contact, skills, dates, education) comes straight from the
// profile row — no AI involvement, so it can never be hallucinated or changed.
export const resumeContentSchema = z.object({
  professionalSummary: z.string().min(1),
  workExperience: z.array(z.object({ bullets: z.array(z.string().min(1)).min(1).max(4) })),
});

export type ResumeContent = z.infer<typeof resumeContentSchema>;

// 4. Component (n/a — pure schema module)

// zod can't express "this array's length must equal another value's length
// at runtime" — workExperience.length must match the profile's own
// work_experience.length exactly (same order, one bullets entry per role).
// Call this right after resumeContentSchema.safeParse succeeds and treat a
// mismatch identically to a schema failure (Decision 3).
export function workExperienceCountMatches(
  content: ResumeContent,
  expectedRoleCount: number,
): boolean {
  return content.workExperience.length === expectedRoleCount;
}
