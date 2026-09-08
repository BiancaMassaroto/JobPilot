// Feature 10 — Gemini job match scoring, one batched call per search, never
// one call per job (the shared free-tier Gemini quota is 20 requests/day —
// see architecture.md's Adzuna Job Discovery decision, Decision 2).

// 1. External imports
import { z } from "zod";

// 2. Internal imports
import type { AdzunaJob } from "@/lib/adzuna";
import { logAgentError } from "@/lib/agent-logs";
import { gemini } from "@/lib/gemini";
import { jobMatchSchema, type JobMatchResult } from "@/lib/job-matching-schema";
import type { ProfileRow } from "@/lib/profile-transform";

// 3. Type definitions

// Adzuna's own snippet is already short — this is a defensive ceiling only,
// matching Feature 07 decision 8's "cap the request side too" precedent.
const DESCRIPTION_CAP = 1000;

export type ScoreJobsResult =
  | { success: true; resultsByIndex: Map<number, JobMatchResult> }
  | { success: false; error: string };

// The split "don't invent" constraint (Decision 2's cross-check correction):
// matchedSkills only names skills literally present in the profile;
// missingSkills is allowed — expected — to name real job-required skills the
// profile doesn't have, since naming an absent skill is that field's whole
// purpose.
const MATCHING_SYSTEM_PROMPT =
  "You are a job matching assistant. Score each listed job against the candidate's profile: 0 to 100, one paragraph reason, matchedSkills (skills from the candidate's profile that this job genuinely needs — only skills literally present in the profile), missingSkills (real skills the job description asks for that are not in the candidate's profile — do not invent a skill the job description itself never mentions). Return one result per job, in the same order, using each job's given index.";

// 4. Component (n/a — agent module)

export async function scoreJobs(
  jobs: AdzunaJob[],
  profile: ProfileRow,
  userId: string,
  runId: string,
): Promise<ScoreJobsResult> {
  try {
    const candidateJobs = jobs.map((job, index) => ({
      index,
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      description: job.description.slice(0, DESCRIPTION_CAP),
    }));

    const userPrompt = JSON.stringify({
      candidate: {
        skills: profile.skills ?? [],
        experienceLevel: profile.experience_level,
        yearsExperience: profile.years_experience,
        currentTitle: profile.current_title,
        workExperience: profile.work_experience ?? [],
      },
      jobs: candidateJobs,
    });

    const response = await gemini.models.generateContent({
      // Same model as Features 07/08 — gemini-2.5-flash was live-confirmed
      // dead (404) during Feature 07's build. See lib/gemini.ts.
      model: "gemini-3.6-flash",
      contents: `${MATCHING_SYSTEM_PROMPT}\n\n${userPrompt}`,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(jobMatchSchema),
        // Deterministic scoring, matching this project's existing
        // extraction convention (Decision 1).
        temperature: 0.3,
        // gemini-3.6-flash's thinking tokens count against this budget
        // regardless of visible output length — reusing Features 07/08's
        // own live-verified number rather than a smaller, untested one.
        maxOutputTokens: 8000,
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (!response.text) {
      throw new Error(`Gemini returned an empty response (finishReason: ${finishReason})`);
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(response.text);
    } catch (parseError) {
      if (finishReason === "MAX_TOKENS") {
        throw new Error(`Gemini response truncated by maxOutputTokens: ${String(parseError)}`);
      }
      throw parseError;
    }

    const parseResult = jobMatchSchema.safeParse(rawJson);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    // Keep only the first occurrence of each index — the schema constrains
    // index to a non-negative integer, not uniqueness (Decision 8's
    // cross-check finding). A later duplicate is treated the same as a
    // missing index: that job is skipped by the caller.
    const resultsByIndex = new Map<number, JobMatchResult>();
    for (const result of parseResult.data.results) {
      if (resultsByIndex.has(result.index)) {
        console.warn("[api/agent/find] duplicate index in Gemini response", { index: result.index });
        continue;
      }
      resultsByIndex.set(result.index, result);
    }

    return { success: true, resultsByIndex };
  } catch (error) {
    await logAgentError(userId, runId, null, "Gemini job match scoring failed", error);
    return { success: false, error: String(error) };
  }
}
