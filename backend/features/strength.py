"""Team strength, attack, and defense metrics."""

from __future__ import annotations

import pandas as pd
import numpy as np


def compute_strength_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute attack/defense strength relative to league average.

    Uses average goals scored and conceded across all teams as baseline,
    then computes each team's attack and defense strength ratios.
    """
    if df.empty:
        return df

    finished = df[df["status"] == "finished"].copy()
    if finished.empty:
        return df

    avg_home_goals = finished["home_goals"].mean()
    avg_away_goals = finished["away_goals"].mean()

    if avg_home_goals == 0:
        avg_home_goals = 1.0
    if avg_away_goals == 0:
        avg_away_goals = 1.0

    team_stats = {}
    for side, opp in [("home", "away"), ("away", "home")]:
        for team_id in finished[f"{side}_team_id"].unique():
            team_matches = finished[finished[f"{side}_team_id"] == team_id]
            if team_id not in team_stats:
                team_stats[team_id] = {"goals_for": [], "goals_against": []}
            team_stats[team_id]["goals_for"].extend(team_matches[f"{side}_goals"].tolist())
            team_stats[team_id]["goals_against"].extend(team_matches[f"{opp}_goals"].tolist())

    strength_map = {}
    for team_id, stats in team_stats.items():
        n = len(stats["goals_for"])
        if n == 0:
            continue
        avg_scored = np.mean(stats["goals_for"])
        avg_conceded = np.mean(stats["goals_against"])
        overall_avg = (avg_home_goals + avg_away_goals) / 2

        attack_strength = avg_scored / overall_avg if overall_avg > 0 else 1.0
        defense_strength = avg_conceded / overall_avg if overall_avg > 0 else 1.0
        team_strength = attack_strength - defense_strength

        strength_map[team_id] = {
            "attack_strength": attack_strength,
            "defense_strength": defense_strength,
            "team_strength": team_strength,
            "avg_goals_scored": avg_scored,
            "avg_goals_conceded": avg_conceded,
            "matches_played": n,
        }

    for prefix in ["home", "away"]:
        team_col = f"{prefix}_team_id"
        for feat in ["attack_strength", "defense_strength", "team_strength"]:
            df[f"{prefix}_{feat}"] = df[team_col].map(
                lambda tid: strength_map.get(tid, {}).get(feat, 1.0)
            )

    df["attack_strength_diff"] = df["home_attack_strength"] - df["away_attack_strength"]
    df["defense_strength_diff"] = df["home_defense_strength"] - df["away_defense_strength"]
    df["team_strength_diff"] = df["home_team_strength"] - df["away_team_strength"]

    return df


def compute_head_to_head(df: pd.DataFrame, n_recent: int = 10) -> pd.DataFrame:
    """Add head-to-head record features for each match."""
    df = df.sort_values("match_date").copy()

    h2h_home_wins = []
    h2h_draws = []
    h2h_away_wins = []
    h2h_avg_goals = []

    finished = df[df["status"] == "finished"]

    for idx, row in df.iterrows():
        h_id, a_id = row["home_team_id"], row["away_team_id"]
        prior = finished[
            (finished["match_date"] < row["match_date"])
            & (
                ((finished["home_team_id"] == h_id) & (finished["away_team_id"] == a_id))
                | ((finished["home_team_id"] == a_id) & (finished["away_team_id"] == h_id))
            )
        ].tail(n_recent)

        if prior.empty:
            h2h_home_wins.append(0.0)
            h2h_draws.append(0.0)
            h2h_away_wins.append(0.0)
            h2h_avg_goals.append(np.nan)
            continue

        n = len(prior)
        wins = 0
        draws = 0
        total_goals = 0

        for _, p in prior.iterrows():
            if p["home_team_id"] == h_id:
                if p["home_goals"] > p["away_goals"]:
                    wins += 1
                elif p["home_goals"] == p["away_goals"]:
                    draws += 1
            else:
                if p["away_goals"] > p["home_goals"]:
                    wins += 1
                elif p["away_goals"] == p["home_goals"]:
                    draws += 1
            total_goals += p["home_goals"] + p["away_goals"]

        h2h_home_wins.append(wins / n)
        h2h_draws.append(draws / n)
        h2h_away_wins.append((n - wins - draws) / n)
        h2h_avg_goals.append(total_goals / n)

    df["h2h_home_win_pct"] = h2h_home_wins
    df["h2h_draw_pct"] = h2h_draws
    df["h2h_away_win_pct"] = h2h_away_wins
    df["h2h_avg_goals"] = h2h_avg_goals
    return df
