# Architecture

## Stack

| Layer                          | Tool                     | Purpose                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------ |
| Framework                      | Next.js 16 (App Router)  | Full stack framework                             |
| Auth + DB + Storage + Realtime | InsForge                 | Entire backend                                   |
| Cloud browser                  | Browserbase              | Company research — browsing company public pages |
| AI browser control             | Stagehand                | Company page interaction and content extraction  |
| Job Discovery                  | Adzuna API               | Job search and discovery                         |
| AI model                       | Gemini (`@google/genai`) | Extraction, resume generation, job match scoring, company research synthesis + Stagehand's own driving model — every AI feature project-wide as of the Feature 08 decision below, now including Features 10 and 13 (see their decisions below); Feature 17 still says GPT-4o elsewhere in these docs until it is rebuilt to match |
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
│   ├── adzuna.ts                          → Adzuna API job discovery (Feature 10) — calls lib/adzuna.ts, dedupes, saves to DB
│   ├── matcher.ts                         → Gemini job match scoring (Feature 10 — corrected from GPT-4o, see its decision below), one batched call per search
│   ├── research.ts                        → Company research — Browserbase + Stagehand (Gemini-driven) + Gemini synthesis (Feature 13 decision below, not yet built)
│   ├── extractor.ts                       → GPT-4o job description extraction + structuring (not yet built)
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
│   (no lib/browserbase.ts — Feature 13's `/develop` pass found it unnecessary: `lib/stagehand.ts`'s `browserbase.launch()` creates the Browserbase session itself, see architecture.md's Feature 13 decision, Decision 3)
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
Gemini scores each job against user profile
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
Gemini synthesizes dossier from extracted content
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
Gemini processes content
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
| experience_level    | text        | student / junior / mid / senior / lead       |
| years_experience    | integer     |                                              |
| skills              | text[]      | Array of skill tags                          |
| industries          | text[]      | Industries worked in                         |
| work_experience     | jsonb       | Array of up to 3 roles                       |
| education           | jsonb       | Degree, field, institution, year             |
| academic_experience | jsonb       | Optional, student-only — awards, exchange programs, undergraduate research, etc. (added live 2026-09-07, on request — see "Profile Save Logic" below) |
| job_titles_seeking  | text[]      | Roles they want                              |
| remote_preference   | text        | remote / onsite / hybrid / any               |
| preferred_locations | text[]      | Optional preferred locations                 |
| salary_expectation  | text        | Optional                                     |
| cover_letter_tone   | text        | formal / casual / enthusiastic               |
| linkedin_url        | text        |                                              |
| portfolio_url       | text        |                                              |
| work_authorization  | text        | citizen / permanent_resident / visa_required |
| resume_pdf_url      | text        | InsForge Storage URL of current resume — never linked to a client directly, see "InsForge Storage" below |
| resume_storage_key  | text        | The bare object key `insforge.storage.download()` needs (added live, Feature 08 — see Decision 12's second correction) |
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
| match_reason       | text        | Gemini explanation (corrected — Feature 10 decision) |
| matched_skills     | text[]      | Skills user has that match                     |
| missing_skills     | text[]      | Skills user lacks                              |
| company_research   | jsonb       | Company dossier from research agent            |
| company_researched_at | timestamptz | Set when the dossier is saved — null until researched; the activity timestamp for company research (jobs has no other timestamp for it) |
| found_at           | timestamptz |                                                |

### `agent_logs`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        |                                  |
| run_id     | uuid        | References agent_runs — nullable (Feature 13 decision: company research has no agent_run to attach to; CHECK requires run_id or job_id) |
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
  - **Correction — this column was never actually applied live, discovered the hard way.** This decision recorded the column as a done migration back at Feature 04, and Feature 13's own `/architect`/`/develop` passes both repeated that claim without re-checking it against the live database. It surfaced as a real, reproducible bug: the engineer clicked a job on `/find-jobs` and got `column "company_researched_at" does not exist` from `app/find-jobs/[id]/page.tsx`'s query, confirmed directly via `get-table-schema` (the live `jobs` table had `company_research` but not this column at all) — 2026-09-10. Fixed live via `run-raw-sql` (`ALTER TABLE jobs ADD COLUMN company_researched_at timestamptz;`) and reconfirmed present with the right type. **Lesson carried forward**: a schema claim recorded in this file is not itself proof the migration actually landed — re-verify a column's real presence via `get-table-schema` before building a new feature on top of an old decision's claim, the same live-verification bar this project already applies to third-party library docs.
- **Storage isolation gap — flagged, not silently assumed away.** `storage.objects` has `rlsEnabled: false` and zero policies; `create-bucket` only takes a coarse `isPublic` flag. There is **no per-object ownership check at the DB level** — a "private" bucket means "must be authenticated," not "only the owning user can read their own file." **Decision: private bucket + versioned, unguessable `{user_id}/resume-{uuid}.pdf` paths are the current protection** (obscurity, not enforcement). If resumes ever need real per-user isolation, that means routing downloads through a server action that checks `profiles.resume_pdf_url` ownership first — not something `create-bucket`'s `isPublic` flag can give us. Flagged as a Follow-up, not solved here.

  **Follow-up resolved (`/develop`, 2026-09-07, Feature 08):** turned out to be forced, not optional — a direct link to the stored URL 401s outright (see the "InsForge Storage" section below), so Feature 08 had to add exactly this server-side proxy (`app/api/resume/download/route.ts`) to make viewing a resume work at all. That route incidentally also closes this isolation gap for good, at least for resumes: it scopes the lookup to `profiles.resume_pdf_url` for the calling user's own row before ever calling `.download()`, so it can only ever serve the caller's own file, not just an unguessable one.

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

-- Follow-up migration (2026-09-07): added 'student' to experience_level so
-- someone who doesn't work yet and hasn't graduated has a value that fits —
-- Job Title and Years of Experience become optional (not dropped) for it,
-- see lib/profile-completion.ts. Applied live via run-raw-sql, not part of
-- the original Feature 04 migration above.
ALTER TABLE public.profiles DROP CONSTRAINT profiles_experience_level_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_experience_level_check
  CHECK (experience_level IN ('student','junior','mid','senior','lead'));

-- Follow-up migration (2026-09-07, Feature 08): added resume_storage_key.
-- The bare object key insforge.storage.download() needs — reverse-
-- engineering it from resume_pdf_url turned out unreliable (a live
-- click-through hit a genuine STORAGE_NOT_FOUND from InsForge), so it's
-- now saved directly from the upload response's own `key` field instead,
-- both when generating (app/api/resume/generate/route.ts) and when
-- uploading (actions/profile.ts) — see the Feature 08 decision, Decision
-- 12's second correction. Applied live via run-raw-sql.
ALTER TABLE public.profiles ADD COLUMN resume_storage_key text;

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

**Access: requires a real Authorization bearer token — a plain browser link does not have one. Confirmed live (`/develop`, 2026-09-07, Feature 08):** opening a stored `resume_pdf_url` directly in a new browser tab (a plain `<a href={resumePdfUrl}>`) returns `401 AUTH_INVALID_CREDENTIALS "No token provided"`, not the file. The bucket being "private" does not mean "any authenticated browser session can fetch it" — the storage API needs the SDK's own bearer token, attached by `insforge.storage.from(...).download()` (which calls the SDK's authenticated HTTP client internally), not by cookie-based session auth the way `createInsforgeServer()`'s DB calls work. **This is why the original plan below turned out to be required, not merely safer:** `app/api/resume/download/route.ts` (Feature 08) proxies the file through a server-side route using the authenticated server client, scoped to the caller's own `profiles.resume_pdf_url` — the only way viewing a resume actually works, and it also happens to close the per-object ownership gap this section used to flag as unsolved (this route can only ever serve the caller's own file). Never link `resume_pdf_url` (or any stored object URL from this bucket) directly to a client again; always proxy through an authenticated route the way this one does.

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

## Company Research Pattern (corrected — Feature 13 decision, 2026-09-10)

```typescript
// lib/stagehand.ts — new session per research run, Gemini-driven per Decision 2
const { stagehand, sessionId } = await createResearchSession();
// internally: bb.sessions.create({ projectId, timeout: 120 }), then
// new Stagehand({ env: "BROWSERBASE", apiKey: BROWSERBASE_API_KEY, projectId,
//   browserbaseSessionID: session.id,
//   model: { modelName: "google/gemini-3.6-flash", apiKey: GEMINI_API_KEY },
//   disablePino: true }), then stagehand.init()

// Homepage URL resolved via the SSRF-guarded lib/safe-fetch.ts, not a naive
// `https://www.${cleanName}.com` guess — see Feature 13 decision, Decision 4
const homepageUrl = await resolveEmployerHomepageUrl(job.source_url, job.company);

try {
  const homepage = await stagehand.extract({ instruction: "...", schema: homepageSchema });
  // ... up to 3 sub-page extract() calls per Decision 4a's priority order ...
} catch (error) {
  // Log and continue — Gemini synthesizes from whatever was gathered.
  // runId is null (company research has no agent_run) — Decision 5.
  await logAgentError(userId, null, jobId, "Company research failed", error);
} finally {
  // Always close session when done, even on failure.
  await stagehand.close();
}
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
- Company research always returns a dossier — even if browser research fails, Gemini synthesizes from company name and job description alone. Never return empty.
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

**6. Completion rule** — the actual gap `build-plan.md` left open. Only plain text/array fields participate; every `<select>` (`work_authorization`, `experience_level`, `remote_preference`, `highest_degree`) is excluded because none of them can currently be blank (Feature 05 built no placeholder/unset option). Optional fields (`industries`, `salaryExpectation`, `preferredLocations`, `linkedinUrl`, `portfolioUrl` — the latter two made optional 2026-09-07, on request) and the resume upload are excluded. **9 required units**, each worth 1/9 of the percentage:
   - Full Name, Phone, Location
   - Current/Recent Job Title, Years of Experience, Skills (non-empty array)
   - Work Experience: at least one entry with company name, job title, start date, key responsibilities all non-empty, **and** end date non-empty whenever "currently working here" is unchecked
   - Education: field of study, institution name, graduation year all non-empty (highest degree excluded, it's a select)
   - Job Titles Seeking

   `is_complete` means **all 9**, not a partial threshold — `missingFields.length === 0`. The approved design's own mock (70%, exactly `PHONE`/`LOCATION`/`EDUCATION` flagged) is illustrative, not a target to reverse engineer exactly; this rule originally produced ~73% on that mock data with the full 11-unit list (LinkedIn URL and Portfolio/GitHub included) — close enough to confirm the rule's shape without curve fitting to a placeholder number. It was never re-tuned to a specific percentage after LinkedIn/Portfolio moved to optional; the unit count just dropped from 11 to 9.

   **Student exception (added 2026-09-07):** `experience_level` gained a `student` value (see the follow-up migration above) for someone who doesn't work yet and hasn't graduated. Job Title and Years of Experience stay on the form (a student may still want to log an internship) but no longer count toward the required units when `experienceLevel === "student"` — the rest, including Work Experience and Education, are unaffected and still required for everyone.

   **LinkedIn URL / Portfolio-GitHub made optional (2026-09-07, on request):** both fields stay on the form with an "(Optional)" label (matching the existing convention for `industries`/`salaryExpectation`/`preferredLocations`) and no longer appear in `REQUIRED_CHECKS` at all — not even a student exception, they're unconditionally optional for everyone.

   **Academic Experience added (2026-09-07, on request — asked, not inferred):** a new, student-only section — awards, exchange programs, undergraduate research ("Iniciação Científica," with or without funding), and similar — asked directly via four judgment calls, all answered with the recommended default: (1) visible only when `experienceLevel === "student"`, not for everyone; (2) a structured shape, not free text — `type` (`award` / `exchange_program` / `undergraduate_research` / `other`), `title`, `institution`, `year`, `funded` (boolean, covers "com ou sem bolsa"), `description`; (3) **not** added to `REQUIRED_CHECKS` — optional for everyone, same as Industries/LinkedIn/Portfolio/Salary/Preferred Locations above, never counts toward `is_complete`; (4) **not** added to Feature 07's AI extraction schema/prompt — manual entry only, so the already-shipped, already-tested extraction feature stays untouched. New `profiles.academic_experience jsonb NOT NULL DEFAULT '[]'::jsonb` column (migration run live via `run-raw-sql`, confirmed via `information_schema.columns`), same shape convention as `work_experience`/`education`. Up to 5 entries (`AcademicExperienceCard`, mirrors `WorkExperienceRoleCard` — no "at least one" minimum, unlike Work Experience, since this is opt-in). See `types/index.ts`'s `AcademicExperienceEntry`, `lib/profile-transform.ts`'s `toAcademicExperienceRecords`/`fromAcademicExperienceRecord`, and `actions/profile.ts`'s `academicExperienceEntrySchema`.

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

---

## AI Profile Extraction from Resume (Feature 07 decision — `/architect`, 2026-09-07)

`build-plan.md`'s Feature 07 entry says pdf-parse extracts text, GPT-4o reads it and
returns structured JSON, and the form auto-fills — but leaves open which AI provider,
when the button appears, whether it overwrites or merges, which fields it can
actually fill, and how the extracted values reach `ProfileForm`'s state. This section
closes those gaps.

**1. AI provider — Gemini replaces GPT-4o for this feature; the project-wide switch is a follow-up, not done here.** `GEMINI_API_KEY` is already provisioned in `.env.local` (a plain Google AI Studio key, confirmed with the engineer — not Vertex AI, so `GEMINI_API_PROJECT_NAME`/`GEMINI_PROJECT_ID` go unused for now); `OPENAI_API_KEY` is not set at all. The engineer's call: Gemini becomes the project's one AI provider going forward, but only Feature 07's own docs are rewritten now (this section, plus the Feature 07 lines in `build-plan.md`/`project-overview.md`). **Follow-up, not a Feature 07 blocker:** Features 08 (resume generation), 10 (Adzuna scoring), 13 (company research synthesis), and 17's downstream data still document GPT-4o until each is actually built or re-architected — re-decide the provider then. Stagehand's own `model` config in the Company Research pattern (`library-docs.md`) is a separate concern again; a browser-driving model doesn't necessarily swap providers the same way a plain `generateContent()` call does, so that needs its own look whenever Feature 13 is picked up.

**Follow-up resolved (`/develop`, 2026-09-07, during Feature 08's build):** the engineer made the project-wide call directly — Gemini for every AI feature, not just this one. See the Feature 08 decision below, Decision 1, for the correction and what it means for Features 10/13/17 (still to be built).

**2. Package & client.** `@google/genai` — the current Google GenAI SDK for both the Gemini Developer API (AI Studio keys) and Vertex AI, superseding the deprecated `@google/generative-ai`. New `lib/gemini.ts` (server-only; mirrors the plain-singleton client pattern this project uses for third-party clients — Gemini has no client/server split the way InsForge does, there's no browser-side usage; the original comparison pointed at `lib/browserbase.ts`, which Feature 13's `/develop` pass later found unnecessary — see architecture.md's Feature 13 decision, Decision 3):

```typescript
// lib/gemini.ts
import { GoogleGenAI } from "@google/genai";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
```

**Verify against the installed package before writing real code** — this project has twice found a pre-verified `library-docs.md` snippet didn't match the installed SDK (see the InsForge Storage/Database corrections above). As of this writing, `models.generateContent()`'s config fields are `responseMimeType`, `responseSchema`, `temperature`, and `maxOutputTokens`, nested under a `config:` object (not `generationConfig` — that belongs to the older, deprecated package). Confirm this against `node_modules/@google/genai`'s own type definitions before relying on it.

**3. Model.** `gemini-2.5-flash` — Google's price-performance model for high-volume structured tasks, the closest current analog to how `gpt-4o` was being used for extraction/scoring elsewhere in this codebase. **Flagged, not fully confirmed:** a live web check run for this decision returned inconsistent, likely-stale-or-hallucinated results for the newest model lineup (conflicting version strings, an API method that doesn't match any known Gemini SDK shape) — this space moves fast and the check wasn't trustworthy enough to cite further. Verify the current fastest/cheapest Gemini model against `ai.google.dev`'s own model list before shipping, and swap the model string here if a newer one is clearly the better fit.

**Corrected during the build (`/develop`, 2026-09-07), confirmed live, not just checked against docs:** `gemini-2.5-flash` returned a live `404` — "no longer available to new users, use models/gemini-3.6-flash". Switched to **`gemini-3.6-flash`**, confirmed working end to end (real resume text in, valid schema-matching JSON out). Full detail in `library-docs.md`'s Gemini section, including two follow-on findings this swap surfaced: `gemini-3.6-flash` is a thinking model whose thinking tokens eat into `maxOutputTokens` (see Decision 4's correction below) and can't be turned off (`thinkingConfig.thinkingBudget: 0` → live `400`), and the provisioned `GEMINI_API_KEY` is free-tier with a **20 requests/day** cap per model (live `429`) — fine for building, needs a billing upgrade before real usage.

**4. Structured output.** Gemini's `responseSchema` (JSON-schema-constrained output) is the direct analog to the `response_format: { type: "json_object" }` pattern `library-docs.md` documents for GPT-4o — arguably stronger, since the schema is enforced rather than just requested. Temperature `0.3`, matching this project's existing "matching/scoring/extraction — deterministic" convention (`library-docs.md`); max output tokens `800`, matching the existing "Profile extraction from resume" budget in the same table.

**Corrected during the build, confirmed live:** the field is **`responseJsonSchema`**, not `responseSchema` — `responseSchema` is typed to a narrower OpenAPI-style shape that a plain `z.toJSONSchema()` object doesn't cleanly satisfy; `responseJsonSchema` (typed `unknown`) is the SDK's own current field for a real JSON Schema. And **max output tokens is `8000`, not `800`** — `gemini-3.6-flash`'s thinking tokens count against this budget (~1300 thinking tokens alone for a short sample resume in isolated testing; a real, multi-page, non-English resume ran higher still and truncated an intermediate `3000` once this went through the actual running app), and `800` silently truncated the JSON response mid-string. Check `response.candidates?.[0]?.finishReason === "MAX_TOKENS"` before assuming a JSON parse failure is something else — that's how truncation actually presents. All confirmed via live `generateContent()` calls during the Feature 07 build, not just against the SDK's types. See `library-docs.md`'s Gemini section for the full corrected snippet.

**Also required, confirmed live, and easy to miss because it doesn't reproduce in a plain Node script:** `pdf-parse` needs explicit worker setup under Next.js/Turbopack — `PDFParse.setWorker(getData())` (from `pdf-parse/worker`) before any `new PDFParse(...)` call, plus `serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"]` in `next.config.ts` for the production build. Full detail in `library-docs.md`'s pdf-parse section, "Next.js / Turbopack Setup."

**5. Trigger point.** The Extract from Resume button appears in `ResumeUpload.tsx` as soon as a file is selected (client-side `selectedFileName` state is already tracked there) — before Save Profile, matching `project-overview.md`'s onboarding flow ("upload → Extract from Resume or Skip"). It always extracts from the freshly selected `File` already sitting on the hidden `<input name="resume">`, never from a previously saved `resume_pdf_url` — a returning user with no new file selected simply doesn't see the button (no fallback to the stored resume in this pass; a possible follow-up if it's ever wanted).

**6. Overwrite behavior.** Extraction result unconditionally overwrites every mapped field in `ProfileForm`'s local `profile` state — no merge, no confirmation prompt. The user reviews and edits before Save Profile per `build-plan.md`'s stated flow, so nothing is destroyed silently; Save Profile is a separate, later action.

**7. Field scope & type shape.** Extraction fills: `fullName`, `phone`, `location`, `linkedinUrl`, `portfolioUrl`, `currentTitle`, `yearsExperience`, `skills`, `industries`, `workExperience` (up to 3 roles), `education`, and `experienceLevel` (nullable — see Decision 8). Never touches `email` (always the session user, never editable — Feature 06 decision 9's sibling rule) or the job-seeking preference fields (`jobTitlesSeeking`, `remotePreference`, `salaryExpectation`, `preferredLocations`, `workAuthorization`) — a resume states what someone has done, not what they want next; those stay exactly as the user left them.

`ExtractableProfileFields` is **not** a flat `Pick<ProfileFormData, ...>` (the first draft of this decision had it that way — caught in cross check). Every key except `experienceLevel` always comes back with a real, possibly-empty value (`""`/`[]`) per Decision 8's "never fabricate" rule. `experienceLevel: ExperienceLevel | null` is the one exception: `null` means "the resume gave no reliable signal, leave the form's current value alone." A flat object spread can't express "don't touch this field" any other way — every other key already has a defined empty state, and this five-value enum doesn't.

**8. One zod schema drives both what Gemini is asked to return and what the response is validated against** — not two hand-maintained copies that can silently drift apart (an earlier draft of this decision specified the model's `responseSchema` and the response's zod validation separately; caught in cross check). Zod v4 is already installed (`package.json`) and ships `z.toJSONSchema()` for exactly this: define one `extractedProfileSchema` (in `actions/profile.ts`, or a new `lib/profile-extraction-schema.ts` if sharing with `types/index.ts` is easier) and derive Gemini's `responseSchema` from it. The schema itself, not just the prompt, enforces:
   - Every string/array field is non-optional, defaulting to `""`/`[]` — the prompt still instructs Gemini to never fabricate a value it doesn't have, but the schema being non-optional is what actually guarantees `ProfileForm` can safely spread the result.
   - `workExperience`: `.max(3)` on the schema itself, not just a prompt instruction ("keep the 3 most recent" if the resume lists more) — otherwise a model that ignores the instruction pushes an uncapped array into `ProfileForm`'s state, and the only place it would ever surface is later, opaquely, as `saveProfileAction`'s own `.max(3)` rejecting the whole save with "Some profile fields are invalid."
   - `workExperience[].startDate`/`endDate`: `/^\d{4}-\d{2}$/` or `""` (matches `WorkExperienceRoleCard`'s `type="month"` inputs, which render blank on anything else — a malformed date should fall back to empty, not corrupt the field). "Present"/"Current"/no end date on the most recent role → `currentlyWorkingHere: true`, `endDate: ""`.
   - `education.highestDegree`: constrained to the same 6 values `ProfileForm.tsx` renders (`high_school | associate | bachelor | master | doctorate | other`) — the model maps free text ("BS", "Bachelor of Science") to the closest one, `"other"` when nothing fits or nothing is stated. (The same "a `<select>` has no real blank option" gap Feature 06 flagged as a follow-up for manual edits — extraction doesn't get a pass on it just because it's a new write path.) `education` stays a single object (Feature 06 decision 4); if the resume lists multiple degrees, keep the highest/most recent.
   - `yearsExperience`: a bare non-negative integer string or `""` — never free text like "5+" or "5-7 years" (the field feeds a `type="number"` input, which silently blanks on anything else).
   - `experienceLevel`: `z.enum([...]).nullable()` (student/junior/mid/senior/lead, the same five `ProfileForm.tsx` renders) — inferred from years of experience and seniority language in titles only when the resume gives enough signal to guess reasonably; `null` otherwise (Decision 7 covers how `null` is handled on merge). Excluded from the "always a concrete value" rule above because forcing a guess onto an ambiguous resume is worse than leaving the form's existing value alone.
   - `skills`/`industries`: trimmed, case-normalized, and de-duplicated server-side after the model responds, before returning — not left to the model to stay consistent on its own (e.g. "JavaScript" vs "javascript" across two resume sections).
   - Extracted resume text sent to Gemini is capped before the request (e.g. the first 15,000 characters) — a long CV or a PDF with an embedded cover letter has no other stated ceiling; `maxOutputTokens: 800` already caps the response side, the request side needs the same treatment.

**9. Validation.** `pdf-parse` extracts raw text server-side inside a try/catch — any throw (a corrupted or password-protected PDF) maps to the same copy as the too-short case below, not a separate error path. Reuse `MAX_RESUME_SIZE_BYTES` (5MB) and the PDF-mime check already in `actions/profile.ts` — the same two client + server validations, not a second copy. If the extracted text is under 50 characters (a real one-page resume is always well over this; catches image-based/blank PDFs pdf-parse can't read, same bucket as a parse failure) → return the exact copy `build-plan.md` specifies: `"Could not extract text from this PDF. Please try a different file."` A Gemini call failure, a schema-invalid response, or an unparseable JSON body → `"Could not extract profile details from this resume. Please try again or fill in the form manually."`

**10. Server Action, `useActionState`-shaped — not an API route, not a bare imperative call.** New `extractProfileFromResumeAction(previousState, formData)` in `actions/profile.ts`, alongside `saveProfileAction` — same file, same auth-check and file-validation pattern, and the **same two-argument signature `useActionState` requires** (matching `saveProfileAction` exactly — an earlier draft of this decision had it as a bare `(formData) => …` called imperatively from an `onClick`; caught in cross check, see Decision 11 for why that was wrong). Reasoning for a Server Action over `POST /api/resume/extract` is unchanged: it needs the same "receive a `File` through `FormData`" handling `saveProfileAction` already has, it writes nothing to the database (no `revalidatePath`, unlike `architecture.md`'s "Agent Operations (API Routes)" pattern, which is for functions that write agent results to the DB), and the result needs to land directly in `ProfileForm`'s state. Runner-up considered: `POST /api/resume/extract`, closer to `architecture.md`'s "Resume Operations (API Routes)" diagram and symmetric with Feature 08's `/api/resume/generate` — not picked because Feature 08 actually writes a new file to Storage and updates the DB (a real mutation an API route suits), while this is not a mutation.

```typescript
export type ExtractProfileState = {
  success: boolean;
  data?: ExtractableProfileFields; // see Decision 7 for the field list and the experienceLevel null case
  error?: string;
};

export async function extractProfileFromResumeAction(
  _previousState: ExtractProfileState,
  formData: FormData,
): Promise<ExtractProfileState> {
  // same getCurrentUser() guard as saveProfileAction (Feature 06 decision 10,
  // "Auth defense-in-depth") — proxy.ts already guards /profile, this is paranoia
  // ...
}
```

**11. Wiring: a second `useActionState` in `ProfileForm`, not hand-rolled `onClick`/`isExtracting` state in `ResumeUpload`.** `ProfileForm` already calls `useActionState(saveProfileAction, INITIAL_ACTION_STATE)` for Save, bound as the `<form>`'s default `action`. Add a second: `const [extractState, extractFormAction, isExtracting] = useActionState(extractProfileFromResumeAction, INITIAL_EXTRACT_STATE)`. The Extract button — still rendered inside `ResumeUpload`, still a descendant of the one existing `<form>` (never a second, illegally-nested form) — takes `formAction={extractFormAction}` instead of the form's default action. This is React 19's supported multi-action-per-form pattern (a submit button's own `formAction` overrides the form's `action` for that click) and it's a real `type="submit"` button with no risk of silently triggering `saveProfileAction` instead — the concrete regression an earlier draft of this decision left open (a default-`type` button inside this form submits it; `Add role`/`Generate Resume from Profile`, the only other in-form buttons today, are both explicitly `type="button"` for exactly this reason).

This also gets pending state and same-action double-submit prevention for free from React, the same way `isPending` already guards Save — `isExtracting` disables the Extract button, and the whole `ResumeUpload` dropzone besides (swapping files mid-extraction is blocked, not just re-clicking Extract), while a request is in flight.

`ProfileForm` passes `extractFormAction`, `isExtracting`, and the extract error down: `<ResumeUpload extractFormAction={extractFormAction} isExtracting={isExtracting} extractError={extractState.error} />` (replacing the single `onExtracted` callback from an earlier draft of this decision), and merges a successful result with a `useEffect` on `extractState.data`:

```typescript
useEffect(() => {
  if (!extractState.data) return;
  setProfile((current) => ({
    ...current,
    ...extractState.data,
    // null means "no reliable signal" (Decision 7/8) — keep whatever the
    // form already had rather than overwrite it with null.
    experienceLevel: extractState.data.experienceLevel ?? current.experienceLevel,
  }));
}, [extractState.data]);
```

(`extractState.data`'s object identity changes each time a new extraction completes — that's what re-triggers this effect; `useActionState` doesn't return the same reference across unrelated re-renders.)

**Accepted edge case, not guarded against:** if the user edits a field currently visible on the form while an extraction is in flight (a few seconds), that edit can be overwritten when the result lands — consistent with Decision 6's unconditional-overwrite choice (the user reviews everything after extraction regardless) and not worth disabling all ~16 form fields to prevent. Revisit only if this turns out to bite in practice.

**12. No new PostHog event.** Not in `code-standards.md`'s six-event list, and neither `build-plan.md` nor `project-overview.md` calls for one on this feature (contrast Feature 10/13, which explicitly name their events) — inferred, not asked. Add one later only if the dashboard needs to report on extraction usage specifically.

### Build plan for `/develop`

1. `types/index.ts` — add `ExtractableProfileFields`: every key from Decision 7's field list as a non-optional, possibly-empty value, except `experienceLevel: ExperienceLevel | null`. Not a `Pick<ProfileFormData, ...>` — see Decision 7 for why.
2. `lib/gemini.ts` (new) — `export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })`. Verify the real `models.generateContent()` config shape against the installed package's types before using it (Decision 2).
3. `actions/profile.ts` — add `extractProfileFromResumeAction(previousState, formData)`: same auth guard as `saveProfileAction`; re-validate the file (PDF mime, `MAX_RESUME_SIZE_BYTES`); `pdf-parse` the buffer inside try/catch (Decision 9); the under-50-characters check; cap the extracted text before sending (Decision 8); one shared zod schema (`extractedProfileSchema`) drives both `responseSchema` (via `z.toJSONSchema()`) and response validation (Decision 8, closes the drift risk between the two); call `gemini.models.generateContent()` with the Decision 8 system prompt, temperature `0.3`, max output tokens `800`; normalize skills/industries (trim/case/dedupe); return `{ success: true, data }` or `{ success: false, error }` per Decision 9's two error messages. No DB write, no `revalidatePath`. **Before writing the real logic:** install `pdf-parse` (+ `@types/pdf-parse` if types aren't bundled) and `@google/genai`, and smoke-test both imports in isolation first — some `pdf-parse` versions run a debug code path on import that reads a bundled test file and can throw in some server environments; confirm the installed version doesn't hit it before wiring it into the action.
4. `components/profile/ResumeUpload.tsx` — accept `extractFormAction`, `isExtracting`, `extractError` props (Decision 11); render the Extract from Resume button (`type="submit"`, `formAction={extractFormAction}`) once `selectedFileName` is set, disabled while `isExtracting` with its label swapped to `"Extracting…"`; disable the dropzone while `isExtracting` too; render `extractError` the same way the existing upload `error` renders.
5. `components/profile/ProfileForm.tsx` — add the second `useActionState(extractProfileFromResumeAction, INITIAL_EXTRACT_STATE)`; the `useEffect` merge from Decision 11 (with the `experienceLevel` null-coalescing); pass `extractFormAction`/`isExtracting`/`extractState.error` down to `<ResumeUpload />`.
6. `library-docs.md` — new `## Gemini` section (Decisions 2-4, 8), added alongside the existing `## OpenAI GPT-4o` section, not replacing it (Features 08/10/13/17 still document GPT-4o until their own pass).
7. `code-standards.md` — add `@google/genai` to the approved dependencies list; add `GEMINI_API_KEY` to the environment variables table.

### References

- `@google/genai` package — https://ai.google.dev/gemini-api/docs/api-key (confirmed current package name; exact latest version not independently confirmed, the npm registry page could not be fetched in this pass — check `npmjs.com/@google/genai` directly before installing)
- Structured output config — https://ai.google.dev/gemini-api/docs/structured-output (the specific field names/nesting returned by this pass's check looked inconsistent with the known SDK shape — treat as unverified, confirm against the installed package's types instead, per Decision 2)
- Model lineup — https://ai.google.dev/gemini-api/docs/models (the specific model list returned by this pass's check looked inconsistent/likely stale or hallucinated — treat as unverified, confirm against this page directly before picking a final model string, per Decision 3)

---

## Resume PDF Generation from Profile (Feature 08 decision — `/architect`, 2026-09-07)

`build-plan.md`'s Feature 08 entry (before this pass) named "Gemini" as the content generator and a fixed-path `resumes/{user_id}/resume.pdf` upload with `upsert: true` — both copy-paste drift from Feature 07's paragraph, and (as first drafted) contradicted by this project's own already-resolved provider decision (Feature 07 decision 1: "Features 08/10/13/17 still document GPT-4o") and by the installed InsForge SDK (no `upsert` option at all — see the Storage correction under Feature 06). It also left open what the model should actually generate versus what should come straight from the saved profile, whether generation requires a Server Action or an API route, whether the profile needs to be complete first, and whether the generated PDF shares `resume_pdf_url` with a Feature 06 user-uploaded original or gets its own column. This section closes those gaps. `build-plan.md`'s paragraph has already been corrected in this same pass to match the decisions below.

**1. AI provider — Gemini, project-wide, not GPT-4o.** **Corrected during the build (`/develop`, 2026-09-07), at the engineer's explicit direction, superseding this decision's own original text and reopening Feature 07 decision 1's "follow-up, not done here" framing:** Gemini is now this project's provider for every AI feature, not just Feature 07's resume extraction. This decision was first drafted assuming GPT-4o (matching Feature 07 decision 1's stated default at the time), then corrected mid-build once the engineer stated the broader policy directly. `OPENAI_API_KEY` is no longer needed by this feature — the `openai` package was installed, then removed again once this correction landed, since nothing in the codebase ends up using it. Features 10/13/17 (job matching, company research synthesis, dashboard data) still say GPT-4o in `build-plan.md`/`library-docs.md` as of this pass — this project-wide provider correction should carry into each when it is actually built, not just Feature 08; the Stagehand `modelName` for the browser-driving Feature 13 agent is a separate concern again, per Feature 07 decision 1's own note, so it needs its own look then, not assumed here.

**2. Split — Gemini writes prose only, nothing else.** The model is asked for exactly two things: one `professionalSummary` paragraph, and polished bullet points per work-experience entry (rewriting each entry's free-text `key_responsibilities` into 2-4 resume-style fragments). Every other field on the PDF — name, email, phone, location, links, current title, skills, work-experience company/title/dates, education — is read straight from the `profiles` row with no model involvement. Reasoning: those fields are already structured and correct; asking a model to reproduce them adds hallucination risk (a wrong date, a dropped skill) for zero benefit, and keeps the request small enough that a generous but bounded output budget is safe (Decision 4).

**3. Request/response shape and validation — one shared zod schema, mirroring Feature 07 decision 8's pattern exactly.** New `lib/resume-generation-schema.ts`:

```typescript
export const resumeContentSchema = z.object({
  professionalSummary: z.string().min(1),
  workExperience: z.array(
    z.object({ bullets: z.array(z.string().min(1)).min(1).max(4) }),
  ),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;
```

`workExperience.length` must equal the profile's own `work_experience.length` at runtime — zod can't express a length that depends on another value, so check it explicitly right after `safeParse` succeeds and treat a mismatch identically to a schema failure (Decision 13). Same schema-enforced pattern as Feature 07: this same `resumeContentSchema` drives both Gemini's `responseJsonSchema` (via `z.toJSONSchema()`) and the response validation — one definition, not two hand-maintained copies that can drift (Feature 07 decision 8's reasoning applies unchanged).

**4. Model parameters — matches Feature 07's live-verified call exactly, not `library-docs.md`'s original GPT-4o table.** `model: 'gemini-3.6-flash'` (Feature 07 decision 3's live-confirmed replacement for the dead `gemini-2.5-flash`), `responseMimeType: 'application/json'`, `responseJsonSchema` from `z.toJSONSchema(resumeContentSchema)`, `temperature: 0.7` (natural variation is wanted here, unlike extraction's deterministic `0.3` — the one dimension that stays provider-agnostic from the original GPT-4o-based draft), `maxOutputTokens: 8000` — not the `1000` `library-docs.md`'s now-superseded OpenAI table earmarked for this feature, reused instead from Feature 07 decision 4's own live correction: `gemini-3.6-flash`'s thinking tokens count against this same budget, and a tighter budget risks the identical silent mid-JSON truncation Feature 07 had to correct live. Applied directly on this basis rather than re-discovering it by trial and error.

**5. Reuses `lib/gemini.ts` — no new client file needed.** Feature 07 already added a single server-only Gemini client; this feature imports it as-is, the same way it will for every future AI feature under Decision 1's project-wide policy. (An earlier draft of this decision added a parallel `lib/openai.ts` — removed once Decision 1 was corrected; nothing in the codebase references it.)

**6. PDF template lives in `lib/`, not `components/` — `lib/resume-pdf-template.tsx`.** It is a `@react-pdf/renderer` `<Document>`/`<Page>` tree that only ever runs inside the API route via `renderToBuffer()`; it never renders to the DOM and must never be imported by a client component (react-pdf's primitives aren't DOM elements — importing this from a client component would break the build, not just look wrong). `lib/`'s existing charter ("third-party client initialisation and shared utilities") is the better fit than `components/`'s ("UI only... no direct DB calls") for something that renders content but never touches the DOM. Layout: `LETTER` page size (this product's stated user base is US-centric — Adzuna is already hardcoded to `us` — matching Feature 06/07's precedent of picking a concrete default rather than asking), built-in `Helvetica`/`Helvetica-Bold` fonts (no `Font.register()` custom loading — keeps the route free of font-file bundling concerns). Section order top to bottom: name + contact line (email, phone, location, LinkedIn, portfolio — joined with a separator, any empty field omitted rather than shown blank) → Professional Summary → Skills (a plain joined list, not pill badges — react-pdf has no real flex-wrap pill layout worth the complexity for a one-page document) → Work Experience (title/company, a lighter date-range line, then bullets) → Education. Only the CSS properties `library-docs.md`'s react-pdf section already documents as supported are used; literal hex colors are fine here since this renders a PDF, not a web page — the "no raw hex" rule (`ui-tokens.md`) governs Tailwind/web UI, not react-pdf's own `StyleSheet.create()`.

**7. API route, not a Server Action — `app/api/resume/generate/route.ts`.** This mirrors `architecture.md`'s own "Resume Operations (API Routes)" data-flow diagram (above) and is the exact case Feature 07 decision 10 named as the contrast to its own choice: this operation writes a new object to Storage and updates the `profiles` row — a real mutation with a result that doesn't need to land in `ProfileForm`'s editable state, unlike extraction. `POST`, no request body needed — everything comes from the authenticated user's own saved profile, not from anything the client sends.

**8. Minimal-data guard, not a full-completeness gate (engineer's call).** Generation is blocked only when the profile lacks `full_name` **and** lacks both a `current_title` and any work-experience entry with a non-empty company/title — not gated on `profiles.is_complete`. Reasoning: someone should be able to get a usable first draft early and refine later, rather than being forced through every optional field first; this also matches how Feature 07 (extraction) already treats form completion as an ongoing, editable process rather than an all-or-nothing gate. The check runs before any GPT-4o call, so an empty/near-empty profile costs nothing.

**9. Storage path — versioned key, not the fixed path `build-plan.md` originally described.** `{user_id}/resume-{uuid}.pdf`, the same pattern Feature 06 already uses live for user-uploaded resumes (`actions/profile.ts`) — confirmed necessary rather than just consistent, since the installed InsForge Storage SDK has no `upsert` option at all (Feature 06's SDK correction above); reusing a fixed key would silently overwrite in place with no way to opt out. Confirmed live via the `list-buckets` MCP tool that the `resumes` bucket already exists (`public: false`) — no new bucket needed for this feature.

**10. Data model — reuse `profiles.resume_pdf_url`, no new column (engineer's call, confirmed against the live schema via the `get-table-schema` MCP tool, which shows exactly one relevant column today).** Generating a resume overwrites the same column Feature 06 writes for a user-uploaded original — there is one "current resume" slot per profile, whichever of upload or generate produced it most recently. The superseded file is not deleted from Storage (no cleanup attempted, consistent with the Storage isolation gap already accepted under Feature 04/06 — an unreferenced object is not a new kind of gap this feature introduces), it simply has nothing left in the database pointing at it. If a later feature needs the original upload to survive a generation (e.g. tailoring a cover letter off the literal uploaded text), that is the concrete condition under which to revisit this and add a second column — not assumed now.

**11. UI wiring — a plain client handler with local state, not `useActionState`/`formAction`. Placement corrected on request, same day.** Because this is a route handler, not a Server Action, the `useActionState` pattern Features 06/07 both use doesn't apply directly the way it does for Save/Extract. `ProfileForm.tsx` (which already owns the Feature 07 merge state) adds `isGenerating`, `generateError`, and `generatedResumeUrl` (seeded from the profile loaded on page render, so a prior generation still shows after a reload, not just after a fresh generate-in-this-session). A plain async handler calls `fetch('/api/resume/generate', { method: 'POST' })`.

  **Button placement corrected: it does not live in `ResumeUpload.tsx` anymore.** This decision's first draft kept "Generate Resume from Profile" in the footer of `ResumeUpload.tsx`'s card, at the top of the page, matching where Feature 05's original design happened to place the (until-now inert) button. The engineer flagged this live: Generate reads whatever is currently **saved** to the profile, not unsaved edits below it — sitting above the fields it depends on invited generating from stale or incomplete data before ever saving. Moved to a new section inside `ProfileForm`'s "Profile Information" card, after the Save Profile button (`border-t border-border pt-8`, its own heading "Generate a Resume") — `ResumeUpload.tsx` now only covers the "resume in" direction (upload/extract) and no longer takes `onGenerate`/`isGenerating`/`generateError`/`generatedResumeUrl` props at all. `<ResumePreview resumePdfUrl={generatedResumeUrl} />` moved with it.

**12. New `components/profile/ResumePreview.tsx` — built now, deferred since Feature 05. Corrected live (`/develop`, 2026-09-07) — this decision's first draft got the download path wrong.** Feature 05's own notes explicitly deferred this component to "whichever of Feature 07/08 first needs to render an uploaded/generated resume"; Feature 07 didn't need it (extraction feeds form fields, not a document view), so Feature 08 is where it gets built. Presentational only (`components/`'s own charter — no DB calls), props `{ resumePdfUrl: string | null }` (only gates whether a resume exists, doesn't become the link target — see below), renders nothing when null. When present: a simple row below `ResumeUpload.tsx`'s existing footer buttons, reusing its `border-t border-border` separator, a short status line, and a "View PDF" link (`target="_blank" rel="noopener noreferrer"`) — no embedded viewer or iframe.

  **The link does not point at the stored URL directly — this draft's original assumption ("`upload()`'s returned `url` is usable as a plain link... consistent with the obscurity-based access model") was wrong, confirmed on the engineer's first real click-through:** the raw URL 401s ("No token provided") because the storage API needs a real bearer token, which a plain `<a>` navigation never attaches — this is a different, stricter requirement than the "obscurity, not enforcement" model the Feature 04 decision described, not a variant of it. Fixed by adding `app/api/resume/download/route.ts` (new): a same-origin `GET` route that loads the caller's own profile row, looks up the storage key, calls `insforge.storage.from('resumes').download(key)` with the authenticated server client, and streams the PDF back with `Content-Type: application/pdf`. `ResumePreview`'s link now points at this fixed route (`/api/resume/download`), not `resumePdfUrl`. See the "InsForge Storage" section above for the corrected access model this proves.

  **Second correction, same day, on the engineer's very next click-through:** this route's first version derived the storage key by parsing it back out of `resume_pdf_url` (the URL is `.../objects/${encodeURIComponent(key)}`, confirmed against the installed `@insforge/sdk`'s own `upload()`/`download()`/`getPublicUrl()` implementations) rather than adding a second column. That was wrong in practice, not just in principle — the very next "View PDF" click returned a real `STORAGE_NOT_FOUND` (404) from InsForge itself once the auth fix above was in place, meaning the re-derived key didn't actually resolve to the uploaded object. Rather than keep debugging a round-trip this project has no way to verify against the real backend's exact encoding, switched to the vendor's own documented pattern instead: `profiles.resume_storage_key` (new column, added live via `run-raw-sql`) stores the SDK's own `key` field from the upload response directly — both `app/api/resume/generate/route.ts` and `actions/profile.ts`'s upload path (Feature 06) now save it, since both write to the same `resume_pdf_url`/`resume_storage_key` pair (Decision 10 already unified them under one slot). The download route now reads `resume_storage_key` directly with no parsing at all. A profile whose resume was saved before this column existed has no key and gets "No resume found" until it's regenerated or re-uploaded — no attempt made to backfill the handful of rows written during this same day's testing.

**13. Error handling — specific before the AI call, generic and uniform after it.** The Decision 8 guard fails with a specific, actionable message (what's missing) before any cost is incurred. Every failure from that point on — Gemini quota/timeout/5xx, a malformed or schema-invalid response, a `workExperience.length` mismatch (Decision 3), a PDF render error, a Storage upload failure — returns the same generic "temporarily unavailable, try again" family of message to the user, logged server-side with a `[api/resume/generate]` prefix and enough detail to distinguish the real cause, matching this project's established convention (Feature 07 decision 9's two-tier specific/generic split, adapted here to three stages instead of two since there's a real cost boundary — the AI call — worth failing before). A quota failure specifically reuses Feature 07's `isQuotaExceededError` check (`error instanceof ApiError && error.status === 429`) — the same free-tier Gemini key, and its 20-requests/day cap, is now shared across every AI feature under Decision 1, not just extraction. Storage upload must succeed before the database is touched; if the database update fails after a successful upload, the new file is briefly orphaned with nothing pointing at it — the same accepted class of gap as Decision 10, not a new one. Regenerating on top of an existing generated resume is always allowed with no confirmation prompt (matches this project's minimalist scope elsewhere); the client's own `disabled={isGenerating}` is the only concurrency guard needed, no server-side locking.

**14. Dependencies — `@react-pdf/renderer` only; no new AI SDK.** `@google/genai` is already installed (Feature 07); Decision 1's correction means this feature adds no new AI package. `@react-pdf/renderer` pulls in a WASM layout engine and a font-handling package, the same general class of native/non-ESM dependency that made `pdf-parse` need `serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"]` in `next.config.ts` for Feature 07's Turbopack production build. **Verified during the build (`/develop`, 2026-09-07):** a real `npm run build` completed cleanly with `@react-pdf/renderer` installed and `/api/resume/generate` listed as a route — no Turbopack bundling error appeared, so `next.config.ts`'s `serverExternalPackages` needed no change. The `openai` package was briefly installed for this feature's first draft and has been uninstalled; nothing in the codebase imports it.

**15. No new PostHog event.** Same reasoning as Feature 07 decision 12 — not in `code-standards.md`'s six-event list, and neither `build-plan.md` nor `project-overview.md` calls for one on this feature. Add one later only if the dashboard needs to report on resume-generation usage specifically.

### Build plan for `/develop`

1. ~~`lib/openai.ts`~~ — not needed; Decision 5 reuses `lib/gemini.ts`.
2. `lib/resume-generation-schema.ts` (new) — the zod schema from Decision 3.
3. `lib/resume-pdf-template.tsx` (new) — the `@react-pdf/renderer` document from Decision 6, exported as a single component taking the profile row plus the validated `ResumeContent`.
4. `lib/profile-completion.ts` — add a small exported helper (`hasMinimumResumeData`) alongside `calculateProfileCompletion` for the Decision 8 guard, since both reason about the same profile row shape.
5. `lib/profile-transform.ts` — add `resume_pdf_url: string | null` and `resume_storage_key: string | null` to `ProfileRow` (the first column has existed since Feature 04; the second was added live during this build, Decision 12's second correction).
6. Migration (`run-raw-sql`, applied live) — `ALTER TABLE public.profiles ADD COLUMN resume_storage_key text;`.
7. `app/api/resume/generate/route.ts` (new) — `POST` handler per Decisions 7-13: auth check via `createInsforgeServer()`, load the profile row, the minimal-data guard, the Gemini call in its own try/catch, response validation (including the runtime length check), `renderToBuffer()` in its own try/catch, upload to the `resumes` bucket at a fresh versioned key, update `profiles.resume_pdf_url` **and `resume_storage_key`** only after a successful upload, `revalidatePath('/profile')`, return `{ success, data: { resumePdfUrl }, error? }` from every branch.
8. `actions/profile.ts` — `saveProfileAction`'s existing resume-upload path (Feature 06) also saves `resume_storage_key` alongside `resume_pdf_url`, using the same path string it already uploads to (Decision 12's second correction applies to both write paths, not just generation).
9. `app/api/resume/download/route.ts` (new) — `GET` handler per Decision 12: auth check, load the caller's own `resume_storage_key`, `insforge.storage.from('resumes').download(key)`, stream the blob back with `Content-Type: application/pdf`. No URL parsing.
10. `components/profile/ResumePreview.tsx` (new) — per Decision 12; its "View PDF" link points at `/api/resume/download`, not `resumePdfUrl`.
11. `components/profile/ResumeUpload.tsx` — covers upload/extract only; no Generate button, no generate-related props (moved out, Decision 11's placement correction).
12. `components/profile/ProfileForm.tsx` — accept an `initialResumePdfUrl` prop (from `app/profile/page.tsx`'s `profileRow.resume_pdf_url`, not part of `ProfileFormData` — email-style separation, sourced once and never round-tripped through the save form); add `isGenerating`/`generateError`/`generatedResumeUrl` state and the `fetch`-based handler; render the "Generate a Resume" section (the button, `generateError`, and `<ResumePreview resumePdfUrl={generatedResumeUrl} />`) after the Save Profile button, per Decision 11.
13. `app/profile/page.tsx` — pass `initialResumePdfUrl={profileRow?.resume_pdf_url ?? null}`.
14. `package.json` — add `@react-pdf/renderer` only (Decision 14).
15. `next.config.ts` — left unchanged; Decision 14's live build check found no Turbopack issue.
16. `library-docs.md` — the Gemini section now also covers resume generation, not just extraction; the OpenAI section's "Features 08/10/13/17" note is corrected to reflect Decision 1; the react-pdf Rules corrected to require a server-side proxy, never a direct client link.
17. `ui-registry.md` — register `ResumePreview.tsx`, corrected to describe the proxy link.
18. `progress-tracker.md` — mark Feature 08 done once built and verified, with decisions-made notes for the mid-build provider correction and both live-found storage bugs (matching Feature 07's level of detail).

### Verify (`/develop`, 2026-09-07)

Not yet driven through the real running app (see `progress-tracker.md`'s Feature 08 notes) — these are the concrete steps to run once there's a real authenticated session, derived from `build-plan.md`'s Feature 08 logic and the decisions above:

- [ ] With a saved profile that has at least a full name and one work-experience entry, click "Generate Resume from Profile" → expect the button to show "Generating…", then a "Resume ready" row with a "View PDF" link, no error shown.
- [x] Click "View PDF" → confirmed live, twice, that this needed fixing: first the raw `resumePdfUrl` 401'd (no bearer token), then the first fix's re-derived key 404'd (`STORAGE_NOT_FOUND`) — both corrected in Decision 12. **A profile whose resume was generated before `resume_storage_key` existed has no key to look up — click "Generate Resume from Profile" once more first**, so this run writes the key, then click "View PDF" to confirm it now actually opens a real, readable one-page PDF: name/contact header, a professional summary paragraph, a skills list, work experience with polished bullets, education, matching Decision 6's section order.
- [ ] With an empty/near-empty profile (no name, no title, no work experience), click Generate → expect the specific message "Add at least your name and either a job title or work experience before generating a resume." and confirm no Gemini call was logged (Decision 8 — this should cost nothing).
- [ ] Click Generate twice in a row on the same profile → expect a new PDF each time, and the "View PDF" link (and `profiles.resume_pdf_url` in the DB) pointing at the newest one after each click (Decisions 9-10).
- [ ] Compare the generated PDF's content against the real profile data for the test account → confirm no invented employer, date, or skill appears (Decision 2's "no hallucination" boundary).
- [ ] If the shared Gemini free-tier quota (20 requests/day, now shared with Feature 07's extraction) is hit, confirm the generic "temporarily unavailable" message appears and the button re-enables — not a raw error or a stuck "Generating…" state (Decision 13).

### References

No new external web research this pass. This decision is grounded in the project's own already-resolved conventions (Features 04/06/07 above) plus live checks against the running InsForge backend and its SDK docs: `get-table-schema` (confirmed `profiles`'s real columns, Decision 10), `list-buckets` (confirmed the `resumes` bucket already exists, Decision 9), the `fetch-docs storage-sdk` and `fetch-docs db-sdk` MCP tools (confirmed the real `upload()`/`update()` signatures and the absence of a signed-URL method, Decisions 9 and 12), and a real `npm run build` (Decision 14).

---

## Adzuna Job Discovery (Feature 10 decision — `/architect`, 2026-09-08)

`build-plan.md`'s Feature 10 entry says Adzuna is searched, GPT-4o scores each job, and results are saved — but names the wrong provider (the project switched to Gemini project-wide in the Feature 08 decision, which explicitly named Feature 10 as needing its own pass), and leaves open how many jobs get saved, how repeat searches are handled, how a partial or total failure surfaces, how country is detected, and what actually happens to `find-jobs`'s still-mock jobs table. This section closes those gaps. Every open question below was put to the engineer directly rather than assumed; the answer given is recorded next to each.

**1. AI provider — Gemini, completing the project-wide switch.** Confirmed directly by the engineer, not re-litigated: reuse `lib/gemini.ts`'s existing client as-is (no new client file, matching Features 07/08's own reuse of it), model `gemini-3.6-flash`, `responseJsonSchema` derived via `z.toJSONSchema()` from one zod schema shared between request and response validation, temperature `0.3` (deterministic scoring, matching this project's existing convention), `maxOutputTokens: 8000` (reused from Features 07/08's own live-verified number — `gemini-3.6-flash`'s thinking tokens count against this budget regardless of how short the visible output is, and a smaller budget is exactly what silently truncated Feature 07's first attempt). `build-plan.md`'s Feature 10 text and `library-docs.md`'s `## OpenAI GPT-4o` / `## Gemini` scope notes are corrected below to match, the same way Feature 08's provider correction updated those files.

**2. Score every job in one batched Gemini call, not one call per job.** The literal reading of `build-plan.md`'s wording ("GPT-4o scores job against user profile," singular) implies a call per job — up to 10 Gemini calls for one search (`results_per_page: "10"`, `library-docs.md`). That collides directly with a real, already-documented constraint: the provisioned `GEMINI_API_KEY` is free tier, capped at **20 requests a day per model** (confirmed live via a real `429` during Feature 07's build). A single search at 10 calls would burn half that daily budget in one click. Instead, one Gemini call per search scores the whole batch: the request lists every candidate job (title, company, location, a capped description snippet), the response returns one match result per job, correlated back by array index (mirrors Feature 08 decision 3's `workExperience.length` runtime check — the model is asked to return exactly as many results as jobs sent, and a length or index mismatch is handled per Decision 8 below, not treated as a hard failure). This cuts Gemini usage for this feature from up to 10 calls to exactly 1 per search, and it's still an honest reduction, not a full fix — see Decision 12's Follow-up on the shared quota.

```typescript
// lib/job-matching-schema.ts
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
```

System prompt: "You are a job matching assistant. Score each listed job against the candidate's profile: 0 to 100, one paragraph reason, matchedSkills (skills from the candidate's profile that this job genuinely needs — only skills literally present in the profile), missingSkills (real skills the job description asks for that are not in the candidate's profile — do not invent a skill the job description itself never mentions). Return one result per job, in the same order, using each job's given index." (Corrected at cross check, 2026-09-08: an earlier draft of this prompt added a blanket "never invent a skill the candidate's profile doesn't list," copied from Feature 08's resume-generation prompt without adjusting it — taken literally it would have barred the model from naming `missingSkills` at all, since that field's whole purpose is skills absent from the profile. The split constraint above says what "don't invent" actually means for each of the two fields.) User prompt feeds the candidate's `skills`, `experienceLevel`, `yearsExperience`, `currentTitle`, `workExperience` (from the `profiles` row, read once per search, never re-fetched per job) plus the array of `{ index, title, company, location, description }` for every job Adzuna returned this search (each `description` capped at 1000 characters before sending — Adzuna's own snippet is already short, this is a defensive ceiling only, matching Feature 07 decision 8's "cap the request side too" precedent).

**2a. Minimal-profile guard, before any Adzuna or Gemini call (cross check finding).** The route loads the caller's `profiles` row (`insforge.database.from('profiles').select('*').eq('id', user.id).maybeSingle()`) immediately after the auth check, before calling Adzuna at all — this is also where the fields Decision 2's user prompt needs come from, named explicitly so nothing is left for the build to guess. If the row is `null`, or `skills` is empty and `current_title` is also empty (mirrors Feature 08 decision 8's minimal-data guard, adapted to what scoring actually needs), return `400` with "Add at least your skills or a job title to your profile before searching for jobs." — no Adzuna call, no Gemini call, nothing costs anything. This is a real gap the original draft left open (there was no guard at all).

**3. Data model — no new columns, no new tables.** Reuses exactly the `agent_runs` and `jobs` tables Feature 04 already built. Confirmed with the engineer directly: `agent_runs` gets one new row per search (`status`, `job_title_searched`, `location_searched`, `jobs_found`, `started_at`, `completed_at`); `jobs` gets one row per Adzuna result that is both new (Decision 5) and successfully scored (Decision 8), with `source: 'search'`, `run_id` set to the new run, and every other column populated per the mapping `library-docs.md`'s `## Adzuna API` section already documents correctly (`about_role` from the description snippet, salary formatted from `salary_min`/`salary_max`, `source_url`/`external_apply_url` both set from `redirect_url`).

**4. Country detection — a small hardcoded keyword map, not a geocoding call.** `build-plan.md` says "detect country from location input, default to 'us'" with no rule. A real geocoding API is disproportionate for four supported countries (`us`/`gb`/`au`/`ca`, per `library-docs.md`). New `detectAdzunaCountry(location: string): AdzunaCountry` in `agent/adzuna.ts`: lowercase and trim the input, check it against a short list of country names/codes and a handful of major cities per country (`uk`, `united kingdom`, `england`, `scotland`, `london`, `manchester` → `gb`; `australia`, `sydney`, `melbourne`, `brisbane` → `au`; `canada`, `toronto`, `vancouver`, `montreal` → `ca`), default `us` when nothing matches or the location is empty. **Documented limitation, not a bug** (same treatment as Feature 06 decision 5's comma-split rule): an ambiguous city name shared across countries (e.g. "London, Ontario") is misdetected — acceptable for a keyword heuristic, flagged in Follow-up rather than solved with a real geocoding dependency this project doesn't otherwise need.

**5. Duplicate handling — skip a job already saved for this user with the same `source_url`.** Confirmed with the engineer: Adzuna's `redirect_url` is a stable per-listing identifier, and without dedup a repeated search (a realistic usage pattern — the same title/location searched again days later) would fill the jobs list with exact duplicate rows. Before scoring, the route queries `jobs` for the current user where `source_url` is in the set of this call's `redirect_url`s, and drops any Adzuna result already present from the batch sent to Gemini — no need to spend a Gemini call scoring a job that won't be inserted. No new unique constraint at the DB level (RLS + this app-level check is consistent with how this project has handled every other de-dup-shaped concern so far); a race between two concurrent searches for the same listing is accepted as out of scope, same class of gap as the storage isolation note in Feature 04.

**6. Save-scope semantics — save every new, successfully scored job; report the strong-match count separately.** Confirmed with the engineer directly, resolving a real tension in the existing docs: `project-overview.md`'s Job Matching section says "all jobs visible... regardless of score, low scoring jobs still accessible," while the approved success-banner mock text reads "Found 8 jobs and saved 4 strong matches." The engineer's call keeps both true: **every** new job that clears dedup and scores successfully gets saved (no score-based filtering on what's written to the DB — Feature 11's Low Match filter stays a real, populated filter, not a dead one), and the banner's two numbers both describe that same saved set: "Found N jobs" = the count of jobs newly saved this run, "and saved M strong matches" = how many of those N score `>= MATCH_THRESHOLD`. **"Found" and "saved" are the same number in this implementation** (both count newly inserted jobs) — the banner's two verbs describe one action from two angles, not two different counts. `agent_runs.jobs_found` is set to this same N (the saved count), not Adzuna's raw result count — this is also the number Feature 16's Recent Activity will read ("Found X jobs for [jobTitle]"), and a saved count is the more accurate one for that downstream feature to report.

**7. `MATCH_THRESHOLD` — add it now, exactly where `code-standards.md` already says it belongs.** `code-standards.md` has documented `export const MATCH_THRESHOLD = 70` in `lib/utils.ts` since the project's early conventions were written, but no feature has needed it until this one (Feature 11's High/Low filter comes later, but this feature already needs it for Decision 6's strong-match count). Add it to `lib/utils.ts` alongside the existing `formatRelativeTime`, imported wherever "strong match" or a score threshold is checked — never a re-hardcoded `70`.

**8. Zero results and partial scoring failure — two different, both non-fatal, outcomes.**
   - **Adzuna returns zero jobs** (a valid, ordinary outcome, not a failure): `agent_runs` completes normally (`status: 'completed'`, `jobs_found: 0`), no Gemini call is made (nothing to score), the client shows "Found 0 jobs for [jobTitle] in [location] — try a different search." **All results are duplicates after Decision 5's dedup** gets the same treatment with adjusted copy: "No new jobs found for [jobTitle] in [location] — you've already found these before."
     - **Distinguishing these two cases (cross check finding — the response shape as first drafted couldn't tell them apart).** The route's success response includes `adzunaResultCount` (the raw count Adzuna returned, before dedup) alongside `jobsFound`/`strongMatches` (both post-dedup, post-scoring, the saved count — Decision 6). The client picks the copy: `adzunaResultCount === 0` → "Found 0 jobs..."; `adzunaResultCount > 0 && jobsFound === 0` → "No new jobs found... you've already found these before."; `jobsFound > 0` → the normal Decision 6 banner. `adzunaResultCount` is never itself stored anywhere (not on `agent_runs`, which stays defined as the saved count per Decision 6) — it exists only to let the client render the right zero-result copy.
   - **The batched Gemini call itself fails outright** (quota, timeout, network, or a schema-invalid response) — confirmed with the engineer: this is treated as a whole-run failure (Decision 9), not a per-job skip, since no job could be scored at all.
   - **The batched call succeeds but returns fewer valid results than jobs sent**, or an index doesn't match any job in the request (a partial/malformed response, not an outright failure) — confirmed with the engineer: only the jobs missing a valid result are skipped (not inserted, logged via `logAgentError()` — Decision 9a — with `level: 'error'`, the job's title/company in the message, `job_id: null` since it was never inserted), the rest of the batch is still saved normally. A `results.length` that's merely short is not itself an error; only jobs with no matching `index` in the response are affected (mirrors Feature 08 decision 3's array-length runtime check, applied per-item instead of rejecting the whole batch — a job with no real score would break `MatchScoreBar`'s and Feature 11's score-sort assumptions if inserted with a placeholder value).
     - **Duplicate `index` values in the response (cross check finding).** The schema only constrains `index` to a non-negative integer, not uniqueness — nothing stops Gemini returning two results claiming the same index. When building the index → result map, keep only the **first** occurrence of each index; log a warning to the server console (`[api/agent/find] duplicate index in Gemini response`) and treat every later duplicate the same as a missing index (that job is skipped, per the paragraph above) rather than leaving "which one wins" to whatever order the implementation happens to iterate in.
   - **A job's DB insert itself fails after scoring succeeded (cross check finding — not covered by the two cases above).** A transient DB error, or (before the Decision 3a fix) the `job_type` CHECK constraint, can fail one row's insert even though Adzuna and Gemini both succeeded for it. Treated identically to a scoring-miss: that job is excluded from `jobsFound`/`strongMatches` and logged via `logAgentError()` (`level: 'error'`, `job_id: null`), the rest of the batch's inserts still proceed — never abort the whole run over one row, and never let `agent_runs.jobs_found` drift from what's actually readable in `jobs` (insert jobs one at a time in the loop, not a single bulk insert that would fail or succeed atomically as one unit, so one bad row can't take the others down with it).

**8a. `job_type` mapping bug, found at cross check.** The `library-docs.md` Adzuna mapping this decision (Decision 3) said to reuse "as already documented correctly" was not correct: it mapped `jobs.job_type` from `contract_type`, whose real Adzuna values are `"permanent"`/`"contract"` — not `"fulltime"`/`"parttime"`. Any ordinary permanent listing (the common case) would write `job_type: "permanent"`, fail the `job_type` CHECK constraint (`architecture.md`'s Feature 04 migration: `IN ('fulltime','parttime','contract')`), and hit exactly the "DB insert fails after scoring succeeded" case above for every ordinary job. **Fixed directly in `library-docs.md`'s Adzuna section** (not deferred to `/develop`): `job_type` is now derived from the separate `contract_time` field (`full_time`/`part_time`), with `contract_type === "contract"` overriding to `"contract"` when present. Decision 3 above should be read as reusing the *corrected* mapping, not the one originally shipped in `library-docs.md`.

**9. Whole-run failure — the Adzuna call itself fails, or Gemini fails outright (Decision 8's second bullet).** Confirmed with the engineer: `agent_runs` is marked `status: 'failed'`, `completed_at: now()`; the full error is logged via `logAgentError()` (Decision 9a) with `level: 'error'`, `job_id: null` and to the server console with the `[api/agent/find]` prefix (`code-standards.md`'s Error Handling convention); the client gets a single generic message, "Couldn't search for jobs right now. Please try again." — never the raw Adzuna/Gemini error text (`code-standards.md`: "user-facing errors must never expose raw internals"). No jobs are saved from a run that fails at either the Adzuna or the whole-batch-Gemini stage.

**Corrected live, 2026-09-09 — this path fired for a real, non-code reason.** The engineer hit this exact branch on a real search: `agent_logs` showed Gemini's batched scoring call returned a live `503 UNAVAILABLE` — `"This model is currently experiencing high demand... Please try again later."` Confirmed the failure handling above worked correctly end to end (`agent_runs.status: 'failed'`, generic message, no jobs saved) — this is not a defect in this decision. Since Gemini's own message calls a `503` explicitly transient, added `withGeminiRetry()` (`lib/gemini.ts` — see `library-docs.md`'s Gemini section) as a thin wrapper around the `generateContent()` call in `agent/matcher.ts`: retries a `503` up to twice with a short delay before this Decision 9 path ever triggers. A `429` (Decision 12's Follow-up quota cap) is deliberately not retried — it would just waste another request against the same exhausted daily cap. This only reduces how often a transient blip reaches Decision 9; the failure contract itself (`status: 'failed'`, generic message, `502`) is unchanged for a genuine outright failure.

**9a. `logAgentError()` — the shared logging helper this decision (and `code-standards.md`'s own Agent Code example, and `library-docs.md`'s Company Research pattern) already assumes exists, made explicit at cross check.** No file implementing it exists yet in this codebase (`agent/` doesn't exist at all before this feature). New `lib/agent-logs.ts`: `logAgentError(userId: string, runId: string, jobId: string | null, message: string, error: unknown): Promise<void>` — inserts one row into `agent_logs` (`level: 'error'`, the given `user_id`/`run_id`/`job_id`, `message` plus `String(error)`), wrapped in its own try/catch that only `console.error`s on failure (a logging failure must never itself throw and mask the original error). `userId` is required because `agent_logs.user_id` is `NOT NULL`; `runId` is also required, not nullable — every call site in this feature (Decisions 8, 8a, 9) already has both a real authenticated user and a real `agent_runs` row by the time it logs; the one case with no run yet (Decision 9c) is exactly why that branch bypasses this helper entirely rather than being passed a `null`.

**9b. HTTP status codes, named explicitly (cross check finding — none were pinned beyond Decision 10's `401`).** Matches Feature 08's precedent (the closest analog: a route that also gates on auth, a data guard, and an AI call) rather than a flat `500` for everything: `401` — no session (Decision 10). `400` — missing/empty `jobTitle`, or the Decision 2a minimal-profile guard. `502` — the Adzuna call or the whole-batch Gemini call fails outright (Decision 9): a failure from an upstream service, not this server's own bug. `500` — reserved for a genuinely unexpected internal error (e.g. the `agent_runs` insert itself, Decision 9c) rather than a named upstream failure.

**9c. If the initial `agent_runs` insert itself fails (cross check finding — Decision 9 assumed a run row already exists to mark `'failed'`).** No `run_id` exists yet to attach an `agent_logs` row to, so this branch logs to the server console only (`[api/agent/find]` prefix, per `code-standards.md`) via a direct `console.error`, not `logAgentError()` — this is exactly why Decision 9a's `runId` param is required rather than nullable, this is the one case with no run to log against, and it bypasses the helper entirely rather than being passed a placeholder. Returns the same generic message as Decision 9, at `500` (Decision 9b — this is this server's own DB write failing, not an upstream service).

**9d. Request body validation, named explicitly (cross check finding).** `{ jobTitle: string, location?: string }`. `jobTitle` — required, non-empty after `.trim()`, else `400` (Decision 9b). `location` — optional; if the key is missing entirely (not just an empty string), coerce to `""` before it ever reaches `detectAdzunaCountry()` (Decision 4), which calls `.toLowerCase()`/`.trim()` on it and would throw on `undefined` otherwise.

**10. Auth — this route is its own gate, not defense-in-depth.** Unlike every Server Action so far (`proxy.ts` already protects the *page* that renders the form, so the action's own `getCurrentUser()` check is a paranoia return), `proxy.ts`'s `PROTECTED_ROUTES` list (`/dashboard`, `/profile`, `/find-jobs`) does not cover `/api/*` at all. `POST /api/agent/find` is reachable directly with no page in front of it, so its own `createInsforgeServer()` + `getCurrentUser()` check is the **only** thing stopping an unauthenticated call — return `{ success: false, error: "Not authenticated" }` at `401` when it fails, not a redirect (this is an API route, not a page or a Server Action). Every DB write (`agent_runs` insert, `jobs` insert, the dedup read) is scoped to that resolved `user_id`, never a client-supplied one, on top of the RLS policies Feature 04 already put on both tables.

**11. `SearchControls.tsx` becomes a Client Component with a plain fetch handler — not a Server Action.** Settled by an existing project invariant, not asked: `code-standards.md`'s Invariants section already states "Server Actions never call agent functions. Agent functions are only called from API routes" — so a `useActionState`/Server-Action wrapper (Features 06/07's pattern) is not available here at all; this matches Feature 08's own precedent instead (a route handler with a plain client `fetch()` call and local `isSearching`/`error`/`successMessage` state, not `useActionState`). `SearchControls` gains `"use client"`, controlled `jobTitle`/`location` inputs, and an `onSubmit` handler: `POST /api/agent/find` with `{ jobTitle, location }`, disables the Find Jobs button and shows a loading label while pending (same `disabled={isPending}` pattern as every other in-flight action in this app), and on success calls `router.refresh()` (`next/navigation`) so the Server Component tree re-renders with the freshly saved jobs — see Decision 12. On failure, renders the generic message from Decision 9 in the same banner slot the success message uses today, swapped to the existing `error`-token treatment (`text-error`, matching every other inline error in this app) rather than the `success-lightest` banner styling. **Initial state, before any search has run this session (cross check finding — left unstated in the first draft): the banner renders nothing** — same "renders `null` when there's nothing to show yet" precedent as `ResumePreview.tsx` (Feature 08) — not the hardcoded always-visible mock text `SearchControls` currently ships with.

**12. `app/find-jobs/page.tsx` swaps `MOCK_JOBS` for a real, unpaginated DB read — Feature 11 still owns filter/sort/pagination.** Confirmed with the engineer: leaving the table on Feature 09's mock data after a real, successful search would visibly contradict the banner it just showed (`project-overview.md`'s own flow says jobs "appear in the job list below" right after a search). `app/find-jobs/page.tsx` becomes async, resolves the current user, and reads `insforge.database.from('jobs').select('*').eq('user_id', user.id).order('found_at', { ascending: false })` with no `.range()`/limit — every one of the user's saved jobs, unpaginated, mapped through a new small transform (`lib/job-transform.ts`, mirroring `lib/profile-transform.ts`'s existing pattern) from the DB row shape into `components/find-jobs/mock-jobs.ts`'s already-DB-aligned `Job` type (`company`/`role`/`matchScore`/`salaryEstimate`/`foundAt`/`source` — chosen in Feature 09 specifically to make this swap close to drop-in). `mock-jobs.ts`'s `MOCK_JOBS` export and its file comment are deleted once nothing imports it; the `Job` type itself moves to `types/index.ts` since it now has two real consumers (the page's read, and the route's insert path). Feature 11 (not this feature) still owns `.range()`-based pagination, the High/Low Match filter, the text search, and wiring the currently-uncontrolled `JobFilters` "All Matches" select — this decision only stops the page from showing fake data after a real search, it does not implement any of Feature 11's own logic.

**13. PostHog — both documented events, fired from the route.** `job_search_started` fires once, right after the auth check and before the Adzuna call, `{ userId, jobTitle, location }`. `job_found` fires once per job actually inserted (after Decision 5's dedup and Decision 8's scoring-failure skip — never for a duplicate or an unscored job), `{ userId, source: 'search', matchScore }`. One `createPostHogServer()` instance for the whole request, every event captured on it, one `await posthog.shutdown()` at the very end of the handler (covers every return path, including the failure branches in Decisions 8-9, which still shut down cleanly even when they fire zero `job_found` events) — matches `lib/posthog-server.ts`'s existing "always use and shutdown in the same function" rule, read as scoped to the one handler invocation rather than one client per event.

**14. Configuration — nothing new.** `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, and `GEMINI_API_KEY` are already in `code-standards.md`'s environment table from earlier features; this feature adds no new secret or env var.

### Build plan for `/develop`

1. `lib/utils.ts` — add `export const MATCH_THRESHOLD = 70` (Decision 7).
2. `lib/job-matching-schema.ts` (new) — `jobMatchSchema` from Decision 2.
3. `lib/adzuna.ts` (new) — `searchJobs()` per `library-docs.md`'s `## Adzuna API` pattern, including the cross-check-corrected `job_type` mapping (Decision 8a) — do not carry forward the original, wrong `contract_type || "fulltime"` mapping.
4. `lib/agent-logs.ts` (new) — `logAgentError(userId, runId, jobId, message, error)` per Decision 9a; `userId` is required because `agent_logs.user_id` is `NOT NULL`.
5. `types/index.ts` — move `Job`/`JobSource` here from `components/find-jobs/mock-jobs.ts` (Decision 12); add the request type (`{ jobTitle: string; location?: string }`, Decision 9d) and response type (`{ jobsFound: number; strongMatches: number; adzunaResultCount: number; jobTitle: string; location: string }`, Decisions 6 and 8) for `POST /api/agent/find`.
6. `agent/adzuna.ts` (new) — `discoverJobs(jobTitle, location, userId, runId)` per `code-standards.md`'s Agent Code convention (`{success, jobs?, error?}`, try/catch, `logAgentError()` before returning on failure): calls `lib/adzuna.ts`'s `searchJobs()`, `detectAdzunaCountry()` (Decision 4), the dedup read (Decision 5). Returns both the raw Adzuna results (for `adzunaResultCount`) and the post-dedup list to score.
7. `agent/matcher.ts` (new) — `scoreJobs(jobs, profile, userId, runId)` — the `runId`/`userId` params (added at cross check) are what let this function call `logAgentError()` itself on a whole-batch Gemini failure, per the same Agent Code convention as `discoverJobs`. The one batched `gemini.models.generateContent()` call (Decision 2), validates against `jobMatchSchema`, returns results keyed by index with duplicate-index and missing-index handling per Decision 8.
8. `app/api/agent/find/route.ts` (new) — `POST` handler tying 6 and 7 together per Decisions 8-11: auth check (`401`, Decision 10), body validation (Decision 9d, `400`), the Decision 2a profile guard (`400`), `agent_runs` insert (`status: 'running'`; its own failure branch is Decision 9c, `500`, no `logAgentError()` call), the discover → dedup → score → per-job insert sequence (jobs inserted one at a time, not one bulk insert, per Decision 8's "one bad row can't take the others down" rule), `agent_runs` update (`status: 'completed'` or `'failed'`, `jobs_found` = the saved count, `completed_at`), PostHog events (Decision 13), `revalidatePath('/find-jobs')` on success (so the Server Component page reflects the new rows even without the client's own `router.refresh()`), returns `{ success, data: { jobsFound, strongMatches, adzunaResultCount, jobTitle, location }, error? }` — `502` for an Adzuna or whole-batch-Gemini failure (Decision 9b), never a raw upstream error message (Decision 9).
9. `components/find-jobs/SearchControls.tsx` — `"use client"`, controlled inputs, `onSubmit` fetch handler, no-banner initial state, loading/error/success states per Decision 11; the success copy branches on `adzunaResultCount`/`jobsFound` per Decision 8's three-way split.
10. `lib/job-transform.ts` (new) — DB row → `Job` transform per Decision 12, mirroring `lib/profile-transform.ts`'s pattern.
11. `app/find-jobs/page.tsx` — becomes `async`, real unpaginated read per Decision 12, passes real `jobs` to `JobsListSection` in place of `MOCK_JOBS`.
12. `components/find-jobs/mock-jobs.ts` — delete once nothing imports it (Decision 12).
13. `context/build-plan.md` — Feature 10's paragraph corrected below (Gemini, batched scoring, dedup, save-scope semantics) as part of this same pass.
14. `context/library-docs.md` — `## OpenAI GPT-4o` / `## Gemini` scope notes, and the `job_type` mapping fix (Decision 8a), corrected below as part of this same pass.

### Verify (once built)

- [ ] Search a title/location with real results → banner reads "Found N jobs and saved M strong matches" with N = M's superset per Decision 6, jobs appear in the table below with no page reload (Decisions 11-12), `agent_runs` row shows `status: 'completed'`, `jobs_found: N`.
- [ ] Run the identical search again immediately → banner reflects Decision 5's dedup (0 or few new jobs depending on whether Adzuna's own result set shifted), no duplicate rows appear in the table.
- [ ] Search a title with no real results (a nonsense string) → "Found 0 jobs..." message, `agent_runs` still `status: 'completed'`, `jobs_found: 0`, no Gemini call logged.
- [ ] Confirm total Gemini calls for one search is exactly 1 (Decision 2), not one per job — check server logs or a request count against the free-tier quota.
- [ ] Force an Adzuna failure (temporarily wrong `ADZUNA_APP_KEY`) → generic error banner, `agent_runs` `status: 'failed'`, real error in `agent_logs` and server console, no jobs saved (Decision 9).
- [ ] Confirm `/api/agent/find` rejects a request with no valid session (Decision 10) — the only gate on this route, since `proxy.ts` doesn't cover `/api/*`.
- [ ] Search a real title likely to return an ordinary permanent listing (most results) → confirm every one actually gets inserted, not silently dropped by the `job_type` CHECK constraint (Decision 8a's cross-check fix) — check `jobs_found` matches what the table actually shows, not a smaller number.
- [ ] With an empty or skills-and-title-empty profile, click Find Jobs → confirm the specific 400 message from Decision 2a appears and no Adzuna/Gemini call was made (check server logs), not a generic failure.

### Follow-up

- [ ] The shared Gemini free-tier quota (20 requests/day per model, already flagged in Features 07/08) is now touched by a third feature. Batching (Decision 2) keeps this feature's own usage to 1 call per search instead of up to 10, but the quota is still shared across extraction, resume generation, and every job search — upgrading the key's billing plan is more urgent now than when it was first flagged, not less.
- [ ] Country detection (Decision 4) is a documented, imperfect heuristic — revisit only if a real user hits a wrong-country result in practice (e.g. an ambiguous shared city name), not preemptively.
- [ ] A race between two concurrent searches for the same listing (Decision 5) could both pass the dedup check before either insert lands — accepted as out of scope, same class of gap as Feature 04's storage isolation note.

---

## Filter + Sort + Pagination (Feature 11 decision — `/architect`, 2026-09-09)

`build-plan.md`'s Feature 11 entry names the four behaviors (All/High/Low Match filter, three sort orders, text search, 20-per-page pagination) but leaves open the one load-bearing call: whether these run client-side over the jobs the page already loads, or server-side via URL params re-querying the DB on every change (the phrasing Feature 10's Decision 12 used — "Feature 11 owns `.range()`-based pagination" — leaned server-side, but that was this project's own note, not a ratified engineer decision). Put to the engineer directly; the rest below are implementation calls that follow from that answer.

**1. Client-side, over the jobs the page already loads — confirmed directly with the engineer.** `app/find-jobs/page.tsx` keeps Feature 10's unpaginated read of every job row for the current user; filter, search, sort, and pagination all run in the browser over that array. Rationale: this is a single-user, manually-triggered job list (`project-overview.md`'s Out of Scope: no scheduled agent runs) — the dataset one user accumulates from clicking "Find Jobs" stays small, so there's nothing here that needs a DB round trip to feel right. It also matches the client-side sort Feature 09 already shipped rather than introducing a second, URL-param-driven state model alongside it. **Not chosen:** server-side `.range()`/`.order()`/`.ilike()` queries driven by URL search params — scales indefinitely, but costs a page navigation (or a fetch + `router.refresh()`) on every filter/sort/search/page change, a separate count query, and debounce handling, for a scale this app doesn't have yet.

**2. Filter values reuse the existing `MATCH_THRESHOLD` constant, never a second hardcoded `70`.** All Matches — every job. High Match — `matchScore >= MATCH_THRESHOLD`. Low Match — `matchScore < MATCH_THRESHOLD`. Same threshold Feature 10's Decision 6/7 already established and saved to `lib/utils.ts`; this feature imports it, it does not redefine it.

**3. Text search — case-insensitive substring match against company OR role, applied on every keystroke, no debounce.** Since this runs client-side (Decision 1) against an already-in-memory array, there's no network call to debounce against; filtering an array of this size on every keystroke is negligible. Revisit only if Decision 1 itself is revisited.

**4. Pipeline order and page reset.** Derive the visible rows as: filter (score threshold) → search (text) → sort → paginate (slice to the current page). Changing the filter, the search text, or the sort order resets the current page back to 1 — standard list UX, and it avoids landing on a page that no longer exists once the result count shrinks.

**5. New pure helpers, colocated with their one consumer — same "don't promote until a second consumer needs it" precedent as `sort-jobs.ts` and the pre-Feature-10 `Job` type.**
   - `components/find-jobs/filter-jobs.ts` (new) — `FilterOption = "all" | "high" | "low"`, `filterJobs(jobs, filterBy)` (Decision 2's threshold logic), `searchJobs(jobs, query)` (Decision 3's case-insensitive company/role match).
   - `components/find-jobs/paginate-jobs.ts` (new) — `JOBS_PAGE_SIZE = 20` (`build-plan.md`'s fixed page size; scoped here since this page is still its only consumer, unlike `MATCH_THRESHOLD` which Feature 10 already shares across two features), `paginateJobs(jobs, page)` returning that page's slice, and `getPageNumbers(currentPage, totalPages)` for Decision 6 below.

**6. Page-number/ellipsis rule — the one `JobsPagination` currently fakes as a hardcoded "1 2 3 … 8."** Always show page 1 and the last page; show the current page and its immediate neighbors (±1); collapse any gap larger than one page into a single `…`. When `totalPages <= 7`, show every page number and no ellipsis at all — collapsing a single hidden page behind "…" would be a pointless truncation of a small, cheap-to-render list.

**7. `JobsListSection` stays the single owner of all interactive state — no new client components.** It already holds `sortBy` (Feature 09); this feature adds `filterBy`, `searchQuery`, and `currentPage` alongside it, all local `useState`, with the filtered → searched → sorted → paginated pipeline (Decision 4) derived via `useMemo`. Same "one small client island, not the whole page" pattern Feature 09 established — `app/find-jobs/page.tsx` stays an unchanged Server Component.

**8. `JobFilters` becomes fully controlled.** Its "All Matches" select is currently `defaultValue="all"` with no `onChange`, and its text input has no state at all — both get the same controlled-prop treatment `sortBy`/`onSortChange` already uses: new `filterBy`/`onFilterChange` and `searchQuery`/`onSearchChange` props.

**9. `JobsPagination` becomes real, driven by props instead of hardcoded markup.** New props: `currentPage`, `totalPages`, `totalCount` (the filtered/searched count, not the raw `jobs.length` Feature 10 wired it to), `onPageChange`, `onPrevious`, `onNext`. "Showing X to Y of Z results" — X/Y are the current page's real start/end index into the filtered set, Z is `totalCount`. Previous disables on page 1, Next disables on the last page. Page numbers render from Decision 6's `getPageNumbers()`, each clickable and the current one highlighted (today's static `accent`-styled "1").

**10. A second, distinct empty state for "filtered/searched down to zero," separate from Feature 09's "no jobs saved yet."** `JobsListSection`'s existing `JobsEmptyState` (`jobs.length === 0`) stays exactly as is. A new, local, unexported `NoMatchesEmptyState` (mirrors its structure) renders when `jobs.length > 0` but the filtered+searched result is empty — otherwise the table would render zero rows with no explanation, and "Showing 1 to 0 of 0" is a confusing thing to show without one.

**11. No new PostHog event, no DB read or write.** Pure client-side wiring over data Feature 10 already loads — matches `build-plan.md`'s Feature 11 entry, which lists no event.

**12. `FilterOption` stays local to `components/find-jobs/`, same as `SortOption`.** One consumer each (`JobFilters`/`JobsListSection`); no promotion to `types/index.ts` unless a second real consumer needs it later.

### Build plan for `/develop`

1. `components/find-jobs/filter-jobs.ts` (new) — `FilterOption`, `filterJobs()`, `searchJobs()` per Decisions 2-3, 5.
2. `components/find-jobs/paginate-jobs.ts` (new) — `JOBS_PAGE_SIZE`, `paginateJobs()`, `getPageNumbers()` per Decisions 5-6.
3. `components/find-jobs/JobFilters.tsx` — controlled `filterBy`/`onFilterChange` and `searchQuery`/`onSearchChange` props alongside the existing `sortBy`/`onSortChange` (Decision 8).
4. `components/find-jobs/JobsListSection.tsx` — add `filterBy`/`searchQuery`/`currentPage` state, the `useMemo` pipeline (Decision 4), page reset on filter/search/sort change, and the new `NoMatchesEmptyState` (Decisions 7, 10).
5. `components/find-jobs/JobsPagination.tsx` — rewritten to take the real props from Decision 9 in place of the current hardcoded markup.
6. `context/progress-tracker.md` — mark Feature 11 done with build notes, per `AGENTS.md`'s "update after every feature" rule.
7. `context/ui-registry.md` — update the `JobFilters`/`JobsListSection`/`JobsPagination` entries to match their new props and behavior.

### Verify (once built)

- [ ] Typing in the search box filters the table live, case-insensitive, matching company or role.
- [ ] All Matches / High Match / Low Match narrows the table correctly at the `MATCH_THRESHOLD` boundary.
- [ ] Changing the filter, the search text, or the sort order resets pagination to page 1.
- [ ] With more than 20 filtered/searched jobs: correct total page count, correct "Showing X to Y of Z," Previous/Next work and disable at the first/last page respectively.
- [ ] `totalPages <= 7` renders every page number with no ellipsis; a larger count collapses correctly around the current page (Decision 6).
- [ ] Filtering or searching down to zero results (with `jobs.length > 0`) shows `NoMatchesEmptyState`, not an empty table or a "Showing 1 to 0 of 0" banner.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.

### Follow-up

- [ ] If one user's saved job count ever grows large enough that loading it all unpaginated becomes slow, revisit Decision 1 and move to the server-side `.range()` approach Feature 10's Decision 12 originally sketched.

---

## Company Research Agent (Feature 13 decision — `/architect`, 2026-09-10)

`build-plan.md`'s Feature 13 entry is already unusually detailed (SSRF-guarded homepage URL derivation, single Browserbase session, homepage + max-3-subpage `extract()`, dossier JSON shape, `jobs.company_research`/`company_researched_at` already migrated in Feature 04) — this section treats that as the real starting spec, not something to re-derive, and closes what it leaves open: the AI provider (explicitly flagged as TBD since Feature 07/08's decisions), a live-confirmed schema blocker that stops this feature from logging its own failures at all, the concrete SSRF implementation mechanism, the execution model, the re-run policy, and the loading/populated UI states no design mock covers. Every open question below was either put to the engineer directly or verified live (a real web check, a real schema query against this project's own InsForge backend) — none is assumed.

**1. AI provider — Gemini only, ratified directly by the engineer, not re-opened for discussion.** No ChatGPT/OpenAI/GPT-4o anywhere in this feature — for the dossier synthesis call *and* for Stagehand's own browser-driving model, which is a separate concern from synthesis (Feature 07 decision 1 and Feature 08 decision 1 both flagged Stagehand's `modelName` as needing its own look here, not assumed). This finalizes what those two decisions left open. Consistent with the live signal that `OPENAI_API_KEY` isn't even provisioned in `.env.local`.

**2. Stagehand's driving model — `google/gemini-3.6-flash`, confirmed via a live web check against Stagehand's current docs, not assumed from training data.** Stagehand (`@browserbasehq/stagehand`) supports a `provider/model` string for `model.modelName` since v2.5.2, including Google — confirmed against `docs.stagehand.dev/v3/configuration/models` and `docs.stagehand.dev/v3/basics/extract` (2026-09-10). Stagehand's own docs example uses `google/gemini-2.5-flash` — **not used here**: this project already found that exact model dead in production (a live `404`, Feature 07 decision, "no longer available to new users") and moved to `gemini-3.6-flash` project-wide. Use `google/gemini-3.6-flash` for consistency with every other Gemini call in this codebase, not Stagehand's (already-stale-relative-to-this-project's-own-findings) doc example. Structured `extract()` schemas are described as provider-agnostic (Stagehand translates the zod schema internally regardless of model) with no Gemini-specific caveat documented. **Live-confirmed during `/develop`, 2026-09-10 — not just the docs check above.** A real `Stagehand.create()` with this exact model config, driving a real Browserbase session against a real page (`stripe.com`), returned valid, correctly-shaped structured JSON from a schema-based `extract()` call. This also confirms Stagehand's own Gemini usage draws on the same `GEMINI_API_KEY` (Google AI Studio) key and quota as every other Gemini call in this project — resolving the Follow-up question this decision originally left open about whether Stagehand bills separately.

**2a. API key — passed explicitly, no new env var.** Stagehand's docs show an auto-load env var (`GOOGLE_GENERATIVE_AI_API_KEY`) different from this project's existing `GEMINI_API_KEY`. Don't add a second, differently-named copy of the same secret: Stagehand's `model` config also accepts an explicit `apiKey` field (the existing stale pattern in this file already did this for OpenAI: `modelClientOptions: { apiKey: ... }`) — pass `apiKey: process.env.GEMINI_API_KEY!` directly. No new configuration.

**3. `lib/stagehand.ts` — new factory, not a shared singleton.** Each research run needs its own Browserbase session, so this can't be a module-scope client instance like `lib/gemini.ts`. New `createResearchSession(): Promise<{ stagehand: Stagehand; sessionId?: string }>`.

**Corrected TWICE during `/develop`, 2026-09-10 — both corrections confirmed with a real live call, not just typechecked, the same bar Features 07/08/10 already set.** This decision's own sketch above (and `library-docs.md`) assumed a v3-style Stagehand API. The actually-installed `@browserbasehq/stagehand` is **v4.1.0**, a materially different major version:

1. **Constructor**: `new Stagehand({...}) + await stagehand.init()` doesn't exist in v4 — it's `await Stagehand.create({...})`, no separate `.init()` call. Confirmed against the installed package's real types (`static create(input: StagehandCreateOptions): Promise<Stagehand>`).
2. **Session creation — the bigger finding.** The original two-step design (a separate `@browserbasehq/sdk` client calling `bb.sessions.create({ projectId, timeout })`, then Stagehand attaching via `browserbase.connect({ apiKey, sessionId })`) **fails live**: `BrowserbaseSessionError: Stagehand extension is not installed in the connected browser. The extension must be included when the Browserbase session is created.` A session created by the plain Browserbase SDK has no Stagehand extension in it, and v4 needs one to drive the browser at all. Fixed by using `browserbase.launch({ apiKey: BROWSERBASE_API_KEY })` instead — it creates the session **and** uploads/installs the required extension automatically, confirmed live end to end: a real session launch, a real `google/gemini-3.6-flash`-driven `extract()` call against `stripe.com`, a real structured JSON result back, a clean `close()`. This is simpler than the original design, not a workaround: **`@browserbasehq/sdk` is not needed at all** and was uninstalled; `lib/browserbase.ts` (this decision's own Decision 3 sketch) was never needed and is not part of the build.
   - **One accepted behavior change, also confirmed live, not assumed:** `browserbase.launch()`'s real options schema in this version is only `{ apiKey, baseUrl }` — no `projectId` or session-timeout field (confirmed against the installed package's own runtime schema, not just its typed surface). The session's project is inferred from the API key (Browserbase's own documented default, fine for this app's single-project setup), and its timeout comes from the Browserbase project's own default rather than an explicit 120s. `BROWSERBASE_PROJECT_ID` is not consumed by this code path as a result — the real ceiling on how long a request waits is the Next.js route's own `maxDuration` (Decision 9), unchanged.
3. **`stagehand.context` doesn't exist either** — the real accessor is `stagehand.browser.context` (`stagehand.browser` is a getter returning `StagehandBrowser`, which carries `context: BrowserContext`, `.newPage(url)`, `.activePage()`).
4. **`extract()`'s schema argument is the second positional parameter**, `stagehand.extract(instruction, schema, options?)`, not a `{ instruction, schema }` object (confirmed against both the installed package's real overload — `extract<Schema extends z.ZodType>(instruction, schema, options?): Promise<ExtractResult<Schema>>` — and the current `docs.stagehand.dev/v4` documentation, not the `/v3` URL an earlier web check during `/architect` happened to land on).
5. **A real cross-package type friction, not a functional bug:** the installed `@browserbasehq/stagehand` pins its own `zod` (`4.4.3`), distinct from this project's own `zod` (`4.5.4`) — two structurally identical but nominally different packages, so TypeScript can't unify their `ZodType` branding across the boundary. Resolved with a narrow, explicit cast at the call site (`agent/research.ts`'s `forStagehandSchema()`) rather than pinning a shared zod version across two independently-versioned packages — both are plain zod v4 objects and interoperate correctly at runtime (confirmed by the same live extract() call above actually returning correctly-shaped data).

Final, live-confirmed shape: `browserbase.launch({ apiKey: BROWSERBASE_API_KEY })` → `Stagehand.create({ browser, model: { modelName: "google/gemini-3.6-flash", apiKey: GEMINI_API_KEY }, logging: { level: "off" } })` (`logging: { level: "off" }` replaces the old, no-longer-existing `disablePino: true`). Centralizes the model config in one `lib/` file per the System Boundaries rule ("third party client initialisation... only").

**4. Homepage URL resolution — `lib/safe-fetch.ts` (new), implementing `build-plan.md`'s SSRF guard exactly, with the one implementation detail its prose left open closed here.** New `resolveEmployerHomepageUrl(redirectUrl: string, companyName: string): Promise<string>` — never throws, always returns a URL (either the resolved real homepage or the `https://www.{cleanName}.com` fallback), matching this project's "always degrade gracefully" invariant. Implements `build-plan.md`'s hop-by-hop manual redirect follow (`fetch(url, { redirect: "manual" })`, capped at 5 hops) and IP-range validation (loopback, link-local including the cloud metadata address, private ranges, other reserved ranges) exactly as specified there — reuse that spec verbatim, don't re-derive it.
   - **The one gap build-plan.md's prose left open ("perform the actual request against the resolved IP you validated") is now concrete**: use `dns.promises.lookup(hostname, { all: true })` and reject the hop if **any** resolved address (not just the first) falls in a blocked range — a hostname can resolve to multiple IPs, some public and some not. Re-run this same lookup-and-validate step **immediately before** issuing each hop's actual `fetch()` call (not once, cached, at the top of the loop) — this is build-plan.md's own "re-check immediately before connecting" instruction, and it's what this decision adopts as the concrete mechanism, not a hardened DNS-pinned socket. **This leaves a small, accepted residual window** (the interval between the re-check and the actual TCP connect) where a DNS answer could theoretically still change — a real but genuinely low-probability gap for this feature's threat model (Adzuna listings, not arbitrary anonymous input), documented here as a limitation rather than solved with connection-level IP pinning, matching this project's established "documented limitation, not a bug" precedent (Feature 10's country detection, Feature 04's storage isolation gap). Revisit only if this feature ever accepts a URL from a less-trusted source than an Adzuna listing.
   - Company name cleaning for the fallback path reuses the existing regex below (`Inc.`/`LLC`/`Ltd.`/`Corp.`/`Co.` suffix strip, lowercase, strip whitespace). **Bug found and fixed via live testing during `/develop`, 2026-09-10**: the original pattern only consumed whitespace before the suffix, so `"Stripe, Inc."` (a comma before the space) cleaned to `"stripe,"` — a stray comma survives into the fallback URL (`https://www.stripe,.com`). Fixed to also consume an optional comma (`\s*,?\s*(Inc\.?|...)`); re-verified live afterward: `"Stripe, Inc."` → `https://www.stripe.com`.
   - **Live-verified end to end, not just unit-reasoned**: a real redirect chain (via a deterministic redirector) correctly resolved down to the real root domain and stripped a subdomain; a URL pointed at a loopback address and at the cloud metadata address (`169.254.169.254`) both correctly fell back to the company-name guess without ever being fetched; a plain non-redirecting HTTPS URL passed through unchanged.
   - `agent/research.ts` calls this one function and gets back a homepage URL; it never sees the hop-by-hop logic directly.
   - **Named explicitly (cross-check finding): `redirectUrl` comes from `jobs.source_url`** — "Original job listing URL" per the schema, and the actual Adzuna `redirect_url` value at insert time (`app/api/agent/find/route.ts`). `jobs.external_apply_url` holds the same value today but is documented separately ("Direct company apply URL") and isn't guaranteed to stay identical — `source_url` is the one to read here, not `external_apply_url`.

**4a. Sub-page selection rule, made concrete (cross-check finding — build-plan.md's "prefer about/blog/engineering/product over careers" is a preference, not an algorithm).** `pageLinks` (from the homepage `extract()`, Decision above) can return more than 3 links, duplicates, several of the same `kind`, or none of the preferred kinds — nothing in build-plan.md says how that reduces to the 3 actually-visited pages. Fixed priority order: `about` → `blog` → `engineering` → `product` → `team` → `other`, then `careers` last. Dedupe by resolved URL (case-insensitive, trailing slash ignored) before ranking. Take the first 3 in that priority order; only fall back to `careers` if fewer than 3 non-`careers` links exist at all. Deterministic and stated once, rather than left to whoever writes `agent/research.ts` to guess.

**5. Live-confirmed schema blocker, found by querying this project's actual InsForge backend, not assumed from architecture.md's prose: `agent_logs.run_id` is `NOT NULL`.** `architecture.md`'s own existing text already states company research "runs standalone... outside any `agent_run`, so it has none to attach a log to" — but as the schema actually stands, that means **company research cannot write to `agent_logs` at all**; every insert with `run_id: null` would violate the constraint. Confirmed live via `get-table-schema` (`agent_logs.run_id`: `isNullable: "NO"`, FK into `agent_runs(id)` `ON DELETE CASCADE`).
   - **Decision, confirmed with the engineer: migrate `agent_logs.run_id` to nullable.** New migration: `ALTER TABLE agent_logs ALTER COLUMN run_id DROP NOT NULL;` plus `ALTER TABLE agent_logs ADD CONSTRAINT agent_logs_run_id_or_job_id_check CHECK (run_id IS NOT NULL OR job_id IS NOT NULL);` — a row can never be anchored to neither (mirrors Feature 04's own "tie the nullable FK to a CHECK" pattern for `jobs.source`/`run_id`). **Not chosen**: reusing `agent_runs` with a synthetic row per research call — rejected because `agent_runs.job_title_searched` is itself `NOT NULL` and job-search-specific (confirmed live, same schema check); writing a placeholder into a column literally named "job title searched" for an operation that isn't a job search risks a future dashboard/activity feature (Feature 15/16) misreading it as a real search term.
   - **`logAgentError()`'s signature widens, not replaces.** Feature 10's `logAgentError(userId: string, runId: string, jobId: string | null, message: string, error: unknown)` becomes `logAgentError(userId: string, runId: string | null, jobId: string | null, message: string, error: unknown)`. Every existing Feature 10 call site is unaffected (they already always pass a real run id — a non-null string is still a valid `string | null`). Company research calls it as `logAgentError(userId, null, jobId, message, error)`.
   - **Fixes a real, backwards-argument bug already sitting in `library-docs.md`'s own Stagehand example**, corrected as part of this pass (see the doc corrections below): `logAgentError(userId, jobId, null, "Company research failed", error)` was passing `jobId` into the `runId` slot and `null` into the `jobId` slot — exactly backwards from Feature 10's ratified signature, presumably written before that signature existed and never reconciled. Corrected to `logAgentError(userId, null, jobId, "Company research failed", error)`.

**6. Data model — no other new columns beyond Decision 5's `agent_logs` fix.** `jobs.company_research` (jsonb) and `jobs.company_researched_at` (timestamptz, nullable) were assumed to already exist from Feature 04/the Feature 12 note. **Corrected live during `/develop`, 2026-09-10**: `company_researched_at` had never actually been applied to the live database — see the correction note under Feature 04's own decision above for the full story and the live fix (`ALTER TABLE jobs ADD COLUMN company_researched_at timestamptz;`, reconfirmed via `get-table-schema`). This feature writes to those two columns, plus the `agent_logs` migration in Decision 5. No new table.

**7. Re-run policy — always allowed, overwrites, confirmed directly with the engineer.** The "Research Company" button stays enabled once a dossier exists (no separate "already researched" disabled/hidden state) — clicking it again re-runs the full flow and replaces the dossier. **One case this needs to get right, not covered by "always overwrites" alone: a failed re-run must not blank out a perfectly good existing dossier.** `jobs.company_research`/`company_researched_at` are only written **after** synthesis succeeds — a failed run (Decision 10) leaves whatever was already stored (empty, or a previous dossier) completely untouched and returns an error to the client; the client's own state simply reverts to what it was rendering before the click, plus an inline error.

**8. Dossier synthesis reuses `lib/gemini.ts`'s existing client — no new client, no new library.** `gemini-3.6-flash`, `responseJsonSchema` derived via `z.toJSONSchema()` from one new `lib/company-research-schema.ts` (the same "one schema, not two hand-copies" rule the Gemini docs already state) exporting `companyResearchSchema` (the 9-field shape `build-plan.md` already specifies exactly) and `export type CompanyResearchDossier = z.infer<typeof companyResearchSchema>` — re-exported from `types/index.ts` since both `agent/research.ts` (backend) and `components/job-details/CompanyResearch.tsx` (frontend render) need it, the "promote to `types/index.ts` on a second real consumer" precedent this project has followed since Feature 09/10. Temperature `0.4` (`build-plan.md`'s own number — natural but grounded, matching this project's resume-generation convention for content with genuine synthesis, not deterministic extraction/scoring). `maxOutputTokens: 8000` (reused, not re-derived — Features 07/08/10's own live-verified number for `gemini-3.6-flash`'s thinking-token budget). Wrapped in `withGeminiRetry()` (`lib/gemini.ts`) — same transient-`503` handling as Feature 10's matcher call, not re-invented.

**9. Execution model — single blocking API route, confirmed directly with the engineer over a background-queue or poll-based alternative.** `POST /api/agent/research` stays open for the whole run (homepage extract → up to 3 sub-page extracts → session close → Gemini synthesis) and returns once it's actually done — no new infra (a queue, a status-polling column), matching this project's existing single-Browserbase-session design. **This corrects, not follows, `library-docs.md`'s current Browserbase caveat** ("do not add `maxDuration`... session continues running independently"): that line is really about not coupling the *Next.js function's* lifetime to the *Browserbase session's own* lifetime as if extending one automatically protects the other — it does not mean a route that synchronously drives `act()`/`extract()` calls needs no timeout headroom of its own. Under the execution model actually chosen here, the route needs to stay alive for the full round trip, so `app/api/agent/research/route.ts` exports `export const maxDuration = 180;` (3 minutes — the 120s Browserbase session budget plus headroom for the synthesis call that runs after the browser closes). **Flagged, not resolved here**: whether the actual deployment target (InsForge hosting, not assumed to be Vercel) honors `maxDuration` at all, or has a lower hard cap — this needs checking once the feature is actually deployed, not guessed now (Follow-up).

**10. Failure handling — one whole-run failure mode, not per-step.** Every individual browser step already degrades gracefully by design (`build-plan.md`: empty homepage extraction → skip straight to synthesis with job + profile alone; a failed `act()`/sub-page `extract()` → logged, continue with whatever was already gathered — this project's existing "never let one Stagehand step crash the run" invariant, unchanged). The one real failure this feature can still hit outright is **the Gemini synthesis call itself failing** (quota, timeout, a `503` `withGeminiRetry()` couldn't recover, a schema-invalid response) — since nothing before that point is ever fatal, the browser only ever produces "thin" input, never a hard error. On that failure: log via `logAgentError(userId, null, jobId, "Company research failed", error)` (Decision 5), return a generic message to the client ("Couldn't research this company right now. Please try again.") at `502` (an upstream-service failure, matching Feature 10's status-code convention), leave `jobs.company_research`/`company_researched_at` untouched (Decision 7).

**11. HTTP status codes, named explicitly.** `401` — no session (Decision 12). `400` — missing/empty `jobId` in the request body. `404` — `jobId` doesn't resolve to a job owned by the current user (Decision 12's ownership check) — never leak whether a job exists for someone else, same precedent as Feature 12's `notFound()` for another user's job id. `502` — the Gemini synthesis call fails outright (Decision 10). `500` — reserved for a genuinely unexpected internal error (the `jobs` update itself failing after a successful synthesis).

**12. Auth and ownership — this route is its own gate, `proxy.ts` doesn't cover it.** Same precedent as Feature 10's Decision 10: `proxy.ts`'s `PROTECTED_ROUTES` list doesn't include `/api/*`, so `POST /api/agent/research`'s own `createInsforgeServer()` + `getCurrentUser()` check is the only thing stopping an unauthenticated call (`401`). The job lookup is scoped in the same query as the ownership check — `insforge.database.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).maybeSingle()` — a `null` result means "doesn't exist, or isn't yours," both rendered as `404` (Decision 11), never distinguished to the caller.

**13. API surface.** `POST /api/agent/research`, body `{ jobId: string }`. Success: `{ success: true, data: { dossier: CompanyResearchDossier } }`. Failure: `{ success: false, error: string }` at the status codes in Decision 11. The route also does `revalidatePath` on the job detail page path so the Server Component re-renders with the freshly saved dossier — same pattern as Feature 10's Decision 8.

**14. PostHog — `company_researched` fires once per successful run, including a re-run.** `{ userId, jobId, company }`, matching `code-standards.md`'s existing six-event list exactly (this event was already on it, unused until now). One `createPostHogServer()` per request, `await posthog.shutdown()` on every return path — same "always use and shutdown in the same function" rule as every prior feature's server-side event.

**15. UI — loading state is a simulated step sequence, not a real backend-synced one; this is a deliberate tradeoff, stated plainly rather than left implicit.** The engineer picked step-progress copy ("Visiting homepage… Analyzing… Synthesizing…") together with the single-blocking-route execution model (Decision 9) — those two don't compose for free: a blocking route with no streaming response or status-polling channel gives the client no real signal about which phase is actually running. `CompanyResearch.tsx` (now a Client Component, Decision 17) cycles through three fixed labels on a timer (`~4s` per step) while the one `fetch()` is in flight, holding on the last label ("Synthesizing your dossier…") for however long the request actually takes past that point, rather than claiming to track real server state it has no way to observe. Documented here so this reads as an intentional, inspectable choice, not an accidental mismatch between two independently-made decisions.

**16. UI — populated dossier renders as stacked sections in the same card chrome as the empty state, not tabs or an accordion.** No design mock covers this state (`ui-registry.md`'s existing `CompanyResearch` entry only specs the empty state). Render all 9 fields from `build-plan.md`'s Job Details UI list top to bottom inside the existing card: Company Overview (paragraph) → Tech Stack (tag list, reusing the existing skill-tag visual pattern from the Match Score section) → Culture (bullet list) → Why This Role (paragraph) → Your Edge (bullet list) → Gaps to Address (bullet list) → Smart Questions (bullet list) → Interview Prep (bullet list) → Sources (small text, links). Kept as one flowing stack rather than tabs/accordion — simpler, no interaction state to manage, and matches this project's general preference for plain stacked content over interactive chrome elsewhere on this page (Match Score, Job Description are both plain stacks too).

**17. `CompanyResearch.tsx` becomes a Client Component — a necessary, not incidental, change from Feature 12's build.** Feature 12 shipped it as a Server Component with an "intentionally inert" button (`ui-registry.md`'s own words) specifically because Feature 13 didn't exist yet. It now takes an `initialDossier: CompanyResearchDossier | null` prop (Decision 17a) to seed its local state (`status: "idle" | "loading" | "error"`, the current dossier if any) and an `onClick` handler: `POST /api/agent/research` with `{ jobId }`, cycles the Decision 15 step labels while pending, on success sets the returned dossier into local state (renders immediately, no page reload needed) and calls `router.refresh()` (`next/navigation`) so the Server Component tree also picks up the persisted row on next natural revalidation — same belt-and-suspenders pattern Feature 10's Decision 11 used. On failure, shows an inline error message (`text-error` token, matching every other inline error in this app) without touching whatever dossier was already displayed (Decision 7).

**17a. A saved dossier must survive a fresh page load — closed here, not left to the build (cross-check finding: nothing previously named this value's source).** Today, `app/find-jobs/[id]/page.tsx`'s column select, `lib/job-transform.ts`'s `fromJobDetailRow`, and `types/index.ts`'s `JobDetail` all explicitly omit `company_research`/`company_researched_at` (the type's own comment defers this to "whichever feature owns shaping and displaying a populated dossier" — that's this one). Without this fix, reloading the job details page after a successful research run would show the empty state again despite the DB already holding the dossier. Fix: add both columns to `page.tsx`'s `.select()`, add `companyResearch: CompanyResearchDossier | null` and `companyResearchedAt: string | null` to `JobDetailRow`/`JobDetail`, map them in `fromJobDetailRow`, and pass `initialDossier={job.companyResearch}` into `CompanyResearch.tsx` from the page.

**18. Package installation — deferred to `/develop`, not installed as part of this decision.** Matches this project's established division: `/architect` decides, `/develop` installs and builds. **Correction (cross-check finding): `@browserbasehq/sdk` and `@browserbasehq/stagehand` are already on `code-standards.md`'s Approved dependencies list** (added when the Stack table first named Browserbase/Stagehand, before either feature was built) — only the actual `npm install` and the resulting `package.json` entries are net-new here, not a doc addition.

**19. Configuration — nothing new.** `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`, `GEMINI_API_KEY` are already provisioned (confirmed present in `.env.local`) and already in `code-standards.md`'s environment table from earlier features. `OPENAI_API_KEY` is deliberately never added (Decision 1).

**20. Implementation skills — none installed for this feature.** Confirmed this session: no `/browser` or `/fetch` skill exists in `.claude/skills/`, and `integration-nextjs-app-router` (despite its name) is a PostHog skill, not a browser one. No Browserbase/Stagehand MCP server is configured in `.mcp.json`. This feature is built directly against `library-docs.md` (corrected below) and Stagehand's official docs, with no installed skill to defer to — flagged in Follow-up as a candidate for a future `/audit` pass if Browserbase/Stagehand skills become available.

### Doc corrections (applied as part of this pass)

- **`library-docs.md`**: remove the dangling "Replace the existing Stagehand 'Company Research Pattern' section... with this:" editorial artifact sitting mid-file (leftover unexecuted edit instruction, not documentation). Correct the Stagehand init snippet and the Company Research Pattern's synthesis call from OpenAI/GPT-4o to Gemini per Decisions 2-3 and 8. Fix the backwards `logAgentError()` call in the `act()` example (Decision 5). Correct the Browserbase "do not add `maxDuration`" caveat per Decision 9. Update the `## Gemini` scope note and `## OpenAI GPT-4o` section's framing — Feature 13 is now decided (Gemini), only Feature 17 remains pending.
- **`architecture.md`** (this file, applied alongside this section): Stack table's Feature 13/17 note narrows to "Feature 17 still pending." `agent/research.ts`'s folder-structure comment drops "GPT-4o"/"provider TBD." **All three** Data Flow diagrams' provider mentions are corrected while this section is already being edited (cross-check finding — not just the Company Research one this decision directly touches): Job Discovery's "GPT-4o scores each job" (stale since Feature 10's own Gemini decision) and Resume Operations' "GPT-4o processes content" (stale since Feature 08's) both say Gemini now too, alongside Company Research. The Invariants line says Gemini, not GPT-4o. The stale `## Company Research Pattern` illustrative code block (OpenAI model config, old `stagehand.page` API, the 2-argument `logAgentError` call, the naive un-guarded homepage URL construction) is replaced with the corrected pattern per Decisions 2-5. The `jobs` table's `match_reason` column note ("GPT-4o explanation," predating Feature 10's own Gemini correction) is fixed to say Gemini while this table is already being edited for the `company_research`/`company_researched_at` rows.
- **`build-plan.md`**: Feature 13's entry is otherwise accurate and stays as the source of truth for the SSRF guard, extraction schemas, and dossier shape — only its "GPT-4o" mentions are corrected to Gemini.
- **`ui-registry.md`**: `CompanyResearch` entry updated — the button is no longer "intentionally inert"; add the loading (Decision 15) and populated (Decision 16) states, note the `initialDossier` prop (Decision 17a), and note the component is now a Client Component.
- **`code-standards.md`** (cross-check finding — missing from the original correction list): the Environment Variables table's `OPENAI_API_KEY` row currently reads "Not currently used... Features 10/13/17 (not yet built) will use it instead of GPT-4o when built" — strike "13" now that Decision 1 rules it out permanently for this feature, leaving only 17 as a pending reconsideration. `@browserbasehq/sdk`/`@browserbasehq/stagehand` need no addition to the Approved dependencies list — both are already on it (cross-check confirmed) — only their actual `npm install` is new (Decision 18).

### Build plan for `/develop`

1. Migration (via `run-raw-sql`): `agent_logs.run_id` → nullable, plus the `run_id IS NOT NULL OR job_id IS NOT NULL` check constraint (Decision 5).
2. `lib/agent-logs.ts` — widen `logAgentError`'s `runId` param to `string | null` (Decision 5). No behavior change for existing Feature 10 call sites.
3. `lib/company-research-schema.ts` (new) — `companyResearchSchema`, `CompanyResearchDossier` type (Decision 8).
4. `lib/safe-fetch.ts` (new) — `resolveEmployerHomepageUrl()` per Decision 4.
5. ~~`lib/browserbase.ts`~~ — **not built** (Decision 3's live-verified correction: `browserbase.launch()` creates the session itself, no separate `@browserbasehq/sdk` client needed).
6. `lib/stagehand.ts` (new) — `createResearchSession()` per Decision 3's corrected, live-verified shape.
7. `agent/research.ts` (new) — ties it together: loads the job + profile from DB, resolves the homepage URL (4), opens the session (3), runs homepage + up to 3 sub-page `extract()` calls per `build-plan.md`'s schemas (closing the session in a `finally`, never left open even on failure), calls Gemini synthesis (8) wrapped in `withGeminiRetry()`, `logAgentError()` on outright failure (5, 10) with no DB write, otherwise updates `jobs.company_research`/`company_researched_at` (7).
8. `app/api/agent/research/route.ts` (new) — `POST` handler per Decisions 11-14: auth (12), body validation, ownership-scoped job lookup (12), calls `agent/research.ts`, `revalidatePath`, PostHog event (14), `export const maxDuration = 180` (9).
9. `types/index.ts` — re-export `CompanyResearchDossier`; add `companyResearch`/`companyResearchedAt` to `JobDetail` (Decisions 8, 17a).
10. `lib/job-transform.ts` — add `companyResearch`/`companyResearchedAt` to `JobDetailRow`, map them in `fromJobDetailRow` (Decision 17a).
11. `app/find-jobs/[id]/page.tsx` — add `company_research`/`company_researched_at` to the `.select()`, pass `initialDossier={job.companyResearch}` to `CompanyResearch` (Decision 17a).
12. `components/job-details/CompanyResearch.tsx` — becomes `"use client"`, takes `initialDossier` prop, wired per Decisions 15-17: fetch handler, step-progress loading state, populated dossier render (16), inline error state that never clobbers an existing dossier.
13. `package.json` — add `@browserbasehq/stagehand` only (Decision 18/Decision 3's correction: `@browserbasehq/sdk` was installed, found unnecessary once `browserbase.launch()`'s live behavior was confirmed, and uninstalled again in the same pass).
14. `context/library-docs.md`, `context/architecture.md`, `context/build-plan.md`, `context/ui-registry.md`, `context/code-standards.md` — doc corrections above, applied in this same pass.

### Verify (once built)

- [x] **Live-confirmed during `/develop`, 2026-09-10**: Stagehand accepts `google/gemini-3.6-flash`, drives a real Browserbase session (launched via `browserbase.launch()`), and returns valid structured JSON from a schema-based `extract()` call against a real page — see Decision 3's corrections.
- [x] **Live-confirmed during `/develop`, 2026-09-10**: the SSRF guard (`lib/safe-fetch.ts`) correctly follows a real redirect chain down to its root domain, correctly falls back (never fetches) on a loopback address and on the cloud metadata address, and passes through a plain non-redirecting URL unchanged. A real bug found in the process (a stray comma from `"Stripe, Inc."`-style names) was fixed and re-verified — see Decision 4.
- [ ] Research a real, well-known company with a working public site through the actual running app → dossier renders all 9 fields, `jobs.company_research`/`company_researched_at` populated, `company_researched` PostHog event fires once. (The Stagehand/Gemini/SSRF mechanics above are now live-confirmed in isolation; this is the full route-to-UI path, which still needs a real click-through — same sandbox limitation as every prior feature.)
- [ ] **Reload the job details page (or open it in a new tab) after a successful research run** → the dossier renders immediately from `initialDossier`, not the empty state (Decision 17a) — this is the case the cross-check pass caught as untested by the same-session-only flow.
- [ ] Re-run research on the same job → dossier is replaced (Decision 7), no duplicate rows, no error.
- [ ] Research a company whose site can't be resolved (a fabricated/garbage company name) → synthesis still runs from job + profile alone, a dossier still saves (never empty per the standing invariant).
- [ ] Force the Gemini synthesis call to fail (e.g. a temporarily invalid key) → generic `502` error, `agent_logs` gets a real row with `run_id: null`, `job_id` set (Decision 5), and the job's existing `company_research` (if any) is untouched (Decision 7/10).
- [ ] Confirm `/api/agent/research` rejects a request with no valid session (`401`), and a `jobId` belonging to another user (`404`, not `403` — never confirms the job exists).
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean (verified during `/develop`, 2026-09-10, including after the `browserbase.launch()` correction and the comma-bug fix).

### Follow-up

- [ ] **Confirm `maxDuration` is actually honored by this project's real deployment target** (InsForge hosting — not assumed to be Vercel), and what the real hard cap is if any — Decision 9 chose 180s from Browserbase's own documented session budget, not from a confirmed platform limit.
- [x] ~~Whether Stagehand's Gemini usage draws from the same quota as this project's own `lib/gemini.ts` calls~~ — **resolved**: yes, confirmed live (Decision 2) — the same `GEMINI_API_KEY` is passed explicitly into Stagehand's model config, so it draws on the same Google AI Studio quota. The shared free-tier quota (20 requests/day per model, flagged since Feature 07) is now touched by a fourth feature, and by an agent whose exact per-run call count (Stagehand's own internal `act()`/`extract()` usage) isn't precisely bounded the way this project's own direct `generateContent()` calls are — worth watching in practice, not just at build time.
- [ ] The DNS-rebinding residual window in Decision 4 (re-check-immediately-before-connect, not full connection-level IP pinning) — revisit only if this feature's trust model changes (e.g. accepting a URL from a source less controlled than an Adzuna listing).
- [ ] No Browserbase/Stagehand Agent Skill or MCP server exists yet (Decision 20) — worth a `/audit` pass to check again once this feature is actually being built, in case one becomes available.
- [ ] **Cross-check finding, latent not active**: the new `agent_logs` CHECK constraint (Decision 5: `run_id IS NOT NULL OR job_id IS NOT NULL`) can conflict with `agent_logs.job_id`'s existing `ON DELETE SET NULL` — deleting a `jobs` row would null out a company-research log's only remaining anchor (`run_id` already null) and fail the CHECK, aborting the delete. No code path deletes a `jobs` row anywhere in this codebase today (verified: no `actions/jobs.ts`, no `.delete()` call on `jobs`), so this doesn't bite yet — but whoever builds a future job-deletion feature needs to know about this interaction before it does.
- [ ] **New, found during `/develop`**: `browserbase.launch()` gives no explicit control over which Browserbase project a session bills to or its timeout (Decision 3's accepted behavior change) — revisit if this app ever needs multiple Browserbase projects, or if the account-level default session timeout proves too short/long in practice.

### References

- Stagehand model configuration and Gemini/Google provider support: `docs.stagehand.dev/v3/configuration/models`, `docs.stagehand.dev/v3/basics/extract` (checked live, 2026-09-10).
