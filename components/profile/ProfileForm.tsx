"use client";

// 1. External imports
import { useActionState, useState } from "react";
import { FileText, Plus } from "lucide-react";

// 2. Internal imports
import {
  extractProfileFromResumeAction,
  saveProfileAction,
  type ExtractProfileState,
  type SaveProfileState,
} from "@/actions/profile";
import { TextField } from "@/components/profile/TextField";
import { SelectField } from "@/components/profile/SelectField";
import { TagInput } from "@/components/profile/TagInput";
import { WorkExperienceRoleCard } from "@/components/profile/WorkExperienceRoleCard";
import { AcademicExperienceCard } from "@/components/profile/AcademicExperienceCard";
import { ResumeUpload } from "@/components/profile/ResumeUpload";
import { ResumePreview } from "@/components/profile/ResumePreview";
import type { AcademicExperienceEntry, ProfileFormData, WorkExperienceEntry } from "@/types";

// 3. Type definitions
const WORK_AUTHORIZATION_OPTIONS = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "visa_required", label: "Visa Required" },
];

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
];

const HIGHEST_DEGREE_OPTIONS = [
  { value: "high_school", label: "High School" },
  { value: "associate", label: "Associate Degree" },
  { value: "bachelor", label: "Bachelor's Degree" },
  { value: "master", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "other", label: "Other" },
];

const REMOTE_PREFERENCE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "Onsite" },
  { value: "hybrid", label: "Hybrid" },
  { value: "any", label: "Any" },
];

const MAX_WORK_EXPERIENCE_ROLES = 3;
// Requested directly (not a numbered feature) — more headroom than Work
// Experience's 3, since a student may reasonably have an award, an
// exchange program, and undergraduate research all at once.
const MAX_ACADEMIC_EXPERIENCE_ENTRIES = 5;

const INITIAL_ACTION_STATE: SaveProfileState = { success: false };
const INITIAL_EXTRACT_STATE: ExtractProfileState = { success: false };

type Props = {
  initialProfile: ProfileFormData;
  initialResumePdfUrl: string | null;
  initialResumeStorageKey: string | null;
};

