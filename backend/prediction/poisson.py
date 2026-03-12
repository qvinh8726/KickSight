"""Poisson regression goal model for match outcome prediction."""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import poisson
from scipy.optimize import minimize
from dataclasses import dataclass


@dataclass
class PoissonPrediction:
    home_lambda: float
    away_lambda: float
    prob_home: float
    prob_draw: float
    prob_away: float
    prob_over_25: float
    prob_under_25: float
    prob_btts_yes: float
    prob_btts_no: float
    projected_home_goals: float
    projected_away_goals: float
    scoreline_probs: dict[tuple[int, int], float]


class PoissonGoalModel:
    """Dixon-Coles inspired Poisson model for international football.

    Estimates team attack/defense parameters and uses them to generate
    goal expectancy, which feeds a bivariate Poisson distribution for
    match outcome probabilities.
    """

    MAX_GOALS = 8

    def __init__(self):
        self.attack: dict[int, float] = {}
        self.defense: dict[int, float] = {}
        self.home_advantage: float = 0.0
        self.rho: float = 0.0
        self.fitted = False

    def fit(self, df: pd.DataFrame) -> None:
        finished = df[(df["status"] == "finished") & df["home_goals"].notna()].copy()
        if finished.empty:
            return

        teams = set(finished["home_team_id"].unique()) | set(finished["away_team_id"].unique())
        team_idx = {t: i for i, t in enumerate(sorted(teams))}
        n_teams = len(teams)

        home_goals = finished["home_goals"].values.astype(float)
        away_goals = finished["away_goals"].values.astype(float)
        home_ids = finished["home_team_id"].map(team_idx).values
        away_ids = finished["away_team_id"].map(team_idx).values
        weights = finished.get("importance", pd.Series(np.ones(len(finished)))).values

        date_range = (finished["match_date"].max() - finished["match_date"]).dt.days
        time_decay = np.exp(-date_range.values / 365.0)
        weights = weights * time_decay

        n_params = 2 * n_teams + 2
        x0 = np.zeros(n_params)
        x0[:n_teams] = 0.0
        x0[n_teams:2*n_teams] = 0.0
        x0[-2] = 0.25
        x0[-1] = -0.05

        def neg_log_likelihood(params):
            att = params[:n_teams]
            defe = params[n_teams:2*n_teams]
            home_adv = params[-2]
            rho = params[-1]

            lambda_home = np.exp(att[home_ids] - defe[away_ids] + home_adv)
            lambda_away = np.exp(att[away_ids] - defe[home_ids])

            lambda_home = np.clip(lambda_home, 0.01, 10.0)
            lambda_away = np.clip(lambda_away, 0.01, 10.0)

            log_lik = (
                poisson.logpmf(home_goals, lambda_home)
                + poisson.logpmf(away_goals, lambda_away)
            )

            dc_adj = np.ones_like(log_lik)
            both_zero = (home_goals == 0) & (away_goals == 0)
            h1_a0 = (home_goals == 1) & (away_goals == 0)
            h0_a1 = (home_goals == 0) & (away_goals == 1)
            h1_a1 = (home_goals == 1) & (away_goals == 1)

            dc_adj[both_zero] = 1 - lambda_home[both_zero] * lambda_away[both_zero] * rho
            dc_adj[h1_a0] = 1 + lambda_away[h1_a0] * rho
            dc_adj[h0_a1] = 1 + lambda_home[h0_a1] * rho
            dc_adj[h1_a1] = 1 - rho

            dc_adj = np.clip(dc_adj, 1e-10, None)
            log_lik += np.log(dc_adj)

            constraint = 0.001 * np.sum(att ** 2)
            return -np.sum(weights * log_lik) + constraint

        result = minimize(neg_log_likelihood, x0, method="L-BFGS-B", options={"maxiter": 500})

        params = result.x
        idx_to_team = {i: t for t, i in team_idx.items()}

        for i in range(n_teams):
            tid = idx_to_team[i]
            self.attack[tid] = params[i]
            self.defense[tid] = params[n_teams + i]

        self.home_advantage = params[-2]
        self.rho = params[-1]
        self.fitted = True

    def predict(
        self,
        home_team_id: int,
        away_team_id: int,
        is_neutral: bool = False,
    ) -> PoissonPrediction:
        att_h = self.attack.get(home_team_id, 0.0)
        def_h = self.defense.get(home_team_id, 0.0)
        att_a = self.attack.get(away_team_id, 0.0)
        def_a = self.defense.get(away_team_id, 0.0)

        ha = 0.0 if is_neutral else self.home_advantage
        lambda_home = np.exp(att_h - def_a + ha)
        lambda_away = np.exp(att_a - def_h)

        lambda_home = np.clip(lambda_home, 0.1, 8.0)
        lambda_away = np.clip(lambda_away, 0.1, 8.0)

        scoreline_probs = {}
        for i in range(self.MAX_GOALS + 1):
            for j in range(self.MAX_GOALS + 1):
                p = poisson.pmf(i, lambda_home) * poisson.pmf(j, lambda_away)
                scoreline_probs[(i, j)] = p

        self._apply_dc_correction(scoreline_probs, lambda_home, lambda_away)

        total = sum(scoreline_probs.values())
        scoreline_probs = {k: v / total for k, v in scoreline_probs.items()}

        prob_home = sum(p for (h, a), p in scoreline_probs.items() if h > a)
        prob_draw = sum(p for (h, a), p in scoreline_probs.items() if h == a)
        prob_away = sum(p for (h, a), p in scoreline_probs.items() if h < a)

        prob_over_25 = sum(p for (h, a), p in scoreline_probs.items() if h + a > 2)
        prob_under_25 = 1.0 - prob_over_25

        prob_btts_yes = sum(p for (h, a), p in scoreline_probs.items() if h > 0 and a > 0)
        prob_btts_no = 1.0 - prob_btts_yes

        return PoissonPrediction(
            home_lambda=lambda_home,
            away_lambda=lambda_away,
            prob_home=prob_home,
            prob_draw=prob_draw,
            prob_away=prob_away,
            prob_over_25=prob_over_25,
            prob_under_25=prob_under_25,
            prob_btts_yes=prob_btts_yes,
            prob_btts_no=prob_btts_no,
            projected_home_goals=round(lambda_home, 2),
            projected_away_goals=round(lambda_away, 2),
            scoreline_probs=scoreline_probs,
        )

    def _apply_dc_correction(
        self,
        probs: dict[tuple[int, int], float],
        lam_h: float,
        lam_a: float,
    ) -> None:
        rho = self.rho
        if (0, 0) in probs:
            probs[(0, 0)] *= max(1 - lam_h * lam_a * rho, 0.001)
        if (1, 0) in probs:
            probs[(1, 0)] *= max(1 + lam_a * rho, 0.001)
        if (0, 1) in probs:
            probs[(0, 1)] *= max(1 + lam_h * rho, 0.001)
        if (1, 1) in probs:
            probs[(1, 1)] *= max(1 - rho, 0.001)

    def most_likely_scoreline(self, pred: PoissonPrediction, top_n: int = 5) -> list[tuple[str, float]]:
        sorted_scores = sorted(pred.scoreline_probs.items(), key=lambda x: x[1], reverse=True)
        return [(f"{h}-{a}", round(p * 100, 1)) for (h, a), p in sorted_scores[:top_n]]
