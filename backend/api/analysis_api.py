"""Analysis report API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.match import Match
from backend.models.team import Team
from backend.models.prediction import Prediction
from backend.api.schemas import AnalysisRequest, AnalysisOut, PredictionOut, ValueBetOut
from backend.analysis.writer import AnalysisWriter
from backend.worldcup.tournament import WorldCup2026Mode
from backend.prediction.ensemble import MatchPrediction

router = APIRouter(prefix="/api/analysis", tags=["analysis"])

writer = AnalysisWriter()
wc_mode = WorldCup2026Mode()


@router.post("/report", response_model=AnalysisOut)
async def generate_report(request: AnalysisRequest, db: AsyncSession = Depends(get_db)):
    match_result = await db.execute(select(Match).where(Match.id == request.match_id))
    match = match_result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    home_result = await db.execute(select(Team).where(Team.id == match.home_team_id))
    away_result = await db.execute(select(Team).where(Team.id == match.away_team_id))
    home_team = home_result.scalar_one_or_none()
    away_team = away_result.scalar_one_or_none()

    if not home_team or not away_team:
        raise HTTPException(status_code=404, detail="Team not found")

    pred_result = await db.execute(
        select(Prediction)
        .where(Prediction.match_id == match.id)
        .order_by(Prediction.created_at.desc())
        .limit(1)
    )
    pred = pred_result.scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction available for this match")

    prediction = MatchPrediction(
        match_id=match.id,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        prob_home=pred.prob_home,
        prob_draw=pred.prob_draw,
        prob_away=pred.prob_away,
        prob_over_25=pred.prob_over_25 or 0.5,
        prob_under_25=pred.prob_under_25 or 0.5,
        prob_btts_yes=pred.prob_btts_yes or 0.5,
        prob_btts_no=pred.prob_btts_no or 0.5,
        projected_home_goals=pred.projected_home_goals or 1.0,
        projected_away_goals=pred.projected_away_goals or 1.0,
        projected_scoreline=f"{round(pred.projected_home_goals or 1)}-{round(pred.projected_away_goals or 1)}",
        asian_handicap_lean=pred.asian_handicap_lean or "neutral",
        model_breakdown={},
        confidence=pred.confidence or 0.5,
    )

    tournament_context = ""
    if request.include_tournament_context and "World Cup" in match.competition:
        ctx = wc_mode.get_context(
            stage=match.competition_stage or "GROUP_STAGE",
            home_team=home_team.name,
            away_team=away_team.name,
        )
        tournament_context = wc_mode.generate_tournament_context_text(ctx)

    report = await writer.generate_report(
        prediction=prediction,
        home_team=home_team.name,
        away_team=away_team.name,
        competition=match.competition,
        match_date=str(match.match_date),
        home_elo=home_team.elo_rating or 1500,
        away_elo=away_team.elo_rating or 1500,
        tournament_context=tournament_context,
    )

    pred_out = PredictionOut(
        match_id=match.id,
        home_team=home_team.name,
        away_team=away_team.name,
        match_date=match.match_date,
        competition=match.competition,
        prob_home=pred.prob_home,
        prob_draw=pred.prob_draw,
        prob_away=pred.prob_away,
        prob_over_25=pred.prob_over_25,
        prob_under_25=pred.prob_under_25,
        prob_btts_yes=pred.prob_btts_yes,
        prob_btts_no=pred.prob_btts_no,
        projected_home_goals=pred.projected_home_goals,
        projected_away_goals=pred.projected_away_goals,
        confidence=pred.confidence,
    )

    return AnalysisOut(
        match_id=match.id,
        home_team=home_team.name,
        away_team=away_team.name,
        report=report,
        prediction=pred_out,
    )
