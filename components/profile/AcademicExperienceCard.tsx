// 1. External imports
import { Trash2 } from "lucide-react";

// 2. Internal imports
import { TextField } from "@/components/profile/TextField";
import { SelectField } from "@/components/profile/SelectField";
import { TextAreaField } from "@/components/profile/TextAreaField";
import type { AcademicExperienceEntry } from "@/types";

// 3. Type definitions
const ACADEMIC_EXPERIENCE_TYPE_OPTIONS = [
  { value: "award", label: "Award" },
  { value: "exchange_program", label: "Exchange Program" },
  { value: "undergraduate_research", label: "Undergraduate Research (Iniciação Científica)" },
  { value: "other", label: "Other" },
];

type Props = {
  entry: AcademicExperienceEntry;
  onChange: (entry: AcademicExperienceEntry) => void;
  onRemove: () => void;
};

// 4. Component
// Requested directly (not a numbered feature) — shown only for students,
// see ProfileForm.tsx. Same shape as WorkExperienceRoleCard, one entry per
// card, always removable (unlike Work Experience's "at least one role"
// rule — there's no equivalent minimum here, an empty list is fine).
export function AcademicExperienceCard({ entry, onChange, onRemove }: Props) {
  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-border bg-surface-secondary p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove academic experience"
        className="absolute top-4 right-4 text-text-muted hover:text-error"
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="grid grid-cols-1 gap-4 pr-8 md:grid-cols-2">
        <SelectField
          label="Type"
          options={ACADEMIC_EXPERIENCE_TYPE_OPTIONS}
          value={entry.type}
          onChange={(event) =>
            // Cast is safe: ACADEMIC_EXPERIENCE_TYPE_OPTIONS values are the only options rendered.
            onChange({ ...entry, type: event.target.value as AcademicExperienceEntry["type"] })
          }
        />
        <TextField
          label="Title"
          placeholder="E.g. Dean's List, Erasmus Exchange"
          value={entry.title}
          onChange={(event) => onChange({ ...entry, title: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Institution / Organization"
          value={entry.institution}
          onChange={(event) => onChange({ ...entry, institution: event.target.value })}
        />
        <TextField
          label="Year"
          placeholder="YYYY"
          value={entry.year}
          onChange={(event) => onChange({ ...entry, year: event.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={entry.funded}
          onChange={(event) => onChange({ ...entry, funded: event.target.checked })}
          className="h-4 w-4 accent-accent"
        />
        Funded / scholarship (bolsa)
      </label>

      <TextAreaField
        label="Description (Optional)"
        value={entry.description}
        onChange={(event) => onChange({ ...entry, description: event.target.value })}
      />
    </div>
  );
}
