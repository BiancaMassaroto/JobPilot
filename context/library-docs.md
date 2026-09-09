# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to JobPilot.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. Some tools have MCP servers that give the AI agent direct access to documentation, logs, and debugging tools. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## InsForge

**Check first:** Check AGENTS.md for an installed InsForge skill. If an InsForge MCP server is configured — use it. The skill/MCP will have the latest API patterns.

**Correction (Feature 02):** the package is `@insforge/sdk` (verified on npm) — `@insforge/ssr` does not exist as a standalone package. Its SSR helpers live at the `@insforge/sdk/ssr` and `@insforge/sdk/ssr/middleware` subpaths, confirmed against the SDK's own bundled `SDK-REFERENCE.md`.

### Client vs Server

Two separate instances — never mix them:

```typescript
// lib/insforge-client.ts — browser context only
import { createBrowserClient } from "@insforge/sdk/ssr";

export const insforge = createBrowserClient();
// Env resolved automatically: NEXT_PUBLIC_INSFORGE_URL, NEXT_PUBLIC_INSFORGE_ANON_KEY
```

```typescript
// lib/insforge-server.ts — server context only
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({ cookies: await cookies() });
};
```

**Rules:**

- Browser client — Client Components, browser-side auth state, realtime subscriptions. Its `auth` surface is read-only (`getCurrentUser`, `getProfile`) — no `signIn*`/`signOut`, because the refresh token cookie is httpOnly and server-owned.
- Server client — Server Components, API routes, Server Actions, agent functions
- Never use browser client in server context
- Never use server client in browser context

---

### Auth

```typescript
// Get current user in server context
const insforge = await createInsforgeServer();
const {
  data: { user },
} = await insforge.auth.getCurrentUser();
if (!user) redirect("/login");
```

### OAuth sign-in (SSR mode — server-owned refresh cookie)

The SSR browser client does not auto-exchange OAuth callbacks (that's a plain
`createClient()` behavior only). Initiate and exchange on the server via
`createAuthActions()`:

```typescript
// actions/auth.ts
"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function signInWithOAuthAction(provider: "google" | "github") {
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });
  const origin = `http://${(await headers()).get("host")}`;

  const { data, error } = await auth.signInWithOAuth(provider, {
    redirectTo: `${origin}/callback`,
    skipBrowserRedirect: true, // required in SSR mode — we redirect manually below
  });

  if (error || !data.url) redirect("/login?error=oauth_failed");
  if (data.codeVerifier) {
    cookieStore.set("insforge_oauth_verifier", data.codeVerifier, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }
  redirect(data.url);
}
```

```typescript
// app/(auth)/callback/route.ts — a Route Handler, never a page.tsx (pages can't set cookies)
import { NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const codeVerifier = request.cookies.get("insforge_oauth_verifier")?.value;
  const response = NextResponse.redirect(new URL("/dashboard", request.nextUrl.origin));

  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const { error } = await auth.exchangeOAuthCode(code!, codeVerifier);
  response.cookies.delete("insforge_oauth_verifier");

  return error
    ? NextResponse.redirect(new URL("/login?error=oauth_failed", request.nextUrl.origin))
    : response;
}
```

**Rules:**

- `signInWithOAuth` needs `skipBrowserRedirect: true` in SSR mode — we redirect manually after storing `codeVerifier`
- `codeVerifier` always goes in an httpOnly cookie, never returned to the client
- The callback route reads `insforge_code` from the query string, exchanges it via `exchangeOAuthCode(code, codeVerifier)`, then deletes the verifier cookie
- Browser client's default refresh endpoint is `/api/auth/refresh` — implement it with `createRefreshAuthRouter()` from `@insforge/sdk/ssr`
- Session refresh in `proxy.ts` uses the lighter `@insforge/sdk/ssr/middleware` subpath (`updateSession()`) — never import the full SDK there

---

### DB Queries

**Correction (Feature 06):** the client's query builder is namespaced under
`.database`, not exposed at the top level. Verified directly against
`node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts`: `InsForgeClient` only
declares `readonly database: Database`, `readonly storage: Storage`, etc. —
there is no `.from()` on the client itself. `Database.from()` is what
forwards to the real Postgrest query builder, so every call below is
`insforge.database.from(...)`, never `insforge.from(...)`.

```typescript
// Read
const { data, error } = await insforge.database
  .from("jobs")
  .select("*")
  .eq("user_id", user.id)
  .order("found_at", { ascending: false });

