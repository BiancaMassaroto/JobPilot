// 1. External imports
import Link from "next/link";

// 2. Internal imports
import { Navbar } from "@/components/layout/Navbar";

// 3. Type definitions
// (none)

// 4. Component
export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 shadow-card">
          <h1 className="text-base font-semibold text-text-primary">Dashboard coming soon</h1>
          <p className="text-sm text-text-secondary">
            Stats, recent activity, and analytics land here in a later phase of the build. For now,
            head to your profile to get set up.
          </p>
          <Link
            href="/profile"
            className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          >
            Go to Profile
          </Link>
        </div>
      </main>
    </>
  );
}
