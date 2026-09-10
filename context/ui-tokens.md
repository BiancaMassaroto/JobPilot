# UI Tokens

Design tokens for JobPilot. All colors, typography, spacing, and component values extracted from the delivered design. Use these exact values throughout the codebase — never hardcode colors or use raw Tailwind color classes in components.

---

## How to Use

This project uses **Tailwind CSS v4**. All design tokens are defined using the `@theme` directive in `app/globals.css`. No `tailwind.config.ts` needed for colors or tokens.

`app/globals.css` is the canonical source for the semantic palette, so raw hex
values are explicitly permitted inside its `@theme` token definition only.
Components and other stylesheets must consume the resulting CSS variables or
Tailwind token classes instead of defining raw colors.

Tailwind v4 automatically generates utility classes from `@theme` variables:

- `--color-accent` → `bg-accent`, `text-accent`, `border-accent`
- `--color-surface` → `bg-surface`, `text-surface`, `border-surface`
- `--shadow-card` → `shadow-card`

```tsx
// Correct — uses generated utility classes
className="bg-surface text-text-primary border-border"

// Also correct — references CSS variable directly
style={{ color: 'var(--color-text-primary)' }}

// Never — hardcoded hex values
className="bg-[#F6F7FB] text-[#101828]"

// Never — raw Tailwind color classes
className="bg-purple-500 text-gray-600"
```

---

## globals.css — Complete Token Definition

