"""Match and team API endpoints."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.team import Team
from backend.models.match import Match
from backend.models.odds import Odds
from backend.api.schemas import MatchOut, TeamOut, OddsOut

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("/", response_model=list[MatchOut])
async def list_matches(
    competition: str | None = None,
    status: str | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    team: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Match).order_by(Match.match_date.desc())

    if competition:
        query = query.where(Match.competition == competition)
    if status:
        query = query.where(Match.status == status)
    if from_date:
        query = query.where(Match.match_date >= from_date)
    if to_date:
        query = query.where(Match.match_date <= to_date)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    matches = result.scalars().all()

    team_ids = set()
    for m in matches:
        team_ids.add(m.home_team_id)
        team_ids.add(m.away_team_id)

    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams_map = {t.id: t.name for t in teams_result.scalars().all()}

    return [
        MatchOut(
            id=m.id,
            home_team=teams_map.get(m.home_team_id, "Unknown"),
            away_team=teams_map.get(m.away_team_id, "Unknown"),
            match_date=m.match_date,
            competition=m.competition,
            competition_stage=m.competition_stage,
            is_knockout=m.is_knockout,
            is_neutral_venue=m.is_neutral_venue,
            home_goals=m.home_goals,
            away_goals=m.away_goals,
            status=m.status,
        )
        for m in matches
    ]


@router.get("/upcoming", response_model=list[MatchOut])
async def upcoming_matches(
    days: int = Query(default=7, le=30),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    today = date.today()
    end = today + timedelta(days=days)

    query = (
        select(Match)
        .where(Match.match_date >= today, Match.match_date <= end, Match.status == "scheduled")
        .order_by(Match.match_date)
    )
    result = await db.execute(query)
    matches = result.scalars().all()

    team_ids = set()
    for m in matches:
        team_ids.add(m.home_team_id)
        team_ids.add(m.away_team_id)

    teams_result = await db.execute(select(Team).where(Team.id.in_(team_ids)))
    teams_map = {t.id: t.name for t in teams_result.scalars().all()}

    return [
        MatchOut(
            id=m.id,
            home_team=teams_map.get(m.home_team_id, "Unknown"),
            away_team=teams_map.get(m.away_team_id, "Unknown"),
            match_date=m.match_date,
            competition=m.competition,
            competition_stage=m.competition_stage,
            is_knockout=m.is_knockout,
            is_neutral_venue=m.is_neutral_venue,
            home_goals=m.home_goals,
            away_goals=m.away_goals,
            status=m.status,
        )
        for m in matches
    ]


@router.get("/{match_id}", response_model=MatchOut)
async def get_match(match_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Match).where(Match.id == match_id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    home = await db.execute(select(Team).where(Team.id == match.home_team_id))
    away = await db.execute(select(Team).where(Team.id == match.away_team_id))
    home_team = home.scalar_one_or_none()
    away_team = away.scalar_one_or_none()

    return MatchOut(
        id=match.id,
        home_team=home_team.name if home_team else "Unknown",
        away_team=away_team.name if away_team else "Unknown",
        match_date=match.match_date,
        competition=match.competition,
        competition_stage=match.competition_stage,
        is_knockout=match.is_knockout,
        is_neutral_venue=match.is_neutral_venue,
        home_goals=match.home_goals,
        away_goals=match.away_goals,
        status=match.status,
    )


@router.get("/{match_id}/odds", response_model=list[OddsOut])
async def get_match_odds(match_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Odds).where(Odds.match_id == match_id))
    odds_list = result.scalars().all()
    return [
        OddsOut(
            bookmaker=o.bookmaker,
            home_current=o.home_current,
            draw_current=o.draw_current,
            away_current=o.away_current,
            over_25_current=o.over_25_current,
            under_25_current=o.under_25_current,
        )
        for o in odds_list
    ]


teams_router = APIRouter(prefix="/api/teams", tags=["teams"])


@teams_router.get("/", response_model=list[TeamOut])
async def list_teams(
    limit: int = Query(default=100, le=300),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Team).order_by(Team.elo_rating.desc()).limit(limit))
    teams = result.scalars().all()
    return [
        TeamOut(
            id=t.id,
            name=t.name,
            country_code=t.country_code,
            elo_rating=t.elo_rating,
            fifa_ranking=t.fifa_ranking,
        )
        for t in teams
    ]