// Insert
const { data, error } = await insforge.database
  .from("jobs")
  .insert({ user_id: user.id, title, company, match_score })
  .select()
  .single();

// Update
const { error } = await insforge.database
  .from("jobs")
  .update({ company_research: dossier })
  .eq("id", jobId)
  .eq("user_id", user.id); // always scope to user

// Upsert (e.g. a 1:1 row keyed by the authenticated user's id)
const { error } = await insforge.database
  .from("profiles")
  .upsert({ id: user.id, ...fields }, { onConflict: "id" });
```

**Rules:**

- Always scope queries to `user_id` — never query without user filter
- Always handle the `error` return — never assume success
- Use `.single()` when expecting exactly one row

---

### Storage

**Correction (Feature 06):** the installed SDK's `upload()` takes no options
object at all — no `contentType`, no `upsert` flag. Verified directly against
`node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts`:
`upload(path: string, file: File | Blob): Promise<StorageResponse<StorageFileSchema>>`.
`file` must be a `File`/`Blob`, never a raw `Buffer`. Same-path upload always
overwrites in place (standard PUT semantics, per the SDK's own doc comment) —
there's no separate upsert flag to pass, uploading to an existing key already
behaves that way. `StorageFileSchema` already includes a resolved `url`, so
there is no separate `getPublicUrl()` call needed after upload.

```typescript
// Upload file — file must be a File or Blob (e.g. a Server Action's
// formData.get("resume"), or new Blob([buffer]) if you start from a Buffer)
const { data, error } = await insforge.storage
  .from("resumes")
  .upload(`${userId}/resume.pdf`, file);

const url = data?.url;
```

**Storage paths:**

- Resume objects: `resumes/{user_id}/resume-{uuid}.pdf`

**Rules:**

- Uploading to the same path always overwrites the existing file — no separate upsert flag needed or available
- Always save `data.url` back to the DB after upload — it's already resolved, no extra `getPublicUrl()` call
- Never write files to disk — always upload a `File`/`Blob` directly to storage

---

## Adzuna API

**Check first:** Check AGENTS.md for an installed Adzuna skill. If none exists — use this file and the official Adzuna API docs.

### Job Search

```typescript
// lib/adzuna.ts
export async function searchJobs(
  jobTitle: string,
  location: string,
  country: string = "us",
): Promise<AdzunaJob[]> {
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    what: jobTitle,
    category: "it-jobs", // always filter to IT jobs
    results_per_page: "10",
    "content-type": "application/json",
  });

  // Only add where if location is provided
  if (location) {
    params.set("where", location);
  }

  const response = await fetch(
    `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`,
  );

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}
```

### Response Shape

Each Adzuna job result contains:

```typescript
type AdzunaJob = {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string; // snippet only — not full description
  redirect_url: string; // Adzuna tracking URL → redirects to actual job
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted: "0" | "1"; // "1" means salary is estimated
  contract_type?: "permanent" | "contract"; // permanent vs. fixed-term/contract — NOT full-time/part-time, see the Feature 10 correction below
  contract_time?: "full_time" | "part_time"; // the field that actually carries full/part time
  created: string; // ISO date string
  category: { tag: string; label: string };
};
```

**Corrected (Feature 10 cross check, 2026-09-08) — `job_type` was mapped from the wrong field.** The original snippet below mapped `jobs.job_type` (CHECKed to `'fulltime' | 'parttime' | 'contract'`, see `architecture.md`'s Feature 04 migration) from `contract_type`, whose real values are `"permanent"`/`"contract"` — not `"fulltime"`/`"parttime"`. Adzuna's separate `contract_time` field is the one that actually returns `"full_time"`/`"part_time"`. Left uncorrected, any ordinary permanent listing (the common case) would write `job_type: "permanent"` and fail the CHECK constraint outright, silently dropping the job. Fixed in the mapping below: `contract_time` decides full-time vs part-time (defaulting to full-time when absent, since Adzuna doesn't always set it), and `contract_type === "contract"` overrides to `"contract"` when present (a fixed-term/contract listing, regardless of what `contract_time` says).

### Saving Jobs to DB

```typescript
// Map Adzuna result to jobs table
function mapAdzunaJobType(job: AdzunaJob): "fulltime" | "parttime" | "contract" {
  if (job.contract_type === "contract") return "contract";
  if (job.contract_time === "part_time") return "parttime";
  return "fulltime";
}

