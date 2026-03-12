"""Master feature builder that orchestrates all feature modules."""

from __future__ import annotations

import pandas as pd
import numpy as np

from backend.features.elo import EloSystem
from backend.features.rolling import compute_team_rolling_stats
from backend.features.strength import compute_strength_features, compute_head_to_head
from backend.features.venue import compute_rest_days, compute_travel_distance


class FeatureBuilder:
    """Builds the complete feature matrix for model training and prediction.

    Pipeline order matters -- Elo must run first (chronological), then
    rolling stats, then strength, head-to-head, and venue features.
    """

    FEATURE_COLUMNS = [
        "home_elo_pre", "away_elo_pre", "elo_diff",
        "home_attack_strength", "away_attack_strength",
        "home_defense_strength", "away_defense_strength",
        "team_strength_diff", "attack_strength_diff", "defense_strength_diff",
        "home_form_5", "away_form_5", "home_form_10", "away_form_10",
        "home_win_pct_5", "away_win_pct_5",
        "home_goals_scored_roll_5", "away_goals_scored_roll_5",
        "home_goals_conceded_roll_5", "away_goals_conceded_roll_5",
        "home_goals_scored_roll_10", "away_goals_scored_roll_10",
        "home_xg_roll_5", "away_xg_roll_5",
        "home_xga_roll_5", "away_xga_roll_5",
        "home_shots_on_target_roll_5", "away_shots_on_target_roll_5",
        "home_possession_roll_5", "away_possession_roll_5",
        "h2h_home_win_pct", "h2h_draw_pct", "h2h_avg_goals",
        "home_rest_days", "away_rest_days", "rest_diff",
        "is_neutral_venue", "is_knockout", "importance",
    ]

    TARGET_1X2 = "result"
    TARGET_OVER25 = "over_25"
    TARGET_BTTS = "btts"

    def __init__(self):
        self.elo_system = EloSystem()

    def build(self, df: pd.DataFrame, team_countries: dict[int, str] | None = None) -> pd.DataFrame:
        if df.empty:
            return df

        df = self.elo_system.compute_ratings_for_df(df)
        df = compute_team_rolling_stats(df, windows=[5, 10])
        df = compute_strength_features(df)
        df = compute_head_to_head(df)
        df = compute_rest_days(df)
        df = compute_travel_distance(df, team_countries)

        return df

    def get_training_data(
        self, df: pd.DataFrame, target: str = "result"
    ) -> tuple[pd.DataFrame, pd.Series]:
        finished = df[df["status"] == "finished"].copy()
        available_features = [c for c in self.FEATURE_COLUMNS if c in finished.columns]
        X = finished[available_features].copy()

        for col in X.select_dtypes(include=["bool"]).columns:
            X[col] = X[col].astype(int)

        X = X.fillna(X.median())
        y = finished[target]

        return X, y

    def get_prediction_features(self, df: pd.DataFrame) -> pd.DataFrame:
        available_features = [c for c in self.FEATURE_COLUMNS if c in df.columns]
        X = df[available_features].copy()
        for col in X.select_dtypes(include=["bool"]).columns:
            X[col] = X[col].astype(int)
        X = X.fillna(X.median())
        return X
