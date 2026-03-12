"""Prediction and value bet API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.match import Match
from backend.models.team import Team
from backend.models.odds import Odds
from backend.models.prediction import Prediction
from backend.api.schemas import PredictionOut, ValueBetOut, DashboardMatch, MatchOut, OddsOut
from backend.betting.odds import OddsConverter
from backend.betting.value import ValueDetector

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/", response_model=list[PredictionOut])
async def list_predictions(
    model_name: str | None = None,
    value_only: bool = False,
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(Prediction).order_by(Prediction.created_at.desc())
    if model_name:
        query = query.where(Prediction.model_name == model_name)
    if value_only:
        query = query.where(Prediction.is_value_bet == True)
    query = query.limit(limit)

    result = await db.execute(query)
    preds = result.scalars().all()

    match_ids = {p.match_id for p in preds}
    matches = await _get_matches_map(db, match_ids)

    return [_prediction_to_out(p, matches) for p in preds]


@router.get("/match/{match_id}", response_model=list[PredictionOut])
async def get_match_predictions(match_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Prediction).where(Prediction.match_id == match_id))
    preds = result.scalars().all()
    if not preds:
        raise HTTPException(status_code=404, detail="No predictions for this match")
    matches = await _get_matches_map(db, {match_id})
    return [_prediction_to_out(p, matches) for p in preds]


@router.get("/value-bets", response_model=list[ValueBetOut])
async def list_value_bets(
    min_ev: float = Query(default=0.03, ge=0.0),
    min_confidence: float = Query(default=0.3, ge=0.0, le=1.0),
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Prediction)
        .where(Prediction.is_value_bet == True, Prediction.best_bet_ev >= min_ev)
        .order_by(Prediction.best_bet_ev.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    preds = result.scalars().all()

    match_ids = {p.match_id for p in preds}
    matches = await _get_matches_map(db, match_ids)

    bets = []
    for p in preds:
        m_info = matches.get(p.match_id, {})
        if p.best_bet_market and p.best_bet_ev:
            bets.append(ValueBetOut(
                match_id=p.match_id,
                home_team=m_info.get("home_team", ""),
                away_team=m_info.get("away_team", ""),
                match_date=m_info.get("match_date"),
                market=p.best_bet_market,
                selection=p.best_bet_selection or "",
                model_prob=_get_selection_prob(p),
                fair_odds=round(1 / _get_selection_prob(p), 2) if _get_selection_prob(p) > 0 else 0,
                bookmaker_odds=round(1 / (1 - p.best_bet_ev / _get_selection_prob(p)), 2) if _get_selection_prob(p) > 0 else 0,
                implied_prob=0.0,
                edge=p.best_bet_ev,
                ev=p.best_bet_ev,
                confidence=p.confidence or 0.5,
                kelly_fraction=p.kelly_fraction or 0.0,
                suggested_stake=p.suggested_stake or 0.0,
                risk_rating="medium",
            ))
    return bets


@router.get("/dashboard", response_model=list[DashboardMatch])
async def dashboard(
    competition: str | None = None,
    min_ev: float = Query(default=0.0),
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date as dt_date
    match_query = (
        select(Match)
        .where(Match.match_date >= dt_date.today())
        .order_by(Match.match_date)
        .limit(limit)
    )
    if competition:
        match_query = match_query.where(Match.competition == competition)

    result = await db.execute(match_query)
    matches = result.scalars().all()

    team_ids = set()
    for m in matches:
        team_ids.add(m.home_team_id)
        team_ids.add(m.away_team_id)

    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams_map = {t.id: t.name for t in teams_result.scalars().all()}

    converter = OddsConverter()
    dashboard_items = []

    for m in matches:
        home_name = teams_map.get(m.home_team_id, "Unknown")
        away_name = teams_map.get(m.away_team_id, "Unknown")

        match_out = MatchOut(
            id=m.id,
            home_team=home_name,
            away_team=away_name,
            match_date=m.match_date,
            competition=m.competition,
            competition_stage=m.competition_stage,
            is_knockout=m.is_knockout,
            is_neutral_venue=m.is_neutral_venue,
            home_goals=m.home_goals,
            away_goals=m.away_goals,
            status=m.status,
        )

        pred_result = await db.execute(
            select(Prediction)
            .where(Prediction.match_id == m.id)
            .order_by(Prediction.created_at.desc())
            .limit(1)
        )
        pred = pred_result.scalar_one_or_none()

        odds_result = await db.execute(select(Odds).where(Odds.match_id == m.id))
        odds_list = odds_result.scalars().all()

        pred_out = None
        fair_h, fair_d, fair_a = None, None, None
        if pred:
            pred_out = PredictionOut(
                match_id=m.id,
                home_team=home_name,
                away_team=away_name,
                match_date=m.match_date,
                competition=m.competition,
                prob_home=pred.prob_home,
                prob_draw=pred.prob_draw,
                prob_away=pred.prob_away,
                prob_over_25=pred.prob_over_25,
                prob_under_25=pred.prob_under_25,
                prob_btts_yes=pred.prob_btts_yes,
                prob_btts_no=pred.prob_btts_no,
                projected_home_goals=pred.projected_home_goals,
                projected_away_goals=pred.projected_away_goals,
                projected_scoreline=f"{round(pred.projected_home_goals or 0)}-{round(pred.projected_away_goals or 0)}",
                confidence=pred.confidence,
            )
            fair_h = round(converter.implied_to_decimal(pred.prob_home), 2)
            fair_d = round(converter.implied_to_decimal(pred.prob_draw), 2)
            fair_a = round(converter.implied_to_decimal(pred.prob_away), 2)

        dashboard_items.append(DashboardMatch(
            match=match_out,
            prediction=pred_out,
            odds=[
                OddsOut(
                    bookmaker=o.bookmaker,
                    home_current=o.home_current,
                    draw_current=o.draw_current,
                    away_current=o.away_current,
                    over_25_current=o.over_25_current,
                    under_25_current=o.under_25_current,
                )
                for o in odds_list
            ],
            fair_odds_home=fair_h,
            fair_odds_draw=fair_d,
            fair_odds_away=fair_a,
        ))

    return dashboard_items


async def _get_matches_map(db: AsyncSession, match_ids: set[int]) -> dict:
    if not match_ids:
        return {}
    result = await db.execute(select(Match).where(Match.id.in_(match_ids)))
    matches = result.scalars().all()

    team_ids = set()
    for m in matches:
        team_ids.add(m.home_team_id)
        team_ids.add(m.away_team_id)

    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams_map = {t.id: t.name for t in teams_result.scalars().all()}

    return {
        m.id: {
            "home_team": teams_map.get(m.home_team_id, "Unknown"),
            "away_team": teams_map.get(m.away_team_id, "Unknown"),
            "match_date": m.match_date,
            "competition": m.competition,
        }
        for m in matches
    }


def _prediction_to_out(p: Prediction, matches: dict) -> PredictionOut:
    m_info = matches.get(p.match_id, {})
    return PredictionOut(
        match_id=p.match_id,
        home_team=m_info.get("home_team", ""),
        away_team=m_info.get("away_team", ""),
        match_date=m_info.get("match_date"),
        competition=m_info.get("competition"),
        prob_home=p.prob_home,
        prob_draw=p.prob_draw,
        prob_away=p.prob_away,
        prob_over_25=p.prob_over_25,
        prob_under_25=p.prob_under_25,
        prob_btts_yes=p.prob_btts_yes,
        prob_btts_no=p.prob_btts_no,
        projected_home_goals=p.projected_home_goals,
        projected_away_goals=p.projected_away_goals,
        projected_scoreline=f"{round(p.projected_home_goals or 0)}-{round(p.projected_away_goals or 0)}",
        asian_handicap_lean=p.asian_handicap_lean,
        confidence=p.confidence,
    )


def _get_selection_prob(p: Prediction) -> float:
    sel = p.best_bet_selection
    if sel == "home":
        return p.prob_home
    elif sel == "draw":
        return p.prob_draw
    elif sel == "away":
        return p.prob_away
    return p.prob_home
