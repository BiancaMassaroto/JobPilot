// 1. External imports
import type { TextareaHTMLAttributes } from "react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

// 4. Component
export function TextAreaField({ label, className, ...textareaProps }: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-text-secondary uppercase">{label}</span>
      <textarea
        {...textareaProps}
        className={`min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none ${className ?? ""}`}
      />
    </label>
  );
}
