export type WorkAuthorization = "citizen" | "permanent_resident" | "visa_required";

export type ExperienceLevel = "student" | "junior" | "mid" | "senior" | "lead";

export type RemotePreference = "remote" | "onsite" | "hybrid" | "any";

export type WorkExperienceEntry = {
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  currentlyWorkingHere: boolean;
  keyResponsibilities: string;
};

export type EducationInfo = {
  highestDegree: string;
  fieldOfStudy: string;
  institutionName: string;
  graduationYear: string;
};

export type AcademicExperienceType = "award" | "exchange_program" | "undergraduate_research" | "other";

// Requested directly (not part of a numbered feature), shown only when
// experienceLevel is "student" — see ProfileForm.tsx and
// architecture.md's Feature 06 decision, "Student exception" addendum.
// funded covers the "com ou sem bolsa de estudos" distinction the request
// named for Iniciação Científica specifically, but applies to any entry
// type (an exchange program or award can be funded too).
export type AcademicExperienceEntry = {
  type: AcademicExperienceType;
  title: string;
  institution: string;
  year: string;
  funded: boolean;
  description: string;
};

export type ProfileFormData = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  workAuthorization: WorkAuthorization;
  currentTitle: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: string;
  skills: string[];
  industries: string[];
  workExperience: WorkExperienceEntry[];
  education: EducationInfo;
  // Optional, student-only — never counted toward profile completion (see
  // lib/profile-completion.ts), same treatment as Industries/LinkedIn/etc.
  academicExperience: AcademicExperienceEntry[];
  jobTitlesSeeking: string;
  remotePreference: RemotePreference;
  salaryExpectation: string;
  preferredLocations: string;
};

export type ProfileCompletion = {
  percentage: number;
  missingFields: string[];
};

// Not a Pick<ProfileFormData, ...> — every key here always comes back a real,
// possibly-empty value except experienceLevel, whose null means "the resume
// gave no reliable signal, leave the form's current value alone" (a flat
// spread can't express that for a field with no other empty state). Never
// includes email or the job-seeking preference fields — see
// architecture.md's Feature 07 decision, Decision 7.
export type ExtractableProfileFields = {
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  portfolioUrl: string;
  currentTitle: string;
  yearsExperience: string;
  skills: string[];
  industries: string[];
  workExperience: WorkExperienceEntry[];
  education: EducationInfo;
  experienceLevel: ExperienceLevel | null;
};

// Moved here from components/find-jobs/mock-jobs.ts at Feature 10 (Adzuna
// Job Discovery) — now has two real consumers (app/find-jobs/page.tsx's DB
// read via lib/job-transform.ts, and this feature's own insert path), so it
// stops being a find-jobs-scoped type. Field names (company/role/matchScore/
// salaryEstimate/foundAt/source) were chosen in Feature 09 specifically to
// map cleanly onto the jobs table's company/title/match_score/salary/
// found_at/source columns.
export type JobSource = "search" | "url";

export type Job = {
  id: string;
  company: string;
  role: string;
  matchScore: number;
  salaryEstimate: string;
  foundAt: Date;
  source: JobSource;
};

// jobs.job_type's CHECK constraint (architecture.md's Constraints, Row
// Level Security & Migration section) — nullable, since Adzuna doesn't
// always resolve a contract type (see mapAdzunaJobType's callers).
export type JobType = "fulltime" | "parttime" | "contract";

// Feature 12 (Job Details Page) — a separate, richer shape from `Job`
// above rather than extending it: the find-jobs table and this page need
// disjoint slices of the same `jobs` row, and `Job`/`fromJobRow` already
// have a real consumer (JobsTable) that shouldn't have to carry fields it
// never renders. Field names map onto the jobs table columns the same way
// `Job`'s do. companyResearch is intentionally omitted — Feature 12 only
// ever renders the Company Research card's empty state (build-plan.md),
// Feature 13 owns shaping and displaying a populated dossier.
export type JobDetail = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salaryEstimate: string;
  jobType: JobType | null;
  foundAt: Date;
  aboutRole: string | null;
  matchScore: number;
  matchReason: string | null;
  matchedSkills: string[];
  missingSkills: string[];
  externalApplyUrl: string | null;
};

// POST /api/agent/find request body (architecture.md's Adzuna Job Discovery
// decision, Decision 9d). location is optional — a missing key is coerced
// to "" by the route before it reaches detectAdzunaCountry().
export type FindJobsRequestBody = {
  jobTitle: string;
  location?: string;
};

// POST /api/agent/find success response data (Decisions 6 and 8).
// jobsFound/strongMatches are both post-dedup, post-scoring saved counts;
// adzunaResultCount is the raw pre-dedup count, used only so the client can
// pick the right zero-result copy (Decision 8) — never stored anywhere.
export type FindJobsResponseData = {
  jobsFound: number;
  strongMatches: number;
  adzunaResultCount: number;
  jobTitle: string;
  location: string;
};
