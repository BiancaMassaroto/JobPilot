// Shared profile <-> DB row transform, both directions. Kept out of
// actions/profile.ts deliberately: a "use server" file's exports are all
// treated as Server Action references (same reason lib/auth-constants.ts
// exists), so the read-direction transform app/profile/page.tsx needs can't
// live there. See architecture.md's Feature 06 decision for the naming
// rules this encodes (snake_case jsonb keys, education as an object, the
// text[] comma split/join) — this file is their one source of truth.

// 1. External imports
// (none)

// 2. Internal imports
import type {
  AcademicExperienceEntry,
  AcademicExperienceType,
  EducationInfo,
  ExperienceLevel,
  ProfileFormData,
  RemotePreference,
  WorkAuthorization,
  WorkExperienceEntry,
} from "@/types";

// 3. Type definitions
export type WorkExperienceRecord = {
  company_name: string;
  job_title: string;
  start_date: string;
  end_date: string | null;
  currently_working_here: boolean;
  key_responsibilities: string;
};

export type EducationRecord = {
  highest_degree: string;
  field_of_study: string;
  institution_name: string;
  graduation_year: string;
};

export type AcademicExperienceRecord = {
  type: string;
  title: string;
  institution: string;
  year: string;
  funded: boolean;
  description: string;
};

export type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: string | null;
  current_title: string | null;
  experience_level: string | null;
  years_experience: number | null;
  skills: string[] | null;
  industries: string[] | null;
  work_experience: WorkExperienceRecord[] | null;
  education: EducationRecord | null;
  job_titles_seeking: string[] | null;
  remote_preference: string | null;
  salary_expectation: string | null;
  preferred_locations: string[] | null;
  is_complete: boolean | null;
  // Added for Feature 08 (Resume PDF Generation) — the column has existed
  // since Feature 04, this type just never needed to read it before now.
  resume_pdf_url: string | null;
  // Added live during Feature 08's build (migration run via run-raw-sql,
  // 2026-09-07), after reverse-engineering the storage key from
  // resume_pdf_url turned out unreliable (a live "View PDF" click 404'd,
  // STORAGE_NOT_FOUND) — the InsForge SDK's own upload() response already
  // returns the real key, so it's saved directly instead of re-derived.
  // See architecture.md's Feature 08 decision, Decision 12's second correction.
  resume_storage_key: string | null;
  // Optional, student-only field requested directly (not a numbered
  // feature) — see types/index.ts's AcademicExperienceEntry and
  // architecture.md's Feature 06 decision, "Student exception" addendum.
  academic_experience: AcademicExperienceRecord[] | null;
};

function emptyWorkExperienceEntry(): WorkExperienceEntry {
  return {
    companyName: "",
    jobTitle: "",
    startDate: "",
    endDate: "",
    currentlyWorkingHere: false,
    keyResponsibilities: "",
  };
}

function emptyEducationInfo(): EducationInfo {
  return { highestDegree: "high_school", fieldOfStudy: "", institutionName: "", graduationYear: "" };
}

function fromWorkExperienceRecord(record: WorkExperienceRecord): WorkExperienceEntry {
  return {
    companyName: String(record.company_name ?? ""),
    jobTitle: String(record.job_title ?? ""),
    startDate: String(record.start_date ?? ""),
    endDate: String(record.end_date ?? ""),
    currentlyWorkingHere: record.currently_working_here ?? false,
    keyResponsibilities: String(record.key_responsibilities ?? ""),
  };
}

function fromEducationRecord(record: EducationRecord): EducationInfo {
  return {
    highestDegree: String(record.highest_degree ?? ""),
    fieldOfStudy: String(record.field_of_study ?? ""),
    institutionName: String(record.institution_name ?? ""),
    graduationYear: String(record.graduation_year ?? ""),
  };
}

const ACADEMIC_EXPERIENCE_TYPES: AcademicExperienceType[] = [
  "award",
  "exchange_program",
  "undergraduate_research",
  "other",
];