const jobRecord = {
  user_id: userId,
  run_id: runId,
  source: "search", // always 'search' for Adzuna jobs
  source_url: job.redirect_url,
  external_apply_url: job.redirect_url,
  title: job.title,
  company: job.company.display_name,
  location: job.location.display_name,
  salary: job.salary_min
    ? `$${Math.round(job.salary_min / 1000)}k - $${Math.round(job.salary_max! / 1000)}k`
    : null,
  job_type: mapAdzunaJobType(job),
  about_role: job.description, // Adzuna returns snippet — used as description
  match_score: scoredJob.matchScore,
  match_reason: scoredJob.matchReason,
  matched_skills: scoredJob.matchedSkills,
  missing_skills: scoredJob.missingSkills,
  found_at: new Date().toISOString(),
};
```

**Rules:**

- Always include `category=it-jobs` — never search Adzuna without this filter
- Never pass `where` if location is empty — omit the parameter entirely
- `source` is always `'search'` for Adzuna jobs — never any other value
- `salary_is_predicted: "1"` means Adzuna estimated the salary — this is normal
- `job_type` is derived via `mapAdzunaJobType()` (`contract_time` for full/part time, `contract_type === "contract"` overrides to contract) — never map it from `contract_type` alone, its `"permanent"` value isn't a valid `job_type` and fails the DB's CHECK constraint
- Adzuna description is a snippet — Gemini scores from it as of Feature 10 (`architecture.md`'s Adzuna Job Discovery decision), not a full description
- Default country to `'us'` — support `gb`, `au`, `ca` as alternatives

---

## Browserbase

**Check first:** Check AGENTS.md for an installed Browserbase skill. If a Browserbase MCP server is configured — use it. The skill/MCP will have the latest session management and API patterns.

### Session Creation — Company Research

```typescript
import Browserbase from "@browserbasehq/sdk";

const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

// Single session for company research — sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

**Important — Browserbase runs independently from your Next.js server:**
Browserbase sessions run on Browserbase's cloud infrastructure, not inside your Next.js API route. The API route triggers the Browserbase session and returns a response while the session continues running independently on Browserbase's platform. Do not add `maxDuration` or any timeout configuration to Next.js API routes to accommodate Browserbase session length.

**Rules:**

- Always use single sessions — never parallel sessions (free plan limit)
- Session timeout is 120 seconds — sufficient for 3-4 page visits
- Always end sessions cleanly — call stagehand.close() when done
- Project ID always from `process.env.BROWSERBASE_PROJECT_ID` — never hardcode
- Browserbase client lives in `lib/browserbase.ts` — always import from there

---

## Stagehand

**Check first:** Check AGENTS.md for an installed Stagehand skill. If a Stagehand MCP server is configured — use it. The skill/MCP will have the latest act() and extract() patterns.

### Initialisation

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  model: { modelName: "openai/gpt-4o", apiKey: process.env.OPENAI_API_KEY! },
  disablePino: true,
});

await stagehand.init();
const page = stagehand.context.activePage()!;
```

### extract()

```typescript
import { z } from "zod";

const result = await stagehand.extract({
  instruction:
    "Extract the company overview, main product description, and any technology mentions from this page.",
  schema: z.object({
    companyOverview: z.string().optional(),
    mainProduct: z.string().optional(),
    techMentions: z.array(z.string()).optional(),
    navLinks: z
      .array(
        z.object({
          label: z.string(),
          url: z.string(),
        }),
      )
      .optional(),
  }),
});
```

### act()

```typescript
// Always wrap in try/catch
try {
  await stagehand.act({
    action: "Click the About link in the navigation",
  });
} catch (error) {
  await logAgentError(userId, jobId, null, "Company research failed", error);
}
```

## Company Research Section

Replace the existing Stagehand "Company Research Pattern" section in library-docs.md with this:

---

### Company Research Pattern

Three-step process: homepage extraction → sub-page extraction → GPT-4o synthesis.
Job description and user profile come from DB — never re-fetch what you already have.
Browser's only job is the company website.

```typescript
// Step 1 — Homepage extraction
const homepageData = await stagehand.extract({
  instruction:
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  schema: z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
    signals: z
      .array(z.string())
      .describe("Funding, notable customers, scale, mission, recent news"),
    pageLinks: z
      .array(
        z.object({
          url: z.string(),
          kind: z.enum([
            "about",
            "careers",
            "blog",
            "engineering",
            "product",
            "team",
            "other",
          ]),
        }),
      )
      .describe("Internal links worth visiting"),
  }),
});

