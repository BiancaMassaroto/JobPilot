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
- Nav link active: `text-sm font-medium text-accent`
- Nav link inactive: `text-sm font-medium text-text-dark hover:text-text-primary`
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