function fromAcademicExperienceRecord(record: AcademicExperienceRecord): AcademicExperienceEntry {
  return {
    // Cast is safe: the DB CHECK constraint only allows these exact values;
    // fall back to "other" for a row saved before that constraint existed.
    type: (ACADEMIC_EXPERIENCE_TYPES as string[]).includes(record.type)
      ? (record.type as AcademicExperienceType)
      : "other",
    title: String(record.title ?? ""),
    institution: String(record.institution ?? ""),
    year: String(record.year ?? ""),
    funded: record.funded ?? false,
    description: String(record.description ?? ""),
  };
}

// 4. Component (n/a — pure transform module)

export function toWorkExperienceRecords(entries: WorkExperienceEntry[]): WorkExperienceRecord[] {
  return entries.map((entry) => ({
    company_name: entry.companyName,
    job_title: entry.jobTitle,
    start_date: entry.startDate,
    end_date: entry.currentlyWorkingHere ? null : entry.endDate,
    currently_working_here: entry.currentlyWorkingHere,
    key_responsibilities: entry.keyResponsibilities,
  }));
}

export function toAcademicExperienceRecords(
  entries: AcademicExperienceEntry[],
): AcademicExperienceRecord[] {
  return entries.map((entry) => ({
    type: entry.type,
    title: entry.title,
    institution: entry.institution,
    year: entry.year,
    funded: entry.funded,
    description: entry.description,
  }));
}

export function toEducationRecord(education: EducationInfo): EducationRecord {
  return {
    highest_degree: education.highestDegree,
    field_of_study: education.fieldOfStudy,
    institution_name: education.institutionName,
    graduation_year: education.graduationYear,
  };
}

// "React,Vue" -> ["React","Vue"]; a title containing a literal comma will
// split into two entries — an accepted limitation of the free-text-comma
// pattern the approved design already uses.
export function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseYearsExperience(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function fromProfileRow(row: ProfileRow | null, sessionEmail: string): ProfileFormData {
  if (!row) {
    return {
      fullName: "",
      email: sessionEmail,
      phone: "",
      location: "",
      linkedinUrl: "",
      portfolioUrl: "",
      workAuthorization: "citizen",
      currentTitle: "",
      experienceLevel: "junior",
      yearsExperience: "",
      skills: [],
      industries: [],
      workExperience: [emptyWorkExperienceEntry()],
      education: emptyEducationInfo(),
      academicExperience: [],
      jobTitlesSeeking: "",
      remotePreference: "any",
      salaryExpectation: "",
      preferredLocations: "",
    };
  }

  return {
    fullName: row.full_name ?? "",
    // Always the session's own email, never a stored copy — the save action
    // always writes it from the session too, so this can never drift.
    email: sessionEmail,
    phone: row.phone ?? "",
    location: row.location ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    portfolioUrl: row.portfolio_url ?? "",
    // Cast is safe: the DB CHECK constraint only allows these exact values.
    workAuthorization: (row.work_authorization as WorkAuthorization) ?? "citizen",
    currentTitle: row.current_title ?? "",
    // Cast is safe: the DB CHECK constraint only allows these exact values.
    experienceLevel: (row.experience_level as ExperienceLevel) ?? "junior",
    yearsExperience: row.years_experience != null ? String(row.years_experience) : "",
    skills: row.skills ?? [],
    industries: row.industries ?? [],
    workExperience:
      row.work_experience && row.work_experience.length > 0
        ? row.work_experience.map(fromWorkExperienceRecord)
        : [emptyWorkExperienceEntry()],
    education: row.education ? fromEducationRecord(row.education) : emptyEducationInfo(),
    academicExperience: (row.academic_experience ?? []).map(fromAcademicExperienceRecord),
    jobTitlesSeeking: (row.job_titles_seeking ?? []).join(", "),
    // Cast is safe: the DB CHECK constraint only allows these exact values.
    remotePreference: (row.remote_preference as RemotePreference) ?? "any",
    salaryExpectation: row.salary_expectation ?? "",
    preferredLocations: (row.preferred_locations ?? []).join(", "),
  };
}
