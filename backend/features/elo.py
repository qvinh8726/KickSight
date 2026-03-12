"""International Elo rating system for national teams."""

from __future__ import annotations

import pandas as pd
import numpy as np


class EloSystem:
    """Computes and updates Elo ratings for teams across match history.

    Uses the World Football Elo methodology with tournament importance weighting,
    goal difference scaling, and home advantage adjustment.
    """

    K_BASE = 40
    HOME_ADVANTAGE = 100
    NEUTRAL_ADVANTAGE = 0

    def __init__(self, initial_rating: float = 1500.0):
        self.initial_rating = initial_rating
        self.ratings: dict[int, float] = {}

    def get_rating(self, team_id: int) -> float:
        return self.ratings.get(team_id, self.initial_rating)

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))

    def goal_diff_multiplier(self, goal_diff: int) -> float:
        n = abs(goal_diff)
        if n <= 1:
            return 1.0
        elif n == 2:
            return 1.5
        else:
            return (11.0 + n) / 8.0

    def update(
        self,
        home_id: int,
        away_id: int,
        home_goals: int,
        away_goals: int,
        importance: float = 1.0,
        is_neutral: bool = False,
    ) -> tuple[float, float]:
        home_rating = self.get_rating(home_id)
        away_rating = self.get_rating(away_id)

        advantage = self.NEUTRAL_ADVANTAGE if is_neutral else self.HOME_ADVANTAGE
        home_expected = self.expected_score(home_rating + advantage, away_rating)
        away_expected = 1.0 - home_expected

        if home_goals > away_goals:
            home_actual, away_actual = 1.0, 0.0
        elif home_goals < away_goals:
            home_actual, away_actual = 0.0, 1.0
        else:
            home_actual, away_actual = 0.5, 0.5

        gd_mult = self.goal_diff_multiplier(home_goals - away_goals)
        k = self.K_BASE * importance * gd_mult

        home_new = home_rating + k * (home_actual - home_expected)
        away_new = away_rating + k * (away_actual - away_expected)

        self.ratings[home_id] = home_new
        self.ratings[away_id] = away_new

        return home_new, away_new

    def compute_ratings_for_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """Process a chronologically sorted DataFrame and add Elo columns."""
        df = df.sort_values("match_date").copy()
        home_elo_pre, away_elo_pre = [], []
        home_elo_post, away_elo_post = [], []
        elo_diff = []

        for _, row in df.iterrows():
            h_id = row["home_team_id"]
            a_id = row["away_team_id"]
            h_pre = self.get_rating(h_id)
            a_pre = self.get_rating(a_id)
            home_elo_pre.append(h_pre)
            away_elo_pre.append(a_pre)
            elo_diff.append(h_pre - a_pre)

            if pd.notna(row.get("home_goals")) and pd.notna(row.get("away_goals")):
                h_post, a_post = self.update(
                    h_id, a_id,
                    int(row["home_goals"]),
                    int(row["away_goals"]),
                    importance=row.get("importance", 1.0),
                    is_neutral=bool(row.get("is_neutral_venue", False)),
                )
            else:
                h_post, a_post = h_pre, a_pre

            home_elo_post.append(h_post)
            away_elo_post.append(a_post)

        df["home_elo_pre"] = home_elo_pre
        df["away_elo_pre"] = away_elo_pre
        df["home_elo_post"] = home_elo_post
        df["away_elo_post"] = away_elo_post
        df["elo_diff"] = elo_diff
        return df
