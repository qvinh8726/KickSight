import { query, isDbAvailable } from "./db";

export interface DbMatch {
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
  venue: string | null;
}

export interface DbPrediction {
  match_id: number;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  prob_over_25: number | null;
  prob_under_25: number | null;
  prob_btts_yes: number | null;
  prob_btts_no: number | null;
  projected_home_goals: number | null;
  projected_away_goals: number | null;
  projected_scoreline: string;
  asian_handicap_lean: string | null;
  confidence: number | null;
}

export interface DbValueBet {
  match_id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  competition: string;
  market: string;
  selection: string;
  ev: number;
  confidence: number;
  kelly_fraction: number;
  suggested_stake: number;
}

export interface DashboardMatch {
  match: DbMatch;
  prediction: DbPrediction;
  odds: any[];
  value_bets: any[];
  fair_odds_home: number | null;
  fair_odds_draw: number | null;
  fair_odds_away: number | null;
}

export async function getDashboardFromDb(): Promise<{ matches: DashboardMatch[]; stats: any } | null> {
  if (!isDbAvailable()) return null;

  try {
    const matchRes = await query(`
      SELECT m.id, ht.name as home_team, at.name as away_team,
             m.match_date, m.competition, m.competition_stage,
             m.is_knockout, m.is_neutral_venue, m.home_goals, m.away_goals,
             m.status, m.venue
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE m.match_date >= CURRENT_DATE AND m.status = 'scheduled'
      ORDER BY m.match_date
      LIMIT 30
    `);

    if (matchRes.rows.length === 0) return null;

    const matchIds = matchRes.rows.map((r: any) => r.id);

    const predRes = await query(`
      SELECT DISTINCT ON (match_id) *
      FROM ml_predictions
      WHERE match_id = ANY($1)
      ORDER BY match_id, created_at DESC
    `, [matchIds]);
    const predMap = new Map(predRes.rows.map((p: any) => [p.match_id, p]));

    const oddsRes = await query(`
      SELECT * FROM odds WHERE match_id = ANY($1)
    `, [matchIds]);
    const oddsMap = new Map<number, any[]>();
    for (const o of oddsRes.rows) {
      if (!oddsMap.has(o.match_id)) oddsMap.set(o.match_id, []);
      oddsMap.get(o.match_id)!.push(o);
    }

    const matches: DashboardMatch[] = matchRes.rows.map((m: any) => {
      const pred = predMap.get(m.id);
      const odds = oddsMap.get(m.id) || [];

      const prediction: DbPrediction = pred ? {
        match_id: m.id,
        prob_home: pred.prob_home,
        prob_draw: pred.prob_draw,
        prob_away: pred.prob_away,
        prob_over_25: pred.prob_over_25,
        prob_under_25: pred.prob_under_25,
        prob_btts_yes: pred.prob_btts_yes,
        prob_btts_no: pred.prob_btts_no,
        projected_home_goals: pred.projected_home_goals,
        projected_away_goals: pred.projected_away_goals,
        projected_scoreline: `${Math.round(pred.projected_home_goals || 0)}-${Math.round(pred.projected_away_goals || 0)}`,
        asian_handicap_lean: pred.asian_handicap_lean,
        confidence: pred.confidence,
      } : {
        match_id: m.id,
        prob_home: 0.33, prob_draw: 0.33, prob_away: 0.34,
        prob_over_25: null, prob_under_25: null,
        prob_btts_yes: null, prob_btts_no: null,
        projected_home_goals: null, projected_away_goals: null,
        projected_scoreline: "0-0", asian_handicap_lean: null, confidence: null,
      };

      return {
        match: {
          id: m.id,
          home_team: m.home_team,
          away_team: m.away_team,
          match_date: m.match_date?.toISOString?.()?.slice(0, 10) || m.match_date,
          competition: m.competition,
          competition_stage: m.competition_stage,
          is_knockout: m.is_knockout,
          is_neutral_venue: m.is_neutral_venue,
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          status: m.status,
          venue: m.venue,
        },
        prediction,
        odds: odds.map((o: any) => ({
          bookmaker: o.bookmaker,
          home: o.home_current,
          draw: o.draw_current,
          away: o.away_current,
        })),
        value_bets: pred?.is_value_bet ? [{
          market: pred.best_bet_market,
          selection: pred.best_bet_selection,
          ev: pred.best_bet_ev,
          kelly_fraction: pred.kelly_fraction,
          suggested_stake: pred.suggested_stake,
        }] : [],
        fair_odds_home: pred ? Math.round((1 / pred.prob_home) * 100) / 100 : null,
        fair_odds_draw: pred ? Math.round((1 / pred.prob_draw) * 100) / 100 : null,
        fair_odds_away: pred ? Math.round((1 / pred.prob_away) * 100) / 100 : null,
      };
    });

    const totalValueBets = matches.reduce((s, m) => s + m.value_bets.length, 0);
    const avgConfidence = matches.length > 0
      ? matches.reduce((s, m) => s + (m.prediction.confidence || 0), 0) / matches.length
      : 0;

    return {
      matches,
      stats: {
        upcoming_matches: matches.length,
        value_bets: totalValueBets,
        avg_confidence: avgConfidence,
        model: "Ensemble AI (Poisson + XGBoost + LightGBM)",
      },
    };
  } catch (err) {
    console.error("[DB] Dashboard query failed:", err);
    return null;
  }
}

