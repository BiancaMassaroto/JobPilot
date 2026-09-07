// 1. External imports
import type { InputHTMLAttributes } from "react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

// 4. Component
export function TextField({ label, className, ...inputProps }: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-text-secondary uppercase">{label}</span>
      <input
        {...inputProps}
        className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-secondary ${className ?? ""}`}
      />
    </label>
  );
}
