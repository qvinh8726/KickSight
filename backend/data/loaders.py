"""Load data from CSV and JSON files into the database."""

from __future__ import annotations

from pathlib import Path
from datetime import date

import pandas as pd
import structlog
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.database import SyncSession
from backend.models.team import Team
from backend.models.match import Match
from backend.models.odds import Odds

logger = structlog.get_logger()


class CSVLoader:
    """Loads match data from CSV files.

    Expected columns: date, home_team, away_team, home_goals, away_goals,
    competition, and optional stats columns.
    """

    COLUMN_MAP = {
        "date": "match_date",
        "home_team": "home_team",
        "away_team": "away_team",
        "home_score": "home_goals",
        "away_score": "away_goals",
        "home_goals": "home_goals",
        "away_goals": "away_goals",
        "tournament": "competition",
        "competition": "competition",
    }

    def load(self, filepath: str | Path) -> int:
        df = pd.read_csv(filepath)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        df = df.rename(columns=self.COLUMN_MAP)

        required = {"match_date", "home_team", "away_team"}
        if not required.issubset(set(df.columns)):
            missing = required - set(df.columns)
            raise ValueError(f"Missing required columns: {missing}")

        count = 0
        with SyncSession() as session:
            for _, row in df.iterrows():
                try:
                    count += self._insert_row(session, row)
                except Exception as e:
                    logger.warning("csv_row_error", error=str(e))
            session.commit()

        logger.info("csv_loaded", filepath=str(filepath), rows=count)
        return count

    def _insert_row(self, session: Session, row: pd.Series) -> int:
        home = self._get_or_create_team(session, str(row["home_team"]))
        away = self._get_or_create_team(session, str(row["away_team"]))

        match_date = pd.to_datetime(row["match_date"]).date()
        existing = session.execute(
            select(Match).where(
                Match.home_team_id == home.id,
                Match.away_team_id == away.id,
                Match.match_date == match_date,
            )
        ).scalar_one_or_none()

        if existing:
            return 0

        match = Match(
            home_team_id=home.id,
            away_team_id=away.id,
            match_date=match_date,
            competition=str(row.get("competition", "Unknown")),
            home_goals=self._safe_int(row.get("home_goals")),
            away_goals=self._safe_int(row.get("away_goals")),
            home_xg=self._safe_float(row.get("home_xg")),
            away_xg=self._safe_float(row.get("away_xg")),
            home_shots=self._safe_int(row.get("home_shots")),
            away_shots=self._safe_int(row.get("away_shots")),
            home_shots_on_target=self._safe_int(row.get("home_shots_on_target")),
            away_shots_on_target=self._safe_int(row.get("away_shots_on_target")),
            home_possession=self._safe_float(row.get("home_possession")),
            away_possession=self._safe_float(row.get("away_possession")),
            home_corners=self._safe_int(row.get("home_corners")),
            away_corners=self._safe_int(row.get("away_corners")),
            home_yellow_cards=self._safe_int(row.get("home_yellow_cards")),
            away_yellow_cards=self._safe_int(row.get("away_yellow_cards")),
            is_neutral_venue=bool(row.get("neutral", False)),
            status="finished" if self._safe_int(row.get("home_goals")) is not None else "scheduled",
        )
        session.add(match)
        return 1

    def _get_or_create_team(self, session: Session, name: str) -> Team:
        team = session.execute(select(Team).where(Team.name == name)).scalar_one_or_none()
        if not team:
            team = Team(name=name)
            session.add(team)
            session.flush()
        return team

    @staticmethod
    def _safe_int(val) -> int | None:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return None
        return int(val)

    @staticmethod
    def _safe_float(val) -> float | None:
        if val is None or (isinstance(val, float) and pd.isna(val)):
            return None
        return float(val)


class JSONLoader:
    """Loads match data from JSON files (list of match objects)."""

    def load(self, filepath: str | Path) -> int:
        df = pd.read_json(filepath)
        csv_loader = CSVLoader()
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        df = df.rename(columns=CSVLoader.COLUMN_MAP)

        count = 0
        with SyncSession() as session:
            for _, row in df.iterrows():
                try:
                    count += csv_loader._insert_row(session, row)
                except Exception as e:
                    logger.warning("json_row_error", error=str(e))
            session.commit()

        logger.info("json_loaded", filepath=str(filepath), rows=count)
        return count
