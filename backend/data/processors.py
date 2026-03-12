"""Cleans and normalizes raw data into analysis-ready DataFrames."""

from __future__ import annotations

import pandas as pd
import numpy as np
from sqlalchemy import select, text
from backend.database import SyncSession
from backend.models.match import Match
from backend.models.team import Team
from backend.models.odds import Odds


class DataProcessor:
    """Loads raw DB data and produces clean DataFrames for modeling."""

    def load_matches_df(self, competition: str | None = None, min_date: str | None = None) -> pd.DataFrame:
        with SyncSession() as session:
            query = select(Match)
            if competition:
                query = query.where(Match.competition == competition)
            if min_date:
                query = query.where(Match.match_date >= min_date)
            query = query.order_by(Match.match_date)
            results = session.execute(query).scalars().all()

        rows = []
        for m in results:
            rows.append({
                "match_id": m.id,
                "match_date": m.match_date,
                "home_team_id": m.home_team_id,
                "away_team_id": m.away_team_id,
                "home_goals": m.home_goals,
                "away_goals": m.away_goals,
                "home_xg": m.home_xg,
                "away_xg": m.away_xg,
                "home_shots": m.home_shots,
                "away_shots": m.away_shots,
                "home_shots_on_target": m.home_shots_on_target,
                "away_shots_on_target": m.away_shots_on_target,
                "home_possession": m.home_possession,
                "away_possession": m.away_possession,
                "home_corners": m.home_corners,
                "away_corners": m.away_corners,
                "home_yellow_cards": m.home_yellow_cards,
                "away_yellow_cards": m.away_yellow_cards,
                "home_red_cards": m.home_red_cards,
                "away_red_cards": m.away_red_cards,
                "home_elo_pre": m.home_elo_pre,
                "away_elo_pre": m.away_elo_pre,
                "competition": m.competition,
                "competition_stage": m.competition_stage,
                "is_neutral_venue": m.is_neutral_venue,
                "is_knockout": m.is_knockout,
                "importance": m.importance,
                "status": m.status,
            })
        df = pd.DataFrame(rows)
        if df.empty:
            return df

        df["match_date"] = pd.to_datetime(df["match_date"])
        df["result"] = np.where(
            df["home_goals"] > df["away_goals"], "H",
            np.where(df["home_goals"] < df["away_goals"], "A", "D"),
        )
        df["total_goals"] = df["home_goals"] + df["away_goals"]
        df["btts"] = ((df["home_goals"] > 0) & (df["away_goals"] > 0)).astype(int)
        df["over_25"] = (df["total_goals"] > 2.5).astype(int)
        return df

    def load_odds_df(self) -> pd.DataFrame:
        with SyncSession() as session:
            results = session.execute(select(Odds)).scalars().all()

        rows = []
        for o in results:
            rows.append({
                "odds_id": o.id,
                "match_id": o.match_id,
                "bookmaker": o.bookmaker,
                "home_open": o.home_open,
                "draw_open": o.draw_open,
                "away_open": o.away_open,
                "home_current": o.home_current,
                "draw_current": o.draw_current,
                "away_current": o.away_current,
                "home_close": o.home_close,
                "draw_close": o.draw_close,
                "away_close": o.away_close,
                "over_25_current": o.over_25_current,
                "under_25_current": o.under_25_current,
                "btts_yes_current": o.btts_yes_current,
                "btts_no_current": o.btts_no_current,
                "asian_handicap_line": o.asian_handicap_line,
                "asian_handicap_home": o.asian_handicap_home,
                "asian_handicap_away": o.asian_handicap_away,
            })
        return pd.DataFrame(rows)

    def load_teams_df(self) -> pd.DataFrame:
        with SyncSession() as session:
            results = session.execute(select(Team)).scalars().all()
        rows = []
        for t in results:
            rows.append({
                "team_id": t.id,
                "name": t.name,
                "country_code": t.country_code,
                "confederation": t.confederation,
                "fifa_ranking": t.fifa_ranking,
                "elo_rating": t.elo_rating,
                "squad_value": t.squad_value,
            })
        return pd.DataFrame(rows)

    def merge_match_odds(self, matches_df: pd.DataFrame, odds_df: pd.DataFrame) -> pd.DataFrame:
        if odds_df.empty:
            return matches_df

        avg_odds = (
            odds_df.groupby("match_id")
            .agg({
                "home_current": "mean",
                "draw_current": "mean",
                "away_current": "mean",
                "over_25_current": "mean",
                "under_25_current": "mean",
            })
            .reset_index()
        )
        return matches_df.merge(avg_odds, on="match_id", how="left")
