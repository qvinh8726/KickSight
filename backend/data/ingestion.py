"""Orchestrates data ingestion from multiple sources into the database."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import structlog
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.database import SyncSession
from backend.models.team import Team
from backend.models.match import Match
from backend.models.odds import Odds
from backend.data.sources import FootballDataClient, OddsAPIClient

logger = structlog.get_logger()


class DataIngestionService:
    """Coordinates pulling data from APIs and persisting to Postgres."""

    def __init__(self):
        self.football_client = FootballDataClient()
        self.odds_client = OddsAPIClient()

    async def ingest_competition_matches(self, competition_id: int, season: int) -> int:
        data = await self.football_client.get_competition_matches(competition_id, season)
        matches_raw = data.get("matches", [])
        count = 0
        with SyncSession() as session:
            for m in matches_raw:
                count += self._upsert_match_from_api(session, m)
            session.commit()
        logger.info("ingested_matches", competition=competition_id, season=season, count=count)
        return count

    async def ingest_world_cup_2026(self) -> int:
        return await self.ingest_competition_matches(competition_id=2000, season=2026)

    async def ingest_odds(self, sport: str = "soccer_fifa_world_cup") -> int:
        odds_data = await self.odds_client.get_soccer_odds(sport=sport)
        count = 0
        with SyncSession() as session:
            for event in odds_data:
                count += self._upsert_odds_from_api(session, event)
            session.commit()
        logger.info("ingested_odds", sport=sport, count=count)
        return count

    def _get_or_create_team(self, session: Session, name: str, country_code: str = "") -> Team:
        team = session.execute(select(Team).where(Team.name == name)).scalar_one_or_none()
        if not team:
            team = Team(name=name, country_code=country_code)
            session.add(team)
            session.flush()
        return team

    def _upsert_match_from_api(self, session: Session, data: dict) -> int:
        external_id = str(data.get("id", ""))
        existing = session.execute(
            select(Match).where(Match.external_id == external_id)
        ).scalar_one_or_none()
        if existing:
            self._update_match_scores(existing, data)
            return 0

        home_info = data.get("homeTeam", {})
        away_info = data.get("awayTeam", {})
        home_team = self._get_or_create_team(session, home_info.get("name", "Unknown"))
        away_team = self._get_or_create_team(session, away_info.get("name", "Unknown"))

        score = data.get("score", {})
        ft = score.get("fullTime", {})
        competition = data.get("competition", {})

        match_date_str = data.get("utcDate", "")[:10]
        match_date = date.fromisoformat(match_date_str) if match_date_str else date.today()

        stage = data.get("stage", "")
        is_knockout = stage in ("ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL", "THIRD_PLACE")

        importance = self._compute_importance(competition.get("name", ""), stage)

        match = Match(
            external_id=external_id,
            home_team_id=home_team.id,
            away_team_id=away_team.id,
            match_date=match_date,
            competition=competition.get("name", "Unknown"),
            competition_stage=stage,
            tournament_round=data.get("matchday"),
            is_knockout=is_knockout,
            home_goals=ft.get("home"),
            away_goals=ft.get("away"),
            importance=importance,
            status=data.get("status", "SCHEDULED").lower(),
        )
        session.add(match)
        return 1

    def _update_match_scores(self, match: Match, data: dict) -> None:
        score = data.get("score", {})
        ft = score.get("fullTime", {})
        if ft.get("home") is not None:
            match.home_goals = ft["home"]
            match.away_goals = ft["away"]
            match.status = data.get("status", match.status).lower()

    def _upsert_odds_from_api(self, session: Session, event: dict) -> int:
        bookmakers = event.get("bookmakers", [])
        if not bookmakers:
            return 0

        home_name = event.get("home_team", "")
        away_name = event.get("away_team", "")
        home_team = self._get_or_create_team(session, home_name)
        away_team = self._get_or_create_team(session, away_name)

        match = session.execute(
            select(Match).where(
                Match.home_team_id == home_team.id,
                Match.away_team_id == away_team.id,
                Match.status != "finished",
            )
        ).scalar_one_or_none()

        if not match:
            return 0

        count = 0
        for bookie in bookmakers:
            odds_record = self._parse_bookmaker_odds(match.id, bookie)
            if odds_record:
                session.add(odds_record)
                count += 1
        return count

    def _parse_bookmaker_odds(self, match_id: int, bookie: dict) -> Odds | None:
        name = bookie.get("key", "unknown")
        markets = {m["key"]: m for m in bookie.get("markets", [])}

        odds = Odds(match_id=match_id, bookmaker=name, market="composite")

        h2h = markets.get("h2h", {})
        if h2h:
            outcomes = {o["name"]: o["price"] for o in h2h.get("outcomes", [])}
            odds.home_current = outcomes.get("Home Team") or outcomes.get(list(outcomes.keys())[0] if outcomes else "")
            odds.draw_current = outcomes.get("Draw")
            odds.away_current = outcomes.get("Away Team") or outcomes.get(list(outcomes.keys())[-1] if outcomes else "")

        totals = markets.get("totals", {})
        if totals:
            for o in totals.get("outcomes", []):
                if o.get("name") == "Over" and o.get("point", 0) == 2.5:
                    odds.over_25_current = o["price"]
                elif o.get("name") == "Under" and o.get("point", 0) == 2.5:
                    odds.under_25_current = o["price"]

        spreads = markets.get("spreads", {})
        if spreads:
            for o in spreads.get("outcomes", []):
                if "point" in o:
                    odds.asian_handicap_line = o["point"]
                    odds.asian_handicap_home = o["price"]
                    break

        return odds

    @staticmethod
    def _compute_importance(competition_name: str, stage: str) -> float:
        base = {
            "FIFA World Cup": 4.0,
            "UEFA Euro": 3.5,
            "Copa America": 3.0,
            "Africa Cup of Nations": 2.5,
            "FIFA World Cup Qualification": 2.5,
            "UEFA Nations League": 2.0,
        }.get(competition_name, 1.0)

        stage_mult = {
            "FINAL": 2.0,
            "SEMI_FINALS": 1.7,
            "QUARTER_FINALS": 1.5,
            "ROUND_OF_16": 1.3,
            "THIRD_PLACE": 1.1,
        }.get(stage, 1.0)

        return base * stage_mult
