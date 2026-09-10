// 3. Type definitions
export type StatDatum = {
  label: string;
  value: string;
  trend?: { value: string; description: string };
  subtitle?: string;
};

type Props = {
  stats: StatDatum[];
};

// 4. Component
export function StatsBar({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: StatDatum }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 shadow-card">
      <span className="text-sm font-medium text-text-secondary">{stat.label}</span>
      <span className="text-3xl leading-9 font-semibold text-text-primary">{stat.value}</span>
      {stat.trend ? (
        <div className="flex items-center gap-2">
          <span
            className={
              stat.trend.value.startsWith("-")
                ? "rounded-sm bg-error-lightest px-2 py-0.5 text-xs font-medium text-error"
                : "rounded-sm bg-success-lightest px-2 py-0.5 text-xs font-medium text-success-darker"
            }
          >
            {stat.trend.value}
          </span>
          <span className="text-xs text-text-muted">{stat.trend.description}</span>
        </div>
      ) : stat.subtitle ? (
        <span className="text-xs text-text-muted">{stat.subtitle}</span>
      ) : null}
    </div>
  );
}
