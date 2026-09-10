"use client";

// 1. External imports
import { AlertCircle, type LucideIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 2. Internal imports
import { ChartStateMessage } from "@/components/dashboard/ChartStateMessage";

// 3. Type definitions
export type BarDatum = {
  label: string;
  value: number;
};

type Props = {
  title: string;
  data: BarDatum[] | null;
  maxValue: number;
  yAxisTicks: number[];
  color: "info" | "success";
  emptyIcon: LucideIcon;
  emptyMessage: string;
};

// Tailwind can't resolve a class built from a template string at build
// time — map the two chart colors to real CSS variable values instead
// (recharts' `fill` prop takes a real color, not a Tailwind class).
const BAR_FILL: Record<Props["color"], string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
};

// 4. Component
// Reused for both bar charts on the dashboard (Company Research Activity,
// Match Score Distribution) — same card shell and axis config, only the
// data, fill color, and empty-state copy differ. Rebuilt on recharts at
// Feature 17 (architecture.md's Feature 17 decision, Decision 2 and 10) —
// previously hand-rolled SVG/CSS (Feature 14). `data: null` (a failed
// PostHog query) renders differently from `data: []` (query succeeded,
// genuinely no data yet) — Decision 7.
export function BarChartCard({
  title,
  data,
  maxValue,
  yAxisTicks,
  color,
  emptyIcon,
  emptyMessage,
}: Props) {
  const EmptyIcon = emptyIcon;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {data === null ? (
        <ChartStateMessage
          icon={<AlertCircle className="h-5 w-5 text-text-muted" />}
          message="Unable to load chart data right now."
        />
      ) : data.length === 0 ? (
        <ChartStateMessage
          icon={<EmptyIcon className="h-5 w-5 text-text-muted" />}
          message={emptyMessage}
        />
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-chart-axis)", fontSize: 12 }}
              />
              <YAxis
                domain={[0, maxValue]}
                ticks={yAxisTicks}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-chart-axis)", fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-surface-secondary)" }}
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill={BAR_FILL[color]} radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
