# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Adzuna API               | Job search and discovery                         |
| AI model                       | OpenAI GPT-4o            | Matching, research synthesis, extraction         |
| Analytics                      | PostHog                  | Event tracking and dashboard charts              |
| PDF generation                 | @react-pdf/renderer      | Resume PDF rendering                             |
| Styling                        | Tailwind CSS + shadcn/ui | UI components and styling                        |
| Language                       | TypeScript strict        | Throughout                                       |

---

## Folder Structure

```
/
├── AGENTS.md
├── instrumentation-client.ts                → PostHog browser init (Next.js file convention — auto-loaded, no import needed)
├── context/
│   ├── project-overview.md
│   ├── architecture.md
│   ├── ui-tokens.md
│   ├── ui-rules.md
│   ├── ui-registry.md
│   ├── code-standards.md
│   ├── library-docs.md
│   ├── build-plan.md
│   └── progress-tracker.md
├── app/
│   ├── layout.tsx                          → Root layout, mounts PostHogIdentify
│   ├── page.tsx                            → Homepage
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                   → Login page
│   │   └── callback/
│   │       └── route.ts                   → OAuth callback handler (Route Handler — must set cookies)
│   ├── dashboard/
│   │   └── page.tsx                       → Main dashboard
│   ├── profile/
│   │   └── page.tsx                       → Profile form + resume management
│   ├── find-jobs/
│   │   ├── page.tsx                       → Find Jobs page — search controls + jobs list
│   │   └── [id]/
│   │       └── page.tsx                   → Individual job details page
│   └── api/
│       ├── agent/
│       │   ├── find/route.ts              → Trigger Adzuna job discovery
│       │   └── research/route.ts          → Trigger company research agent
│       ├── resume/
│       │   ├── generate/route.ts          → Generate base resume PDF from profile
│       │   └── extract/route.ts           → Extract profile data from uploaded resume PDF
├── agent/
│   ├── adzuna.ts                          → Adzuna API job discovery + GPT-4o scoring
│   ├── research.ts                        → Company research — Browserbase + Stagehand + GPT-4o
│   ├── matcher.ts                         → GPT-4o job matching logic
│   ├── extractor.ts                       → GPT-4o job description extraction + structuring
│   └── types.ts                           → Agent-specific TypeScript types
├── actions/
│   ├── profile.ts                         → Profile save + update
│   └── jobs.ts                            → Job status updates
├── components/
│   ├── ui/                                → shadcn/ui components only
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   ├── auth/
│   │   ├── LoginCard.tsx
│   │   ├── PostHogIdentify.tsx            → headless, mounted in root layout — resolves session on load and identifies to PostHog
│   │   └── SignOutButton.tsx              → wraps signOutAction with resetIdentity() — not yet used anywhere (no sign-out control exists), ready for whenever one is built
│   ├── homepage/
│   │   ├── Hero.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Features.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RecentActivity.tsx
│   │   └── AnalyticsCharts.tsx
│   ├── profile/
│   │   ├── ProfileForm.tsx
│   │   ├── ResumeUpload.tsx
│   │   ├── ResumePreview.tsx
│   │   └── CompletionIndicator.tsx
│   ├── find-jobs/
│   │   ├── SearchControls.tsx
│   │   ├── JobsTable.tsx
│   │   ├── JobFilters.tsx
│   │   └── JobsPagination.tsx
│   └── job-details/
│       ├── JobInfo.tsx
│       ├── MatchScore.tsx
│       ├── JobDescription.tsx
│       ├── CompanyResearch.tsx
│       └── JobActions.tsx
├── lib/
│   ├── insforge-client.ts                 → InsForge browser client instance
│   ├── insforge-server.ts                 → InsForge server client
│   ├── browserbase.ts                     → Browserbase session creation + management
│   ├── stagehand.ts                       → Stagehand initialisation with Browserbase session
│   ├── adzuna.ts                          → Adzuna API client
│   ├── posthog-client.ts                  → PostHog identity helpers (identifyUser, resetIdentity), isPostHogConfigured, captureBeforeNavigate — init lives in instrumentation-client.ts
│   ├── posthog-server.ts                  → PostHog server client
│   ├── auth-constants.ts                  → OAUTH_VERIFIER_COOKIE — shared by actions/auth.ts and the callback route (actions/auth.ts is "use server" and can't export a plain constant)
│   └── utils.ts                           → Shared utility functions
└── types/
    └── index.ts                           → Global TypeScript types
```

