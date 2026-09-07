// Browser context only — identity lifecycle helpers around the posthog-js
// singleton that instrumentation-client.ts initializes at app startup.
import posthog from "posthog-js";

type IdentifiedUser = {
  id: string;
  email: string;
};

// Single source for "is it safe to call posthog.capture()" — components
// that fire client-side events read this instead of each recomputing the
// same env var check (this drifted out of sync once already, per
// progress-tracker.md's note on the Feature 03 env var rename).
export const isPostHogConfigured = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

export function identifyUser(user: IdentifiedUser): void {
  posthog.identify(user.id, { email: user.email });
}

// posthog-js's capture() is fire-and-forget with no way to await the actual
// network send on the public API. Called right before a hard navigation
// (an OAuth redirect, an external link) that would otherwise race the
// request off the network, this gives it a brief window to leave the
// browser first — the standard mitigation for this exact race.
export function captureBeforeNavigate(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  posthog.capture(event, properties);
  return new Promise((resolve) => setTimeout(resolve, 250));
}

// Unlinks the browser's identity so the next person on a shared device
// doesn't inherit the outgoing user's events. Call on sign out.
export function resetIdentity(): void {
  posthog.reset();
}
