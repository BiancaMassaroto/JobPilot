import type { ProfileCompletion, ProfileFormData } from "@/types";

// Every select field (work authorization, experience level, remote preference,
// highest degree) is deliberately excluded here — none of them can be blank as
// currently built (no placeholder/unset option), so they can never surface as
// "missing." Optional fields (industries, salary expectation, preferred
// locations) and the resume upload are excluded too. See architecture.md's
// "Profile Save Logic — Persistence & Completion Rules" (Feature 06 decision)
// for the full reasoning — this is the single source of truth that decision
// requires; both the profile page and the save action must import this, never
// re-derive the rule.
type RequiredCheck = {
  label: string;
  isComplete: (profile: ProfileFormData) => boolean;
};

const REQUIRED_CHECKS: RequiredCheck[] = [
  { label: "Full Name", isComplete: (profile) => profile.fullName.trim().length > 0 },
  { label: "Phone", isComplete: (profile) => profile.phone.trim().length > 0 },
  { label: "Location", isComplete: (profile) => profile.location.trim().length > 0 },
  { label: "LinkedIn", isComplete: (profile) => profile.linkedinUrl.trim().length > 0 },
  { label: "Portfolio", isComplete: (profile) => profile.portfolioUrl.trim().length > 0 },
  { label: "Job Title", isComplete: (profile) => profile.currentTitle.trim().length > 0 },
  {
    label: "Years of Experience",
    isComplete: (profile) => profile.yearsExperience.trim().length > 0,
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
