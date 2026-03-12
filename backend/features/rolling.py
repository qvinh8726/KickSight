"""Rolling statistics computed per-team over recent match windows."""

from __future__ import annotations

import pandas as pd
import numpy as np


def compute_team_rolling_stats(df: pd.DataFrame, windows: list[int] = None) -> pd.DataFrame:
    """Add rolling average features for each team's recent matches.

    For each match, we look back at the team's last N matches and compute
    rolling averages for goals, xG, shots, possession, etc.
    """
    if windows is None:
        windows = [5, 10]

    df = df.sort_values("match_date").copy()

    stat_cols = [
        "goals_scored", "goals_conceded", "xg", "xga",
        "shots", "shots_on_target", "possession", "corners",
        "yellow_cards", "red_cards",
    ]

    home_records = _build_team_records(df, side="home")
    away_records = _build_team_records(df, side="away")
    all_records = pd.concat([home_records, away_records]).sort_values(["team_id", "match_date"])

    rolling_feats = {}
    for team_id, team_df in all_records.groupby("team_id"):
        for w in windows:
            for col in stat_cols:
                if col in team_df.columns:
                    rolled = team_df[col].rolling(w, min_periods=1).mean()
                    for idx, val in zip(team_df["match_id"], rolled):
                        key = (idx, team_id)
                        if key not in rolling_feats:
                            rolling_feats[key] = {}
                        rolling_feats[key][f"{col}_roll_{w}"] = val

        win_series = (team_df["result_points"] == 3).astype(float)
        unbeaten_series = (team_df["result_points"] >= 1).astype(float)
        for w in windows:
            form = team_df["result_points"].rolling(w, min_periods=1).mean()
            win_pct = win_series.rolling(w, min_periods=1).mean()
            unbeaten_pct = unbeaten_series.rolling(w, min_periods=1).mean()
            for idx, f_val, w_val, u_val in zip(team_df["match_id"], form, win_pct, unbeaten_pct):
                key = (idx, team_id)
                rolling_feats[key][f"form_{w}"] = f_val
                rolling_feats[key][f"win_pct_{w}"] = w_val
                rolling_feats[key][f"unbeaten_pct_{w}"] = u_val

    for w in windows:
        for prefix in ["home", "away"]:
            team_col = f"{prefix}_team_id"
            for col in stat_cols:
                feat_name = f"{prefix}_{col}_roll_{w}"
                df[feat_name] = df.apply(
                    lambda row: rolling_feats.get(
                        (row["match_id"], row[team_col]), {}
                    ).get(f"{col}_roll_{w}", np.nan),
                    axis=1,
                )
            df[f"{prefix}_form_{w}"] = df.apply(
                lambda row: rolling_feats.get(
                    (row["match_id"], row[team_col]), {}
                ).get(f"form_{w}", np.nan),
                axis=1,
            )
            df[f"{prefix}_win_pct_{w}"] = df.apply(
                lambda row: rolling_feats.get(
                    (row["match_id"], row[team_col]), {}
                ).get(f"win_pct_{w}", np.nan),
                axis=1,
            )

    return df


def _build_team_records(df: pd.DataFrame, side: str) -> pd.DataFrame:
    prefix = side
    opp = "away" if side == "home" else "home"

    records = pd.DataFrame({
        "match_id": df["match_id"],
        "match_date": df["match_date"],
        "team_id": df[f"{prefix}_team_id"],
        "goals_scored": df.get(f"{prefix}_goals", pd.Series(dtype=float)),
        "goals_conceded": df.get(f"{opp}_goals", pd.Series(dtype=float)),
        "xg": df.get(f"{prefix}_xg", pd.Series(dtype=float)),
        "xga": df.get(f"{opp}_xg", pd.Series(dtype=float)),
        "shots": df.get(f"{prefix}_shots", pd.Series(dtype=float)),
        "shots_on_target": df.get(f"{prefix}_shots_on_target", pd.Series(dtype=float)),
        "possession": df.get(f"{prefix}_possession", pd.Series(dtype=float)),
        "corners": df.get(f"{prefix}_corners", pd.Series(dtype=float)),
        "yellow_cards": df.get(f"{prefix}_yellow_cards", pd.Series(dtype=float)),
        "red_cards": df.get(f"{prefix}_red_cards", pd.Series(dtype=float)),
    })

    goal_diff = records["goals_scored"] - records["goals_conceded"]
    records["result_points"] = np.where(goal_diff > 0, 3, np.where(goal_diff == 0, 1, 0))
    return records
