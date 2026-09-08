// Shared zod schema for Feature 10 (Adzuna Job Discovery) — drives both
// Gemini's responseJsonSchema (via z.toJSONSchema(), same pattern as
// lib/resume-generation-schema.ts) and validates the batched scoring
// response. See architecture.md's Adzuna Job Discovery decision, Decision 2.

// 1. External imports
import { z } from "zod";

// 2. Internal imports
// (none)

// 3. Type definitions

// One batched call scores every job from a search at once — up to 10
// results per Adzuna page, correlated back to the job that was sent by
// `index`, not by any Gemini-controlled ordering (Decision 2).
export const jobMatchSchema = z.object({
  results: z.array(
    z.object({
      index: z.number().int().min(0),
      matchScore: z.number().int().min(0).max(100),
      matchReason: z.string().min(1),
      matchedSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
    }),
  ),
});

export type JobMatchResult = z.infer<typeof jobMatchSchema>["results"][number];

// 4. Component (n/a — pure schema module)
