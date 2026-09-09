# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Navbar

`components/layout/Navbar.tsx` — top navbar, used on every page. Client Component (`usePathname` for active link).

- Root: `min-h-16 w-full bg-surface px-6 flex flex-wrap items-center justify-between`
- Logo: `public/logo.png` via `next/image`, `className="h-9 w-auto"`
- **Nav links carry an icon + active underline (added Feature 09, confirmed against `dashboard.png`/`profile.png`/`find-jobs.png` — all three agree; ui-rules.md's "no underline" line was stale and is now corrected):** `LayoutGrid` (Dashboard) / `Search` (Find Jobs) / `User` (Profile), lucide, `h-4 w-4`, `aria-hidden`
- Nav link active: `flex items-center gap-2 border-b-2 pb-1 text-sm font-medium border-accent text-accent`
- Nav link inactive: `flex items-center gap-2 border-b-2 pb-1 text-sm font-medium border-transparent text-text-dark hover:text-text-primary`
- Takes `isAuthenticated?: boolean` (default `false`) — server-computed and passed by each caller, not resolved client-side, so there's no logged-in/out flash. `app/page.tsx` renders it with no prop (always logged out, since `/` redirects away when a session exists); `app/dashboard/page.tsx` and `app/profile/page.tsx` pass `isAuthenticated` true (both routes are gated by `proxy.ts`, `profile/page.tsx` derives it from the `user` it already fetches).
- CTA slot swaps on `isAuthenticated`:
  - Logged out — "Start for free" `Link`: `rounded-md bg-text-slate px-4 py-2 text-sm font-medium text-accent-foreground`
  - Logged in — "Log out" via `<SignOutButton>` (`components/auth/SignOutButton.tsx`, wraps `signOutAction` + `resetIdentity()`): `flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-secondary` with `LogOut` (lucide) `h-3.5 w-3.5` — the secondary-button style (ui-rules.md), not the primary CTA style, since sign-out isn't the page's primary action
- Mobile menu: `md:hidden` button with `Menu`/`X` icon and `aria-expanded`, exposing all three navigation links in a `w-full border-t border-border py-2 md:hidden` list. The CTA/Log out control above sits outside this collapsible list (only the hamburger toggle itself is `md:hidden`), so it's already visible on mobile without a separate entry.

### Footer

`components/layout/Footer.tsx` — site footer, used on every page.

- Root: `w-full border-t border-border bg-surface px-6 py-6`
- Link: `text-sm font-medium text-text-dark hover:text-text-primary`

### Hero (homepage only)

`components/homepage/Hero.tsx` — headline + CTAs + dashboard screenshot.

- Gradient hero card: `rounded-xl border border-border bg-[radial-gradient(circle_at_15%_25%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_85%_15%,var(--color-info-light),transparent_45%),radial-gradient(circle_at_75%_95%,var(--color-accent-light),transparent_50%)] bg-surface px-6 py-20 text-center`
- Headline: `text-5xl font-bold tracking-tight text-text-primary md:text-6xl`
- CTA pair: shared `<CtaButtons />` (see below) — do not re-hand-copy this markup
- Screenshot: `public/images/dashboard-demo.png` via `next/image`, `w-full max-w-4xl h-auto`

### CtaButtons (shared — Hero + CtaSection)

`components/homepage/CtaButtons.tsx` — the "Get Started" / "Find Your First Match" pair, used by both `Hero.tsx` and `CtaSection.tsx`. Extracted because the two callers previously hand-copied identical classes and had already drifted from each other; put any future tweak to this CTA here once, not in both files.

- Wrapper: `mt-8 flex items-center justify-center gap-3`
- Primary ("Get Started" → `/dashboard`): `flex items-center gap-2 rounded-md bg-gradient-to-br from-text-darker to-text-slate px-4 py-2 text-sm font-medium text-accent-foreground`, with `lucide-react` `Play` icon (`h-3.5 w-3.5 fill-current text-text-muted`)
- Secondary ("Find Your First Match" → `/find-jobs`): `rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary`

### Features / HowItWorks (homepage only)

`components/homepage/Features.tsx`, `components/homepage/HowItWorks.tsx` — two-column value-prop sections, mirror layout of each other (image side flips).

- Section: `mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-12 px-8 py-24 md:grid-cols-2` (HowItWorks adds `bg-surface-secondary`)
- Heading: `text-4xl font-bold text-text-primary`
- Feature item (default): `border-b border-l border-b-border border-l-border py-6 pl-6`
- Feature item (highlighted): `border-b border-l-2 border-b-border border-l-accent-dark py-6 pl-6` (Features.tsx uses `border-l-accent-dark`; HowItWorks.tsx uses `border-l-success-dark`)
- Item title: `text-base font-semibold text-text-primary`
- Item description: `mt-2 text-sm text-text-secondary`
- Image frame: `flex items-center justify-center rounded-xl bg-surface-tertiary p-6`

### Testimonial (homepage only)

`components/homepage/Testimonial.tsx`

- Eyebrow: `text-sm font-semibold tracking-wide text-accent`
- Quote: `mx-auto mt-6 max-w-2xl text-2xl font-medium text-text-primary`
- Avatar: `public/images/user-icon.png`, `h-10 w-10 rounded-lg`

### CtaSection (homepage only)

`components/homepage/CtaSection.tsx` — same gradient-card as `Hero.tsx`, and now the same shared `<CtaButtons />` component (see above) rather than a second hand-copy of the button markup.

### LoginCard (login page only)

`components/auth/LoginCard.tsx` — split two-panel auth card (pitch panel + sign-in panel), matching a design reference shared in chat (not yet saved under `context/designs/` — save it there as `login-page.png` if it should become the tracked source of truth for this page).

- Outer card: `grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:grid-cols-2` (stacks to one column below `md`)
- Pitch panel (left): `flex flex-col justify-between gap-10 p-10`, background reuses the Hero/CtaSection radial-gradient pattern — `bg-[radial-gradient(circle_at_20%_20%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_80%_10%,var(--color-info-light),transparent_45%),radial-gradient(circle_at_60%_95%,var(--color-accent-light),transparent_50%)] bg-surface`
  - Trust badge: `inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary` with `ShieldCheck` (lucide) at `h-3.5 w-3.5 text-accent`
  - Headline: `text-4xl font-bold tracking-tight text-text-primary`
  - Subtext: `text-sm text-text-secondary`, bottom note: `text-xs text-text-muted`
- Sign-in panel (right): `flex flex-col justify-center gap-8 p-10`
  - "Welcome to" / "JobPilot" lockup: `text-sm text-text-secondary` over `text-2xl font-bold text-text-primary`
  - OAuth button (secondary style, left-aligned icon+label, not centered): `flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary`
- Each button is its own `<form action={boundServerAction}>` — no client JS needed
- Google/GitHub marks are inline SVGs local to the file (not exported) — lucide-react carries no brand icons

### CompletionIndicator (profile page)

`components/profile/CompletionIndicator.tsx` — "Profile needs attention" banner card, Server Component (no interactivity).

- Root: `flex items-center justify-between gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Heading row: `AlertCircle` (lucide) `h-5 w-5 text-error` + `text-base font-semibold text-text-primary`
- Description: `text-sm text-text-secondary`
- Missing-field badges: `rounded-full bg-error-lightest px-3 py-1 text-xs font-semibold uppercase tracking-wide text-error` (new tokens — see ui-tokens.md's "Attention / Missing Field Badges")
- Ring: raw SVG, two concentric `<circle>` (`stroke-error-light` track, `stroke-error` fill with `strokeDasharray` driven by `completionPercentage`, `origin-center -rotate-90` so it starts at 12 o'clock), `fill-text-primary text-2xl font-bold` `<text>` centered — no charting library, this is the only ring in the app so far

### ResumeUpload (profile page)

`components/profile/ResumeUpload.tsx` — Client Component (drag-and-drop + file input state). **Renders inside `ProfileForm`'s `<form>`, not as a page-level sibling** (Feature 06) — its file input has `name="resume"` and is a real descendant of that `<form>`, so the ancestor's native `FormData` picks it up on submit with no lifted state or callback prop needed. A drag-drop file is synced onto the real `<input>` via `new DataTransfer()` (`input.files = transfer.files`) since a drop never touches the input's own `FileList` on its own — only picking through the native dialog does.

- Root card: `flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Dropzone: `div role="button" tabIndex={0}` (never nest the `<input type="file">` inside it — invalid HTML; it's a preceding sibling instead) `flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center`, idle `border-border-muted bg-surface-secondary`, dragging `border-accent bg-accent-muted`
- Upload icon badge: `flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface` with `CloudUpload` (lucide) `h-5 w-5 text-accent`
- "Select Resume" is a styled `<span>` inside the dropzone (not a real nested button) — secondary button look: `rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary`
- Client-side validation (PDF mime type, 5MB max) clears the input (`input.value = ""`) on failure so a rejected file can't linger as submittable; the Server Action re-validates the same two checks server-side regardless (never trust the client alone)
- **Extract from Resume button (Feature 07)** — renders only once `selectedFileName` is set, right after the error message (the last thing in this card now — see below): `flex items-center justify-center gap-2 rounded-md border border-accent px-4 py-2 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:opacity-60` with `Sparkles` (lucide) icon, label swaps to "Extracting…" while `isExtracting`. It's `type="submit" formAction={extractFormAction}` (the prop `ProfileForm` passes down) — a second action on the same ancestor `<form>` as Save Profile, React 19's per-button `formAction` override, not a nested form. `extractError` renders the same `text-sm text-error` treatment as the upload `error` right below the button. While `isExtracting`, the dropzone itself is also disabled (`aria-disabled`, `tabIndex={-1}`, click/drag handlers no-op, `cursor-not-allowed opacity-60`) — swapping files mid-extraction is blocked, not just re-clicking Extract.
- **No longer has a footer row or a "Generate Resume from Profile" button (moved during Feature 08's build, on request — see `ProfileForm`'s entry below).** This card now covers only the "resume in" direction (upload → auto-fill, or extract); it doesn't take `onGenerate`/`isGenerating`/`generateError`/`generatedResumeUrl` props at all.

### ResumePreview (profile page)

`components/profile/ResumePreview.tsx` — Client Component-adjacent but purely presentational (no `"use client"` directive needed, no state, no DB calls — takes one prop and renders or doesn't). Deferred since Feature 05 ("whichever of Feature 07/08 first needs to render a resume"); Feature 08 is that feature. Renders inside `ProfileForm.tsx`'s "Generate a Resume" section, at the bottom of the "Profile Information" card, not inside `ResumeUpload.tsx` (moved there during the same build — see below).

- Props: `{ resumePdfUrl: string | null }` — renders `null` (nothing) when there's no resume yet
- Root row: `flex items-center justify-between gap-3 border-t border-border pt-6`
- Status side: `CheckCircle` (lucide) `h-4 w-4 text-success` + `text-sm text-text-secondary` "Resume ready"
- Link: `<a href="/api/resume/download" target="_blank" rel="noopener noreferrer">` "View PDF", `text-sm font-medium text-accent` — **not** a direct link to the stored `resumePdfUrl` (confirmed live that 401s, "No token provided" — the storage API needs a real bearer token a plain browser link never attaches). Opens the app's own proxy route instead, which streams the file back through the authenticated server client. See architecture.md's "InsForge Storage" section and the Feature 08 decision, Decision 12, for the corrected reasoning.

### TextField / TextAreaField / SelectField (shared profile form primitives)

`components/profile/TextField.tsx`, `TextAreaField.tsx`, `SelectField.tsx` — generic label+control wrappers extracted to avoid repeating the same input chrome across ~16 fields in `ProfileForm.tsx`. Scoped under `profile/` (not `components/ui/`, which is reserved for shadcn/ui per architecture.md) since profile is their only consumer today; promote them if a second form needs the same pattern.

- Shared input chrome: `w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none`
- Label: `text-xs font-medium text-text-secondary uppercase`
- `TextField` disabled state (used for the read-only Email field): `disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-secondary`
- `SelectField` renders a native `<select appearance-none>` plus an absolutely positioned `ChevronDown` (lucide) `pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted` — no custom listbox

### TagInput (profile page — Skills / Industries)

`components/profile/TagInput.tsx` — Client Component, shared by both "Skills" and "Industries Worked In" fields.

- Input + Add button row: input uses the shared field chrome (above); Add button is the secondary/ghost style `rounded-md border border-border bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-border-light`
- Tag pill: `flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary` with an `X` (lucide) `h-3.5 w-3.5` remove button — note this is `rounded-lg`, not the pill-shaped (`rounded-full`) badges used elsewhere (status/missing-field badges); skill tags are a distinct visual pattern per the design
- Enter key submits the draft value same as clicking Add; duplicate values are silently ignored

### WorkExperienceRoleCard (profile page)

`components/profile/WorkExperienceRoleCard.tsx` — one role in the Work Experience list (`ProfileForm.tsx` renders up to 3, per build-plan.md).

- Root: `relative flex flex-col gap-4 rounded-xl border border-border bg-surface-secondary p-4`
- Remove control (only rendered when `canRemove`, i.e. more than one role exists — the design's mock only shows one role, so this was a necessary but undesigned addition): `absolute top-4 right-4 text-text-muted hover:text-error` with `Trash2` (lucide)
- "Currently working here" checkbox uses the native `accent-accent` Tailwind utility (CSS `accent-color: var(--color-accent)`) rather than a custom SVG checkbox — checking it clears and disables the End Date field (`type="month"` inputs, matching the design's "January 2022" / dashed-placeholder rendering)

### AcademicExperienceCard (profile page, student only)

`components/profile/AcademicExperienceCard.tsx` — one entry in the Academic Experience list (`ProfileForm.tsx` renders up to 5, requested directly, not part of a numbered feature; see progress-tracker.md's 2026-09-07 note). Mirrors `WorkExperienceRoleCard`'s shape closely, with two differences: the remove button is **always** rendered (no `canRemove` gate — an empty list is fine here, unlike Work Experience's "at least one role" rule), and there's a `SelectField` for `type` instead of a second `TextField`.

- Root: `relative flex flex-col gap-4 rounded-xl border border-border bg-surface-secondary p-4` — identical to `WorkExperienceRoleCard`
- Remove control: `absolute top-4 right-4 text-text-muted hover:text-error` with `Trash2` (lucide), always rendered
- Type/Title row uses `pr-8` on the grid wrapper (not on the individual fields) so neither field's content sits under the absolutely-positioned remove button
- "Funded / scholarship (bolsa)" checkbox: same `accent-accent` pattern as Work Experience's "Currently working here" — a flat label + native checkbox, no custom SVG
- Section itself (in `ProfileForm.tsx`) only renders when `profile.experienceLevel === "student"` — the "Add entry" control and the whole card list disappear together when the user picks a different experience level, they don't just hide the button

### SearchControls (find-jobs page)

`components/find-jobs/SearchControls.tsx` — **Client Component as of Feature 10** (was a Server Component with no submit logic through Feature 09). Controlled `jobTitle`/`location` inputs, a plain `onSubmit` fetch handler (`POST /api/agent/find`, not a Server Action — architecture.md's Invariants already rule that out for agent-calling code), `isSearching`/`error`/`result` local state, `router.refresh()` on success so the Server Component tree below re-renders with the freshly saved jobs. Initial state renders no banner at all (same "renders nothing until there's something to show" precedent as `ResumePreview.tsx`), not the old hardcoded always-visible mock text.

- Root card: `flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Field grid: `grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end`
- Label: `text-xs font-medium uppercase text-text-secondary` — same chrome as `profile/TextField.tsx`'s label, not the component itself (this isn't a form-validation context)
- Job Title input has a leading `Search` (lucide) icon (`absolute left-3 ... text-text-muted`); Location input does not — matches the design exactly, not a missed pattern
- Input chrome: `w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none` (Job Title adds `pl-9` for the icon)
- Find Jobs button: primary style + `Search` (lucide) icon, `flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground`, `disabled={isSearching}` (same `disabled`+opacity treatment as `ResumeUpload.tsx`'s Extract button), label swaps to "Searching…" while pending
- Success banner (only when a search just completed with no error): `flex items-center gap-2 rounded-lg bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground` with `Sparkles` (lucide) `h-4 w-4 text-success-alt` — colors pixel-verified against the design (icon `#00BC7D`, text `#007A55`, bg `#ECFDF5`, all existing tokens). Copy branches three ways on the route's `adzunaResultCount`/`jobsFound` (architecture.md's Adzuna Job Discovery decision, Decision 8) — real zero results, all-duplicates, or the normal "Found N jobs and saved M strong matches."
- Error state: `text-sm text-error`, same token as every other inline error in this app (not the success-banner treatment)

### JobsListSection (find-jobs page)

`components/find-jobs/JobsListSection.tsx` — Client Component, the only stateful piece on this page. As of Feature 11, owns `filterBy` (`useState<FilterOption>`, default `"all"`), `searchQuery` (`useState<string>`, default `""`), `sortBy` (`useState<SortOption>`, default `"matchScore"`), and `currentPage` (`useState<number>`, default `1`). Derives `visibleJobs` via `useMemo` running `filterJobs` → `searchJobs` → `sortJobs` in that order, then `pagedJobs` via a second `useMemo` running `paginateJobs(visibleJobs, currentPage)`. Changing `filterBy`, `searchQuery`, or `sortBy` resets `currentPage` to `1` (architecture.md's Filter + Sort + Pagination decision, Decision 4). Assembles the one bordered card (`overflow-hidden rounded-2xl border border-border bg-surface shadow-card`) containing `JobFilters` → (`JobsTable` + `JobsPagination`, or one of the two empty states below). `app/find-jobs/page.tsx` stays an (now `async`) Server Component, but as of Feature 10 it passes real DB-backed jobs (`fromJobRow` over an unpaginated `jobs` read, `types/index.ts`'s `Job`) — `MOCK_JOBS`/`mock-jobs.ts` are gone.

- **`JobsEmptyState`** — not exported, local to this file, added directly per a screenshot the engineer shared. Shown when `jobs.length === 0` (no saved jobs at all, before the first search or after one that saved nothing new) — an empty `<table>` with real pagination text ("Showing 1 to 0...") would have been misleading rather than just plain. `flex flex-col items-center gap-4 px-6 py-16 text-center`: a `Building2` (lucide) icon in a `flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary` badge (same icon and sizing convention as `ResumeUpload.tsx`'s upload badge, and the same icon `JobsTable`'s company cell already uses), `text-text-muted`; caption below `text-sm text-text-secondary`: "No jobs found yet. Run a search to get started."
- **`NoMatchesEmptyState`** — not exported, local to this file, added at Feature 11. Shown when `jobs.length > 0` but `visibleJobs.length === 0` (saved jobs exist, the current filter/search narrows them to nothing) — a distinct case from `JobsEmptyState` above, per architecture.md's Filter + Sort + Pagination decision, Decision 10. Same layout/classes as `JobsEmptyState`, with a `SearchX` (lucide) icon instead of `Building2` and the caption "No jobs match your filters. Try adjusting them."

### sortJobs (find-jobs page, utility)

`components/find-jobs/sort-jobs.ts` — `SortOption = "matchScore" | "newest" | "oldest"` + `sortJobs(jobs, sortBy)`. Semantics match build-plan.md's Feature 11 spec exactly (`matchScore` descending, `newest`/`oldest` by `foundAt`), applied client-side. `Job` imported from `@/types` (moved off `mock-jobs.ts` at Feature 10). Runs as the last stage of `JobsListSection`'s filter → search → sort pipeline (Feature 11) — see `filterJobs`/`searchJobs`/`paginateJobs` below for the sibling stages.

### filterJobs / searchJobs (find-jobs page, utility)

`components/find-jobs/filter-jobs.ts` — added at Feature 11. `FilterOption = "all" | "high" | "low"` + `filterJobs(jobs, filterBy)` (`"high"` → `matchScore >= MATCH_THRESHOLD`, `"low"` → `< MATCH_THRESHOLD`, reusing `lib/utils.ts`'s existing constant, never a second hardcoded `70`). `searchJobs(jobs, query)` — case-insensitive substring match against `company` or `role`, empty/whitespace-only query returns `jobs` unchanged. Both pure, applied client-side. See architecture.md's Filter + Sort + Pagination decision, Decisions 2-3.

### paginateJobs / getPageNumbers (find-jobs page, utility)

`components/find-jobs/paginate-jobs.ts` — added at Feature 11. `JOBS_PAGE_SIZE = 20` (build-plan.md's fixed page size; scoped here rather than `lib/utils.ts` since this page is still its only consumer). `paginateJobs(jobs, page)` slices to that page's rows. `getPageNumbers(currentPage, totalPages)` — the page-number/ellipsis generation `JobsPagination` previously faked: always includes page `1` and the last page, the current page and its immediate neighbors (±1), collapses any larger gap into one `"ellipsis"` marker; renders every page with no ellipsis at all when `totalPages <= 7`. See architecture.md's Filter + Sort + Pagination decision, Decisions 5-6.

### JobFilters (find-jobs page)

`components/find-jobs/JobFilters.tsx` — Client Component. Top strip of the jobs-list card (not its own card — sits inside the same bordered container as `JobsTable`/`JobsPagination`, separated by `border-b`). As of Feature 11, fully controlled from `JobsListSection`: `searchQuery: string` + `onSearchChange`, `filterBy: FilterOption` + `onFilterChange`, `sortBy: SortOption` + `onSortChange`.

- Root: `flex flex-col gap-3 border-b border-border px-6 py-4 md:flex-row md:items-center md:justify-between`
- Text filter: borderless input (`border-transparent bg-transparent`) with a leading `Search` icon, flush inside the card — no boxed input here, unlike `SearchControls`. **Controlled** as of Feature 11 (`value={searchQuery}`, `onChange` fires on every keystroke — no debounce, since filtering runs client-side over an already-in-memory array; see architecture.md's Filter + Sort + Pagination decision, Decision 3).
- "All Matches" `<select>` (all/high/low): **controlled** as of Feature 11 (`value={filterBy}`, `onChange={(e) => onFilterChange(e.target.value as FilterOption)}`). Same chrome as `profile/SelectField.tsx`: `appearance-none rounded-md border border-border bg-surface py-2 pr-9 pl-3 text-sm font-medium text-text-primary` + absolutely positioned `ChevronDown`
- "Match Score" `<select>` (matchScore/newest/oldest): **controlled** — `value={sortBy}`, `onChange={(e) => onSortChange(e.target.value as SortOption)}`, same chrome as above

### JobsTable (find-jobs page)

`components/find-jobs/JobsTable.tsx` — Server Component, real `<table>` (semantic, per ui-rules.md's Table section). Takes `jobs: Job[]` (`Job`/`JobSource` now live in `@/types`, moved off `mock-jobs.ts` at Feature 10 since the type has two real consumers now — the page's DB read and the search route's insert path).

- `<thead>` row: `border-b border-border`, header cells `px-6 py-3 text-xs font-medium tracking-wide text-text-secondary uppercase`
- `<tbody>` rows: `border-b border-border last:border-b-0 hover:bg-surface-secondary`, cells `px-6 py-4`
- Company cell: `Building2` (lucide) in a `flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-tertiary` icon badge + `text-sm font-semibold text-text-primary`
- Role/Salary cells: `text-sm text-text-primary`; Date Found cell: `text-sm text-text-secondary`. Salary falls back to the literal string `"Not disclosed"` (`lib/job-transform.ts`) when Adzuna returns no `salary_min` — no design mock covers this state.
- **`SourceBadge`** — not exported, local to this file. **Not present in `find-jobs.png`; added directly per the engineer's request** despite the design's omission (build-plan.md's original text did list a Source column). Reuses this page's own existing pill-badge pattern rather than inventing new colors: `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium`, `search` → `bg-accent-light text-accent` (same pairing as ui-tokens.md's `Tailored` status badge), `url` → `bg-surface-secondary text-text-secondary` (same pairing as `Low Match`). `source` is always `"search"` for jobs this feature saves — `"url"` stays reserved for manual URL import, out of scope.
- **`MatchScoreBar`** — not exported, local to this file (same "unexported local helper" pattern as `LoginCard.tsx`'s brand SVGs): `h-1 w-24 overflow-hidden rounded-full bg-border-light` track with an absolutely-scaled `h-full rounded-full` fill (`style={{ width: `${score}%` }}`), color by tier per ui-tokens.md's corrected Match Score Colors table (`bg-success-alt` ≥90, `bg-info-medium` ≥80, `bg-warning` ≥50, `bg-text-muted` below); percentage number itself is **not** tier-colored — `text-sm font-semibold text-text-primary`, matching the design (only the bar is colored)

### JobsPagination (find-jobs page)

`components/find-jobs/JobsPagination.tsx` — Client Component as of Feature 11 (was a Server Component with literal JSX before). Takes `totalCount: number`, `currentPage: number`, `onPageChange: (page: number) => void` from `JobsListSection`. Derives `totalPages = Math.max(1, Math.ceil(totalCount / JOBS_PAGE_SIZE))` and the visible result range from `currentPage`/`JOBS_PAGE_SIZE`; page numbers come from `getPageNumbers()` (`paginate-jobs.ts`).

- Root: `flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between`
- Result count text: `text-sm text-text-secondary` with bold `text-text-primary` numbers — "Showing X to Y of Z results", X/Y/Z all real now (Feature 11)
- Page buttons: `rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-secondary`, each with a real `onClick={() => onPageChange(page)}`
- Active page: `rounded-lg border border-accent-light bg-accent-muted px-3 py-1.5 text-sm font-medium text-accent`, `aria-current="page"`
- `Previous`/`Next`: real `onClick`, disabled at the first/last page respectively — `disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-surface`, same border/bg as other page buttons otherwise
- Ellipsis: plain `text-sm text-text-muted`, no border/box — rendered from `getPageNumbers()`'s `"ellipsis"` marker, never shown when `totalPages <= 7`

### ProfileForm (profile page)

`components/profile/ProfileForm.tsx` — Client Component. Takes `initialProfile: ProfileFormData` from the now-async `app/profile/page.tsx` (real saved data, or empty/default values + the session email for a first-time user — no more hardcoded mock, see progress-tracker.md Feature 06 notes) and seeds `useState` from it. Also takes `initialResumePdfUrl: string | null` (Feature 08) — a separate prop, not folded into `ProfileFormData`, the same "always sourced from the row/session directly, never round-tripped through the save form" treatment as `email`. Root element is a `<form action={formAction}>` (`useActionState(saveProfileAction, ...)`) wrapping **both** `<ResumeUpload />` and the "Profile Information" card — they save together in one Server Action call, so both have to share the one `<form>` even though they render as two separate bordered cards. A hidden `<input type="hidden" name="profile" value={JSON.stringify(profile)} readOnly />` carries the whole structured state as one JSON blob (sidesteps native multipart `FormData` turning every field into a string).

- Form root: `flex flex-col gap-6` (no border/card styling itself — the two `<section>`s inside carry that)
- "Profile Information" section: `flex flex-col gap-8 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Section heading: `text-base font-semibold text-text-primary`; each section after the first is separated by `border-t border-border pt-8`
- Two-column field grid: `grid grid-cols-1 gap-4 md:grid-cols-2`
- Experience Level options include `student` (added 2026-09-07, for someone who doesn't work yet and hasn't graduated) alongside `junior`/`mid`/`senior`/`lead`. When it's selected, Job Title and Years of Experience relabel to add "(Optional)" and swap in a hint placeholder ("Leave blank if you haven't worked yet" / `"0"`) — both fields stay visible, they just stop being required (see `lib/profile-completion.ts`)
- "+ Add role": `flex items-center gap-1 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:text-text-muted` with `Plus` (lucide), disabled at 3 roles
- Save Profile button: `type="submit"`, `rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60`, disabled + "Saving…" label while `isPending`; `actionState.error` renders as `text-sm text-error` above it, a success message as `text-sm text-success-foreground`
- **Extract from Resume wiring (Feature 07)**: a second `useActionState(extractProfileFromResumeAction, ...)` alongside the Save one — `extractFormAction`/`isExtracting`/`extractState.error` are passed down to `<ResumeUpload />` (see its registry entry for the button itself). A successful extraction is merged into `profile` state **during render, not in a `useEffect`** — this project's lint config (`react-hooks/set-state-in-effect`) rejects setState-in-effect, so it follows React's "adjust state when a value changes" pattern instead: a tracked `mergedExtraction` state variable compared against `extractState.data`'s identity each render, calling `setProfile` directly (not inside an effect) when it changes. Every mapped field is unconditionally overwritten except `experienceLevel`, where `null` (no reliable signal) keeps whatever the form already had instead of clobbering it.
- **Generate Resume wiring (Feature 08)**: plain `useState` (`isGenerating`, `generateError`, `generatedResumeUrl`, `generatedResumeStorageKey`, the last two seeded from the profile row), not `useActionState` — this is a route handler (`POST /api/resume/generate`), not a Server Action, so there's no `formAction` to bind. `handleGenerate` is a plain async function calling `fetch()` and updating the state values from the JSON response. The button is disabled while either generation or profile saving is pending. `ResumePreview` only shows its download link when the storage key exists, and asks users with legacy URL-only records to generate a new resume.
- **"Generate a Resume" section (Feature 08) — at the bottom of the "Profile Information" card, after the Save Profile button, not inside `<ResumeUpload />`.** Moved there during the build, on request: Generate reads whatever profile data is currently saved (not unsaved edits above it), so it belongs near Save Profile rather than above the fields it depends on. Its own `border-t border-border pt-8` block: a heading (`text-base font-semibold text-text-primary` "Generate a Resume") + description on the left, the button (`onClick={handleGenerate}`, `disabled={isGenerating}`, `FileText` (lucide) icon, label swaps to "Generating…") on the right, `generateError` as `text-sm text-error` below, then `<ResumePreview resumePdfUrl={generatedResumeUrl} />`.

### JobInfo (job details page)

`components/job-details/JobInfo.tsx` — Server Component. Takes `job: JobDetail` (`types/index.ts`, `lib/job-transform.ts`'s `fromJobDetailRow`). Header card + the four-stat info row, built pixel-by-pixel against `context/designs/job-details.png`.

- Header card: `flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card sm:flex-row sm:items-center sm:justify-between`
- Company logo placeholder: `flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-secondary` with `Building2` (lucide) `h-6 w-6 text-text-muted` — pixel-sampled exact match, same bg/border/icon token trio as the neutral "Date Found" stat below
- Title: `text-2xl font-bold text-text-primary`
- Company + match badge row: `job.company` in `text-sm text-text-secondary`, a `•` in `text-text-muted`, then the match badge — `rounded-full bg-success-lightest px-3 py-1 text-sm font-medium text-success-foreground` "N% Match Score" (pixel-sampled: same pairing as `ui-tokens.md`'s "High Match" status badge, just a different label)
- View Job Post: secondary button (`ui-rules.md`'s standard secondary chrome) with `ExternalLink` (lucide) `h-3.5 w-3.5`, real `<a href={job.externalApplyUrl} target="_blank" rel="noopener noreferrer">` (only rendered when the URL exists — see architecture.md's Storage/external-link null-safety precedent)
- Info stat row: `grid grid-cols-2 gap-4 md:grid-cols-4`, four `InfoStat` cards (not exported, local helper, takes a `LucideIcon` prop) — `flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card`, icon in a `flex h-10 w-10 items-center justify-center rounded-full` colored circle, value `text-sm font-semibold text-text-primary` (`truncate` — the design shows "Newark, Ess…" clipping, not a literal DB truncation), label `text-xs font-medium uppercase tracking-wide text-text-muted`
- **Info stat colors — pixel-sampled directly against `job-details.png` (PIL), every one an exact match to an existing token, no new tokens introduced:** Salary Est. `bg-success-lightest`/`text-success` ($ icon); Location `bg-info-lightest`/`text-info-medium` (pin icon); Job Type `bg-accent-muted`/`text-accent` (briefcase icon); Date Found `bg-surface-secondary`/`text-text-secondary` (calendar icon, neutral gray — not orange/warning, despite the icon's warm appearance at a glance)
- Job Type renders `JOB_TYPE_LABELS[job.jobType]` ("Full-time"/"Part-time"/"Contract") or `"—"` when `job.jobType` is `null` (the design's own sample row shows the dash state — `jobs.job_type` is nullable even though `mapAdzunaJobType` currently always resolves a value)
- Location renders `job.location ?? "—"`, same dash fallback

### MatchScore (job details page)

`components/job-details/MatchScore.tsx` — Server Component. Takes `matchReason: string | null`, `matchedSkills: string[]`, `missingSkills: string[]`. Two cards: AI Match Reasoning, then Required Skills vs Your Profile.

- AI Match Reasoning card: `flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card`; icon badge `flex h-10 w-10 items-center justify-center rounded-full bg-success-lightest` with `Sparkles` (lucide) `h-5 w-5 text-success-alt` — same exact icon/color pairing as `SearchControls.tsx`'s success banner, pixel-confirmed against this design too; eyebrow label `text-sm font-semibold uppercase tracking-wide text-text-secondary`; body `text-sm leading-6 text-text-primary`, falls back to a muted "No match reasoning available for this job yet." when null
- Skills card: same card chrome, eyebrow heading "Required Skills vs Your Profile"; "You have" / "Gap skills" sub-labels `text-sm text-text-muted`; each renders a `SkillBadge` row or a muted empty-state line ("No matched skills found." / "No skill gaps — great match!") when its array is empty
- **`SkillBadge`** — not exported, local helper. `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium`, matched: `bg-success-lightest text-success-foreground` + `Check` (lucide); missing: `bg-accent-muted text-accent` + `X` (lucide) — colors are `ui-tokens.md`'s existing Skills Badges table (missing skills are purple/`accent`, not red — confirmed against `project-overview.md`'s "red tags" phrasing being stale prose, the token table and the pixel-sampled design both agree on purple)

### JobDescription (job details page)

`components/job-details/JobDescription.tsx` — Server Component. Takes `aboutRole: string | null`, `externalApplyUrl: string | null`. One card: `flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card`, icon badge `flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary` with `FileText` (lucide) `h-5 w-5 text-text-secondary`, heading `text-base font-semibold text-text-primary`, body `text-sm leading-6 whitespace-pre-line text-text-primary` (falls back to "No description provided for this job." when null). Renders `about_role` as one raw text block — matches `job-details.png` exactly; the separate Responsibilities/Requirements/Nice to have/Benefits bullet sections `project-overview.md`'s prose describes are not in the design or in `build-plan.md`'s Feature 12 UI list, and `about_role` is the only one of those fields Feature 10 actually populates (Adzuna's raw description) — same "design PNG + build-plan.md override older prose" precedent as Features 01/05/09.

- **Truncated-preview notice — added on request, from a shared screenshot, not part of the original `job-details.png`.** `context/library-docs.md`'s Adzuna API section already documents that `about_role` is "a snippet — not full description," and Adzuna cuts it off mid-sentence with no explicit truncation flag. A local, not-exported `looksTruncated(text: string): boolean` heuristic (trailing `...`/`…` → truncated even though it ends in `.`; otherwise no real terminal punctuation `[.!?]["')]?` at the end → truncated) decides whether to render a callout below the description: `flex flex-col items-start gap-3 rounded-xl border border-border bg-surface-secondary p-4` — same chrome as `WorkExperienceRoleCard`'s root — with `text-sm text-text-secondary` explanatory copy and a "View Full Job Post" link, same secondary-button chrome as `JobInfo`'s "View Job Post" but no icon (matches the shared screenshot). Reuses the job's existing `external_apply_url` rather than adding a new `source_url` field — both columns hold the identical Adzuna `redirect_url` today (see `architecture.md`'s Adzuna Job Discovery decision), so a second field carrying the same value wasn't worth adding. Only rendered when `aboutRole` is non-null and looks truncated — the "No description provided" empty state never shows it.

### CompanyResearch (job details page)

`components/job-details/CompanyResearch.tsx` — Server Component. Takes `company: string`. Per build-plan.md's Feature 12 scope ("Company research section shows empty state only"), this always renders the empty state — Feature 13 (Company Research Agent) owns wiring the button and the populated-dossier view.

- Root: `flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Header row: icon badge `flex h-10 w-10 items-center justify-center rounded-full bg-accent-light` with `Building2` (lucide) `h-5 w-5 text-accent`, heading `text-base font-semibold text-text-primary` "Company Research"
- **Research Company button — `rounded-full` (pill), not the standard `rounded-md` primary button.** Pixel-confirmed against `job-details.png`: this one CTA has a visibly larger corner radius than every other primary button in the app. Scoped to this one component (not a change to `ui-rules.md`'s general Buttons section, unlike Feature 09's navbar-underline correction) since nothing else in the app shares this shape yet. `flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground` with `Search` (lucide) `h-3.5 w-3.5`. **Intentionally inert (`type="button"`, no `onClick`)** — same "styled but not yet wired" precedent as `SearchControls.tsx`'s Find Jobs button before Feature 10
- Empty state block: `flex flex-col items-center gap-2 border-t border-border px-6 py-12 text-center`, icon badge `flex h-12 w-12 items-center justify-center rounded-full bg-surface-secondary` with `Building2` (lucide) `h-5 w-5 text-text-muted`, "No research yet" `text-base font-semibold text-text-primary`, description `text-sm text-text-secondary` interpolating `company` — "Click "Research Company" to let the AI browse {company}'s public pages and build a dossier."

### JobActions (job details page)

`components/job-details/JobActions.tsx` — Server Component. Takes `company: string`, `externalApplyUrl: string | null`. Full-width Apply Now bar, the last element on the page (outside every card, its own row — matches the design).

- `<a href={externalApplyUrl} target="_blank" rel="noopener noreferrer">`: `flex w-full items-center justify-center rounded-xl bg-accent px-4 py-4 text-base font-semibold text-accent-foreground hover:bg-accent-dark`, label "Apply Now at {company}"
- Defensive fallback when `externalApplyUrl` is null (nullable DB column, even though every job this app currently saves populates it): a plain `text-text-muted` bar instead of a dead link — never a link with no `href`

### JobsTable (find-jobs page) — Feature 12 addition

`components/find-jobs/JobsTable.tsx` — still a Server Component. Each row is now a real navigation target to `/find-jobs/[id]` (Feature 12 needed a way to reach the new page — `project-overview.md`'s "Click job row → opens job details page" was never wired until now). Uses the "stretched link" pattern rather than an `onClick` handler, so the row stays keyboard-operable via a real `<a>` (`/develop`'s accessibility checklist: navigation must use the platform's real navigation primitive, not a styled `tr`/`div` faking one) without turning the whole table into a Client Component: `<tr className="relative ...">` + a `next/link` `<Link href={`/find-jobs/${job.id}`} className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" aria-label="View details for {role} at {company}" />` as the first child of the row's first `<td>`, sized to the whole row via `position: relative` on the `<tr>`.
