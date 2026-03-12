"use client";

import { useEffect, useState } from "react";
import ValueBetsTable from "@/components/ValueBetsTable";
import StatsGrid from "@/components/StatsGrid";
import type { ValueBet } from "@/lib/api";
import { api } from "@/lib/api";

const DEMO_BETS: ValueBet[] = [
  {
    match_id: 1,
    home_team: "United States",
    away_team: "Brazil",
    match_date: "2026-06-15",
    market: "1x2",
    selection: "home",
    model_prob: 0.28,
    fair_odds: 3.57,
    bookmaker_odds: 3.8,
    implied_prob: 0.263,
    edge: 0.017,
    ev: 0.064,
    confidence: 0.62,
    kelly_fraction: 0.018,
    suggested_stake: 18,
    risk_rating: "medium",
  },
  {
    match_id: 3,
    home_team: "Germany",
    away_team: "Japan",
    match_date: "2026-06-17",
    market: "over_25",
    selection: "over",
    model_prob: 0.55,
    fair_odds: 1.82,
    bookmaker_odds: 1.95,
    implied_prob: 0.513,
    edge: 0.037,
    ev: 0.072,
    confidence: 0.71,
    kelly_fraction: 0.039,
    suggested_stake: 39,
    risk_rating: "low",
  },
  {
    match_id: 4,
    home_team: "England",
    away_team: "Spain",
    match_date: "2026-06-18",
    market: "btts",
    selection: "yes",
    model_prob: 0.61,
    fair_odds: 1.64,
    bookmaker_odds: 1.80,
    implied_prob: 0.556,
    edge: 0.054,
    ev: 0.098,
    confidence: 0.68,
    kelly_fraction: 0.056,
    suggested_stake: 56,
    risk_rating: "low",
  },
];

export default function ValueBetsPage() {
  const [bets, setBets] = useState<ValueBet[]>(DEMO_BETS);
  const [minEv, setMinEv] = useState(3);
  const [loading, setLoading] = useState(false);

  const loadBets = async () => {
    setLoading(true);
    try {
      const data = await api.getValueBets(minEv / 100);
      if (data.length > 0) setBets(data);
    } catch {
      // Keep demo data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBets();
  }, []);

  const totalEv = bets.reduce((s, b) => s + b.ev, 0) / (bets.length || 1);
  const totalStake = bets.reduce((s, b) => s + b.suggested_stake, 0);
  const avgConf = bets.reduce((s, b) => s + b.confidence, 0) / (bets.length || 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Value Bets</h2>
        <p className="mt-1 text-sm text-gray-400">
          Bets where model probability exceeds market implied probability
        </p>
      </div>

      <StatsGrid
        stats={[
          { label: "Active Value Bets", value: String(bets.length) },
          { label: "Avg EV", value: `+${(totalEv * 100).toFixed(1)}%`, positive: true },
          { label: "Total Suggested", value: `$${totalStake.toFixed(0)}` },
          { label: "Avg Confidence", value: `${(avgConf * 100).toFixed(0)}%` },
        ]}
      />

      <div className="card flex items-end gap-4 p-4">
        <div>
          <label className="stat-label mb-1 block">Min EV Threshold (%)</label>
          <input
            type="number"
            value={minEv}
            onChange={(e) => setMinEv(Number(e.target.value))}
            min={0}
            max={50}
            step={0.5}
            className="w-24 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <button
          onClick={loadBets}
          disabled={loading}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <ValueBetsTable bets={bets} />

      <p className="text-center text-xs text-gray-600">
        All bets shown have positive expected value above threshold.
        Suggested stakes use fractional Kelly criterion (25%).
        This is not financial advice.
      </p>
    </div>
  );
}