```css
@import "tailwindcss";

@theme {
  /* Font */
  --font-sans: "Inter", sans-serif;

  /* Page and surface backgrounds */
  --color-background: #f6f7fb;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-surface-tertiary: #f2f5f7;
  --color-surface-muted: #f4f5fb;

  /* Borders */
  --color-border: #e7eaf3;
  --color-border-light: #e5e7eb;
  --color-border-muted: #dfe1e7;

  /* Text */
  --color-text-primary: #101828;
  --color-text-secondary: #6a7282;
  --color-text-muted: #99a1af;
  --color-text-dark: #364153;
  --color-text-darker: #36394a;
  --color-text-darkest: #111827;
  --color-text-black: #131316;
  --color-text-slate: #272835;
  --color-text-slate-medium: #666d80;

  /* Primary accent — purple */
  --color-accent: #7c5cfc;
  --color-accent-dark: #5e4cff;
  --color-accent-light: #f3e8ff;
  --color-accent-muted: #faf5ff;
  --color-accent-foreground: #ffffff;

  /* Success — green */
  --color-success: #10b981;
  --color-success-alt: #00bc7d;
  --color-success-dark: #007a55;
  --color-success-darker: #009966;
  --color-success-light: #d0fae5;
  --color-success-lightest: #ecfdf5;
  --color-success-foreground: #007a55;

  /* Info — blue */
  --color-info: #61a8ff;
  --color-info-dark: #155dfc;
  --color-info-medium: #2b7fff;
  --color-info-light: #dbeafe;
  --color-info-lightest: #eff6ff;
  --color-info-foreground: #155dfc;
  --color-info-muted: #94a2c5;

  /* Warning — orange */
  --color-warning: #ff8904;
  --color-warning-foreground: #ffffff;

  /* Error — red */
  --color-error: #ef4444;
  --color-error-light: #ffe2e2;
  --color-error-lightest: #fef2f3;
  --color-error-foreground: #ffffff;

  /* LinkedIn brand */
  --color-linkedin: #0a66c2;
  --color-linkedin-light: #dce6f1;
  --color-linkedin-foreground: #ffffff;

  /* Dark overlays */
  --color-overlay: #111827;
  --color-overlay-dark: #131316;

  /* Dashboard chart axis labels — added Feature 14, pixel-sampled */
  --color-chart-axis: #9ca3af;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

Tailwind v4 generates utility classes automatically from every `--color-*` token above:

- `bg-accent`, `text-accent`, `border-accent`
- `bg-surface`, `text-surface-secondary`
- `bg-success-light`, `text-text-muted`
- etc.

---

## Color Usage Guide

### Page Layout

| Element           | Token                  |
| ----------------- | ---------------------- |
| Page background   | `bg-background`        |
| Card / surface    | `bg-surface`           |
| Secondary surface | `bg-surface-secondary` |
| Default border    | `border-border`        |
| Light border      | `border-border-light`  |

### Typography

| Element                | Token                           |
| ---------------------- | ------------------------------- |
| Headings, primary text | `text-text-primary` (#101828)   |
| Secondary text, labels | `text-text-secondary` (#6A7282) |
| Placeholder, muted     | `text-text-muted` (#99A1AF)     |
| Dark labels            | `text-text-dark` (#364153)      |

### Accent (Primary Purple)

Used for: primary buttons, active nav items, match score bars, tailored badge, focus rings

| Element                | Token                    |
| ---------------------- | ------------------------ |
| Button background      | `bg-accent`              |
| Button text            | `text-accent-foreground` |
| Light badge background | `bg-accent-light`        |
| Subtle background      | `bg-accent-muted`        |

### Match Score Colors

Match score bars use fill colors based on score range. Corrected 2026-09-08 (Feature 09) — pixel-sampled directly from `find-jobs.png`'s six sample rows; the ranges previously written here (a 90/70/50 split, both top tiers green) didn't match the delivered design, which uses three distinct colors:

| Score Range | Color  | Token                                                    |
| ----------- | ------ | --------------------------------------------------------- |
| 90-100%     | Green  | `bg-success-alt` / `text-success-alt`                     |
| 80-89%      | Blue   | `bg-info-medium` / `text-info-medium`                     |
| 50-79%      | Orange | `bg-warning` / `text-warning`                              |
| Below 50%   | Gray   | `bg-text-muted` / `text-text-muted` (no sample at this range) |

### Skills Badges

| Type          | Background            | Text                      |
| ------------- | --------------------- | ------------------------- |
| Matched skill | `bg-success-lightest` | `text-success-foreground` |
| Missing skill | `bg-accent-muted`     | `text-accent`             |

### Source Badges

| Source   | Background             | Text                  |
| -------- | ---------------------- | --------------------- |
| LinkedIn | `bg-linkedin-light`    | `text-linkedin`       |
| URL      | `bg-surface-secondary` | `text-text-secondary` |

### Status Badges

| Status     | Background             | Text                      |
| ---------- | ---------------------- | ------------------------- |
| Tailored   | `bg-accent-light`      | `text-accent`             |
| High Match | `bg-success-lightest`  | `text-success-foreground` |
| Low Match  | `bg-surface-secondary` | `text-text-secondary`     |

### Attention / Missing Field Badges

Used for "Profile needs attention" style banners — missing field tags (e.g. PHONE, LOCATION, EDUCATION) and their completion ring.

| Element                  | Token                                              |
| ------------------------ | --------------------------------------------------- |
| Missing field badge bg   | `bg-error-lightest`                                  |
| Missing field badge text | `text-error`                                         |
| Alert icon               | `text-error`                                         |
| Completion ring fill     | `stroke-error` (`var(--color-error)`)                |
| Completion ring track    | `stroke-error-light` (`var(--color-error-light)`)    |

---

## Typography

| Element              | Size | Weight | Line height | Color token           |
| -------------------- | ---- | ------ | ----------- | --------------------- |
| Logo text            | 19px | 700    | 28px        | `text-text-darkest`   |
| Stat number          | 30px | 600    | 36px        | `text-text-primary`   |
| Section heading      | 16px | 600    | 24px        | `text-text-primary`   |
| Nav item (active)    | 14px | 500    | 20px        | `text-accent`         |
| Nav item (inactive)  | 14px | 500    | 20px        | `text-text-dark`      |
| Card label           | 14px | 500    | 20px        | `text-text-secondary` |
| Body / activity text | 14px | 500    | 20px        | `text-text-primary`   |
| Trend badge text     | 12px | 500    | 16px        | `text-success-darker` |
| Timestamp / muted    | 12px | 400    | 16px        | `text-text-muted`     |
| Chart axis labels    | 12px | 400    | 15px        | `#9CA3AF`             |
| Stat subtitle        | 12px | 400    | 16px        | `text-text-muted`     |

Font family: **Inter** — import from Google Fonts or use next/font/google.

---

## Spacing

| Token       | Value      | Usage                 |
| ----------- | ---------- | --------------------- |
| `gap-1`     | 4px        | Tight inline gaps     |
| `gap-2`     | 8px        | Badge and tag gaps    |
| `gap-3`     | 12px       | Form field gaps       |
| `gap-4`     | 16px       | Section internal gaps |
| `gap-6`     | 24px       | Between sections      |
| `gap-8`     | 32px       | Page section gaps     |
| `p-4`       | 16px       | Card padding          |
| `p-6`       | 24px       | Large card padding    |
| `px-4 py-2` | 16px / 8px | Button padding        |
| `px-3 py-1` | 12px / 4px | Badge padding         |

---

## Component Tokens

### Cards

```
background: bg-surface
border: 1px solid var(--border)
border-radius: 16px (rounded-2xl in Tailwind)
padding: 24px (p-6)
box-shadow: 0px 1px 3px rgba(0,0,0,0.1), 0px 1px 2px -1px rgba(0,0,0,0.1)
```

