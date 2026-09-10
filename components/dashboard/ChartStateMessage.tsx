// 1. External imports
import type { ReactNode } from "react";

// 3. Type definitions
type Props = {
  icon: ReactNode;
  message: string;
};

// 4. Component
// Shared icon-badge-plus-caption shape for a chart card's "no data yet"
// and "couldn't load" states (BarChartCard/LineChartCard, Feature 17) —
// same visual language as RecentActivity's/JobsEmptyState's empty states
// (Features 09/16), scaled to fit inside a chart card's h-56 area. Extracted
// rather than hand-copied into both chart components, same "reuse, don't
// invent" precedent as components/homepage/CtaButtons.tsx.
//
// `icon` is rendered by the chart card so each card can apply the same
// sizing and color to its Lucide icon.
export function ChartStateMessage({ icon, message }: Props) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-secondary">
        {icon}
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
