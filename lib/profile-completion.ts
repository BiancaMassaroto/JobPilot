import type { ProfileRow } from "@/lib/profile-transform";
import type { ProfileCompletion, ProfileFormData } from "@/types";

// Every select field (work authorization, experience level, remote preference,
// highest degree) is deliberately excluded here — none of them can be blank as
// currently built (no placeholder/unset option), so they can never surface as
// "missing." Optional fields (industries, salary expectation, preferred
// locations, LinkedIn URL, Portfolio/GitHub) and the resume upload are
// excluded too. See architecture.md's
// "Profile Save Logic — Persistence & Completion Rules" (Feature 06 decision)
// for the full reasoning — this is the single source of truth that decision
// requires; both the profile page and the save action must import this, never
// re-derive the rule.
//
// One field's value does change what "complete" means for another: a
// "student" experience level waives Job Title and Years of Experience below
// (a student may genuinely not have either yet) — this is the one
// cross-field exception, everything else here is a flat per-field check.
type RequiredCheck = {
  label: string;
  isComplete: (profile: ProfileFormData) => boolean;
};

const REQUIRED_CHECKS: RequiredCheck[] = [
  { label: "Full Name", isComplete: (profile) => profile.fullName.trim().length > 0 },
  { label: "Phone", isComplete: (profile) => profile.phone.trim().length > 0 },
  { label: "Location", isComplete: (profile) => profile.location.trim().length > 0 },
  {
    // Optional for students — they may genuinely not have a job yet, so an
    // empty field here shouldn't count against them (see the Professional
    // Info section's "(Optional)" label, shown only when Student is picked).
    label: "Job Title",
    isComplete: (profile) =>
      profile.experienceLevel === "student" || profile.currentTitle.trim().length > 0,
  },
  {
    label: "Years of Experience",
    isComplete: (profile) =>
      profile.experienceLevel === "student" || profile.yearsExperience.trim().length > 0,
  },
  { label: "Skills", isComplete: (profile) => profile.skills.length > 0 },
  {
    label: "Work Experience",
    isComplete: (profile) =>
      profile.workExperience.some(
        (role) =>
          role.companyName.trim().length > 0 &&
          role.jobTitle.trim().length > 0 &&
          role.startDate.trim().length > 0 &&
          role.keyResponsibilities.trim().length > 0 &&
          (role.currentlyWorkingHere || role.endDate.trim().length > 0),
      ),
  },
  {
    label: "Education",
    isComplete: (profile) =>
      profile.education.fieldOfStudy.trim().length > 0 &&
      profile.education.institutionName.trim().length > 0 &&
      profile.education.graduationYear.trim().length > 0,
  },
  { label: "Job Titles", isComplete: (profile) => profile.jobTitlesSeeking.trim().length > 0 },
];

export function calculateProfileCompletion(profile: ProfileFormData): ProfileCompletion {
  const missingFields = REQUIRED_CHECKS.filter((check) => !check.isComplete(profile)).map(
    (check) => check.label,
  );
  const percentage = Math.round(
    ((REQUIRED_CHECKS.length - missingFields.length) / REQUIRED_CHECKS.length) * 100,
  );

  return { percentage, missingFields };
}

// Feature 08's gate for Resume PDF Generation — deliberately looser than
// is_complete above (the engineer's call, see architecture.md's Feature 08
// decision, Decision 8): someone should get a usable first draft early and
// refine later, not be forced through every field first. Operates on the
// raw DB row (snake_case) since the route handler reads the row directly,
// not through fromProfileRow.
export function hasMinimumResumeData(row: ProfileRow | null): boolean {
  if (!row || !row.full_name || row.full_name.trim().length === 0) {
    return false;
  }
  const hasTitle = Boolean(row.current_title && row.current_title.trim().length > 0);
  const hasWorkExperience = (row.work_experience ?? []).some(
    (role) => role.company_name.trim().length > 0 && role.job_title.trim().length > 0,
  );
  return hasTitle || hasWorkExperience;
}
