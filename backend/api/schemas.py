"""Pydantic response/request schemas for the API."""

from __future__ import annotations

from pydantic import BaseModel, Field
from datetime import date, datetime


class TeamOut(BaseModel):
    id: int
    name: str
    country_code: str | None = None
    elo_rating: float | None = None
    fifa_ranking: int | None = None


class MatchOut(BaseModel):
    id: int
    home_team: str
    away_team: str
    match_date: date
    competition: str
    competition_stage: str | None = None
    is_knockout: bool = False
    is_neutral_venue: bool = False
    home_goals: int | None = None
    away_goals: int | None = None
    status: str


class OddsOut(BaseModel):
    bookmaker: str
    home_current: float | None = None
    draw_current: float | None = None
    away_current: float | None = None
    over_25_current: float | None = None
    under_25_current: float | None = None


class PredictionOut(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    match_date: date | None = None
    competition: str | None = None

    prob_home: float
    prob_draw: float
    prob_away: float
    prob_over_25: float | None = None
    prob_under_25: float | None = None
    prob_btts_yes: float | None = None
    prob_btts_no: float | None = None

    projected_home_goals: float | None = None
    projected_away_goals: float | None = None
    projected_scoreline: str | None = None
    asian_handicap_lean: str | None = None
    confidence: float | None = None


class ValueBetOut(BaseModel):
    match_id: int
    home_team: str = ""
    away_team: str = ""
    match_date: date | None = None
    market: str
    selection: str
    model_prob: float
    fair_odds: float
    bookmaker_odds: float
    implied_prob: float
    edge: float
    ev: float
    confidence: float
    kelly_fraction: float
    suggested_stake: float
    risk_rating: str


class BacktestRequest(BaseModel):
    competition: str | None = None
    min_date: str | None = None
    train_pct: float = Field(default=0.6, ge=0.3, le=0.9)
    val_pct: float = Field(default=0.2, ge=0.0, le=0.4)
    min_ev: float = Field(default=0.03, ge=0.0)
    kelly_fraction: float = Field(default=0.25, ge=0.05, le=1.0)


class BacktestOut(BaseModel):
    total_bets: int
    winning_bets: int
    win_rate: float
    total_staked: float
    total_profit: float
    roi: float
    max_drawdown: float
    avg_ev: float
    avg_clv: float
    sharpe_ratio: float
    longest_losing_streak: int
    profit_by_market: dict[str, float]
    roi_by_market: dict[str, float]
    monthly_pnl: dict[str, float]


class AnalysisRequest(BaseModel):
    match_id: int
    include_tournament_context: bool = True


class AnalysisOut(BaseModel):
    match_id: int
    home_team: str
    away_team: str
    report: str
    prediction: PredictionOut | None = None
    value_bets: list[ValueBetOut] = []


class DashboardMatch(BaseModel):
    match: MatchOut
    prediction: PredictionOut | None = None
    odds: list[OddsOut] = []
    value_bets: list[ValueBetOut] = []
    fair_odds_home: float | None = None
    fair_odds_draw: float | None = None
    fair_odds_away: float | None = None


class HealthOut(BaseModel):
    status: str
    version: str
    models_loaded: bool
