"use client";

// 1. External imports
import { useId, useState } from "react";
import { X } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
};

// 4. Component
export function TagInput({ label, placeholder, values, onChange }: Props) {
  const inputId = useId();
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  };

  const removeValue = (value: string) => {
    onChange(values.filter((existing) => existing !== value));
  };

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-xs font-medium text-text-secondary uppercase">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="text"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addValue();
            }
          }}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
        />
        <button
          type="button"
          onClick={addValue}
          className="rounded-md border border-border bg-surface-secondary px-4 py-2 text-sm font-medium text-text-primary hover:bg-border-light"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-primary"
            >
              {value}
              <button
                type="button"
                onClick={() => removeValue(value)}
                aria-label={`Remove ${value}`}
                className="text-text-muted hover:text-text-primary"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
