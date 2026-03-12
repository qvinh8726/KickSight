"use client";

import { useEffect, useState } from "react";
import MatchCard from "@/components/MatchCard";
import StatsGrid from "@/components/StatsGrid";
import Filters from "@/components/Filters";
import type { DashboardMatch } from "@/lib/api";
import { api } from "@/lib/api";

const DEMO_MATCHES: DashboardMatch[] = [
  {
    match: {
      id: 1,
      home_team: "United States",
      away_team: "Brazil",
      match_date: "2026-06-15",
      competition: "FIFA World Cup",
      competition_stage: "GROUP_STAGE",
      is_knockout: false,
      is_neutral_venue: false,
      home_goals: null,
      away_goals: null,
      status: "scheduled",
    },
    prediction: {
      match_id: 1,
      home_team: "United States",
      away_team: "Brazil",
      match_date: "2026-06-15",
      competition: "FIFA World Cup",
      prob_home: 0.28,
      prob_draw: 0.24,
      prob_away: 0.48,
      prob_over_25: 0.58,
      prob_under_25: 0.42,
      prob_btts_yes: 0.52,
      prob_btts_no: 0.48,
      projected_home_goals: 1.1,
      projected_away_goals: 1.5,
      projected_scoreline: "1-2",
      asian_handicap_lean: "away",
      confidence: 0.62,
    },
    odds: [{ bookmaker: "pinnacle", home_current: 3.60, draw_current: 3.40, away_current: 2.10 }],
    value_bets: [
      {
        match_id: 1,
        home_team: "United States",
        away_team: "Brazil",
        match_date: "2026-06-15",
        market: "1x2",
        selection: "home",
        model_prob: 0.28,
        fair_odds: 3.57,
        bookmaker_odds: 3.6,
        implied_prob: 0.278,
        edge: 0.002,
        ev: 0.048,
        confidence: 0.62,
        kelly_fraction: 0.013,
        suggested_stake: 13,
        risk_rating: "medium",
      },
    ],
    fair_odds_home: 3.57,
    fair_odds_draw: 4.17,
    fair_odds_away: 2.08,
  },
  {
    match: {
      id: 2,
      home_team: "France",
      away_team: "Argentina",
      match_date: "2026-06-16",
      competition: "FIFA World Cup",
      competition_stage: "GROUP_STAGE",
      is_knockout: false,
      is_neutral_venue: true,
      home_goals: null,
      away_goals: null,
      status: "scheduled",
    },
    prediction: {
      match_id: 2,
      home_team: "France",
      away_team: "Argentina",
      match_date: "2026-06-16",
      competition: "FIFA World Cup",
      prob_home: 0.38,
      prob_draw: 0.27,
      prob_away: 0.35,
      prob_over_25: 0.62,
      prob_under_25: 0.38,
      prob_btts_yes: 0.58,
      prob_btts_no: 0.42,
      projected_home_goals: 1.4,
      projected_away_goals: 1.3,
      projected_scoreline: "1-1",
      asian_handicap_lean: "neutral",
      confidence: 0.45,
    },
    odds: [{ bookmaker: "bet365", home_current: 2.50, draw_current: 3.30, away_current: 2.90 }],
    value_bets: [],
    fair_odds_home: 2.63,
    fair_odds_draw: 3.7,
    fair_odds_away: 2.86,
  },
  {
    match: {
      id: 3,
      home_team: "Germany",
      away_team: "Japan",
      match_date: "2026-06-17",
      competition: "FIFA World Cup",
      competition_stage: "GROUP_STAGE",
      is_knockout: false,
      is_neutral_venue: true,
      home_goals: null,
      away_goals: null,
      status: "scheduled",
    },
    prediction: {
      match_id: 3,
      home_team: "Germany",
      away_team: "Japan",
      match_date: "2026-06-17",
      competition: "FIFA World Cup",
      prob_home: 0.52,
      prob_draw: 0.24,
      prob_away: 0.24,
      prob_over_25: 0.55,
      prob_under_25: 0.45,
      prob_btts_yes: 0.54,
      prob_btts_no: 0.46,
      projected_home_goals: 1.6,
      projected_away_goals: 0.9,
      projected_scoreline: "2-1",
      asian_handicap_lean: "home",
      confidence: 0.71,
    },
    odds: [{ bookmaker: "pinnacle", home_current: 1.85, draw_current: 3.50, away_current: 4.50 }],
    value_bets: [
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
    ],
    fair_odds_home: 1.92,
    fair_odds_draw: 4.17,
    fair_odds_away: 4.17,
  },
];

export default function Dashboard() {
  const [matches, setMatches] = useState<DashboardMatch[]>(DEMO_MATCHES);
  const [loading, setLoading] = useState(false);

  const loadData = async (filters?: Record<string, string>) => {
    setLoading(true);
    try {
      const data = await api.getDashboard(filters);
      if (data.length > 0) setMatches(data);
    } catch {
      // Fall back to demo data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const valueBetCount = matches.reduce((acc, m) => acc + (m.value_bets?.length ?? 0), 0);
  const avgConfidence =
    matches.filter((m) => m.prediction).length > 0
      ? matches
          .filter((m) => m.prediction)
          .reduce((acc, m) => acc + (m.prediction?.confidence ?? 0), 0) /
        matches.filter((m) => m.prediction).length
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-400">
          World Cup 2026 match predictions and value bet detection
        </p>
      </div>

      <StatsGrid
        stats={[
          { label: "Upcoming Matches", value: String(matches.length) },
          { label: "Value Bets", value: String(valueBetCount), positive: valueBetCount > 0 },
          {
            label: "Avg Confidence",
            value: `${(avgConfidence * 100).toFixed(0)}%`,
          },
          { label: "Model", value: "Ensemble v1" },
        ]}
      />

      <Filters
        onFilter={(f) => {
          const params: Record<string, string> = {};
          if (f.competition) params.competition = f.competition;
          if (f.minEv) params.min_ev = String(f.minEv);
          loadData(params);
        }}
      />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-green-500" />
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {matches.map((m) => (
          <MatchCard key={m.match.id} data={m} />
        ))}
      </div>
    </div>
  );
}
