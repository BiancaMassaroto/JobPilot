# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

---

## Phase 1 — Foundation

### 01 Homepage

Build the complete homepage UI.

**UI:**

- Navbar — logo, Dashboard, Find Jobs, Profile links, Start for free button
- Hero section — headline, subheadline, Get Started CTA and Find Your First Match CTA
- Dashboard preview screenshot embedded below hero
- Features section — three value props with descriptions
- Testimonial section
- Bottom CTA section
- Footer

**Logic:**

- Get Started and Start for free → /login if not authenticated, /dashboard if authenticated

---

### 02 Auth

InsForge authentication — Google and GitHub OAuth.

**UI:**

- Login page — Google OAuth button, GitHub OAuth button

**Logic:**

- Google OAuth via InsForge
- GitHub OAuth via InsForge
- OAuth callback handler
- Session management
- Middleware protecting /dashboard, /profile, /find-jobs, /find-jobs/[id]
- After login → redirect to /dashboard

---

### 03 PostHog Initialization

Set up PostHog before any events fire. Must be done before any agent features.

**Logic:**

- Create lib/posthog-client.ts — PostHog browser client, initialized with NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST
- Create lib/posthog-server.ts — PostHog server client with flushAt: 1 and flushInterval: 0
- Initialize PostHog in root app layout — wraps entire app
- posthog.identify() called after successful login with user ID
- posthog.reset() called on logout

---

### 04 Database Schema

All InsForge tables and storage bucket created before any data is written.

**Decision finalized (`/architect`, 2026-09-06)** — see `architecture.md`'s "Constraints, Row Level Security & Migration" section for the full rationale and the exact migration SQL to run. Summary:

**Logic:**

- Run the migration SQL in `architecture.md` via the `run-raw-sql` MCP tool: creates `profiles`, `agent_runs`, `jobs`, `agent_logs` with all columns, CHECK constraints, foreign keys, and indexes
- `profiles.id` is a shared primary key with `auth.users.id` (cross-schema FK) — verify it's accepted; fall back per `architecture.md`'s documented contingency if InsForge rejects a user-created FK into its `auth` schema
- Enable real Postgres RLS on all four tables (`auth.uid() = user_id`, or `= id` for `profiles`) — defense-in-depth on top of the existing app-level `.eq('user_id', ...)` filtering, not a replacement for it
- Cascade deletes: user → `agent_runs`/`jobs`/`agent_logs`; `agent_run` → its `jobs`/`agent_logs`
- `jobs.source` CHECK allows `('search', 'url')` — `'url'` stays reserved even though manual URL import is out of scope, so no migration is needed if it ships later
- Create `resumes` storage bucket via `create-bucket({ bucketName: "resumes", isPublic: false })`
- **Known gap, not solved by this feature**: InsForge's storage has no per-object ownership enforcement (`storage.objects` has RLS disabled, `create-bucket` only takes a coarse `isPublic` flag) — the `{user_id}/resume.pdf` path is obscurity, not real per-user isolation. Revisit with a server-side ownership check if resumes need stronger guarantees later.

---

## Phase 2 — Profile Page

### 05 Profile Page — Full UI

Build the complete profile page UI with mock data. No save logic yet.

**UI:**

- Profile needs attention banner at top — completion percentage ring, missing field tags highlighted (e.g. PHONE, LOCATION, EDUCATION)
- Resume section — drag and drop upload area, "Click to upload or drag and drop" text, PDF only note, Select Resume button, Generate Resume from Profile button below
- Profile Information form with clearly labeled sections:
  - Personal Info — Full Name, Email (pre-filled, not editable), Phone Number, Location, LinkedIn URL, Portfolio/GitHub, Work Authorization dropdown
  - Professional Info — Current Job Title, Experience Level dropdown, Years of Experience, Skills tag input with Add button, Industries tag input with Add button
  - Work Experience — up to 3 roles, each with Company Name, Job Title, Start Date, End Date, Currently working here checkbox, Key Responsibilities textarea. Add role button.
  - Education — Highest Degree dropdown, Field of Study, Institution Name, Graduation Year
  - Job Preferences — Job Titles Seeking, Remote Preference dropdown, Salary Expectation, Preferred Locations, Cover Letter Tone dropdown
- Save Profile button at bottom

---

### 06 Profile Save Logic

Wire profile form to InsForge DB.

**Logic:**

- Server Action in actions/profile.ts saves all form fields to profiles table
- Resume PDF uploaded to InsForge Storage at resumes/{user_id}/resume.pdf with upsert: true
- resume_pdf_url saved to profiles table after upload
- is_complete set to true when all required fields are filled
- Completion percentage and missing fields calculated and saved
- Form pre-fills with existing data on return visits
- revalidatePath('/profile') called after save

