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
- CTA button ("Start for free"): `rounded-md bg-text-slate px-4 py-2 text-sm font-medium text-accent-foreground`
- Mobile menu: `md:hidden` button with `Menu`/`X` icon and `aria-expanded`, exposing all three navigation links in a `w-full border-t border-border py-2 md:hidden` list.

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
- Footer row: `flex ... justify-between border-t border-border pt-6`, "Generate Resume from Profile" primary button with `FileText` (lucide) icon — still UI-only, that's Feature 08
- Client-side validation (PDF mime type, 5MB max) clears the input (`input.value = ""`) on failure so a rejected file can't linger as submittable; the Server Action re-validates the same two checks server-side regardless (never trust the client alone)

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

### ProfileForm (profile page)

`components/profile/ProfileForm.tsx` — Client Component. Takes `initialProfile: ProfileFormData` from the now-async `app/profile/page.tsx` (real saved data, or empty/default values + the session email for a first-time user — no more hardcoded mock, see progress-tracker.md Feature 06 notes) and seeds `useState` from it. Root element is a `<form action={formAction}>` (`useActionState(saveProfileAction, ...)`) wrapping **both** `<ResumeUpload />` and the "Profile Information" card — they save together in one Server Action call, so both have to share the one `<form>` even though they render as two separate bordered cards. A hidden `<input type="hidden" name="profile" value={JSON.stringify(profile)} readOnly />` carries the whole structured state as one JSON blob (sidesteps native multipart `FormData` turning every field into a string).

- Form root: `flex flex-col gap-6` (no border/card styling itself — the two `<section>`s inside carry that)
- "Profile Information" section: `flex flex-col gap-8 rounded-2xl border border-border bg-surface p-6 shadow-card`
- Section heading: `text-base font-semibold text-text-primary`; each section after the first is separated by `border-t border-border pt-8`
- Two-column field grid: `grid grid-cols-1 gap-4 md:grid-cols-2`
- "+ Add role": `flex items-center gap-1 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:text-text-muted` with `Plus` (lucide), disabled at 3 roles
- Save Profile button: `type="submit"`, `rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60`, disabled + "Saving…" label while `isPending`; `actionState.error` renders as `text-sm text-error` above it, a success message as `text-sm text-success-foreground`
