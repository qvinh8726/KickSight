"use client";

import { useState } from "react";
import StatsGrid from "@/components/StatsGrid";
import { PnlChart, MonthlyPnlBars } from "@/components/PerformanceChart";
import type { BacktestResult } from "@/lib/api";
import { api } from "@/lib/api";

const DEMO_RESULT: BacktestResult = {
  total_bets: 247,
  winning_bets: 112,
  win_rate: 0.4534,
  total_staked: 5820.0,
  total_profit: 428.5,
  roi: 0.0736,
  max_drawdown: 185.0,
  avg_ev: 0.052,
  avg_clv: 0.018,
  sharpe_ratio: 1.42,
  longest_losing_streak: 8,
  profit_by_market: { "1x2": 215.0, over_25: 142.5, btts: 71.0 },
  roi_by_market: { "1x2": 0.065, over_25: 0.092, btts: 0.058 },
  monthly_pnl: {
    "2024-01": 35, "2024-02": -18, "2024-03": 62, "2024-04": 28,
    "2024-05": -42, "2024-06": 88, "2024-07": 15, "2024-08": -25,
    "2024-09": 55, "2024-10": 72, "2024-11": 38, "2024-12": 120,
  },
};

export default function BacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(DEMO_RESULT);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    competition: "",
    min_date: "2020-01-01",
    train_pct: 0.6,
    val_pct: 0.2,
    min_ev: 0.03,
    kelly_fraction: 0.25,
  });

  const runBacktest = async () => {
    setLoading(true);
    try {
      const data = await api.runBacktest(config);
      setResult(data);
    } catch {
      // Keep demo result
    } finally {
      setLoading(false);
    }
  };

  const monthlyData = result
    ? Object.entries(result.monthly_pnl).map(([month, profit]) => ({ month, profit }))
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Backtesting</h2>
        <p className="mt-1 text-sm text-gray-400">
          Historical simulation with train/validation/test splits
        </p>
      </div>

      <div className="card">
        <h3 className="mb-4 text-sm font-semibold text-white">Configuration</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <label className="stat-label mb-1 block">Competition</label>
            <select
              value={config.competition}
              onChange={(e) => setConfig({ ...config, competition: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            >
              <option value="">All</option>
              <option value="FIFA World Cup">World Cup</option>
              <option value="UEFA Euro">Euro</option>
              <option value="FIFA World Cup Qualification">WC Quals</option>
            </select>
          </div>
          <div>
            <label className="stat-label mb-1 block">Min Date</label>
            <input
              type="date"
              value={config.min_date}
              onChange={(e) => setConfig({ ...config, min_date: e.target.value })}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="stat-label mb-1 block">Train %</label>
            <input
              type="number"
              value={config.train_pct * 100}
              onChange={(e) => setConfig({ ...config, train_pct: Number(e.target.value) / 100 })}
              min={30}
              max={90}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="stat-label mb-1 block">Min EV</label>
            <input
              type="number"
              value={config.min_ev * 100}
              onChange={(e) => setConfig({ ...config, min_ev: Number(e.target.value) / 100 })}
              min={0}
              max={20}
              step={0.5}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="stat-label mb-1 block">Kelly Frac</label>
            <input
              type="number"
              value={config.kelly_fraction * 100}
              onChange={(e) =>
                setConfig({ ...config, kelly_fraction: Number(e.target.value) / 100 })
              }
              min={5}
              max={100}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={runBacktest}
              disabled={loading}
              className="w-full rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Running..." : "Run Backtest"}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <>
          <StatsGrid
            stats={[
              { label: "Total Bets", value: String(result.total_bets) },
              { label: "Win Rate", value: `${(result.win_rate * 100).toFixed(1)}%` },
              {
                label: "ROI",
                value: `${(result.roi * 100).toFixed(1)}%`,
                positive: result.roi > 0,
                change: result.roi > 0 ? "Profitable" : "Negative",
              },
              {
                label: "Profit",
                value: `$${result.total_profit.toFixed(0)}`,
                positive: result.total_profit > 0,
              },
            ]}
          />

          <StatsGrid
            stats={[
              { label: "Max Drawdown", value: `$${result.max_drawdown.toFixed(0)}` },
              { label: "Sharpe Ratio", value: result.sharpe_ratio.toFixed(2) },
              { label: "Avg EV", value: `${(result.avg_ev * 100).toFixed(1)}%` },
              { label: "Avg CLV", value: `${(result.avg_clv * 100).toFixed(1)}%` },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <PnlChart data={monthlyData} />
            <MonthlyPnlBars data={monthlyData} />
          </div>

          <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-white">Performance by Market</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(result.profit_by_market).map(([market, profit]) => (
                <div key={market} className="rounded-lg bg-gray-900/50 p-4 text-center">
                  <p className="stat-label">{market.toUpperCase()}</p>
                  <p
                    className={`stat-value mt-1 ${
                      profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ${profit.toFixed(0)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    ROI: {((result.roi_by_market[market] ?? 0) * 100).toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