// 4. Component
export function ProfileForm({
  initialProfile,
  initialResumePdfUrl,
  initialResumeStorageKey,
}: Props) {
  const [profile, setProfile] = useState<ProfileFormData>(initialProfile);
  const [actionState, formAction, isPending] = useActionState(
    saveProfileAction,
    INITIAL_ACTION_STATE,
  );
  const [extractState, extractFormAction, isExtracting] = useActionState(
    extractProfileFromResumeAction,
    INITIAL_EXTRACT_STATE,
  );

  // Route handler, not a Server Action — useActionState/formAction don't
  // apply here (see architecture.md's Feature 08 decision, Decision 11).
  // Seeded from initialResumePdfUrl so a prior generation still shows after
  // a page reload, not just after a fresh generate-in-this-session.
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | undefined>(undefined);
  const [generatedResumeUrl, setGeneratedResumeUrl] = useState<string | null>(initialResumePdfUrl);
  const [generatedResumeStorageKey, setGeneratedResumeStorageKey] = useState<string | null>(
    initialResumeStorageKey,
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(undefined);
    try {
      const response = await fetch("/api/resume/generate", { method: "POST" });
      const result: {
        success: boolean;
        data?: { resumePdfUrl: string; resumeStorageKey: string };
        error?: string;
      } =
        await response.json();
      if (result.success && result.data) {
        setGeneratedResumeUrl(result.data.resumePdfUrl);
        setGeneratedResumeStorageKey(result.data.resumeStorageKey);
      } else {
        setGenerateError(result.error ?? "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("[ProfileForm]", error);
      setGenerateError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Merged during render, not in a useEffect: this project's lint config
  // (react-hooks/set-state-in-effect) rejects setState-in-effect, so this
  // follows React's own "adjusting state when a value changes" pattern
  // instead — comparing extractState.data's identity against what was last
  // merged, and calling setState conditionally during render. Same
  // behavior architecture.md's Feature 07 decision (Decision 11) specifies:
  // extractState.data's object identity changes each time a new extraction
  // completes, which is what re-triggers the merge; every mapped field is
  // unconditionally overwritten (Decision 6) — the user reviews everything
  // before Save Profile, so nothing is destroyed silently.
  const [mergedExtraction, setMergedExtraction] = useState(extractState.data);
  if (extractState.data !== mergedExtraction) {
    setMergedExtraction(extractState.data);
    if (extractState.data) {
      const extracted = extractState.data;
      setProfile((current) => ({
        ...current,
        ...extracted,
        // null means "no reliable signal" — keep whatever the form already
        // had rather than overwrite it with null.
        experienceLevel: extracted.experienceLevel ?? current.experienceLevel,
      }));
    }
  }

  // Students haven't worked yet — job title and years of experience stay on
  // the form (a student may still have an internship worth logging) but
  // become optional, both here and in the completion rule (see
  // lib/profile-completion.ts).
  const isStudent = profile.experienceLevel === "student";

  const updateWorkExperience = (index: number, entry: WorkExperienceEntry) => {
    setProfile((current) => ({
      ...current,
      workExperience: current.workExperience.map((role, roleIndex) =>
        roleIndex === index ? entry : role,
      ),
    }));
  };

  const addWorkExperienceRole = () => {
    if (profile.workExperience.length >= MAX_WORK_EXPERIENCE_ROLES) return;
    setProfile((current) => ({
      ...current,
      workExperience: [
        ...current.workExperience,
        {
          companyName: "",
          jobTitle: "",
          startDate: "",
          endDate: "",
          currentlyWorkingHere: false,
          keyResponsibilities: "",
        },
      ],
    }));
  };

  const removeWorkExperienceRole = (index: number) => {
    setProfile((current) => ({
      ...current,
      workExperience: current.workExperience.filter((_, roleIndex) => roleIndex !== index),
    }));
  };

  const updateAcademicExperienceEntry = (index: number, entry: AcademicExperienceEntry) => {
    setProfile((current) => ({
      ...current,
      academicExperience: current.academicExperience.map((existing, entryIndex) =>
        entryIndex === index ? entry : existing,
      ),
    }));
  };

  const addAcademicExperienceEntry = () => {
    if (profile.academicExperience.length >= MAX_ACADEMIC_EXPERIENCE_ENTRIES) return;
    setProfile((current) => ({
      ...current,
      academicExperience: [
        ...current.academicExperience,
        { type: "award", title: "", institution: "", year: "", funded: false, description: "" },
      ],
    }));
  };

  const removeAcademicExperienceEntry = (index: number) => {
    setProfile((current) => ({
      ...current,
      academicExperience: current.academicExperience.filter(
        (_, entryIndex) => entryIndex !== index,
      ),
    }));
  };

  return (
    // Wraps ResumeUpload too, not just the fields below — the resume file and
    // the profile fields save together in one Server Action call (see
    // architecture.md's Feature 06 decision), so both need to live in the
    // same <form>, even though they render as two visually separate cards.
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="profile" value={JSON.stringify(profile)} readOnly />

      <ResumeUpload
        extractFormAction={extractFormAction}
        isExtracting={isExtracting}
        extractError={extractState.error}
      />

      <section className="flex flex-col gap-8 rounded-2xl border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-col gap-1 border-b border-border pb-6">
          <h2 className="text-base font-semibold text-text-primary">Profile Information</h2>
          <p className="text-sm text-text-secondary">
            This context is used to accurately represent you in agent interactions.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text-primary">Personal Info</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              label="Full Name"
              value={profile.fullName}
              onChange={(event) => setProfile({ ...profile, fullName: event.target.value })}
            />
            <TextField label="Email" type="email" value={profile.email} disabled />
            <TextField
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={profile.phone}
              onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
            />
            <TextField
              label="Location"
              placeholder="City, Country"
              value={profile.location}
              onChange={(event) => setProfile({ ...profile, location: event.target.value })}
            />
            <TextField
              label="LinkedIn URL (Optional)"
              type="url"
              value={profile.linkedinUrl}
              onChange={(event) => setProfile({ ...profile, linkedinUrl: event.target.value })}
            />
            <TextField
              label="Portfolio / GitHub (Optional)"
              type="url"
              value={profile.portfolioUrl}
              onChange={(event) => setProfile({ ...profile, portfolioUrl: event.target.value })}
            />
            <SelectField
              label="Work Authorization"
              options={WORK_AUTHORIZATION_OPTIONS}
              value={profile.workAuthorization}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  // Cast is safe: WORK_AUTHORIZATION_OPTIONS values are the only options rendered.
                  workAuthorization: event.target.value as ProfileFormData["workAuthorization"],
                })
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <h3 className="text-base font-semibold text-text-primary">Professional Info</h3>
          <TextField
            label={isStudent ? "Current/Recent Job Title (Optional)" : "Current/Recent Job Title"}
            placeholder={isStudent ? "Leave blank if you haven't worked yet" : undefined}
            value={profile.currentTitle}
            onChange={(event) => setProfile({ ...profile, currentTitle: event.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="Experience Level"
              options={EXPERIENCE_LEVEL_OPTIONS}
              value={profile.experienceLevel}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  // Cast is safe: EXPERIENCE_LEVEL_OPTIONS values are the only options rendered.
                  experienceLevel: event.target.value as ProfileFormData["experienceLevel"],
                })
              }
            />
            <TextField
              label={isStudent ? "Years of Experience (Optional)" : "Years of Experience"}
              type="number"
              min={0}
              placeholder={isStudent ? "0" : undefined}
              value={profile.yearsExperience}
              onChange={(event) => setProfile({ ...profile, yearsExperience: event.target.value })}
            />
          </div>
          <TagInput
            label="Skills"
            placeholder="Add a skill"
            values={profile.skills}
            onChange={(skills) => setProfile({ ...profile, skills })}
          />
          <TagInput
            label="Industries Worked In (Optional)"
            placeholder="E.g. FinTech, Healthcare"
            values={profile.industries}
            onChange={(industries) => setProfile({ ...profile, industries })}
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-text-primary">Work Experience</h3>
            <button
              type="button"
              onClick={addWorkExperienceRole}
              disabled={profile.workExperience.length >= MAX_WORK_EXPERIENCE_ROLES}
              className="flex items-center gap-1 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:text-text-muted"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Add role
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {profile.workExperience.map((entry, index) => (
              <WorkExperienceRoleCard
                key={index}
                entry={entry}
                onChange={(updated) => updateWorkExperience(index, updated)}
                onRemove={() => removeWorkExperienceRole(index)}
                canRemove={profile.workExperience.length > 1}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <h3 className="text-base font-semibold text-text-primary">Education</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="Highest Degree"
              options={HIGHEST_DEGREE_OPTIONS}
              value={profile.education.highestDegree}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  education: { ...profile.education, highestDegree: event.target.value },
                })
              }
            />
            <TextField
              label="Field of Study"
              value={profile.education.fieldOfStudy}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  education: { ...profile.education, fieldOfStudy: event.target.value },
                })
              }
            />
            <TextField
              label="Institution Name"
              placeholder="E.g. State University"
              value={profile.education.institutionName}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  education: { ...profile.education, institutionName: event.target.value },
                })
              }
            />
            <TextField
              label="Graduation Year"
              placeholder="YYYY"
              value={profile.education.graduationYear}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  education: { ...profile.education, graduationYear: event.target.value },
                })
              }
            />
          </div>
        </div>

        {/* Requested directly (not a numbered feature) — student-only:
            awards, exchange programs, undergraduate research (Iniciação
            Científica, com ou sem bolsa), and similar academic experience.
            Optional, not counted toward profile completion, not part of AI
            extraction (see types/index.ts's AcademicExperienceEntry). */}
        {isStudent && (
          <div className="flex flex-col gap-4 border-t border-border pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  Academic Experience (Optional)
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Awards, exchange programs, undergraduate research, and similar experience.
                </p>
              </div>
              <button
                type="button"
                onClick={addAcademicExperienceEntry}
                disabled={profile.academicExperience.length >= MAX_ACADEMIC_EXPERIENCE_ENTRIES}
                className="flex items-center gap-1 text-sm font-medium text-accent disabled:cursor-not-allowed disabled:text-text-muted"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Add entry
              </button>
            </div>
            {profile.academicExperience.length > 0 && (
              <div className="flex flex-col gap-4">
                {profile.academicExperience.map((entry, index) => (
                  <AcademicExperienceCard
                    key={index}
                    entry={entry}
                    onChange={(updated) => updateAcademicExperienceEntry(index, updated)}
                    onRemove={() => removeAcademicExperienceEntry(index)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <h3 className="text-base font-semibold text-text-primary">Job Preferences</h3>
          <TextField
            label="Job Titles Seeking"
            value={profile.jobTitlesSeeking}
            onChange={(event) => setProfile({ ...profile, jobTitlesSeeking: event.target.value })}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectField
              label="Remote Preference"
              options={REMOTE_PREFERENCE_OPTIONS}
              value={profile.remotePreference}
              onChange={(event) =>
                setProfile({
                  ...profile,
                  // Cast is safe: REMOTE_PREFERENCE_OPTIONS values are the only options rendered.
                  remotePreference: event.target.value as ProfileFormData["remotePreference"],
                })
              }
            />
            <TextField
              label="Salary Expectation (Optional)"
              placeholder="E.g. $120k+"
              value={profile.salaryExpectation}
              onChange={(event) => setProfile({ ...profile, salaryExpectation: event.target.value })}
            />
          </div>
          <TextField
            label="Preferred Locations (Optional)"
            placeholder="E.g. New York, London"
            value={profile.preferredLocations}
            onChange={(event) => setProfile({ ...profile, preferredLocations: event.target.value })}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-8">
          {actionState.error && <p className="text-sm text-error">{actionState.error}</p>}
          {!isPending && actionState.success && (
            <p className="text-sm text-success-foreground">Profile saved.</p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Saving…" : "Save Profile"}
          </button>
        </div>

        {/* Generate Resume from Profile reads whatever is currently saved
            (see architecture.md's Feature 08 decision, Decision 7) — it
            lives here, after Save Profile, rather than up in ResumeUpload's
            card at the top of the page, precisely because of that
            dependency (moved during Feature 08's build, on request). */}
        <div className="flex flex-col gap-4 border-t border-border pt-8">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Generate a Resume</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Creates a polished resume PDF from your saved profile above.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isPending || isGenerating}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText aria-hidden="true" className="h-4 w-4" />
              {isGenerating ? "Generating…" : "Generate Resume from Profile"}
            </button>
          </div>
          {generateError && <p className="text-sm text-error">{generateError}</p>}
          <ResumePreview
            resumePdfUrl={generatedResumeUrl}
            resumeStorageKey={generatedResumeStorageKey}
          />
        </div>
      </section>
    </form>
  );
}
