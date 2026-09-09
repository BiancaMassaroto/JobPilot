// 1. External imports
import { Building2, Search } from "lucide-react";

// 2. Internal imports
// (none)

// 3. Type definitions
type Props = {
  company: string;
};

// 4. Component
// Feature 12 (build-plan.md): "Company research section shows empty state
// only." Feature 13 (Company Research Agent) wires the button and the
// populated-dossier view — the button below is intentionally inert (no
// onClick) until then, same "styled but not yet wired" precedent as
// SearchControls' Find Jobs button before Feature 10.
export function CompanyResearch({ company }: Props) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-light">
            <Building2 className="h-5 w-5 text-accent" />
          </span>
          <h2 className="text-base font-semibold text-text-primary">Company Research</h2>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          Research Company
        </button>
      </div>
      <div className="flex flex-col items-center gap-2 border-t border-border px-6 py-12 text-center">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-secondary">
          <Building2 className="h-5 w-5 text-text-muted" />
        </span>
        <p className="text-base font-semibold text-text-primary">No research yet</p>
        <p className="text-sm text-text-secondary">
          Click &quot;Research Company&quot; to let the AI browse {company}&apos;s public pages and build a
          dossier.
        </p>
      </div>
    </div>
  );
}
