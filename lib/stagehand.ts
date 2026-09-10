// Stagehand session factory — one new session per research run
// (architecture.md's Feature 13 decision, Decision 3). Corrected TWICE
// during /develop, 2026-09-10, against the actually-installed package
// (@browserbasehq/stagehand v4.1.0), each correction confirmed with a real
// live call, not just typechecked:
//
// 1. The decision's original sketch (and library-docs.md) assumed a v3-style
//    flat constructor (env/projectId/browserbaseSessionID, new Stagehand() +
//    a separate .init() call). The real v4 shape is `Stagehand.create()`,
//    with no separate .init().
// 2. The decision's two-step design — a separate `@browserbasehq/sdk`
//    client creating the Browserbase session, Stagehand attaching via
//    `browserbase.connect({ apiKey, sessionId })` — fails live with
//    "Stagehand extension is not installed in the connected browser": a
//    session created by the plain Browserbase SDK has no Stagehand
//    extension in it, and this version needs one. `browserbase.launch()`
//    creates the session AND uploads/installs the required extension
//    automatically (confirmed live: a real launch, a real Gemini-backed
//    extract() call against a real page, a clean close). This is simpler
//    than the original two-step design, not a workaround — no
//    `@browserbasehq/sdk` dependency needed at all, so it was uninstalled.
//
// One accepted behavior change from the original decision: `launch()`
// exposes no `projectId`/session-timeout override in this version (its
// schema's only real fields are `apiKey`/`baseUrl` — confirmed against the
// installed package's own runtime schema) — the session's project is
// inferred from the API key (Browserbase's own documented default for a
// single-project setup, which this app has) and its timeout comes from the
// Browserbase project's own default, not an explicit 120s. The Next.js
// route's own `maxDuration` (see app/api/agent/research/route.ts) is the
// real ceiling on how long this feature waits either way.

// 1. External imports
import { browserbase, Stagehand } from "@browserbasehq/stagehand";

// 2. Internal imports
// (none)

// 3. Type definitions
// (none)

// 4. Component (n/a — session factory module)
export async function createResearchSession(): Promise<{ stagehand: Stagehand; sessionId?: string }> {
  const browser = await browserbase.launch({
    apiKey: process.env.BROWSERBASE_API_KEY!,
  });

  const stagehand = await Stagehand.create({
    browser,
    // Gemini, not OpenAI — architecture.md's Feature 13 decision, Decisions
    // 1-2. "google/gemini-3.6-flash", not Stagehand's own doc example
    // ("google/gemini-2.5-flash") — this project already found that exact
    // model dead in production (see lib/gemini.ts's header comment).
    // Confirmed live during this build: a real extract() call against a
    // real page, driven by this exact model config, returned valid
    // structured JSON. apiKey passed explicitly, not via Stagehand's
    // GOOGLE_GENERATIVE_AI_API_KEY auto-load env var — reuses this
    // project's existing GEMINI_API_KEY.
    model: { modelName: "google/gemini-3.6-flash", apiKey: process.env.GEMINI_API_KEY! },
    logging: { level: "off" },
  });

  return { stagehand, sessionId: browser.sessionId };
}
