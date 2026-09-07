# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 06 Profile Save Logic
**Next:** 07 AI Profile Extraction from Resume

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [x] 03 PostHog Initialization
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

### 01 Homepage

- Built against `context/designs/landing-page.png` (source of truth per ui-rules.md) rather than build-plan.md's shorter description — the approved design has **two** feature sections with three value props each ("Manage Your Job Search With Ease" and "Apply With More Confidence, Every Time"), not one. Mapped to `Features.tsx` and `HowItWorks.tsx` per architecture.md's homepage component list.
- Added two homepage components not listed in architecture.md's folder plan, needed to match the design: `Testimonial.tsx` and `CtaSection.tsx`.
- Design's dashboard/table/table/terminal mockups are pre-made static assets (`public/images/dashboard-demo.png`, `jobs-lists.png`, `agnet-log.png`) that already pixel-match the design — used directly via `next/image` instead of rebuilding as HTML/CSS.
- Design's dark CTA buttons ("Get Started", hero + bottom CTA) use a subtle gradient not in ui-tokens.md's documented button spec (which only defines the purple `accent` primary button). Sampled the design's pixel colors and matched them to existing tokens: `from-text-darker to-text-slate` gradient for hero/bottom-CTA buttons, flat `bg-text-slate` for the navbar "Start for free" button — no new hex introduced.
- Hero and bottom-CTA sections use a soft radial-gradient background (pink/blue blur) per the design, built from `var(--color-accent-light)` / `var(--color-info-light)` tokens via an arbitrary Tailwind `bg-[radial-gradient(...)]` value — not a flat white card. This is a deliberate exception to ui-rules.md's "cards are always white" rule since it's a marketing hero, not a data card.
- `Get Started` / `Find Your First Match` / `Start for free` all link to `/login` for now. The build-plan's authenticated-vs-unauthenticated redirect logic depends on InsForge auth, which is Feature 02 — not yet built.
- Installed `lucide-react` (already an approved dependency in code-standards.md) for the play-triangle icon on CTA buttons.
- Logo uses `public/logo.png` directly (icon + wordmark baked into one asset) rather than rebuilding the gradient-square icon in code — simpler and pixel-matches the design; ui-tokens.md's Logo spec (gradient square + separate text) can be revisited later if the logo needs to render at other sizes/colors.
- Navbar is a Client Component (`"use client"`) because it uses `usePathname` to support active-link highlighting for when Dashboard/Find Jobs/Profile pages exist.
- Added an accessible mobile navigation toggle to `Navbar`: below `md`, the menu exposes Dashboard, Find Jobs, and Profile while preserving the existing Start for free CTA.

### 02 Auth

