const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  competition: string;
  competition_stage: string | null;
  is_knockout: boolean;
  is_neutral_venue: boolean;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
}

export interface Prediction {
  match_id: number;
  home_team: string;
  away_team: string;
  match_date: string | null;
  competition: string | null;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  prob_over_25: number | null;
  prob_under_25: number | null;
  prob_btts_yes: number | null;
  prob_btts_no: number | null;
  projected_home_goals: number | null;
  projected_away_goals: number | null;
  projected_scoreline: string | null;
  asian_handicap_lean: string | null;
  confidence: number | null;
}

export interface ValueBet {
  match_id: number;
  home_team: string;
  away_team: string;
  match_date: string | null;
  market: string;
  selection: string;
  model_prob: number;
  fair_odds: number;
  bookmaker_odds: number;
  implied_prob: number;
  edge: number;
  ev: number;
  confidence: number;
  kelly_fraction: number;
  suggested_stake: number;
  risk_rating: string;
}

export interface DashboardMatch {
  match: Match;
  prediction: Prediction | null;
  odds: { bookmaker: string; home_current: number | null; draw_current: number | null; away_current: number | null }[];
  value_bets: ValueBet[];
  fair_odds_home: number | null;
  fair_odds_draw: number | null;
  fair_odds_away: number | null;
}

export interface BacktestResult {
  total_bets: number;
  winning_bets: number;
  win_rate: number;
  total_staked: number;
  total_profit: number;
  roi: number;
  max_drawdown: number;
  avg_ev: number;
  avg_clv: number;
  sharpe_ratio: number;
  longest_losing_streak: number;
  profit_by_market: Record<string, number>;
  roi_by_market: Record<string, number>;
  monthly_pnl: Record<string, number>;
}

export const api = {
  getMatches: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetcher<Match[]>(`/api/matches/${qs}`);
  },
  getUpcoming: (days = 7) => fetcher<Match[]>(`/api/matches/upcoming?days=${days}`),
  getMatch: (id: number) => fetcher<Match>(`/api/matches/${id}`),
  getDashboard: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetcher<DashboardMatch[]>(`/api/predictions/dashboard${qs}`);
  },
  getPredictions: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetcher<Prediction[]>(`/api/predictions/${qs}`);
  },
  getValueBets: (minEv = 0.03) =>
    fetcher<ValueBet[]>(`/api/predictions/value-bets?min_ev=${minEv}`),
  runBacktest: (config: Record<string, unknown>) =>
    fetcher<BacktestResult>("/api/backtest/run", {
      method: "POST",
      body: JSON.stringify(config),
    }),
  getAnalysis: (matchId: number) =>
    fetcher<{ match_id: number; report: string; prediction: Prediction }>("/api/analysis/report", {
      method: "POST",
      body: JSON.stringify({ match_id: matchId }),
    }),
};
