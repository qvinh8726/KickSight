"use client";

interface Stat {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}

export default function StatsGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="card">
          <p className="stat-label">{s.label}</p>
          <p className="stat-value mt-1">{s.value}</p>
          {s.change && (
            <p
              className={`mt-1 text-xs font-medium ${
                s.positive ? "text-green-400" : "text-red-400"
              }`}
            >
              {s.change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
