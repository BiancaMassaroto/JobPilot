// Server context only — API routes, Server Actions, agent functions
import { PostHog } from "posthog-node";

export function createPostHogServer(): PostHog {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
    flushAt: 1, // send immediately — Next.js functions are short-lived
    flushInterval: 0,
  });
}
