export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  competition: string;
  competition_stage: string;
  is_knockout: boolean;
  is_neutral_venue: boolean;
  home_goals: number | null;
  away_goals: number | null;
  status: string;
}

export interface Prediction {
  match_id: number;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  prob_over_25: number;
  prob_under_25: number;
  prob_btts_yes: number;
  prob_btts_no: number;
  projected_home_goals: number;
  projected_away_goals: number;
  projected_scoreline: string;
  asian_handicap_lean: string;
  confidence: number;
}

export interface ValueBet {
  market: string;
  selection: string;
  model_prob: number;
  fair_odds: number;
  bookmaker_odds: number;
  edge: number;
  ev: number;
  confidence: number;
  kelly_fraction: number;
  suggested_stake: number;
  risk_rating: "low" | "medium" | "high";
  home_team?: string;
  away_team?: string;
  match_date?: string;
  competition?: string;
}

export interface DashboardMatch {
  match: Match;
  prediction: Prediction;
  odds: { bookmaker: string; home: number; draw: number; away: number }[];
  value_bets: ValueBet[];
  fair_odds_home: number;
  fair_odds_draw: number;
  fair_odds_away: number;
}

export interface DashboardStats {
  upcoming_matches: number;
  value_bets: number;
  avg_confidence: number;
  model: string;
}

export interface DashboardData {
  matches: DashboardMatch[];
  stats: DashboardStats;
}

export interface BacktestSummary {
  total_bets: number;
  win_rate: number;
  roi: number;
  total_profit: number;
  max_drawdown: number;
  sharpe_ratio: number;
  avg_ev: number;
  clv: number;
}

export interface MonthlyResult {
  month: string;
  roi: number;
  bets: number;
  profit: number;
}

export interface BacktestData {
  summary: BacktestSummary;
  monthly: MonthlyResult[];
}

export interface LiveMatch {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  date: string;
  time: string;
  venue: string;
  league: string;
  league_key: string;
  status: "scheduled" | "finished";
  round: string;
  home_badge: string | null;
  away_badge: string | null;
  thumb: string | null;
  timestamp: string;
}

export interface LeagueInfo {
  key: string;
  id: string;
  name: string;
  country: string;
  badge: string;
  season: string;
}

export interface AllMatchesData {
  leagues: LeagueInfo[];
  upcoming: LiveMatch[];
  results: LiveMatch[];
}

export interface StandingEntry {
  rank: number;
  team: string;
  badge: string | null;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  form: string;
}

export interface StandingsData {
  league: LeagueInfo;
  standings: StandingEntry[];
}
