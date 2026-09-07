export type WorkAuthorization = "citizen" | "permanent_resident" | "visa_required";

export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";

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
  jobTitlesSeeking: string;
  remotePreference: RemotePreference;
  salaryExpectation: string;
  preferredLocations: string;
};

export type ProfileCompletion = {
  percentage: number;
  missingFields: string[];
};
