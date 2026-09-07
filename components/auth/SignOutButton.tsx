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
// sign-out control (currently just Navbar's authenticated state) gets the
// PostHog identity reset for free instead of relying on each caller to
// remember it.
export function SignOutButton({ className, children }: Props) {
  return (
    <form action={signOutAction} onSubmit={() => resetIdentity()}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