---

## System Boundaries

| Folder        | Owns                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `app/`        | Pages and API routes only. No business logic.                                                          |
| `agent/`      | All agent logic. Adzuna discovery, company research, matching, extraction. Nothing here touches React. |
| `actions/`    | Server Actions for UI-triggered mutations only. Profile save, profile update.                          |
| `components/` | UI only. No data fetching logic. No direct DB calls.                                                   |
| `lib/`        | Third party client initialisation and shared utilities only.                                           |
| `types/`      | TypeScript types shared across the project.                                                            |

---

## Data Flow

### UI Mutations (Server Actions)

```
User interaction in component
        ↓
Server Action in actions/
        ↓
InsForge DB write
        ↓
Revalidate or redirect
```

### Agent Operations (API Routes)

```
User clicks Find Jobs
        ↓
API route in app/api/agent/find
        ↓
Calls agent/adzuna.ts
        ↓
Adzuna API returns job listings
        ↓
GPT-4o scores each job against user profile
        ↓
Agent writes results to InsForge DB
        ↓
Page data revalidated
```

### Company Research (API Routes)

```
User clicks Research Company on job details page
        ↓
API route in app/api/agent/research
        ↓
Calls agent/research.ts
        ↓
Single Browserbase session opens with Stagehand
        ↓
Navigates to company homepage + sub pages
        ↓
GPT-4o synthesizes dossier from extracted content
        ↓
Dossier saved to jobs.company_research
        ↓
Page data revalidated
```

### Resume Operations (API Routes)

```
User uploads resume or clicks Generate
        ↓
API route in app/api/resume/
        ↓
GPT-4o processes content
        ↓
@react-pdf/renderer renders PDF buffer
        ↓
New PDF uploaded to InsForge Storage
        ↓
URL saved to profiles table
```

---

## InsForge Database Schema

### `profiles`

| Column              | Type        | Notes                                        |
| ------------------- | ----------- | -------------------------------------------- |
| id                  | uuid        | References auth.users                        |
| full_name           | text        |                                              |
| email               | text        | Pre-filled from auth                         |
| phone               | text        |                                              |
| location            | text        | City, country                                |
| current_title       | text        | Most recent job title                        |
| experience_level    | text        | junior / mid / senior / lead                 |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| cover_letter_tone   | text        | formal / casual / enthusiastic               |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_pdf_url      | text        | InsForge Storage URL of current resume       |
| is_complete         | boolean     | True when all required fields filled         |
| created_at          | timestamptz |                                              |
| updated_at          | timestamptz |                                              |

### `agent_runs`

| Column             | Type        | Notes                        |
| ------------------ | ----------- | ---------------------------- |
| id                 | uuid        |                              |
| user_id            | uuid        | References profiles          |
| status             | text        | running / completed / failed |
| job_title_searched | text        |                              |
| location_searched  | text        |                              |
| jobs_found         | integer     | Total jobs discovered        |
| started_at         | timestamptz |                              |
| completed_at       | timestamptz |                              |

### `jobs`

| Column             | Type        | Notes                                          |
| ------------------ | ----------- | ---------------------------------------------- |
| id                 | uuid        |                                                |
| run_id             | uuid        | Composite FK with user_id → agent_runs(id, user_id) — null if from URL input |
| user_id            | uuid        | References profiles                            |
| source             | text        | search / url                                   |
| source_url         | text        | Original job listing URL                       |
| external_apply_url | text        | Direct company apply URL                       |
| title              | text        |                                                |
| company            | text        |                                                |
| location           | text        |                                                |
| salary             | text        | If available                                   |
| job_type           | text        | fulltime / parttime / contract                 |
| about_role         | text        | 2-3 sentence summary                           |
| responsibilities   | text[]      | Bullet points                                  |
| requirements       | text[]      | Bullet points                                  |
| nice_to_have       | text[]      | Optional                                       |
| benefits           | text[]      | Optional                                       |
| about_company      | text        | Brief company description                      |
| match_score        | integer     | 0-100 scored against main profile              |
| match_reason       | text        | GPT-4o explanation                             |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| company_researched_at | timestamptz | Set when the dossier is saved — null until researched; the activity timestamp for company research (jobs has no other timestamp for it) |
| found_at           | timestamptz |                                                |

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs            |
| user_id    | uuid        | References profiles              |
| message    | text        | Human readable log entry         |
| level      | text        | info / success / warning / error |
| job_id     | uuid        | Optional — related job           |
| created_at | timestamptz |                                  |

