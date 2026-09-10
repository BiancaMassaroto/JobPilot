// DB row -> Job UI transform, mirroring lib/profile-transform.ts's pattern
// (snake_case DB row in, the UI's camelCase shape out). See architecture.md's
// Adzuna Job Discovery decision, Decision 12.

// 1. External imports
// (none)

// 2. Internal imports
import type { CompanyResearchDossier, Job, JobDetail, JobSource, JobType } from "@/types";

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

// Feature 12 (Job Details Page) — the wider row shape app/find-jobs/[id]/
// page.tsx selects. Deliberately its own type rather than reusing JobRow:
// see JobDetail's own comment in types/index.ts for why the two UI shapes
// (and so their row counterparts) stay separate. company_research/
// company_researched_at added at Feature 13 (architecture.md's Feature 13
// decision, Decision 17a).
export type JobDetailRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  job_type: string | null;
  found_at: string;
  about_role: string | null;
  match_score: number | null;
  match_reason: string | null;
  matched_skills: string[] | null;
  missing_skills: string[] | null;
  external_apply_url: string | null;
  company_research: CompanyResearchDossier | null;
  company_researched_at: string | null;
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

export function fromJobDetailRow(row: JobDetailRow): JobDetail {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    salaryEstimate: row.salary ?? "Not disclosed",
    // Cast is safe: the DB CHECK constraint only allows "fulltime" |
    // "parttime" | "contract", or null.
    jobType: row.job_type as JobType | null,
    foundAt: new Date(row.found_at),
    aboutRole: row.about_role,
    matchScore: row.match_score ?? 0,
    matchReason: row.match_reason,
    matchedSkills: row.matched_skills ?? [],
    missingSkills: row.missing_skills ?? [],
    externalApplyUrl: row.external_apply_url,
    companyResearch: row.company_research,
    companyResearchedAt: row.company_researched_at ? new Date(row.company_researched_at) : null,
  };
}
