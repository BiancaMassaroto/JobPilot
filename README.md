<div align="center">

<img src="public/logo.png" alt="JobPilot" width="220" />

### Your AI-powered job hunting co-pilot

Set up your profile once. JobPilot finds the jobs, scores how well they fit, researches the company, and hands you a fully-prepped dossier before you ever click apply.

</div>

<br />

## What is JobPilot?

Job hunting is repetitive: reading dozens of descriptions, guessing if a role is worth your time, then researching each company from scratch — all before you even apply.

JobPilot automates the prep work. Fill out your profile (or upload an existing resume and let AI extract it), then let the agent:

1. **Discover** real, current job postings from [Adzuna](https://developer.adzuna.com/)
2. **Score** each one 0–100 against your actual skills and experience with Gemini
3. **Research** any company you're interested in — a cloud browser session reads the company's own site and produces a structured dossier: overview, tech stack, culture, and interview talking points
4. **Track** everything on a dashboard with real usage analytics

You stay in control the whole time — JobPilot never submits an application for you. It just makes sure that when you do click **Apply**, you're walking in prepared.

<br />

## How it works

```
  Profile Setup                Job Discovery                 Company Research
 ┌────────────────┐          ┌──────────────────┐          ┌──────────────────────┐
 │ Fill profile,   │          │ Search Adzuna by  │          │ Browserbase +         │
 │ upload resume,  │  ────▶   │ title + location  │  ────▶   │ Stagehand browse the  │
 │ auto-extract    │          │ Gemini scores     │          │ company's real site   │
 │ with Gemini     │          │ every match 0-100 │          │ Gemini writes the     │
 └────────────────┘          └──────────────────┘          │ dossier               │
                                                              └──────────────────────┘
                                                                        │
                                                                        ▼
                                                          You review + click Apply Now
```

<br />

## Features

| | |
|---|---|
| 🔐 **Auth** | Google & GitHub OAuth via InsForge |
| 📄 **Smart Profile** | Fill manually, or upload a resume PDF and let Gemini auto-fill every field |
| 📝 **Resume Generation** | Generate a clean, professional PDF resume straight from your profile data |
| 🔎 **Job Discovery** | Search real, live postings through the Adzuna API |
| 🎯 **AI Match Scoring** | Every job scored 0–100 with a reason, matched skills, and missing skills |
| 🕵️ **Company Research Agent** | A cloud browser (Browserbase + Stagehand) visits the company's site, GPT/Gemini synthesizes a dossier |
| 📊 **Live Dashboard** | Stats bar, recent activity feed, and PostHog-powered analytics charts |
| 🎛️ **Filter, Sort & Paginate** | Full control over the jobs list — match score, newest/oldest, high/low match |

<br />

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Backend | [InsForge](https://insforge.dev) — Auth, Postgres DB, Storage |
| AI | [Gemini](https://ai.google.dev/) (`@google/genai`) — extraction, scoring, resume generation, research synthesis |
| Company Research | [Browserbase](https://browserbase.com) + [Stagehand](https://www.stagehand.dev/) — cloud browser automation |
| Job Data | [Adzuna API](https://developer.adzuna.com/) |
| Analytics | [PostHog](https://posthog.com) |
| PDF Generation | `@react-pdf/renderer` |
| Styling | Tailwind CSS v4 (token-based, `@theme`) |
| Charts | Recharts |
| Language | TypeScript (strict) |

<br />

## Getting Started

### Prerequisites

You'll need API keys/credentials for: InsForge, Gemini, Adzuna, Browserbase, and PostHog.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

```env
# InsForge — auth, database, storage
NEXT_PUBLIC_INSFORGE_URL=
NEXT_PUBLIC_INSFORGE_ANON_KEY=
INSFORGE_PROJECT_URL=
INSFORGE_PROJECT_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gemini
GEMINI_API_KEY=

# Adzuna — job discovery
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Browserbase — company research
BROWSERBASE_API_KEY=
BROWSERBASE_PROJECT_ID=

# PostHog — analytics
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=
NEXT_PUBLIC_POSTHOG_HOST=
POSTHOG_PERSONAL_API_KEY=
POSTHOG_PROJECT_ID=
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

<br />

## Project Structure

```
job_pilot/
├── app/                  → Routes (App Router): dashboard, find-jobs, profile, auth, API handlers
├── agent/                → Job discovery, match scoring, and company research agent logic
├── actions/               → Server Actions (profile, jobs)
├── components/            → UI components, organized by feature
├── lib/                   → Clients, schemas, and shared utilities (InsForge, Gemini, PostHog, etc.)
├── migrations/            → Database migrations
├── context/               → Living project docs — architecture, design tokens, build plan, progress
└── public/                → Static assets
```

<br />

## Core Pages

| Route | Description |
|---|---|
| `/` | Landing page |
| `/login` | Google / GitHub sign in |
| `/dashboard` | Stats, recent activity, analytics |
| `/find-jobs` | Search controls + full jobs list |
| `/find-jobs/[id]` | Job details, match breakdown, company research |
| `/profile` | Profile form + resume management |

<br />

## Documentation

This project keeps its own living context docs in [`context/`](context/) — architecture decisions, the design token system, UI conventions, and a feature-by-feature build log. Start with [`context/project-overview.md`](context/project-overview.md) if you want the full picture.

<br />

## Acknowledgements

Job listings powered by [Adzuna](https://www.adzuna.com/).

<br />

---

<div align="center">
Built with Next.js, InsForge, and a lot of AI.
</div>