- **Corrected a stale package name across architecture.md, library-docs.md, and code-standards.md**: those files referenced `@insforge/ssr` as a standalone npm package. It does not exist (confirmed 404 on the npm registry). The real package is `@insforge/sdk` (already the one AGENTS.md's own InsForge instructions and the MCP `fetch-docs` tool point to); its SSR helpers live at the `@insforge/sdk/ssr` and `@insforge/sdk/ssr/middleware` subpaths — verified against the installed package's own bundled `SDK-REFERENCE.md`. All three context files and the actual code now use the correct import path.
- **`middleware.ts` → `proxy.ts`**: this project runs Next.js 16.3.4, which renamed Middleware to Proxy (confirmed in `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` per AGENTS.md's "read the bundled docs first" rule). architecture.md said `middleware.ts` — corrected to `proxy.ts` with an exported `proxy()` function. The InsForge SDK's own `updateSession()` reference already anticipates this rename.
- **OAuth callback is a Route Handler (`callback/route.ts`), not a page** (architecture.md originally listed `callback/page.tsx`). Exchanging the OAuth code and setting the resulting session cookies requires writing `Set-Cookie` headers, which a Server Component page cannot do — only a Route Handler or Server Action can. Corrected in architecture.md's folder plan.
- Session model: cookie-based SSR mode (`createBrowserClient()` / `createServerClient()` from `@insforge/sdk/ssr`), not the plain `createClient()` + in-memory-session pattern from the generic InsForge SDK docs. This keeps the refresh token httpOnly and server-owned, matching architecture.md's existing two-client-instance design. Because of this, sign-in/sign-out run through Server Actions (`actions/auth.ts`) via `createAuthActions()`, and the OAuth flow is: Server Action calls `signInWithOAuth(provider, { skipBrowserRedirect: true })` → stores `codeVerifier` in an httpOnly cookie → redirects to the provider → `callback/route.ts` calls `exchangeOAuthCode()` and sets the session cookies → redirects to `/dashboard`.
- `proxy.ts` protects `/dashboard`, `/profile`, `/find-jobs` by checking the `accessToken` that `updateSession()` returns (it transparently refreshes an expired access token from the httpOnly refresh cookie first, so a real session is never bounced to `/login` just because the short-lived access token expired).
- Completed the Feature 01 logic that was deferred pending this feature: `Home` (`app/page.tsx`) is now async and redirects logged-in users to `/dashboard` server-side (`project-overview.md`'s documented homepage flow). The homepage CTAs ("Get Started", "Start for free") now link straight to `/dashboard`/`/find-jobs` instead of `/login` — `proxy.ts` itself bounces unauthenticated visitors to `/login`, so no separate auth check was needed in those components.
- lucide-react (v1.41.0, already installed) ships no Google/GitHub brand marks — inlined both as local, unexported SVG components in `LoginCard.tsx` rather than adding a new icon dependency.
- **BLOCKING before release, not just a manual step to remember:** the backend's `allowedRedirectUrls` is currently empty (confirmed via `get-backend-metadata`). Until it's populated, OAuth doesn't degrade, it fails outright at the callback for every provider — no user can sign in with Google or GitHub at all. Add `http://localhost:3000/callback` for local dev and the deployed origin's `/callback` before release, in the InsForge dashboard's Auth settings, then **actually test a sign-in with Google and with GitHub** against each configured origin to confirm the callback completes end-to-end (session cookies set, landed on `/dashboard`), not just that the setting was saved.
- Redesigned the login page as a two-panel card (pitch panel + sign-in panel) to match a design reference shared in chat, replacing the original single centered card. See ui-registry.md's `LoginCard` entry.
- **`/code-review` pass — fixes applied:**
  - `app/(auth)/callback/route.ts` had no try/catch (code-standards.md requires one on every route handler) — wrapped the whole handler; a thrown error now falls back to the same `/login?error=oauth_failed` redirect as a normal exchange failure.
  - On a failed `exchangeOAuthCode`, the `insforge_oauth_verifier` cookie deletion had been applied to the discarded success-path `response` object, not the `NextResponse` actually returned — the stale verifier cookie would survive a failed attempt. Fixed to delete it on whichever response is actually returned.
  - `actions/auth.ts`'s `getAppOrigin()` built the OAuth `redirectTo` straight from the request's `Host` header, which a proxy/misconfigured LB can spoof — open-redirect risk until `allowedRedirectUrls` (see above) is populated. It now requires a validated `NEXT_PUBLIC_APP_URL` outside local development and only permits a loopback `Host` fallback in `NODE_ENV=development`. Documented in code-standards.md's env var table; set in `.env.local`.
  - `text-white` (a raw Tailwind class, against ui-rules.md's "project tokens only" rule) on the Navbar/Hero/CtaSection CTA buttons — swapped for the existing `text-accent-foreground` token (`#ffffff`), no new token needed.
  - Hero.tsx and CtaSection.tsx hand-copied the identical CTA button markup — ui-registry.md had already flagged this as a "reuse, don't invent" case that never got followed. Extracted into `components/homepage/CtaButtons.tsx`, now the single source both files import.
  - The review also caught that `package.json`/`context/ui-tokens.md`/`context/ui-rules.md` commit to Tailwind v4 (`@theme`, no `tailwind.config.ts`) while AGENTS.md's InsForge setup notes said "EXTRA IMPORTANT: Use Tailwind CSS 3.4 (do not upgrade to v4)". Flagged to the user rather than resolved unilaterally, since downgrading would mean rewriting Feature 01's entire token system. **Decision: keep v4** — it's the one actually shipped and working since Feature 01. AGENTS.md's note is corrected to say so explicitly, with a pointer to `ui-tokens.md`/`ui-rules.md`.

### 03 PostHog Initialization

- **Corrected a stale client-init pattern across architecture.md and library-docs.md**: those files documented a manual `posthog.init()` inside `lib/posthog-client.ts`, wired up from the root layout, reading `NEXT_PUBLIC_POSTHOG_KEY`. An `instrumentation-client.ts` file already existed at the project root (from an earlier `@posthog/wizard` run, per the installed `integration-nextjs-app-router` skill's bundled PostHog docs) using the current recommended Next.js integration — the `instrumentation-client.ts` file convention, confirmed as the real one in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md` (introduced Next.js 15.3, auto-loaded before hydration, no import needed anywhere) — and reading `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`. Kept that file as-is and repointed `lib/posthog-client.ts` to a narrower job: identity helpers only (`identifyUser`, `resetIdentity`), not init. Corrected `architecture.md`'s folder plan, `library-docs.md`'s PostHog section, and `code-standards.md`'s env var table to match.
- **Two events already existed outside the approved list**: `components/auth/LoginCard.tsx` and `components/homepage/CtaButtons.tsx` (built in Features 01–02) already called `posthog.capture()` for `oauth_sign_in_started` and `marketing_cta_clicked`, neither of which was in `code-standards.md`'s 4-event list. Asked the user — decision: keep both, add them to the approved list rather than strip them out. `code-standards.md` now documents six events.
- Added `lib/posthog-server.ts` — `createPostHogServer()` factory per the documented pattern (`flushAt: 1`, `flushInterval: 0`), reading the corrected env var name. Installed `posthog-node` (already an approved dependency in code-standards.md, just not yet installed).
- `posthog.identify()` after login: this app's OAuth flow is entirely server-side (Server Action → provider → Route Handler callback → redirect), so there is no client-side "login succeeded" moment to hook into directly. Added `components/auth/PostHogIdentify.tsx` — a headless client component mounted once in the root layout — that resolves the current session via `insforge.auth.getCurrentUser()` on every page load and calls `identifyUser()` if one exists. This is the documented fallback pattern (PostHog's own Next.js integration docs, "identify as soon as you're able," for apps that learn the user asynchronously) rather than the `posthog.init({ loaded })` callback, which only works for synchronously-known users.
- **`posthog.reset()` on logout — not wired yet, flagged rather than forced**: `signOutAction` in `actions/auth.ts` exists (Feature 02) but has no caller anywhere in the UI yet; there is no sign-out control (the Navbar isn't session-aware). Building a logout button now would be scope creep beyond this feature. `resetIdentity()` is exported from `lib/posthog-client.ts` and ready — wire a call to it into whichever client component ends up submitting `signOutAction`, whenever that control is built.
- No `ui-registry.md` entry: `PostHogIdentify` renders `null` and has no visual footprint, so there's no pattern to register there.
- **`/code-review` pass — fixes applied:**
  - **BLOCKING before merge — live API key exposure, not resolved by the `.gitignore` fix alone:** `.mcp.json` carries a live InsForge API key in plaintext and wasn't covered by `.gitignore` — added an ignore rule so it can't be committed going forward. Checked whether it already had been: `git log --all -- .mcp.json` and `git ls-files` both come back empty, so nothing needs purging from repository history here. But the `.gitignore` rule only stops a *future* commit — it does not revoke the key, and the file has sat in plaintext on disk this whole time, readable by anything with local filesystem access (backup/sync tools, other local processes, a shared screen), not only git. **Rotate this key in the InsForge dashboard before merge** and update the local `.mcp.json` with the new value; treat the current key as compromised regardless of the clean git history. If a copy of it ever does turn up in git history, a CI log, or a shared copy elsewhere, purge it from that history too and rotate again.
  - `app/globals.css`'s plain `@theme` block redefined `--font-sans` as a literal `"Inter", sans-serif` string, colliding with the identically-named CSS variable next/font's `inter.variable` also writes on `<html>` — and since no `@font-face` exists for the literal name "Inter", this meant the self-hosted font was never actually rendering, regardless of which declaration won the cascade. Renamed the next/font variable to `--font-inter` (`app/layout.tsx`) and added a separate `@theme inline { --font-sans: var(--font-inter), sans-serif; }` block so `--font-sans` explicitly resolves to next/font's real generated stack. Verified in the compiled CSS: `.font-sans{font-family:var(--font-inter), sans-serif}`.
  - `instrumentation-client.ts` threw an unguarded error at module scope when PostHog env vars were missing in development — since Next.js auto-loads this file before hydration on every page, a fresh clone without `.env.local` configured crashed the whole app for what should be optional analytics. Changed to `console.warn`.
  - `signOutAction` never unlinked the browser's PostHog identity. Added `components/auth/SignOutButton.tsx`, wrapping the action with `resetIdentity()` — not consumed anywhere yet (still no sign-out control in the UI), but now the correct call site exists for whenever one is built, instead of relying on a future caller to remember the pairing.
  - `LoginCard.tsx`'s `oauth_sign_in_started` capture fired in `onSubmit` immediately before the Server Action's hard redirect to the OAuth provider — an async `posthog.capture()` racing page unload can be aborted mid-flight. Added `captureBeforeNavigate()` (`lib/posthog-client.ts`), which fires the capture then resolves after a short delay; both OAuth forms now `preventDefault()`, call it, then `requestSubmit()` once it resolves.
  - `signInWithOAuthAction` and `signOutAction` returned `Promise<void>` against code-standards.md's `{ success, error? }` convention for Server Actions. Both actions redirect unconditionally on every path (`redirect()` itself is typed `never`), so there's no code path that returns a value — retyped both `Promise<never>` and documented this as the one sanctioned exception in code-standards.md, rather than force a return value that would never be reached.
  - The OAuth verifier cookie name was hardcoded independently in `actions/auth.ts` and `app/(auth)/callback/route.ts`. Tried exporting it from `actions/auth.ts` first — broke the build, because a `"use server"` file's exports are all treated as Server Action references and can't include a plain constant. Moved it to a new `lib/auth-constants.ts` instead, imported by both.
  - `isPostHogConfigured` was computed with an identical inline expression independently in `LoginCard.tsx` and `CtaButtons.tsx` (a third variant lived in `instrumentation-client.ts`, left as is since its job — deciding whether to init at all — is a different concern). Consolidated the two component-side checks into a single `isPostHogConfigured` export in `lib/posthog-client.ts`.
  - Google's brand colors were hardcoded as raw hex in `LoginCard.tsx`'s inline SVG with no stated exception to ui-tokens.md's "never hardcode hex" invariant. Added the brand-icon exception to `ui-tokens.md` and a short comment at the SVG — these are fixed trademarked colors, not design tokens, and shouldn't be swapped for one.

### 04 Database Schema

- **`/architect` pass first**: the build-plan.md entry left real decisions open — whether to add Postgres RLS (InsForge genuinely supports it, confirmed live via `auth.uid()`/`auth.role()`/`auth.jwt()`), how to handle a real gap in InsForge's storage isolation (`storage.objects` has RLS disabled with no per-object ownership check), whether `jobs.source = 'url'` should stay reserved despite URL import being out of scope, and cascade delete behavior. Full rationale lives in `architecture.md`'s "Constraints, Row Level Security & Migration" section.
- Ran the migration via the `run-raw-sql` MCP tool: `profiles`, `agent_runs`, `jobs`, `agent_logs` created with all columns, CHECK constraints, foreign keys, and indexes exactly as decided. `profiles.id REFERENCES auth.users(id)` — the flagged cross-schema FK risk — was accepted by InsForge without issue, so the documented fallback (a plain `uuid` PK with no FK into `auth`) wasn't needed.
- RLS enabled and policies verified on all four tables via `get-table-schema` (`rlsEnabled: true`, `auth.uid() = user_id` / `= id` policies present on each).
- Created the `resumes` storage bucket via `create-bucket` (`isPublic: false`).
- **Verified end-to-end**, not just via the admin MCP path: ran a real query through the app's actual `@insforge/sdk` client using the public `NEXT_PUBLIC_INSFORGE_URL` + anon key from `.env.local` (the same config `lib/insforge-client.ts` uses) — `select()` on `profiles` returned `{ data: [], error: null }` with no session, confirming RLS blocks anonymous reads correctly rather than erroring or leaking rows.
- `jobs.company_research`, `agent_logs.job_id`, and other nullable columns match architecture.md exactly — no column list drift from what `/architect` specified.

### 05 Profile Page — Full UI

- Built pixel-by-pixel against `context/designs/profile.png` (source of truth per ui-rules.md), not build-plan.md's text description — the approved design has **no Cover Letter Tone field** in Job Preferences, unlike build-plan.md's description and architecture.md's `profiles.cover_letter_tone` column. Left it out of the UI entirely (input coverage for this feature is "what the design shows"); the DB column stays reserved for whenever a later feature actually surfaces it.
- Two new tokens added to `ui-tokens.md` / `globals.css` — `--color-error-light: #ffe2e2` (completion ring track) and `--color-error-lightest: #fef2f3` (missing-field badge background) — sampled directly from the design PNG. Neither existed before; the existing `--color-error` (#ef4444) already matched the ring fill and badge text/icon exactly, so that one was reused as-is.
- No shadcn/ui components used — followed Features 01/02's established pattern (hand-rolled Tailwind matching ui-tokens.md/ui-rules.md exactly) rather than introducing shadcn now, since nothing in the codebase uses it yet and `components/ui/` is reserved for it per architecture.md's system boundaries. Revisit if a future feature actually needs shadcn primitives.
- Extracted five reusable, non-exported-elsewhere components under `components/profile/` beyond architecture.md's four (`ProfileForm`, `ResumeUpload`, `CompletionIndicator` — `ResumePreview` deferred, see below): `TextField`, `TextAreaField`, `SelectField` (generic field chrome, reused ~16 times), `TagInput` (shared by Skills + Industries), `WorkExperienceRoleCard` (one role, rendered up to 3 times). Same pattern as Feature 01 adding `CtaButtons.tsx`/`Testimonial.tsx` beyond the original folder plan — extracted because the alternative was hand-copying the same field markup a dozen-plus times in one file.
- `ResumePreview.tsx` (listed in architecture.md's folder plan) **not built** — the design has no "resume already uploaded" visual state to build against, and build-plan.md Feature 05 only describes the empty upload state. Deferred to whichever of Feature 07/08 first needs to render an uploaded/generated resume.
- Work Experience list is fully interactive (add up to 3 roles, remove any role once more than one exists) even though the design's mock only shows one role — the "+ Add role" control the design does show has no purpose if roles can't actually be added and removed. The remove (trash icon) affordance itself isn't in the design; added it because the design has no way to build a role-removal UI reference for something it never shows more than one of.
- All profile state is local `useState`, seeded with the design's own mock values (Faizan Ali / Vercel / etc.) verbatim — no InsForge reads/writes yet (Feature 06), so the Save Profile and Generate Resume from Profile buttons render but do nothing yet.
- Verified with `npm run build` (typecheck + production build, both clean) and `npm run lint` (no warnings). Visual comparison against the design was done by hand (pixel-sampling the design PNG with PIL for exact colors/positions) rather than a rendered screenshot diff — this sandbox has no headless browser (`chromium-cli`/Playwright/Chromium all unavailable) to drive the real `/profile` route, which is also behind `proxy.ts` auth and has no session to satisfy in this environment. Confirmed the route renders correctly (200, expected section text present, no error markers) via a temporary unauthenticated preview route that was deleted before finishing.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- **`app/dashboard/page.tsx` is a placeholder, not Feature 14.** Added out of sequence, at the user's explicit request, only so the OAuth login flow (which redirects to `/dashboard` per architecture.md) doesn't 404 while testing Feature 05. It's a single static card ("Dashboard coming soon" + a link to `/profile`) — no stats bar, no recent activity, no analytics, no `Navbar`-aware auth state. **Do not treat Phase 5 as started.** When Feature 14 is actually built, this file gets replaced wholesale, not extended.
