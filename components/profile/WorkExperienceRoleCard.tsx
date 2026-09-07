// 1. External imports
import { useId } from "react";
import { Trash2 } from "lucide-react";

// 2. Internal imports
import { TextField } from "@/components/profile/TextField";
import { TextAreaField } from "@/components/profile/TextAreaField";
import type { WorkExperienceEntry } from "@/types";

// 3. Type definitions
type Props = {
  entry: WorkExperienceEntry;
  onChange: (entry: WorkExperienceEntry) => void;
  onRemove: () => void;
  canRemove: boolean;
};

// 4. Component
export function WorkExperienceRoleCard({ entry, onChange, onRemove, canRemove }: Props) {
  const endDateInputId = useId();

  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-border bg-surface-secondary p-4">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove role"
          className="absolute top-4 right-4 text-text-muted hover:text-error"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Company Name"
          value={entry.companyName}
          onChange={(event) => onChange({ ...entry, companyName: event.target.value })}
        />
        <TextField
          label="Job Title"
          value={entry.jobTitle}
          onChange={(event) => onChange({ ...entry, jobTitle: event.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label="Start Date"
          type="month"
          value={entry.startDate}
          onChange={(event) => onChange({ ...entry, startDate: event.target.value })}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor={endDateInputId}
              className="text-xs font-medium text-text-secondary uppercase"
            >
              End Date
            </label>
            <label className="flex items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={entry.currentlyWorkingHere}
                onChange={(event) =>
                  onChange({
                    ...entry,
                    currentlyWorkingHere: event.target.checked,
                    endDate: event.target.checked ? "" : entry.endDate,
                  })
                }
                className="h-4 w-4 accent-accent"
              />
              Currently working here
            </label>
          </div>
          <input
            id={endDateInputId}
            type="month"
            value={entry.endDate}
            disabled={entry.currentlyWorkingHere}
            onChange={(event) => onChange({ ...entry, endDate: event.target.value })}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-muted"
          />
        </div>
      </div>

      <TextAreaField
        label="Key Responsibilities"
        value={entry.keyResponsibilities}
        onChange={(event) => onChange({ ...entry, keyResponsibilities: event.target.value })}
      />
    </div>
  );
}