// If oneLiner and productSummary are empty — wrong site or parked domain
// Skip to synthesis with job description and profile only
if (!homepageData.oneLiner && !homepageData.productSummary) {
  await stagehand.close();
  // proceed to synthesis with empty companyResearch
}

// Step 2 — Sub-page extraction (max 3, prefer about/blog/engineering/product over careers)
const subPageData = await stagehand.extract({
  instruction:
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  schema: z.object({
    keyPoints: z.array(z.string()),
    technologies: z
      .array(z.string())
      .describe("Specific languages, frameworks, tools, platforms"),
    valuesOrCulture: z
      .array(z.string())
      .describe("Stated values, working style, team norms"),
    notable: z
      .array(z.string())
      .describe("Customers, funding, scale, projects, awards"),
  }),
});

// Step 3 — GPT-4o synthesis (after browser closes)
// Feed three data sources: company research + job from DB + profile from DB
const systemPrompt = `You are a sharp career strategist preparing a candidate to apply for a specific role. You are given (a) research collected from the company's own website, (b) the job posting, and (c) the candidate's profile. Produce a concise, concrete briefing that gives this specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent funding, customers, headcount, or facts. If research was thin, infer carefully from the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON matching this shape:
{
  "companyOverview": string,
  "techStack": string[],
  "culture": string[],
  "whyThisRole": string,
  "yourEdge": string[],
  "gapsToAddress": string[],
  "smartQuestions": string[],
  "interviewPrep": string[],
  "sources": string[]
}`;

const userPrompt = `COMPANY RESEARCH (from their website):
${JSON.stringify(companyResearch)}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description}
Matched skills (already computed): ${job.matched_skills.join(", ")}
Missing skills (already computed): ${job.missing_skills.join(", ")}

CANDIDATE PROFILE:
Current title: ${profile.current_title}
Experience: ${profile.years_experience} years, level ${profile.experience_level}
Skills: ${profile.skills.join(", ")}
Work history: ${JSON.stringify(profile.work_experience)}`;

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  temperature: 0.4,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
});
```

**Dossier fields:**

| Field           | Type     | Purpose                                             |
| --------------- | -------- | --------------------------------------------------- |
| companyOverview | string   | What the company does                               |
| techStack       | string[] | Technologies they use                               |
| culture         | string[] | Values and working style                            |
| whyThisRole     | string   | Why this role exists                                |
| yourEdge        | string[] | Specific links between THIS candidate and this role |
| gapsToAddress   | string[] | Missing skills reframed as strategy                 |
| smartQuestions  | string[] | Questions that show real research                   |
| interviewPrep   | string[] | Topics to prepare for this role                     |
| sources         | string[] | Pages the company info came from                    |

**Rules:**

- Always use `extract()` with a Zod schema — never parse raw HTML or use regex
- Always wrap every `act()` and `extract()` in try/catch
- Always call `await stagehand.close()` when done — ends the Browserbase session
- Model is always `gpt-4o` — never use other models
- Temperature is `0.4` for synthesis — grounded but flexible enough to make real connections
- Max 3 sub-pages — never exceed this on free plan
- Always close session in finally block — never leave sessions open even if research fails
- Job description and profile always come from DB — never re-fetch via browser
- If browser research returns empty — still run synthesis with job + profile only
- yourEdge, gapsToAddress, and smartQuestions are the most valuable fields — never skip them

## Gemini

**Check first:** Check AGENTS.md for an installed Gemini skill. No Gemini SDK skill is installed as of this writing — use this file and the official Gemini API docs.

**Scope note (Feature 08 decision, `architecture.md`, correcting Feature 07's original note; updated at Feature 10):** Gemini is this project's provider for every AI feature, not just extraction. Feature 07 (extraction), Feature 08 (resume generation), and now Feature 10 (job match scoring — one batched call per search, see architecture.md's Adzuna Job Discovery decision) all use it. Features 13/17 still document GPT-4o below, pending their own `/architect` pass — the project-wide switch should carry into each when it's actually built, per architecture.md's Feature 08 decision, item 1.

### Client Setup (Server-Only)

```typescript
// lib/gemini.ts
import { ApiError, GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  /* retries a 503 up to twice with a short delay — see below */
}
```

**This is a plain Google AI Studio key setup, not Vertex AI** — `GEMINI_API_PROJECT_NAME`/`GEMINI_PROJECT_ID` (also in `.env.local`) go unused here; don't wire them into this client.

**Wrap every `generateContent()` call in `withGeminiRetry()` — confirmed live 2026-09-09, not just theoretical.** A real `/api/agent/find` run failed outright with a `503 UNAVAILABLE`: `"This model is currently experiencing high demand... Please try again later."` — Gemini's own message calls this transient. `withGeminiRetry()` retries a `503` up to twice with a short delay (`500ms`, `1500ms`) before letting the caller's catch block treat it as a real failure. **Never retry a `429`** (the quota error below) — retrying just wastes another request against the same exhausted daily cap; `isRetryableGeminiError()` inside `withGeminiRetry()` only matches `503`. Currently wired into Feature 10's batched scoring call (`agent/matcher.ts`) — wrap any future `generateContent()` call (Features 13/17) the same way rather than leaving it to fail outright on a transient blip.

### Structured JSON Response

**Verified live against the real API during the Feature 07 build** — the config shape below, the model string, and every rule under it are confirmed working end to end (not just type-checked), not the originally-assumed snippet. See the corrections below the code block.

```typescript
const response = await gemini.models.generateContent({
  model: "gemini-3.6-flash",
  contents: "Your prompt here",
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(yourZodSchema), // not responseSchema — see below
    temperature: 0.3,
    maxOutputTokens: 8000, // see the thinking-tokens note below before lowering this
  },
});

