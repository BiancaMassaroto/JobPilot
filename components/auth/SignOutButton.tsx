"use client";

// 1. External imports
import type { ReactNode } from "react";

// 2. Internal imports
import { signOutAction } from "@/actions/auth";
import { resetIdentity } from "@/lib/posthog-client";

// 3. Type definitions
type Props = {
  className?: string;
  children: ReactNode;
};

// 4. Component
// The single call site for signing out — wraps the Server Action so every
// future sign-out control (none exist yet; the Navbar isn't session-aware)
// gets the PostHog identity reset for free instead of relying on each
// caller to remember it.
export function SignOutButton({ className, children }: Props) {
  return (
    <form action={signOutAction} onSubmit={() => resetIdentity()}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
