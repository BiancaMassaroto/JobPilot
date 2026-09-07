import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!projectToken || !host) {
  if (process.env.NODE_ENV === "development") {
    const missingVariable = !projectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";

    // Warn, don't throw — this file is auto-loaded before hydration on every
    // page, so throwing here breaks the whole app for a missing analytics
    // key. A missing key should just mean no analytics, not a crashed app.
    console.warn(
      `[instrumentation-client] ${missingVariable} is missing or un-configured — PostHog events will be silently dropped until it's set.`,
    );
  }
} else {
  posthog.init(projectToken, {
    api_host: host,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