if (!response.text) throw new Error("Empty response from Gemini");
const result = JSON.parse(response.text);
```

**Corrections found during the Feature 07 build (all confirmed live, not just against the SDK's types):**

- **`gemini-2.5-flash` is gone.** A live call returned `404 "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash..."`. Feature 07 now uses `gemini-3.6-flash`. If you're reading this for a new feature, don't assume `gemini-3.6-flash` is still current either — Google retires Gemini models on this kind of short notice; check `ai.google.dev`'s current model list, or make one real call and read the error if it's wrong.
- **Use `responseJsonSchema`, not `responseSchema`, when the schema comes from `z.toJSONSchema()`.** `responseSchema` is typed `SchemaUnion` — a narrower, OpenAPI-style shape — and a plain JSON Schema object doesn't cleanly typecheck against it. `responseJsonSchema` is typed `unknown` and is the SDK's own documented field for a real JSON Schema (confirmed in `node_modules/@google/genai`'s own type definitions and doc comments: "Since v1.9.0, we switch to use backend JSON schema support... we move the data that was treated as JSON schema from the responseSchema field to the responseJsonSchema field").
- **`gemini-3.6-flash` is a thinking model — its thinking tokens count against `maxOutputTokens`.** A live run's `response.usageMetadata` showed `thoughtsTokenCount: 1292` for a short sample resume, on top of the actual JSON output — `maxOutputTokens: 800` (the original assumption, carried over from how GPT-4o was budgeted) silently truncated the JSON mid-string. `maxOutputTokens: 3000` cleared a short sample resume in isolated testing, but a real, multi-page (and non-English) resume still truncated at `3000` when this went through the actual running app — raised to `8000`. Check `response.candidates?.[0]?.finishReason === "MAX_TOKENS"` when a response fails to `JSON.parse` — that's how a truncated response actually presents (as ordinary malformed JSON), not as a distinct error.
- **Thinking cannot be disabled on this model.** Passing `config: { thinkingConfig: { thinkingBudget: 0 } }` (the documented way to turn off thinking on some Gemini models) returned a live `400 INVALID_ARGUMENT` on `gemini-3.6-flash`. Don't add it back without confirming a specific model actually supports budget `0`.
- **The provisioned `GEMINI_API_KEY` is on the free tier, with a hard quota of 20 requests/day per model** (`generativelanguage.googleapis.com/generate_content_free_tier_requests`, confirmed via a live `429 RESOURCE_EXHAUSTED` during testing). Fine for building and light manual testing; upgrade the key's billing plan before this feature sees real usage, or every user past the 20th request that day gets `EXTRACTION_FAILED_ERROR` with no indication it was a quota problem, not a real failure.

**`responseJsonSchema` should be derived from a real zod schema, not hand-written separately.** Zod v4 (already installed) ships `z.toJSONSchema()` for exactly this — define the shape once as a zod schema, derive `responseJsonSchema` from it, and reuse the same schema to validate the parsed response. Two hand-maintained copies of the same shape drift apart silently (this bit Feature 07's own extraction schema in an earlier draft — see `architecture.md`'s Feature 07 decision, Decision 8).

**A field-level `.regex()` alone rejects the whole response over one malformed value — prefer `.catch("")` for a field that has a defined empty state.** E.g. `z.string().regex(/^\d{4}-\d{2}$/).catch("")` for a date field: a value that doesn't match falls back to `""` instead of failing `safeParse` entirely. `z.toJSONSchema()` handles `.catch()` fine (it does **not** handle `.transform()` — that throws `"Transforms cannot be represented in JSON Schema"` at schema-generation time, confirmed live; do any cross-field normalization as a plain function on the already-validated result instead, not as a schema transform).

**Rules:**

- Always use `responseJsonSchema` (derived from zod) for structured data — stronger than a bare "return JSON" instruction, the schema is enforced
- Always check `response.text` is truthy before parsing — it's typed `string | undefined`
- Always validate parsed JSON before using — wrap in try/catch
- Temperature `0.3` for extraction (deterministic), `0.7` for resume generation (natural variation) — same convention the OpenAI table below originally documented, now applied to Gemini project-wide (Feature 08 decision, item 1)
- Budget `maxOutputTokens` generously on a thinking model — thinking tokens are invisible in `response.text` but still consume the budget; check `response.usageMetadata.thoughtsTokenCount` if output is coming back truncated. `8000` has been the working budget for both extraction (Feature 07) and resume generation (Feature 08) so far — don't drop back to a smaller GPT-4o-style budget without re-verifying live, the way `800` silently truncated Feature 07's first attempt
- Wrap every `generateContent()` call in `withGeminiRetry()` — transient `503` ("high demand") failures receive two retries, after `500 ms` and `1500 ms`; `429` quota failures are not retried

---

## OpenAI GPT-4o

**Not currently used anywhere in this project (Feature 08 decision, `architecture.md`, item 1) — kept below for Features 13/17 to reconsider when each is built,** since the project switched to Gemini for every AI feature during Feature 08's build, and Feature 10 confirmed the same switch for job match scoring at its own `/architect` pass (2026-09-08). `openai` is not an approved dependency (see `code-standards.md`); if a future feature reconsiders GPT-4o specifically, that reasoning belongs in that feature's own `/architect` decision, not assumed from this section.

**Check first:** Check AGENTS.md for an installed OpenAI skill. The skill will have the latest API patterns and model capabilities.

### Structured JSON Response

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  temperature: 0.3,
  messages: [
    {
      role: "system",
      content: "You are a job matching assistant. Return only valid JSON.",
    },
    {
      role: "user",
      content: `Your prompt here`,
    },
  ],
});

const result = JSON.parse(response.choices[0].message.content!);
```