### Constraints, Row Level Security & Migration (Feature 04 decision — `/architect`, 2026-09-06)

The tables above name columns and types; this section is what actually gets executed for Feature 04. Verified live against this project's InsForge backend (empty `public` schema, no tables yet) before deciding anything — none of this is generic Postgres knowledge, it's what this specific backend actually supports:

- **RLS is real Postgres RLS.** `auth.uid()` (`uuid`), `auth.role()` (`text`), and `auth.jwt()` (`jsonb`) all exist and work exactly like Supabase's — confirmed by querying `pg_proc` directly. **Decision: add RLS policies on all four tables**, as defense-in-depth on top of the app-level `.eq('user_id', ...)` filtering `library-docs.md` already mandates (a forgotten filter becomes a bug, not a cross-user leak). This was previously an unimplemented invariant ("Row level security policies on all four tables" in `build-plan.md`) with no concrete policy behind it.
- **`profiles.id` is a shared primary key with `auth.users.id`** (confirmed `auth.users.id` carries a real `PRIMARY KEY` constraint, so the cross-schema FK is valid) — not a separate FK column, so one profile per user is structural, not a uniqueness constraint to enforce separately.
- **`jobs.source = 'url'` stays reserved** even though `project-overview.md` puts manual URL import out of scope — decided to keep the schema future-proof (no migration needed if that feature ships later) rather than narrow it to match exactly what's built today.
- **`jobs.run_id` ownership is enforced at the DB level, not just existence.** A plain `run_id uuid REFERENCES agent_runs(id)` only proves the run exists — it does not stop a row where `jobs.user_id` differs from that run's `agent_runs.user_id` (RLS's `WITH CHECK (auth.uid() = user_id)` checks the job's own `user_id`, never who owns the run it points at). That gap lets one user's job attach to another user's run, and a future run deletion would then cascade-delete a job that isn't the run owner's. **Decision: a composite FK `(run_id, user_id) REFERENCES agent_runs(id, user_id)`**, which requires `agent_runs` to carry a `UNIQUE (id, user_id)` constraint as the FK target; Postgres skips the check when `run_id IS NULL` (source `url`), so it only bites when a run is actually referenced. Paired with a `CHECK` tying `source` to `run_id`'s presence (`search` requires one, `url` forbids one), so the two nullable-FK-plus-enum fields can't drift apart either.
- **Cascade behavior**: deleting a user cascades down through `agent_runs`, `jobs`, and `agent_logs`; deleting an `agent_run` also cascades to its `jobs` and `agent_logs` (nothing in scope deletes a run today — this only matters if a future admin/cleanup path does, but an orphaned row is worse than an assumption stated plainly here).
- **`jobs.company_researched_at` added — neither existing table had a usable timestamp for "when was this company researched."** `agent_runs` has `started_at`/`completed_at`, not `created_at`; `jobs.found_at` records when the job listing was found, not when its `company_research` dossier was saved, and `agent_logs` requires a `run_id` (company research runs standalone from a job details page, outside any `agent_run`, so it has none to attach a log to). **Decision: a nullable `company_researched_at timestamptz`**, set when the dossier is saved (`build-plan.md` Feature 13), null until then — the activity timestamp `build-plan.md`'s Recent Activity merge (Feature 16) needs.
- **Storage isolation gap — flagged, not silently assumed away.** `storage.objects` has `rlsEnabled: false` and zero policies; `create-bucket` only takes a coarse `isPublic` flag. There is **no per-object ownership check at the DB level** — a "private" bucket means "must be authenticated," not "only the owning user can read their own file." **Decision: private bucket + versioned, unguessable `{user_id}/resume-{uuid}.pdf` paths are the current protection** (obscurity, not enforcement). If resumes ever need real per-user isolation, that means routing downloads through a server action that checks `profiles.resume_pdf_url` ownership first — not something `create-bucket`'s `isPublic` flag can give us. Flagged as a Follow-up, not solved here.