---

### 07 AI Profile Extraction from Resume

Extract from Resume button — Gemini reads uploaded PDF and auto-fills profile form fields.

**Decision finalized (`/architect`, 2026-09-07)** — see `architecture.md`'s "AI Profile Extraction from Resume" section for the full rationale, including the Gemini-over-GPT-4o call (Features 08/10/13/17 still use GPT-4o until each is re-decided). Summary:

**UI:**

- Extract from Resume button appears in the resume card as soon as a file is selected — before Save Profile, not after
- Loading state while processing
- Form fields populate automatically after extraction — every mapped field is overwritten unconditionally, no merge
- User reviews and edits if needed before saving

**Logic:**

- pdf-parse extracts raw text from the selected PDF's buffer
- If extracted text is under 50 characters — return error: "Could not extract text from this PDF. Please try a different file."
- Gemini (`@google/genai`, `gemini-3.6-flash`) reads extracted text and returns structured JSON for: name, phone, location, links, current title, experience level, years of experience, skills, industries, work experience (up to 3 roles), education — never the job-seeking preference fields or email
- Form fields populated with extracted data
- User saves manually after reviewing

---

### 08 Resume PDF Generation from Profile

Generate a clean professional PDF resume from current profile data using Gemini.

**Logic** (corrected 2026-09-07 — see `architecture.md`'s Feature 08 decision for the full reasoning; this paragraph went through two corrections during the same build: first Gemini → GPT-4o to match the provider convention documented at the time, then back to Gemini once the engineer directed a project-wide provider switch — Gemini for every AI feature, not just extraction):

- POST /api/resume/generate
- Reads current profile data from profiles table
- Gemini (`@google/genai`, `gemini-3.6-flash`) generates professional resume content from the profile's prose-bearing fields only:
  - Professional summary paragraph
  - Polished work experience bullet points
  - Clean professional language throughout
- @react-pdf/renderer renders the profile's structured fields plus Gemini's output into a clean single-page PDF using renderToBuffer()
- Buffer uploaded to InsForge Storage at resumes/{user_id}/resume-{uuid}.pdf (versioned key — the installed SDK has no upsert option)
- resume_pdf_url updated in profiles table

---

## Phase 3 — Find Jobs Page

### 09 Find Jobs Page — Full UI

Build the complete Find Jobs page UI with mock data. No logic yet.

**UI:**

- Search controls card at top:
  - JOB TITLE label + input with search icon placeholder "Frontend Engineer"
  - LOCATION label + input placeholder "Remote, New York..."
  - Find Jobs button with search icon
  - Success message area below controls — green banner: "Found 8 jobs and saved 4 strong matches."
- Job list section below:
  - Filter bar: text search input "Filter by company or role...", All Matches dropdown, Match Score sort dropdown
  - Jobs table with columns: COMPANY, ROLE, MATCH SCORE (color coded progress bar + percentage), SALARY EST., SOURCE (Search/URL badge), DATE FOUND
  - Pagination — "Showing 1 to 6 of 24 results", Previous, page numbers, Next

---

### 10 Adzuna Job Discovery

Agent calls Adzuna API to find jobs matching user's search criteria, scores them against user profile, saves to DB.

**Decision finalized (`/architect`, 2026-09-08)** — see `architecture.md`'s "Adzuna Job Discovery" section for the full rationale. Summary (corrected from this paragraph's original GPT-4o-based draft — the project's provider switch, started in the Feature 08 decision, now also covers this feature):

**Logic:**

- POST /api/agent/find receives jobTitle and location from client; this route is its own auth gate (`proxy.ts` doesn't cover `/api/*`)
- Create agent_run record (`status: 'running'`) before calling Adzuna
- Call Adzuna API:
  - GET https://api.adzuna.com/v1/api/jobs/{country}/search/1
  - params: what={jobTitle}, where={location}, results_per_page=10, app_id, app_key
  - Detect country from location input via a small keyword map (us/gb/au/ca) — default to 'us'
- Drop any result already saved for this user (same source_url) before scoring
- Gemini (`@google/genai`, `gemini-3.6-flash`) scores every remaining job in **one batched call**, not one call per job (the shared free-tier quota is 20 requests/day — batching keeps this feature to 1 call per search):
  - matchScore — integer 0-100
  - matchReason — one paragraph explanation
  - matchedSkills — skills user has that job requires
  - missingSkills — skills job requires that user lacks
- Save every job that is both new and successfully scored to the jobs table (no score-based filtering on what gets saved):
  - source: 'search'
  - run_id from agent_runs record
  - All structured fields saved
- Update agent_run with the saved-job count (`status: 'completed'`, or `'failed'` if the whole Adzuna or Gemini call errored out) — return `{ jobsFound, strongMatches }` to the frontend, where jobsFound is the saved count and strongMatches is how many of those score >= MATCH_THRESHOLD; both describe the same saved set, not two different counts
- app/find-jobs/page.tsx reads real saved jobs (unpaginated) instead of Feature 09's mock data — Feature 11 still owns filter/sort/pagination

**PostHog events:** `job_search_started`, `job_found`

---

### 11 Filter + Sort + Pagination

Wire filter tabs, sort dropdown, text search, and pagination to real InsForge DB data.

**Logic:**

- All Matches tab — all jobs for current user
- High Match filter — jobs with match_score >= 70
- Low Match filter — jobs with match_score < 70
- Sort by Match Score — order by match_score descending
- Sort by Newest — order by found_at descending
- Sort by Oldest — order by found_at ascending
- Text search — filter by company name or job title (case insensitive)
- Pagination — 20 jobs per page, total count shown

---

## Phase 4 — Job Details Page

### 12 Job Details Page — Full UI

Build the complete job details page UI. Job data from DB is already available from Phase 3 — wire real data for all job info and match sections immediately. Company research section shows empty state only.

**UI:**

- Back to Jobs link
- Job header — company logo placeholder, job title, company name, match score badge with percentage, View Job Post button (links to redirect_url)
- Info cards row — Salary Est., Location, Job Type, Date Found
- AI Match Reasoning section — match reason paragraph from GPT-4o
- Required Skills vs Your Profile — matched skills as green badges, missing skills as red/orange badges
- Job Description section — description content from Adzuna
- Company Research card — empty state with Research Company button. After research: structured dossier with company overview, tech stack, culture, why this role, interview prep
- Apply Now button (links to redirect_url, opens in new tab)

---

# Feature 13 — Company Research Agent (Updated)

Agent researches the company using their public website and builds a structured dossier using a single Browserbase session. Three data sources fused together: company website content, job description from DB, user profile from DB.

**Logic:**

- POST /api/agent/research receives jobId
- Load job data from DB — extract company_name, job description, matched_skills, missing_skills
- Load user profile from DB — skills, experience, work history
- Derive company homepage URL by following the Adzuna redirect with a manual, SSRF-guarded fetch — no browser needed for this step, but **never `fetch(redirect_url, { redirect: "follow" })`**: an Adzuna listing is employer-controlled input, and an unguarded automatic follow lets a crafted redirect chain make this server request an internal or reserved address (SSRF), not just the intended public site:
  - Follow redirects manually, one hop at a time (`fetch(url, { redirect: "manual" })`, read the returned `Location` header yourself and loop), capped at a small max (e.g. 5 hops) — abort past the cap.
  - Before requesting each hop's URL, validate it and reject the whole chain (fall through to the fallback below) if any check fails: scheme must be `https:`; resolve the hostname's IP and reject loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16`, `fe80::/10` — this also blocks the cloud metadata endpoint at `169.254.169.254`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`), and other reserved/special-use ranges (`0.0.0.0/8`, multicast, etc.).
  - Re-resolve and re-validate on **every** hop, not just the first URL — a redirect can point anywhere, and a hop passing the check proves nothing about the next one. Perform the actual request against the resolved IP you validated (or re-check immediately before connecting) so a DNS answer that changes between the check and the request (DNS rebinding) can't slip a reserved address past the check.
  - Any hop that fails a check, throws, or exceeds the hop cap → abort following and fall back to `https://www.{company}.com` (company name from DB), the same fallback as below.
  - Use the last successfully validated URL as the real employer job page URL
  - Strip subdomain from that URL's hostname (e.g. jobs.stripe.com → stripe.com)
  - Construct homepage URL as https://{rootDomain}
  - If the resolved URL still contains "adzuna.com" — fall back to https://www.{company}.com (company name from DB)
  - If Stagehand gets no meaningful content (oneLiner and productSummary empty) — skip browser research entirely, proceed to GPT-4o synthesis with job description and profile only
- Open single Browserbase session with Stagehand
  **Stagehand homepage extraction:**

```typescript
const homepage = await stagehand.extract({
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
```

If oneLiner and productSummary are empty — bail to synthesis with job description and profile only.

**Stagehand sub-page extraction (max 3 pages — prefer about/blog/engineering/product over careers):**

```typescript
const page = await stagehand.extract({
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
```

- Close Browserbase session after homepage + max 3 sub-pages
  **GPT-4o synthesis (runs after browser closes):**

System prompt:

```
You are a sharp career strategist preparing a candidate to apply for a specific role.
You are given (a) research collected from the company's own website, (b) the job posting,
and (c) the candidate's profile. Produce a concise, concrete briefing that gives this
specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent
  funding, customers, headcount, or facts. If research was thin, infer carefully from
  the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this
  company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly
  and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind
  of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON.
```

User prompt feeds three data sources:

```
COMPANY RESEARCH (from their website): {companyResearch}
JOB POSTING: title, company, description, matched_skills, missing_skills
CANDIDATE PROFILE: current_title, years_experience, experience_level, skills, work_experience
```

Temperature: 0.4

**Dossier shape saved to jobs.company_research jsonb:**

```json
{
  "companyOverview": "string",
  "techStack": ["string"],
  "culture": ["string"],
  "whyThisRole": "string",
  "yourEdge": ["string"],
  "gapsToAddress": ["string"],
  "smartQuestions": ["string"],
  "interviewPrep": ["string"],
  "sources": ["string"]
}
```

- Save complete dossier to jobs.company_research jsonb column, and set jobs.company_researched_at = now() in the same update (the activity timestamp Feature 16's Recent Activity merge reads — see architecture.md)
- Always return a dossier — never fail silently. If browser research failed, GPT-4o synthesizes from job description and profile alone.
  **PostHog event:** `company_researched` — { userId, jobId, company }

---

## Job Details UI — Company Research Card (Updated)

The Company Research card on the job details page must render all 9 fields:

- **Company Overview** — paragraph
- **Tech Stack** — tag list
- **Culture** — bullet list
- **Why This Role** — paragraph
- **Your Edge** — bullet list (highlight — specific to this candidate)
- **Gaps to Address** — bullet list (reframed as strategy, not weaknesses)
- **Smart Questions** — bullet list (questions to ask in interview)
- **Interview Prep** — bullet list
- **Sources** — small text, links to pages researched

## Phase 5 — Dashboard

### 14 Dashboard Page — Full UI

Build the complete dashboard UI with mock data.
**UI:**

- Four stat cards: Total Jobs Found, Avg. Match Rate, Companies Researched, Cover Letters Generated — all showing mock numbers with trend indicators
- Recent Activity card — list of 5 activity entries with colored dots and timestamps
- Resume Tailoring Activity — bar chart (mock data, days of week)
- Jobs Found Over Time — line chart (mock data, days of week)
- Match Score Distribution — bar chart (mock data, score ranges 50-60%, 60-70%, 70-80%, 80-90%, 90-100%)
- Incomplete profile banner at top if profile not complete

---

### 15 Stats Bar — Real Data

Wire four stat cards to real InsForge DB data for current user.

**Logic:**

- Total Jobs Found — COUNT of jobs where user_id = current user
- Avg. Match Rate — AVG of match_score across all user jobs
- Companies Researched — COUNT of jobs where company_research IS NOT NULL and user_id = current user
- Jobs This Week — COUNT of jobs found in last 7 days

---

### 16 Recent Activity — Real Data

Wire recent activity list to real InsForge DB data for current user.

**Logic:**

- Query agent_runs table — most recent runs for current user. Neither `agent_runs` nor `jobs` has a `created_at` column (see the schema in `architecture.md`); use each row's own activity timestamp instead.
- Run activity timestamp: `completed_at ?? started_at` (`started_at` is always set; `completed_at` only once the run finishes, so a still-running run still sorts correctly).
- Query jobs table — most recent company research entries for current user, using `company_researched_at` (set when the dossier is saved, see Feature 13) as the activity timestamp; `company_research IS NOT NULL` alone carries no time to sort by.
- Merge both sets on their respective activity timestamp (run: `completed_at ?? started_at`; research: `company_researched_at`) and sort descending — take last 5-10 entries
- Format each into human readable string:
  - agent_run completed → "Found X jobs for [jobTitle] — [time ago]" (time ago from `completed_at ?? started_at`)
  - company_research populated → "Researched [company] — [time ago]" (time ago from `company_researched_at`)
- Color coded dot per entry type — info blue, success green

---

### 17 Analytics Charts — PostHog Data

Wire three dashboard charts to real PostHog event data for current user.

**Logic:**

- Jobs Found Over Time — query PostHog for job_found events where distinctId = current userId, last 30 days, group by day
- Match Score Distribution — query PostHog for job_found events, extract matchScore property, group into ranges: 50-60, 60-70, 70-80, 80-90, 90-100
- Company Research Activity — query PostHog for company_researched events where distinctId = current userId, last 7 days, group by day
- All three charts rendered with recharts
- Empty state shown for each chart when no data exists yet

---

## Feature Count

| Phase                 | Features |
| --------------------- | -------- |
| Phase 1 — Foundation  | 4        |
| Phase 2 — Profile     | 4        |
| Phase 3 — Find Jobs   | 3        |
| Phase 4 — Job Details | 2        |
| Phase 5 — Dashboard   | 4        |
| **Total**             | **17**   |
