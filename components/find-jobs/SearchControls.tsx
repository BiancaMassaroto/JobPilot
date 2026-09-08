"use client";

// 1. External imports
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, Sparkles } from "lucide-react";

// 2. Internal imports
import type { FindJobsResponseData } from "@/types";

// 3. Type definitions
type ApiResponse = { success: true; data: FindJobsResponseData } | { success: false; error: string };

// 4. Component
// Client Component with a plain fetch handler, not a Server Action —
// architecture.md's Invariants already rule out a Server Action calling
// agent code directly (Feature 08's precedent for the same reason). See
// architecture.md's Adzuna Job Discovery decision, Decision 11.
export function SearchControls() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FindJobsResponseData | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/agent/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, location }),
      });
      const payload = (await response.json()) as ApiResponse;

      if (!payload.success) {
        setResult(null);
        setError(payload.error);
        return;
      }

      setResult(payload.data);
      // Re-renders the Server Component tree with the freshly saved jobs —
      // app/find-jobs/page.tsx reads real data now (Decision 12).
      router.refresh();
    } catch (fetchError) {
      console.error("[SearchControls]", fetchError);
      setResult(null);
      setError("Couldn't search for jobs right now. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="jobTitle" className="text-xs font-medium uppercase text-text-secondary">
            Job Title
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              required
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
              placeholder="Frontend Engineer"
              className="w-full rounded-md border border-border bg-surface py-2 pr-3 pl-9 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="location" className="text-xs font-medium uppercase text-text-secondary">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Remote, New York..."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {isSearching ? "Searching…" : "Find Jobs"}
        </button>
      </form>

      {error && <p className="text-sm text-error">{error}</p>}

      {!error && result && (
        <div className="flex items-center gap-2 rounded-lg bg-success-lightest px-4 py-3 text-sm font-medium text-success-foreground">
          <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-success-alt" />
          {formatResultMessage(result)}
        </div>
      )}
    </section>
  );
}

// Decision 8's three way split, mirrored in copy: Adzuna returned nothing at
// all, Adzuna returned results but every one was already saved (dedup), or
// an ordinary search with at least one newly saved job.
function formatResultMessage(result: FindJobsResponseData): string {
  const locationSuffix = result.location ? ` in ${result.location}` : "";

  if (result.adzunaResultCount === 0) {
    return `Found 0 jobs for ${result.jobTitle}${locationSuffix} — try a different search.`;
  }
  if (result.jobsFound === 0) {
    return `No new jobs found for ${result.jobTitle}${locationSuffix} — you've already found these before.`;
  }
  return `Found ${result.jobsFound} job${result.jobsFound === 1 ? "" : "s"} and saved ${result.strongMatches} strong match${result.strongMatches === 1 ? "" : "es"}.`;
}