**Migration SQL** (run via the `run-raw-sql` MCP tool when Feature 04 is built — `/architect` verifies and decides, it doesn't execute):

```sql
-- profiles — shared primary key with auth.users (1:1)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  location text,
  current_title text,
  experience_level text CHECK (experience_level IN ('junior','mid','senior','lead')),
  years_experience integer,
  skills text[] NOT NULL DEFAULT '{}',
  industries text[] NOT NULL DEFAULT '{}',
  work_experience jsonb NOT NULL DEFAULT '[]',
  education jsonb NOT NULL DEFAULT '[]',
  job_titles_seeking text[] NOT NULL DEFAULT '{}',
  remote_preference text CHECK (remote_preference IN ('remote','onsite','hybrid','any')),
  preferred_locations text[] NOT NULL DEFAULT '{}',
  salary_expectation text,
  cover_letter_tone text CHECK (cover_letter_tone IN ('formal','casual','enthusiastic')),
  linkedin_url text,
  portfolio_url text,
  work_authorization text CHECK (work_authorization IN ('citizen','permanent_resident','visa_required')),
  resume_pdf_url text,
  is_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- agent_runs
CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed')),
  job_title_searched text NOT NULL,
  location_searched text,
  jobs_found integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX agent_runs_user_id_idx ON public.agent_runs(user_id);
-- composite FK target for jobs.(run_id, user_id) below — enforces run ownership, not just run existence
ALTER TABLE public.agent_runs ADD CONSTRAINT agent_runs_id_user_id_key UNIQUE (id, user_id);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_runs_all_own" ON public.agent_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- jobs
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid, -- nullable: null when source = 'url'; ownership enforced by the composite FK below, not a plain REFERENCES
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('search','url')),
  source_url text,
  external_apply_url text,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  salary text,
  job_type text CHECK (job_type IN ('fulltime','parttime','contract')),
  about_role text,
  responsibilities text[] NOT NULL DEFAULT '{}',
  requirements text[] NOT NULL DEFAULT '{}',
  nice_to_have text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  about_company text,
  match_score integer CHECK (match_score BETWEEN 0 AND 100),
  match_reason text,
  matched_skills text[] NOT NULL DEFAULT '{}',
  missing_skills text[] NOT NULL DEFAULT '{}',
  company_research jsonb,
  company_researched_at timestamptz, -- set when the dossier is saved; null until researched
  found_at timestamptz NOT NULL DEFAULT now(),
  -- run_id must belong to this same user_id — a plain REFERENCES agent_runs(id) only proves the run
  -- exists, not that it's this user's; NULL run_id (source = 'url') skips the check (MATCH SIMPLE)
  CONSTRAINT jobs_run_owned_by_user FOREIGN KEY (run_id, user_id)
    REFERENCES public.agent_runs(id, user_id) ON DELETE CASCADE,
  -- source and run_id must agree: a search result always has its run, a manual URL import never does
  CONSTRAINT jobs_run_matches_source CHECK (
    (source = 'search' AND run_id IS NOT NULL) OR (source = 'url' AND run_id IS NULL)
  )
);
CREATE INDEX jobs_user_id_idx ON public.jobs(user_id);
CREATE INDEX jobs_run_id_idx ON public.jobs(run_id);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_all_own" ON public.jobs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- agent_logs
CREATE TABLE public.agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  level text NOT NULL CHECK (level IN ('info','success','warning','error')),
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agent_logs_run_id_idx ON public.agent_logs(run_id);
CREATE INDEX agent_logs_user_id_idx ON public.agent_logs(user_id);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_logs_all_own" ON public.agent_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Storage bucket** (via the `create-bucket` MCP tool, not raw SQL): `create-bucket({ bucketName: "resumes", isPublic: false })`.

**Risk carried into the build, flagged for `/develop` to verify rather than assume:** `profiles.id REFERENCES auth.users(id)` is a cross-schema FK into InsForge's internal `auth` schema. `auth.users.id` is confirmed a real `PRIMARY KEY`, so it's valid Postgres — but some managed platforms block user-created FKs into their internal schemas for migration-stability reasons, and that's not something read-only introspection can confirm. **Fallback if `run-raw-sql` rejects that FK**: drop the `REFERENCES auth.users(id)` clause, keep `profiles.id` as a plain `uuid PRIMARY KEY DEFAULT gen_random_uuid()` populated from `auth.uid()` at insert time, and rely on the RLS policies above (which don't need the FK to work) plus app-level enforcement that `id` is always set from the authenticated user's id on insert.

---

## InsForge Storage

| Bucket  | Path                         | Contents                  |
| ------- | ---------------------------- | ------------------------- |
| resumes | resumes/{user_id}/resume-{uuid}.pdf | Current active resume PDF |

**Access: authenticated users only — NOT per-object ownership enforced.** `storage.objects` has `rlsEnabled: false` (see the Storage isolation gap decision above); the bucket is private, so a request must be authenticated, but any authenticated user who obtains another user's exact versioned path/key can read that file — the unguessable path is the only current protection, obscurity rather than access control. Do not build or document a feature (e.g. exposing `resume_pdf_url` directly to the client, or any URL that reaches this bucket) as if "own files only" is enforced; it is not, until downloads are served through a server-side action that checks `profiles.resume_pdf_url` ownership before returning bytes. This is a known limitation, not a guarantee — treat it as a Follow-up, same as the decision above.

---

## Authentication

- Provider: InsForge Auth
- Methods: Google OAuth, GitHub OAuth
- Protected routes: /dashboard, /profile, /find-jobs, /find-jobs/[id]
- Public routes: /, /login
- `proxy.ts` (Next.js 16 renamed `middleware.ts` to `proxy.ts` — same mechanism) checks session on every protected route
- On login → redirect to /dashboard

---

## InsForge Client Pattern

**Correction (Feature 02):** the package is `@insforge/sdk` — there is no separate `@insforge/ssr` package on npm. SSR helpers ship as a subpath of the same package: `@insforge/sdk/ssr` (client/server factories, OAuth Server Actions) and `@insforge/sdk/ssr/middleware` (the lighter `updateSession()` import for `proxy.ts`, so the full SDK isn't bundled there).

Two separate InsForge instances — never mix them:

```typescript
// lib/insforge-client.ts
// Browser-side — used in client components for Storage, Realtime, and reading auth state
import { createBrowserClient } from "@insforge/sdk/ssr";
export const insforge = createBrowserClient();
// Reads NEXT_PUBLIC_INSFORGE_URL / NEXT_PUBLIC_INSFORGE_ANON_KEY by default.
// Its auth surface is read-only (getCurrentUser, getProfile) — no signIn/signOut;
// those are server-owned (see OAuth pattern below) since refresh tokens are httpOnly.

// lib/insforge-server.ts
// Server-side — used in Server Components, Route Handlers, Server Actions, agent code
import { createServerClient } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";

export const createInsforgeServer = async () => {
  return createServerClient({ cookies: await cookies() });
};
```

### OAuth sign-in pattern (server-owned refresh cookie)

The SSR browser client does **not** auto-exchange OAuth callbacks (that auto-detect
behavior is a plain `createClient()` thing). Initiate and exchange on the server:

```typescript
// actions/auth.ts — Server Action
"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

export async function signInWithOAuthAction(provider: "google" | "github") {
  const cookieStore = await cookies();
  const auth = createAuthActions({ cookies: cookieStore });
  const origin = `http://${(await headers()).get("host")}`; // https in prod

  const { data, error } = await auth.signInWithOAuth(provider, {
    redirectTo: `${origin}/callback`,
    skipBrowserRedirect: true,
  });

  if (error || !data.url) {
    redirect("/login?error=oauth_failed");
  }
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
// app/(auth)/callback/route.ts — Route Handler, not a page (must set cookies)
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

```typescript
// app/api/auth/refresh/route.ts — the browser client's default refresh endpoint
import { createRefreshAuthRouter } from "@insforge/sdk/ssr";
export const { POST } = createRefreshAuthRouter();
```

```typescript
// proxy.ts — project root (Next.js 16 name for middleware.ts)
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@insforge/sdk/ssr/middleware";

const PROTECTED_ROUTES = ["/dashboard", "/profile", "/find-jobs"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const { accessToken } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });
  const isProtected = PROTECTED_ROUTES.some((r) => request.nextUrl.pathname.startsWith(r));
  if (isProtected && !accessToken) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
  return response;
}
```

---

## Browserbase Session Pattern

```typescript
// Company research session — single session, sequential page visits
const session = await bb.sessions.create({
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  timeout: 120, // 2 minute session — visits 3-4 pages max
});
```

---

## Job Discovery Pattern

**Adzuna API — job search**

```typescript
const response = await fetch(
  `https://api.adzuna.com/v1/api/jobs/us/search/1?` +
    `app_id=${process.env.ADZUNA_APP_ID}&` +
    `app_key=${process.env.ADZUNA_APP_KEY}&` +
    `what=${encodeURIComponent(jobTitle)}&` +
    `where=${encodeURIComponent(location)}&` +
    `category=it-jobs&` +
    `results_per_page=10&` +
    `content-type=application/json`,
);
const data = await response.json();
// data.results — array of job listings
// Each job: title, company.display_name, location.display_name,
//           salary_min, salary_max, description, redirect_url, created
```

---

## Company Research Pattern

```typescript
// Single session — visits company homepage and sub pages sequentially
const stagehand = new Stagehand({
  env: "BROWSERBASE",
  apiKey: process.env.BROWSERBASE_API_KEY!,
  projectId: process.env.BROWSERBASE_PROJECT_ID!,
  browserbaseSessionID: session.id,
  modelName: "gpt-4o",
  modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
});

await stagehand.init();
const page = stagehand.page;

// Clean company name and construct homepage URL
const cleanName = companyName
  .replace(/\s*(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?).*$/i, "")
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "");

