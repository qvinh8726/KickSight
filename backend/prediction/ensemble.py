"""Ensemble prediction combining multiple model outputs."""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass

from backend.prediction.poisson import PoissonGoalModel, PoissonPrediction
from backend.prediction.logistic import LogisticBaseline
from backend.prediction.xgboost_model import XGBoostPredictor
from backend.prediction.lightgbm_model import LightGBMPredictor
from backend.features.builder import FeatureBuilder


@dataclass
class MatchPrediction:
    match_id: int
    home_team_id: int
    away_team_id: int

    prob_home: float
    prob_draw: float
    prob_away: float
    prob_over_25: float
    prob_under_25: float
    prob_btts_yes: float
    prob_btts_no: float

    projected_home_goals: float
    projected_away_goals: float
    projected_scoreline: str
    asian_handicap_lean: str

    model_breakdown: dict
    confidence: float


class EnsemblePredictor:
    """Weighted ensemble combining Poisson, Logistic, XGBoost, and LightGBM.

    Weights can be tuned based on historical validation performance.
    The ensemble normalizes probabilities to sum to 1.0.
    """

    DEFAULT_WEIGHTS = {
        "poisson": 0.20,
        "logistic": 0.15,
        "xgboost": 0.40,
        "lightgbm": 0.25,
    }

    def __init__(
        self,
        weights: dict[str, float] | None = None,
        use_lightgbm: bool = True,
    ):
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self.poisson = PoissonGoalModel()
        self.logistic = LogisticBaseline()
        self.xgboost = XGBoostPredictor()
        self.lightgbm = LightGBMPredictor() if use_lightgbm else None
        self.feature_builder = FeatureBuilder()
        self.fitted = False

        if not use_lightgbm and "lightgbm" in self.weights:
            lgbm_weight = self.weights.pop("lightgbm")
            remaining = sum(self.weights.values())
            if remaining > 0:
                for k in self.weights:
                    self.weights[k] *= (1.0 + lgbm_weight / remaining)

    def fit(self, df: pd.DataFrame) -> dict:
        df = self.feature_builder.build(df)
        X, y_1x2 = self.feature_builder.get_training_data(df, target="result")

        finished = df[df["status"] == "finished"]
        y_ou25 = finished["over_25"] if "over_25" in finished.columns else None
        y_btts = finished["btts"] if "btts" in finished.columns else None

        if y_ou25 is not None:
            y_ou25 = y_ou25.loc[X.index]
        if y_btts is not None:
            y_btts = y_btts.loc[X.index]

        metrics = {}

        self.poisson.fit(df)
        metrics["poisson"] = {"status": "fitted"}

        lr_metrics = self.logistic.fit(X, y_1x2)
        metrics["logistic"] = lr_metrics

        xgb_metrics = self.xgboost.fit(X, y_1x2, y_ou25, y_btts)
        metrics["xgboost"] = xgb_metrics

        if self.lightgbm:
            lgbm_metrics = self.lightgbm.fit(X, y_1x2, y_ou25, y_btts)
            metrics["lightgbm"] = lgbm_metrics

        self.fitted = True
        return metrics

    def predict(self, df: pd.DataFrame) -> list[MatchPrediction]:
        if not self.fitted:
            raise RuntimeError("Ensemble not fitted. Call fit() first.")

        df = self.feature_builder.build(df)
        X = self.feature_builder.get_prediction_features(df)

        predictions = []
        for idx, row in df.iterrows():
            if idx not in X.index:
                continue

            model_probs = {}
            x_single = X.loc[[idx]]

            poisson_pred = self.poisson.predict(
                row["home_team_id"], row["away_team_id"],
                is_neutral=bool(row.get("is_neutral_venue", False)),
            )
            model_probs["poisson"] = {
                "prob_home": poisson_pred.prob_home,
                "prob_draw": poisson_pred.prob_draw,
                "prob_away": poisson_pred.prob_away,
                "prob_over_25": poisson_pred.prob_over_25,
                "prob_btts_yes": poisson_pred.prob_btts_yes,
            }

            lr_probs = self.logistic.predict_proba(x_single).iloc[0]
            model_probs["logistic"] = {
                "prob_home": lr_probs["prob_home"],
                "prob_draw": lr_probs["prob_draw"],
                "prob_away": lr_probs["prob_away"],
            }

            xgb_probs = self.xgboost.predict_proba(x_single).iloc[0]
            model_probs["xgboost"] = xgb_probs.to_dict()

            if self.lightgbm:
                lgbm_probs = self.lightgbm.predict_proba(x_single).iloc[0]
                model_probs["lightgbm"] = lgbm_probs.to_dict()

            ensemble = self._weighted_average(model_probs)
            confidence = self._compute_confidence(model_probs)

            proj_h = poisson_pred.projected_home_goals
            proj_a = poisson_pred.projected_away_goals
            scoreline = f"{round(proj_h)}-{round(proj_a)}"

            ah_lean = "home" if ensemble["prob_home"] > ensemble["prob_away"] else "away"
            if abs(ensemble["prob_home"] - ensemble["prob_away"]) < 0.08:
                ah_lean = "neutral"

            predictions.append(MatchPrediction(
                match_id=row.get("match_id", 0),
                home_team_id=row["home_team_id"],
                away_team_id=row["away_team_id"],
                prob_home=ensemble["prob_home"],
                prob_draw=ensemble["prob_draw"],
                prob_away=ensemble["prob_away"],
                prob_over_25=ensemble.get("prob_over_25", 0.5),
                prob_under_25=ensemble.get("prob_under_25", 0.5),
                prob_btts_yes=ensemble.get("prob_btts_yes", 0.5),
                prob_btts_no=ensemble.get("prob_btts_no", 0.5),
                projected_home_goals=proj_h,
                projected_away_goals=proj_a,
                projected_scoreline=scoreline,
                asian_handicap_lean=ah_lean,
                model_breakdown=model_probs,
                confidence=confidence,
            ))

        return predictions

    def _weighted_average(self, model_probs: dict) -> dict:
        markets = ["prob_home", "prob_draw", "prob_away", "prob_over_25", "prob_under_25", "prob_btts_yes", "prob_btts_no"]
        ensemble = {}

        for market in markets:
            weighted_sum = 0.0
            total_weight = 0.0
            for model_name, probs in model_probs.items():
                if market in probs:
                    w = self.weights.get(model_name, 0.0)
                    weighted_sum += probs[market] * w
                    total_weight += w
            if total_weight > 0:
                ensemble[market] = weighted_sum / total_weight
            else:
                ensemble[market] = 1 / 3 if "1x2" in market else 0.5

        total_1x2 = ensemble["prob_home"] + ensemble["prob_draw"] + ensemble["prob_away"]
        if total_1x2 > 0:
            ensemble["prob_home"] /= total_1x2
            ensemble["prob_draw"] /= total_1x2
            ensemble["prob_away"] /= total_1x2

        return ensemble

    def _compute_confidence(self, model_probs: dict) -> float:
        """Confidence based on model agreement (lower variance = higher confidence)."""
        home_probs = [p.get("prob_home", 0) for p in model_probs.values() if "prob_home" in p]
        if len(home_probs) < 2:
            return 0.5

        variance = np.var(home_probs)
        max_prob = max(
            np.mean([p.get("prob_home", 0) for p in model_probs.values() if "prob_home" in p]),
            np.mean([p.get("prob_draw", 0) for p in model_probs.values() if "prob_draw" in p]),
            np.mean([p.get("prob_away", 0) for p in model_probs.values() if "prob_away" in p]),
        )

        agreement_score = max(0, 1 - variance * 10)
        decisiveness = (max_prob - 1/3) / (2/3)
        confidence = 0.6 * agreement_score + 0.4 * decisiveness
        return round(np.clip(confidence, 0.0, 1.0), 3)
