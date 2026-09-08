// DB row -> Job UI transform, mirroring lib/profile-transform.ts's pattern
// (snake_case DB row in, the UI's camelCase shape out). See architecture.md's
// Adzuna Job Discovery decision, Decision 12.

// 1. External imports
// (none)

// 2. Internal imports
import type { Job, JobSource } from "@/types";

// 3. Type definitions
export type JobRow = {
  id: string;
  company: string;
  title: string;
  match_score: number | null;
  salary: string | null;
  found_at: string;
  source: string;
};

// 4. Component (n/a — pure transform module)

export function fromJobRow(row: JobRow): Job {
  return {
    id: row.id,
    company: row.company,
    role: row.title,
    matchScore: row.match_score ?? 0,
    // Adzuna doesn't always return a salary range — no design mock covers
    // this state, so a plain fallback string stands in until one does.
    salaryEstimate: row.salary ?? "Not disclosed",
    foundAt: new Date(row.found_at),
    // Cast is safe: the DB CHECK constraint only allows "search" | "url".
    source: row.source as JobSource,
  };
}