**Temperature settings:**

- `0.3` — matching, scoring, extraction, research synthesis — deterministic results
- `0.7` — resume generation — natural variation

**Max tokens:**

- Job matching + scoring: `300`
- Company research synthesis: `800`
- Resume generation: `1000`
- Profile extraction from resume: `800`

**Rules:**

- Model string is always `'gpt-4o'` — never use other model names
- Always use `response_format: { type: 'json_object' }` for structured data
- Always parse `response.choices[0].message.content` as string — even with json_object it returns a string
- Always validate parsed JSON before using — wrap in try/catch
- Match threshold is always `MATCH_THRESHOLD` from `lib/utils.ts` — never hardcode 70
- Company research synthesis must always return a complete dossier — never return empty even if browser research failed

---

## PostHog

**Check first:** Check AGENTS.md for an installed PostHog skill. If a PostHog MCP server is configured — use it. The skill/MCP will have the latest client and server patterns.

**Correction (Feature 03):** the original spec below called for a manual `posthog.init()` inside `lib/posthog-client.ts`, wired up from the root layout, with the token read from `NEXT_PUBLIC_POSTHOG_KEY`. Verified against the installed `integration-nextjs-app-router` skill's bundled PostHog docs (`.claude/skills/integration-nextjs-app-router/references/next-js.md`) — the current recommended Next.js integration uses the `instrumentation-client.ts` file convention instead (Next.js 15.3+, confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md`), which Next.js auto-loads before hydration with no import needed anywhere. That file already exists at the project root and reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`. `lib/posthog-client.ts` still exists, but only for the identity helpers below — not init.

