"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface PnlChartProps {
  data: { month: string; profit: number }[];
}

export function PnlChart({ data }: PnlChartProps) {
  const cumulative = data.reduce<{ month: string; profit: number; cumulative: number }[]>(
    (acc, d) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
      acc.push({ ...d, cumulative: prev + d.profit });
      return acc;
    },
    []
  );

  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-white">Cumulative P&L</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={cumulative}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#334155" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2332",
              border: "1px solid #2a3a4f",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyPnlBars({ data }: PnlChartProps) {
  return (
    <div className="card">
      <h3 className="mb-4 text-sm font-semibold text-white">Monthly P&L</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={{ stroke: "#334155" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2332",
              border: "1px solid #2a3a4f",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