export async function getMatchesFromDb(): Promise<DbMatch[] | null> {
  if (!isDbAvailable()) return null;
  try {
    const res = await query(`
      SELECT m.id, ht.name as home_team, at.name as away_team,
             m.match_date, m.competition, m.competition_stage,
             m.is_knockout, m.is_neutral_venue, m.home_goals, m.away_goals,
             m.status, m.venue
      FROM matches m
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      ORDER BY m.match_date DESC
      LIMIT 100
    `);
    if (res.rows.length === 0) return null;
    return res.rows.map((m: any) => ({
      ...m,
      match_date: m.match_date?.toISOString?.()?.slice(0, 10) || m.match_date,
    }));
  } catch (err) {
    console.error("[DB] Matches query failed:", err);
    return null;
  }
}

export async function getValueBetsFromDb(): Promise<DbValueBet[] | null> {
  if (!isDbAvailable()) return null;
  try {
    const res = await query(`
      SELECT p.match_id, ht.name as home_team, at.name as away_team,
             m.match_date, m.competition,
             p.best_bet_market as market, p.best_bet_selection as selection,
             p.best_bet_ev as ev, p.confidence,
             p.kelly_fraction, p.suggested_stake
      FROM ml_predictions p
      JOIN matches m ON p.match_id = m.id
      JOIN teams ht ON m.home_team_id = ht.id
      JOIN teams at ON m.away_team_id = at.id
      WHERE p.is_value_bet = TRUE AND m.status = 'scheduled'
      ORDER BY p.best_bet_ev DESC
      LIMIT 50
    `);
    if (res.rows.length === 0) return null;
    return res.rows.map((r: any) => ({
      ...r,
      match_date: r.match_date?.toISOString?.()?.slice(0, 10) || r.match_date,
    }));
  } catch (err) {
    console.error("[DB] Value bets query failed:", err);
    return null;
  }
}

export async function getBacktestFromDb(): Promise<any | null> {
  if (!isDbAvailable()) return null;
  try {
    const totalRes = await query(`SELECT COUNT(*) as total FROM ml_predictions WHERE match_id IN (SELECT id FROM matches WHERE status = 'finished')`);
    const total = parseInt(totalRes.rows[0]?.total || "0");
    if (total === 0) return null;

    const valueBetsRes = await query(`
      SELECT p.is_value_bet, p.best_bet_ev, p.best_bet_market,
             CASE WHEN p.best_bet_selection = 'home' AND m.home_goals > m.away_goals THEN 1
                  WHEN p.best_bet_selection = 'away' AND m.away_goals > m.home_goals THEN 1
                  WHEN p.best_bet_selection = 'draw' AND m.home_goals = m.away_goals THEN 1
                  WHEN p.best_bet_selection = 'over' AND (m.home_goals + m.away_goals) > 2 THEN 1
                  WHEN p.best_bet_selection = 'under' AND (m.home_goals + m.away_goals) < 3 THEN 1
                  ELSE 0 END as is_win,
             p.suggested_stake,
             p.kelly_fraction
      FROM ml_predictions p
      JOIN matches m ON p.match_id = m.id
      WHERE p.is_value_bet = TRUE AND m.status = 'finished'
    `);

    const bets = valueBetsRes.rows;
    if (bets.length === 0) return null;

    const wins = bets.filter((b: any) => b.is_win === 1).length;
    const totalStaked = bets.reduce((s: number, b: any) => s + (b.suggested_stake || 0), 0);
    const totalProfit = bets.reduce((s: number, b: any) => {
      const stake = b.suggested_stake || 0;
      return s + (b.is_win === 1 ? stake * 0.85 : -stake);
    }, 0);

    return {
      total_bets: bets.length,
      winning_bets: wins,
      win_rate: bets.length > 0 ? Math.round((wins / bets.length) * 1000) / 10 : 0,
      total_staked: Math.round(totalStaked * 100) / 100,
      total_profit: Math.round(totalProfit * 100) / 100,
      roi: totalStaked > 0 ? Math.round((totalProfit / totalStaked) * 1000) / 10 : 0,
      avg_ev: Math.round(bets.reduce((s: number, b: any) => s + (b.best_bet_ev || 0), 0) / bets.length * 1000) / 1000,
    };
  } catch (err) {
    console.error("[DB] Backtest query failed:", err);
    return null;
  }
}

export async function initDbTables(): Promise<void> {
  if (!isDbAvailable()) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        google_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS predictions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        competition TEXT,
        predicted_outcome TEXT,
        confidence NUMERIC,
        home_win_prob NUMERIC,
        draw_prob NUMERIC,
        away_win_prob NUMERIC,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("[DB] Tables verified/created");
  } catch (err) {
    console.error("[DB] Table init failed:", err);
  }
}
