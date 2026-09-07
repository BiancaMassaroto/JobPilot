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