### Buttons

**Primary:**

```
background: bg-accent
text: text-accent-foreground
border-radius: rounded-md
padding: px-4 py-2
font-weight: font-medium
```

**Secondary:**

```
background: bg-surface
border: border border-border
text: text-text-primary
border-radius: rounded-md
padding: px-4 py-2
```

**Ghost:**

```
background: transparent
text: text-text-secondary
hover: hover:bg-surface-secondary
border-radius: rounded-md
```

### Input Fields

```
background: bg-surface
border: border border-border
border-radius: rounded-md
padding: px-3 py-2
text: text-text-primary
placeholder: text-text-muted
focus: ring-1 ring-accent
```

### Badges

```
border-radius: rounded-full
padding: px-2 py-0.5
font-size: text-xs
font-weight: font-medium
```

### Match Score Bar

```
background track: bg-border-light
fill: varies by score range (see Match Score Colors above)
height: 4px
border-radius: rounded-full
```

### Trend Badges (stat cards)

```
background: #ECFDF5 (success-lightest)
text color: #009966 (success-darker)
border-radius: 4px (rounded-sm)
padding: 2px 8px
font-size: 12px
font-weight: 500
```

### Activity Dots

**Resolved at Feature 16** — this project only ever has two real dashboard activity types, not three: `agent_run` completions ("Found X jobs...") and `company_research` population ("Researched..."). Feature 14 flagged that the table below (still shown for its accurate colors) named "Resume tailored"/"Cover letter" types that don't exist anywhere in build-plan.md's 17 features, and had a third color with nothing real left to pair it with. Resolved by dropping the third pairing rather than inventing a use for it:

| Real activity type | Outer ring | Inner dot |
|---|---|---|
| Job found (`agent_run` completed) | `#D0FAE5` (success-light) | `#00BC7D` (success-alt) |
| Company researched | `#DBEAFE` (info-light) | `#61A8FF` (info) |

The accent pairing (`#F3E8FF`/`#7C5CFC`) is unused for now — `ActivityDotColor` (`components/dashboard/RecentActivity.tsx`) still allows `"accent"` as a type, kept available rather than removed, in case a third real activity type is ever added.

Dot size: 8px inner, 16px outer with white border

### Dashboard Chart Colors

**Carried forward unchanged into the Feature 17 recharts rebuild** — `BarChartCard`/`LineChartCard` still source every color below from these same CSS variables, just through recharts props (`fill`, `stroke`, `tick`) instead of Tailwind classes or raw SVG attributes. See `ui-registry.md`'s updated entries.

| Chart                             | Color                                                                                                                                                           |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jobs Found Over Time (line)      | `#7C5CFC` (`--color-accent`) stroke, 3px width, area fill gradient from `rgba(124,92,252,0.2)` at the line down to transparent at the baseline — pixel-confirmed (Feature 14), not a flat fill |
| Company Research Activity (bars) | `#61A8FF` (`--color-info`) — corrected 2026-09-10 (Feature 14): this row previously said "Resume Tailoring Activity," a chart that doesn't exist anywhere in build-plan.md's 17 features; pixel-sampled against dashboard.png and matches the real Company Research Activity chart exactly |
| Match Score Distribution (bars)  | `#10B981` (`--color-success`)                                                                                                                                   |
| Chart grid lines                 | `1px dashed #E7EAF3` (`--color-border`) — pixel-confirmed (Feature 14)                                                                                           |
| Chart axis labels                | `--color-chart-axis` (`#9CA3AF`), 12px — new token added Feature 14; pixel-sampled and confirmed distinct from `text-muted` (#99A1AF), so it isn't reused        |

### Logo

```
background: linear-gradient(45deg, #7C5CFC 0%, #4A2EC5 100%)
border-radius: 10px
size: 36x36px
```

---

## Invariants

- Never use hex values directly in components — always use CSS variables via Tailwind tokens
  - Google brand colors are registered as `--color-google-*` theme tokens and consumed by the inline Google mark in `LoginCard.tsx`.
- Font is Inter — always import via next/font/google, never use a fallback system font
- Never use raw Tailwind color classes like `bg-purple-500` or `text-gray-600` — use project tokens only
- `--accent` (#7C5CFC) is the only purple — never use Tailwind's built-in purple scale
- Match score bars always use color tokens based on score range — never hardcoded colors
- LinkedIn badge always uses `--linkedin` (#0A66C2) — never generic blue
- All borders default to `--border` (#E7EAF3) — never use `border-gray-*`
