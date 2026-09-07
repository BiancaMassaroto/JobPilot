"use client";

// 1. External imports
import { useRef, type SubmitEvent } from "react";
import { ShieldCheck } from "lucide-react";

// 2. Internal imports
import { signInWithOAuthAction } from "@/actions/auth";
import {
  captureBeforeNavigate,
  isPostHogConfigured,
} from "@/lib/posthog-client";

// 3. Type definitions
// (none — no props)

// 4. Component
export function LoginCard() {
  const signInWithGoogle = signInWithOAuthAction.bind(null, "google");
  const signInWithGithub = signInWithOAuthAction.bind(null, "github");

  // Guards against the re-entrant submit event requestSubmit() below
  // dispatches — without it, the capture-then-resubmit flow would loop.
  const submittingRef = useRef(false);

  // The Server Action redirects the browser straight to the OAuth
  // provider's domain — a hard navigation that can abort posthog-js's
  // fire-and-forget capture() mid-flight. Hold the real submit for a
  // brief window so the event has a chance to actually leave the browser.
  function handleOAuthSubmit(provider: "google" | "github") {
    return (event: SubmitEvent<HTMLFormElement>) => {
      if (!isPostHogConfigured || submittingRef.current) {
        return;
      }

      event.preventDefault();
      const form = event.currentTarget;
      submittingRef.current = true;

      captureBeforeNavigate("oauth_sign_in_started", { provider }).then(() => {
        form.requestSubmit();
      });
    };
  }

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-card md:grid-cols-2">
      {/* Pitch panel */}
      <div className="flex flex-col justify-between gap-10 bg-[radial-gradient(circle_at_20%_20%,var(--color-accent-light),transparent_45%),radial-gradient(circle_at_80%_10%,var(--color-info-light),transparent_45%),radial-gradient(circle_at_60%_95%,var(--color-accent-light),transparent_50%)] bg-surface p-10">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-accent" />
          OAuth secured by InsForge
        </div>

        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Sign in and let the agent prep your next application.
          </h1>
          <p className="mt-6 max-w-sm text-sm text-text-secondary">
            Connect with Google or GitHub to start building your profile,
            matching jobs, and creating tailored application materials.
          </p>
        </div>

        <p className="text-xs text-text-muted">
          You&apos;ll land on your dashboard right after signing in.
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-col justify-center gap-8 p-10">
        <div>
          <p className="text-sm text-text-secondary">Welcome to</p>
          <p className="text-2xl font-bold text-text-primary">JobPilot</p>
          <p className="mt-2 text-sm text-text-secondary">
            Choose your preferred provider to continue.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <form
            action={signInWithGoogle}
            onSubmit={handleOAuthSubmit("google")}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary"
            >
              <GoogleIcon className="h-4 w-4" />
              Continue with Google
            </button>
          </form>

          <form
            action={signInWithGithub}
            onSubmit={handleOAuthSubmit("github")}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary"
            >
              <GithubIcon className="h-4 w-4" />
              Continue with GitHub
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Lucide has no brand mark for Google — inline the official four-color "G".
// Raw hex here is intentional (see ui-tokens.md's Invariants) — these are
// Google's trademarked brand colors, not project design tokens.
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="var(--color-google-blue)"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="var(--color-google-green)"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="var(--color-google-yellow)"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="var(--color-google-red)"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.87 8.87 4.76 12 4.76Z"
      />
    </svg>
  );
}

// Lucide carries no brand marks either — inline the GitHub Octocat mark.
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.89.12 3.19.77.84 1.24 1.91 1.24 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22 0 1.6-.02 2.89-.02 3.29 0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12Z" />
    </svg>
  );
}
