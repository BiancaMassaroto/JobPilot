// Server-only Gemini client — a plain Google AI Studio key (GEMINI_API_KEY),
// not Vertex AI. Used by every AI feature in this project (extraction,
// resume generation, job matching) since the Feature 08 decision's
// project-wide provider switch — no client/server split like InsForge,
// Gemini has no browser-side usage here.
import { ApiError, GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Gemini's own 503 response body calls this explicitly transient ("Spikes
// in demand are usually temporary. Please try again later.") — confirmed
// live 2026-09-09 via a real /api/agent/find run that failed outright and
// logged this to agent_logs. Retrying it costs nothing against the shared
// free-tier quota (only a 429 counts against that day's cap). Deliberately
// NOT retried: a 429 quota error (retrying would just waste another request
// against the same exhausted cap — see isQuotaExceededError() in
// actions/profile.ts, which the extraction flow already treats this way),
// and anything that isn't a Gemini ApiError at all (a schema-parse failure,
// a truncated response) — those are real failures, not upstream noise.
function isRetryableGeminiError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

const RETRY_DELAYS_MS = [500, 1500];

// Wrap a single generateContent() call (or any Gemini SDK call) to retry a
// transient 503 up to twice with a short delay, before letting the caller's
// own catch block treat it as a real failure. Any other error (including a
// 429) throws immediately on the first attempt — unchanged behavior.
export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableGeminiError(error) || attempt === RETRY_DELAYS_MS.length) {
        throw error;
      }
      console.warn(`[lib/gemini] 503 from Gemini, retrying (attempt ${attempt + 1})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }
  // Unreachable — the loop always returns or throws — but keeps TypeScript's
  // control-flow analysis happy about a guaranteed return type.
  throw new Error("withGeminiRetry: unreachable");
}