### Client Setup (Browser)

```typescript
// instrumentation-client.ts — project root, Next.js auto-loads this, no import needed
import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (projectToken && host) {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}

// Capture event client-side — anywhere, no init call needed first
import posthog from "posthog-js";
posthog.capture("job_found", {
  userId,
  source: "search",
  matchScore: score,
});
```

```typescript
// lib/posthog-client.ts — identity lifecycle helpers around the same singleton
import posthog from "posthog-js";

export const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function identifyUser(user: { id: string; email: string }): void {
  posthog.identify(user.id, { email: user.email });
}

export function resetIdentity(): void {
  posthog.reset();
}

// posthog-js's capture() is fire-and-forget with no way to await the
// network send. Use this instead of a bare capture() right before a hard
// navigation (an OAuth redirect, an external link) that could otherwise
// abort the request mid-flight — see LoginCard.tsx's OAuth buttons.
export function captureBeforeNavigate(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  posthog.capture(event, properties);
  return new Promise((resolve) => setTimeout(resolve, 250));
}
```

**Client-side capture checklist:**

- Gate every client-side `posthog.capture()` call behind `isPostHogConfigured` — import it from `lib/posthog-client.ts` rather than recomputing the env var check locally (it drifted out of sync across components once already).
- Before a hard navigation the current page won't survive (an OAuth redirect, following an external link), use `captureBeforeNavigate()` instead of a bare `posthog.capture()` — otherwise the request can be aborted by the navigation before it leaves the browser.

**Identify on load:** `components/auth/PostHogIdentify.tsx`, mounted once in the root layout, calls `insforge.auth.getCurrentUser()` on mount and `identifyUser()` if a session exists. This project's OAuth flow is entirely server-side (Server Action → provider → Route Handler callback → redirect), so there is no single client-side "login succeeded" moment to hook `identify()` into — resolving the session on every page load and identifying then is the documented fallback for apps that learn the current user asynchronously (see the installed skill's `identify-users.md` reference, "call identify as soon as you're able").

**Reset on logout:** `resetIdentity()` is exported and ready, but there is no sign-out control in the UI yet (`signOutAction` in `actions/auth.ts` has no caller). Wire a call to `resetIdentity()` into whatever client component submits that Server Action once one exists.

### Server Setup

```typescript
// lib/posthog-server.ts
import { PostHog } from "posthog-node";

export function createPostHogServer(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately
    flushInterval: 0, // no batching — Next.js functions are short-lived
  });
}

// Always use and shutdown in the same function
const posthog = createPostHogServer();
posthog.capture({
  distinctId: userId,
  event: "company_researched",
  properties: { userId, jobId, company },
});
await posthog.shutdown(); // required — ensures event is sent
```

**Rules:**

- Always call `await posthog.shutdown()` in server-side functions — events are lost without it
- `flushAt: 1` and `flushInterval: 0` always set on server client
- Event names must match exactly the list in `code-standards.md`
- Always include `userId` as a property on every server-side event
- Call `identifyUser()` (from `lib/posthog-client.ts`) once a session is known on the client side — never call `posthog.identify()` directly outside that helper
- Call `resetIdentity()` on logout on the client side, once a sign-out control exists

---

## @react-pdf/renderer

**Check first:** Check AGENTS.md for an installed react-pdf skill. PDF generation APIs can differ from general training knowledge.

### Resume PDF Generation

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica' },
  section: { marginBottom: 10 },
  heading: { fontSize: 14, fontWeight: 'bold' },
  text: { fontSize: 10 },
})

const ResumePDF = ({ profile }: { profile: Profile }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.heading}>{profile.fullName}</Text>
        <Text style={styles.text}>{profile.email}</Text>
      </View>
    </Page>
  </Document>
)

// Generate buffer
const buffer = await renderToBuffer(<ResumePDF profile={profile} />)

// Upload to InsForge Storage — upload() takes a File/Blob, not a raw Buffer
// (see the Storage section's Feature 06 correction), so wrap it first
await insforge.storage
  .from('resumes')
  .upload(`${userId}/resume.pdf`, new Blob([buffer], { type: 'application/pdf' }))
