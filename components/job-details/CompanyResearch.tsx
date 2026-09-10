"use client";

// 1. External imports
import { Building2, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// 2. Internal imports
import type { CompanyResearchDossier } from "@/types";

// 3. Type definitions
type Props = {
  jobId: string;
  company: string;
  initialDossier: CompanyResearchDossier | null;
};

type Status = "idle" | "loading" | "error";

type ApiResponse =
  | { success: true; data: { dossier: CompanyResearchDossier } }
  | { success: false; error: string };

// Decision 15 — a simulated step sequence, not a real backend-synced one:
// the route is a single blocking call with no streaming/polling channel, so
// this cycles on a timer rather than tracking real server phases. Holds on
// the last label until the response actually returns.
const LOADING_STEPS = ["Visiting company homepage…", "Analyzing pages…", "Synthesizing your dossier…"];
const LOADING_STEP_INTERVAL_MS = 4000;

// 4. Component
// Feature 13 — now a Client Component (changed from Feature 12's build,
// where this was a Server Component with an intentionally inert button —
// see architecture.md's Feature 13 decision, Decision 17). Always enabled,
// even once a dossier exists: re-running research always overwrites
// (Decision 7), it isn't a one-time action.
export function CompanyResearch({ jobId, company, initialDossier }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [dossier, setDossier] = useState<CompanyResearchDossier | null>(initialDossier);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status !== "loading") {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      return;
    }

    // stepIndex is reset to 0 by handleResearch itself, right before this
    // effect fires (not here) — react-hooks/set-state-in-effect forbids
    // calling setState synchronously in an effect body; this effect only
    // subscribes to the timer, per the same rule Feature 07 already
    // adjusted for (architecture.md's AI Profile Extraction decision).
    stepTimerRef.current = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, LOADING_STEPS.length - 1));
    }, LOADING_STEP_INTERVAL_MS);

    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    };
  }, [status]);

  const handleResearch = async () => {
    if (status === "loading") return;

    setStepIndex(0);
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/agent/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!payload.success) {
        // Decision 7 — never clobber whatever dossier was already
        // displayed on a failed run.
        setError(payload.error);
        setStatus("error");
        return;
      }

      setDossier(payload.data.dossier);
      setStatus("idle");
      // Picks up the persisted row on next natural revalidation — same
      // belt-and-suspenders pattern as Feature 10's SearchControls.
      router.refresh();
    } catch (fetchError) {
      console.error("[CompanyResearch]", fetchError);
      setError("Couldn't research this company right now. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-light">
            <Building2 className="h-5 w-5 text-accent" />
          </span>
          <h2 className="text-base font-semibold text-text-primary">Company Research</h2>
        </div>
        <button
          type="button"
          onClick={handleResearch}
          disabled={status === "loading"}
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          {dossier ? "Re-run Research" : "Research Company"}
        </button>
      </div>

      {status === "loading" && (
        <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{LOADING_STEPS[stepIndex]}</p>
        </div>
      )}

      {status !== "loading" && error && (
        <p className="border-t border-border px-6 pt-4 text-sm text-error">{error}</p>
      )}

      {status !== "loading" && dossier && <DossierView dossier={dossier} />}

      {status !== "loading" && !dossier && (
        <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-12 text-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
            <Building2 className="h-5 w-5 text-text-muted" />
          </span>
          <p className="text-base font-semibold text-text-primary">No research yet</p>
          <p className="text-sm text-text-secondary">
            Click &quot;Research Company&quot; to let the AI browse {company}&apos;s public pages and build a
            dossier.
          </p>
        </div>
      )}
    </div>
  );
}

// Not exported — colocated with its one consumer, same "local helper" pattern
// as MatchScore.tsx's SkillBadge. Renders all 9 dossier fields as a plain
// stacked list (Decision 16) — no tabs/accordion, matching this page's
// general preference for stacked content over interactive chrome.
function DossierView({ dossier }: { dossier: CompanyResearchDossier }) {
  return (
    <div className="flex flex-col gap-6 border-t border-border pt-6">
      <Section title="Company Overview">
        <p className="text-sm leading-6 text-text-primary">{dossier.companyOverview}</p>
      </Section>

      <Section title="Tech Stack">
        {dossier.techStack.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dossier.techStack.map((tech) => (
              <span
                key={tech}
                className="inline-flex items-center rounded-full bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-secondary"
              >
                {tech}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No tech stack details found.</p>
        )}
      </Section>

      <BulletSection title="Culture" items={dossier.culture} />

      <Section title="Why This Role">
        <p className="text-sm leading-6 text-text-primary">{dossier.whyThisRole}</p>
      </Section>

      <BulletSection title="Your Edge" items={dossier.yourEdge} />
      <BulletSection title="Gaps to Address" items={dossier.gapsToAddress} />
      <BulletSection title="Smart Questions" items={dossier.smartQuestions} />
      <BulletSection title="Interview Prep" items={dossier.interviewPrep} />

      {dossier.sources.length > 0 && (
        <Section title="Sources">
          <ul className="flex flex-col gap-1">
            {dossier.sources.map((source) => (
              <li key={source} className="text-xs text-text-muted">
                <a href={source} target="_blank" rel="noopener noreferrer">
                  {source}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold tracking-wide text-text-secondary uppercase">{title}</h3>
      {children}
    </div>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-text-primary">
            <span className="text-text-muted">•</span>
            {item}
          </li>
        ))}
      </ul>
    </Section>
  );
}
