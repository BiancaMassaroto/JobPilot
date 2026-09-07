// 1. External imports
import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Option = {
  value: string;
  label: string;
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Option[];
};

// 4. Component
export function SelectField({ label, options, className, ...selectProps }: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-text-secondary uppercase">{label}</span>
      <div className="relative">
        <select
          {...selectProps}
          className={`w-full appearance-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none ${className ?? ""}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-text-muted"
        />
      </div>
    </label>
  );
}
