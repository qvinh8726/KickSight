-- KickSight Database Schema
-- Run: psql kicksight < scripts/init-db.sql

-- Users (Node.js server auth)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User predictions (Node.js server)
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
);

-- Teams (Python backend)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    country_code VARCHAR(3),
    elo_rating FLOAT DEFAULT 1500.0,
    fifa_ranking INTEGER,
    confederation VARCHAR(10),
    squad_value FLOAT,
    is_national_team BOOLEAN DEFAULT TRUE
);

-- Matches (Python backend)
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE,
    home_team_id INTEGER NOT NULL REFERENCES teams(id),
    away_team_id INTEGER NOT NULL REFERENCES teams(id),
    match_date DATE NOT NULL,
    competition TEXT NOT NULL,
    competition_stage TEXT,
    tournament_round TEXT,
    is_knockout BOOLEAN DEFAULT FALSE,
    is_neutral_venue BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'scheduled',
    importance FLOAT DEFAULT 1.0,
    venue TEXT,

    home_goals INTEGER,
    away_goals INTEGER,

    home_xg FLOAT,
    away_xg FLOAT,
    home_shots INTEGER,
    away_shots INTEGER,
    home_shots_on_target INTEGER,
    away_shots_on_target INTEGER,
    home_possession FLOAT,
    away_possession FLOAT,
    home_corners INTEGER,
    away_corners INTEGER,
    home_yellow_cards INTEGER,
    away_yellow_cards INTEGER,
    home_red_cards INTEGER,
    away_red_cards INTEGER,

    home_elo_pre FLOAT,
    away_elo_pre FLOAT
);

-- Odds (Python backend)
CREATE TABLE IF NOT EXISTS odds (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    bookmaker TEXT NOT NULL,
    market TEXT DEFAULT 'composite',

    home_current FLOAT,
    draw_current FLOAT,
    away_current FLOAT,
    over_25_current FLOAT,
    under_25_current FLOAT,

    home_open FLOAT,
    draw_open FLOAT,
    away_open FLOAT,

    home_close FLOAT,
    draw_close FLOAT,
    away_close FLOAT,

    btts_yes_current FLOAT,
    btts_no_current FLOAT,

    asian_handicap_line FLOAT,
    asian_handicap_home FLOAT,
    asian_handicap_away FLOAT,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ML Predictions (Python backend)
CREATE TABLE IF NOT EXISTS ml_predictions (
    id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    model_name TEXT DEFAULT 'ensemble',

    prob_home FLOAT NOT NULL,
    prob_draw FLOAT NOT NULL,
    prob_away FLOAT NOT NULL,
    prob_over_25 FLOAT,
    prob_under_25 FLOAT,
    prob_btts_yes FLOAT,
    prob_btts_no FLOAT,

    projected_home_goals FLOAT,
    projected_away_goals FLOAT,
    asian_handicap_lean TEXT,
    confidence FLOAT,

    is_value_bet BOOLEAN DEFAULT FALSE,
    best_bet_market TEXT,
    best_bet_selection TEXT,
    best_bet_ev FLOAT,
    kelly_fraction FLOAT,
    suggested_stake FLOAT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_external_id ON matches(external_id);
CREATE INDEX IF NOT EXISTS idx_matches_competition ON matches(competition);
CREATE INDEX IF NOT EXISTS idx_odds_match_id ON odds(match_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_match_id ON ml_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_value ON ml_predictions(is_value_bet) WHERE is_value_bet = TRUE;