```

**Supported CSS properties:**
Only use these — others are silently ignored:
`padding, margin, fontSize, color, fontFamily, flexDirection, alignItems, justifyContent, borderRadius, width, height, fontWeight, textAlign, lineHeight`

**Rules:**

- Server-side only — never import in client components
- Always use `renderToBuffer` — not `renderToStream` or `PDFDownloadLink`
- PDF generation only in `app/api/resume/` routes
- Generated buffer wrapped in a `Blob` and uploaded directly to InsForge Storage — never written to disk
- Save **both** the resolved storage URL (`data.url`) and the bare object key (`data.key`) to DB after upload — the InsForge docs' own general Storage guidance already says this, and Feature 08 found out why the hard way: reverse-engineering the key back out of the URL later (rather than saving `data.key` directly) hit a real, live `STORAGE_NOT_FOUND` from InsForge. Save the key under its own column (e.g. `resume_storage_key`), not derived later.
- **Never hand the stored URL to a client directly.** Confirmed live during Feature 08's build: opening it in a browser 401s (`AUTH_INVALID_CREDENTIALS`, "No token provided") — the `resumes` bucket needs a real Authorization bearer token, which only the SDK's own authenticated HTTP client attaches (via `insforge.storage.from(...).download()`), never a plain browser navigation. Serve it through a same-origin route that calls `.download()` with the server client and the saved key instead (see `app/api/resume/download/route.ts` and architecture.md's "InsForge Storage" section) — this doubles as the per-object ownership check that section used to flag as unsolved, since the route only ever looks up the caller's own row.

---

## pdf-parse

**Check first:** Check AGENTS.md for an installed pdf-parse skill.

**Corrected against the installed package (Feature 07 build)**: the snippet below (a default-exported `pdf(buffer)` function) is the **pdf-parse v1** API. The installed version is **pdf-parse v2.4.5**, which replaced that with a `PDFParse` class — `new PDFParse({ data: buffer })`, then `await parser.getText()` returns `{ text, ... }`, then `await parser.destroy()`. Confirmed against the installed package's own bundled README and `.d.cts` types (`node_modules/pdf-parse`), and by smoke-testing the import directly — no debug-path throw on import in this environment.

### Next.js / Turbopack Setup (required — confirmed live, not optional)

`PDFParse` (built on pdfjs-dist) defaults to spinning up a real worker the way it would in a browser. Under Next.js (Turbopack) this fails two different ways, both confirmed live during the Feature 07 build against the real running dev server and a real production build — not just a docs mismatch:

1. **Dev server:** `Setting up fake worker failed: Cannot find module '.../.next/dev/server/chunks/ssr/pdf.worker.mjs'` — pdfjs-dist can't resolve its own worker script inside Turbopack's dev bundle output.
2. **Production build:** even after fixing #1, importing `pdf-parse/worker` pulls in `@napi-rs/canvas`'s native `.node` binding, which Turbopack's build fails on: `Error: non-ecmascript placeable asset — asset is not placeable in ESM chunks`.

**Fix, both parts required:**

```typescript
// Once, before any `new PDFParse(...)` call — module scope is fine.
import { PDFParse } from "pdf-parse";
import { getData as getPdfWorkerData } from "pdf-parse/worker";

PDFParse.setWorker(getPdfWorkerData());
```

Use `getData()` (a self-contained base64 data URL for the worker script), **not** `getPath()` — `getPath()` returns a filesystem path relative to the bundled runtime file, which hits the exact same bundler-relocation problem `getData()` exists to avoid.

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};
```

Without this, `pdf-parse` works in `npx tsc`/plain Node scripts but breaks specifically under Next.js — don't trust a standalone script's success alone before shipping a Next.js feature that uses it.

### Extract Text from Uploaded Resume

```typescript
import { PDFParse } from "pdf-parse";

// In a Server Action or Route Handler handling resume upload
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();
const extractedText = result.text; // raw text content
```

**Rules:**

- Server-side only — never import in client components
- Do the worker setup above once, before this runs — otherwise this throws under Next.js even though it works in a plain Node script
- `result.text` is raw unformatted text — the AI provider handles structure extraction
- Always handle parse errors — some PDFs are image-based, password-protected, or corrupted, and either throw or return empty text; wrap the whole call in try/catch
- If `result.text` is empty or under ~50 characters — return error to user: "Could not extract text from this PDF. Please try a different file."
- `PDFParse`'s `data` option accepts a Node `Buffer` directly (it's a `Uint8Array` subclass) — no extra conversion needed beyond `Buffer.from(arrayBuffer)`
