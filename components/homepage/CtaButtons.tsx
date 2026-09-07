"use client";

// 1. External imports
import Link from "next/link";
import { Play } from "lucide-react";
import posthog from "posthog-js";

// 2. Internal imports
import { isPostHogConfigured } from "@/lib/posthog-client";

// 3. Type definitions
// (none — no props)

// 4. Component
// Shared by Hero.tsx and CtaSection.tsx — same gradient-card CTA pair in both
// places (see ui-registry.md). Keep this single source instead of hand-copying
// the classes again.
export function CtaButtons() {
  return (
    <div className="mt-8 flex items-center justify-center gap-3">
      <Link
        href="/dashboard"
        onClick={() => {
          if (isPostHogConfigured) {
            posthog.capture("marketing_cta_clicked", {
              destination: "dashboard",
            });
          }
        }}
        className="flex items-center gap-2 rounded-md bg-gradient-to-br from-text-darker to-text-slate px-4 py-2 text-sm font-medium text-accent-foreground"
      >
        Get Started
        <Play className="h-3.5 w-3.5 fill-current text-text-muted" />
      </Link>
      <Link
        href="/find-jobs"
        onClick={() => {
          if (isPostHogConfigured) {
            posthog.capture("marketing_cta_clicked", {
              destination: "find_jobs",
            });
          }
        }}
        className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary"
      >
        Find Your First Match
      </Link>
    </div>
  );
}
