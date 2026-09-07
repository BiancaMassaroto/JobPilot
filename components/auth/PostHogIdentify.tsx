"use client";

// 1. External imports
import { useEffect } from "react";

// 2. Internal imports
import { insforge } from "@/lib/insforge-client";
import { identifyUser, resetIdentity } from "@/lib/posthog-client";

// 3. Type definitions
// (none — no props)

// 4. Component
// Mounted once in the root layout so every page load resolves the current
// session (if any) and links it to PostHog, per the "call identify as soon
// as you're able" pattern — the app has no single client-side login moment
// to hook since OAuth sign-in and its callback both run server-side.
export function PostHogIdentify(): null {
  useEffect(() => {
    let cancelled = false;

    insforge.auth.getCurrentUser().then(({ data, error }) => {
      if (cancelled || error) return;
      if (!data.user) {
        resetIdentity();
        return;
      }
      identifyUser({ id: data.user.id, email: data.user.email });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
