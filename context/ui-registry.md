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
