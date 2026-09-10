"use client";

// 1. External imports
import { useId } from "react";
import { AlertCircle, type LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// 2. Internal imports
import { ChartStateMessage } from "@/components/dashboard/ChartStateMessage";

// 3. Type definitions
export type LinePoint = {
  label: string;
  value: number;
};

type Props = {
  title: string;
  data: LinePoint[] | null;
  maxValue: number;
  yAxisTicks: number[];
  emptyIcon: LucideIcon;
  emptyMessage: string;
};

// 4. Component
// Jobs Found Over Time — the one line chart on the dashboard. Rebuilt on
// recharts at Feature 17 (architecture.md's Feature 17 decision, Decisions
// 2 and 10) — previously a hand-rolled Catmull-Rom SVG spline (Feature 14).
// All 30 real days are plotted; only a sparse subset of x-axis labels is
// shown (`interval` below), so a real 30-day range doesn't collide the
// way one label per point would (Decision 10).
export function LineChartCard({ title, data, maxValue, yAxisTicks, emptyIcon, emptyMessage }: Props) {
  const gradientId = useId();
  const labelInterval = data ? Math.max(0, Math.ceil(data.length / 6) - 1) : 0;
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
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="label"
                interval={labelInterval}
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
                contentStyle={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-accent)"
                strokeWidth={3}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