const homepageUrl = `https://www.${cleanName}.com`;

// Navigate and extract — graceful fallback if page not found
try {
  await page.goto(homepageUrl);
  await page.waitForLoadState("networkidle");
  const content = await stagehand.extract({ instruction: "..." });
} catch (error) {
  // Log and continue — GPT-4o will synthesize from what was found
  await logAgentError(jobId, error);
}

// Always close session when done
await stagehand.close();
```

---

## Invariants

Rules the AI agent must never violate:

- API routes contain no UI logic. Components contain no DB logic.
- Agent code in `/agent` never imports from `/components` or `/actions`.
- Server Actions never call agent functions. Agent functions are only called from API routes.
- All InsForge server-side writes use `createInsforgeServer()` — never the browser client.
- No hardcoded hex values or raw Tailwind color classes in components — use CSS variables from ui-tokens.md.
- Every Stagehand action is wrapped in try/catch. Failures are logged to agent_logs, never thrown to crash the run.
- Company research always returns a dossier — even if browser research fails, GPT-4o synthesizes from company name and job description alone. Never return empty.
- Browserbase sessions are always closed with stagehand.close() when done — never leave sessions open.
- Always scope InsForge queries to the current user_id — never query without a user filter.
- Adzuna API always includes category=it-jobs — never search without this filter.
- jobs.source is always 'search' or 'url' — never any other value.

---

## Profile Save Logic — Persistence & Completion Rules (Feature 06 decision — `/architect`, 2026-09-07)

`build-plan.md`'s Feature 06 entry says the Server Action should save all
profile fields, upload a resume PDF, and set `is_complete` / "completion
percentage and missing fields" — but names neither which fields are actually
required, how the percentage is computed, nor how a file gets from the
browser into a Server Action. This section closes those gaps. Verified
against the real, installed `@insforge/sdk` / `@supabase/postgrest-js` types
directly (not just `library-docs.md`'s prose, which turned out to be wrong on
the Storage API — see the correction below).

**1. Persistence.** One `insforge.database.from('profiles').upsert({ id: user.id, ...fields, updated_at }, { onConflict: 'id' })` handles both the first save and every later save, since `profiles.id` is always the authenticated user's id (Feature 04). Never include `created_at` in the payload — omitting it lets Postgres's `DEFAULT now()` apply only on the insert branch; including it would stomp the real creation date on every save. (Note: the query builder is namespaced under `.database` — `insforge.from(...)` does not exist on the client; see the `library-docs.md` correction below, found the same way as the Storage one.)

**2. Read / prefill path.** `app/profile/page.tsx` becomes an async Server Component: `auth.getCurrentUser()`, then `insforge.database.from('profiles').select('*').eq('id', user.id).maybeSingle()` — confirmed real on the installed query builder, returns `null` cleanly for a first-time user instead of erroring. Feature 05's hardcoded "Faizan Ali" mock is deleted; `ProfileForm` takes an `initialProfile` prop (real data, or defaults + the session email if no row exists yet). `CompletionIndicator`'s two hardcoded props become real computed values from the same fetch.

**3. jsonb key naming.** `work_experience` and `education` are stored with **snake_case** keys, matching every other column in this schema, even though the JS-side `ProfileFormData` type is camelCase. One shared transform (both directions) lives in `actions/profile.ts` so Feature 07 (AI extraction) can reuse the exact same shape instead of re-deriving it.

**4. `education` is a single JSON object, not an array** — matches the approved design (one education block, no "add" control), even though the live column defaults to `'[]'`. No migration: every write path always sets `education` explicitly, so the array default is never actually read or written by any code path.

**5. `job_titles_seeking` / `preferred_locations`** stay `text[]` columns (no schema change) with a comma split/join transform: split on `,`, trim, drop empties, on write; `.join(', ')` on read. Documented limitation, not a bug: a title containing a literal comma (e.g. "Engineer, Backend") splits into two entries — inherent to the free-text-comma pattern the approved Feature 05 design already uses.

**6. Completion rule** — the actual gap `build-plan.md` left open. Only plain text/array fields participate; every `<select>` (`work_authorization`, `experience_level`, `remote_preference`, `highest_degree`) is excluded because none of them can currently be blank (Feature 05 built no placeholder/unset option). Optional fields (`industries`, `salaryExpectation`, `preferredLocations`) and the resume upload are excluded. 11 required units, each worth 1/11 of the percentage:
   - Full Name, Phone, Location, LinkedIn URL, Portfolio/GitHub
   - Current/Recent Job Title, Years of Experience, Skills (non-empty array)
   - Work Experience: at least one entry with company name, job title, start date, key responsibilities all non-empty, **and** end date non-empty whenever "currently working here" is unchecked
   - Education: field of study, institution name, graduation year all non-empty (highest degree excluded, it's a select)
   - Job Titles Seeking

   `is_complete` means **all 11**, not a partial threshold — `missingFields.length === 0`. The approved design's own mock (70%, exactly `PHONE`/`LOCATION`/`EDUCATION` flagged) is illustrative, not a target to reverse engineer exactly; this rule produces ~73% on that same mock data, close enough to confirm the rule's shape without curve fitting to a placeholder number.

   **Follow-up, not a Feature 06 blocker:** because no select can ever be blank, a user who never touches them (e.g. `work_authorization` silently defaulting to `citizen`) looks more "complete" than reality. Worth a placeholder/unset option in a later pass on Feature 05's selects.

**7. No new DB columns** for completion percentage or missing fields. `project-overview.md`'s dashboard only ever needs the `is_complete` boolean for its "incomplete profile" banner — nothing queries on percentage. Both values are a pure function of already-persisted fields, computed on demand by `lib/profile-completion.ts` (new, stands alone — no need for `lib/utils.ts` yet), reused by both the page (display) and the Server Action (`is_complete`). To detect "first transition to complete" for the `profile_completed` PostHog event, the action reads the prior row's `is_complete` in the same `.maybeSingle()` read, before the upsert — `upsert()` only returns post-write state.

**8. File upload wiring.** `ResumeUpload.tsx` keeps the selected file in the descendant native `<input name="resume">`; drag-and-drop synchronizes the dropped file onto that input with `DataTransfer`, so no `onFileSelect` prop or lifted `File` state is needed. `ProfileForm.tsx` wraps the upload and profile fields in `<form action={formAction}>` using React 19's `useActionState(saveProfileAction, ...)`, and the shared native `FormData` carries `profile` (the whole `ProfileFormData` JSON-stringified) plus `resume` (the real input's `File`, if any). The Save button is `type="submit"`, disabled while pending, and surfaces an inline error.

   The Server Action (`actions/profile.ts`, new) parses `profile` with zod, re-validates the file's type and size server-side (the `ResumeUpload` client check alone isn't trustworthy — a direct POST bypasses the component), uploads a valid file to a versioned temporary path, upserts the profile fields, and only then persists the resolved `data.url` in a follow-up profile upsert. If either database write fails, it removes the newly uploaded object. The upload uses **no third options argument**; the response's `data.url` is resolved directly, with no separate `getPublicUrl()` call.

**9. `cover_letter_tone` stays permanently unwritten.** It's a real column (Feature 04) for a feature explicitly out of scope (`project-overview.md`: "Cover letter generation" is out of scope) — Feature 05 correctly never built UI for it, and Feature 06 must not "notice the gap" and add it back. Never referenced in `ProfileFormData`, never included in the upsert payload.

**10. Auth defense-in-depth.** The Server Action re-checks `auth.getCurrentUser()` itself even though `proxy.ts` already guards `/profile` (matches the Feature 04 RLS "defense in depth" philosophy) — but unlike `signInWithOAuthAction`/`signOutAction` (the sanctioned `Promise<never>` redirect-only exception), this is a normal `{ success, error? }` action: on a missing user it returns `{ success: false, error: "Not authenticated" }`, it never calls `redirect()`. This branch should be unreachable in practice; it's a paranoia return, not a real second control-flow path.

### SDK API corrections

Two `library-docs.md` sections documented signatures that don't match the
installed SDK — both caught by the real build/typecheck loop while building
Feature 06 (not caught at `/architect` time for the second one), corrected
there; recorded here for traceability.

**Storage.** `library-docs.md`'s Storage section (and its `@react-pdf/renderer` example) documented an options argument that doesn't exist:
```ts
// WRONG — was documented, does not match the installed SDK
.upload(`${userId}/resume.pdf`, fileBuffer, { contentType: "application/pdf", upsert: true })
```
Real signature (`node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts:509`):
```ts
upload(path: string, file: File | Blob): Promise<StorageResponse<StorageFileSchema>>;
// StorageFileSchema already includes a resolved `url` — no separate getPublicUrl() call needed.
// No options object at all: same-path upload always overwrites in place (PUT semantics).
```

**Database.** `library-docs.md`'s DB Queries section (and this file's own draft of decisions 1–2 above, until this correction) called the query builder straight off the client — that method doesn't exist there:
```ts
// WRONG — was documented, does not match the installed SDK
await insforge.from("jobs").select("*")...
```
Real shape (`node_modules/@insforge/sdk/dist/client-DZHoCptg.d.ts:1038`): `InsForgeClient` only declares `readonly database: Database` (plus `storage`, `auth`, etc.) — no top-level `.from()`. The query builder is `insforge.database.from(table)`. This affects every InsForge DB call in every feature, not just Feature 06 — Features 09 through 17 (Adzuna jobs, company research, dashboard stats) all read/write through this same pattern and should use `insforge.database.from(...)`.

### Build plan for `/develop`

1. `types/index.ts` — no structural change to `ProfileFormData`. Add `ProfileCompletion`: `{ percentage: number; missingFields: string[] }`.
2. `lib/profile-completion.ts` (new) — `calculateProfileCompletion(profile: ProfileFormData): ProfileCompletion`, pure, no InsForge imports, encodes the 11-unit rule from Decision 6.
3. `actions/profile.ts` (new) — `"use server"`; zod validation of the parsed `profile` JSON; `getCurrentUser()` guard (`{success:false,error}`, no redirect); one `.maybeSingle()` read for the prior `is_complete`; optional server-side file re-validation + `.storage.upload()`; camelCase → snake_case transform for the two jsonb fields; comma split for the two `text[]` fields; always set `email` from the session user, never client input; `calculateProfileCompletion` → `is_complete`; upsert; fire `profile_completed` only on the false/absent → true transition; `revalidatePath('/profile')`; return `{success, error?}`.
4. `app/profile/page.tsx` — becomes `async`; fetch user + profile row; build `initialProfile`; compute completion for `CompletionIndicator`; pass `initialProfile` down to `ProfileForm`.
5. `components/profile/ProfileForm.tsx` — accept `initialProfile` prop (delete `INITIAL_PROFILE`); use `useActionState(saveProfileAction, ...)`; `<form action={formAction}>`; Save button → `type="submit"`, pending/disabled, inline error. The descendant resume input submits natively with the same form.
6. `components/profile/ResumeUpload.tsx` — synchronize dropped files onto the native input with `DataTransfer`; do not add a callback prop or lift duplicate `File` state.
7. `library-docs.md` — the Storage signature corrections (see "Storage API correction" above) — already applied as part of this decision.
