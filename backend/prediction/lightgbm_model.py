"""LightGBM model for match outcome prediction."""

from __future__ import annotations

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import log_loss
import pickle
from pathlib import Path


class LightGBMPredictor:
    """LightGBM gradient boosting for 1X2, over/under, and BTTS.

    Complementary to XGBoost -- different tree-building algorithm
    provides useful diversity for ensemble predictions.
    """

    DEFAULT_PARAMS = {
        "objective": "multiclass",
        "num_class": 3,
        "max_depth": 8,
        "learning_rate": 0.05,
        "n_estimators": 500,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_samples": 10,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "metric": "multi_logloss",
        "random_state": 42,
        "verbose": -1,
    }

    def __init__(self, params: dict | None = None):
        self.params = {**self.DEFAULT_PARAMS, **(params or {})}
        self.model_1x2: lgb.LGBMClassifier | None = None
        self.model_ou25: lgb.LGBMClassifier | None = None
        self.model_btts: lgb.LGBMClassifier | None = None
        self.encoder = LabelEncoder()
        self.fitted = False

    def fit(
        self,
        X: pd.DataFrame,
        y_1x2: pd.Series,
        y_ou25: pd.Series | None = None,
        y_btts: pd.Series | None = None,
    ) -> dict:
        y_encoded = self.encoder.fit_transform(y_1x2)

        self.model_1x2 = lgb.LGBMClassifier(**self.params)
        self.model_1x2.fit(X, y_encoded)

        metrics = {"1x2_train_logloss": log_loss(y_encoded, self.model_1x2.predict_proba(X))}

        if y_ou25 is not None:
            params_binary = {
                k: v for k, v in self.params.items()
                if k not in ("num_class", "objective", "metric")
            }
            self.model_ou25 = lgb.LGBMClassifier(
                objective="binary", metric="binary_logloss", **params_binary
            )
            self.model_ou25.fit(X, y_ou25.astype(int))
            metrics["ou25_train_logloss"] = log_loss(y_ou25, self.model_ou25.predict_proba(X)[:, 1])

        if y_btts is not None:
            params_binary = {
                k: v for k, v in self.params.items()
                if k not in ("num_class", "objective", "metric")
            }
            self.model_btts = lgb.LGBMClassifier(
                objective="binary", metric="binary_logloss", **params_binary
            )
            self.model_btts.fit(X, y_btts.astype(int))
            metrics["btts_train_logloss"] = log_loss(y_btts, self.model_btts.predict_proba(X)[:, 1])

        self.fitted = True
        return metrics

    def predict_proba(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise RuntimeError("Model not fitted")

        probs = self.model_1x2.predict_proba(X)
        classes = list(self.encoder.classes_)
        result = pd.DataFrame(probs, columns=classes, index=X.index)
        col_map = {"H": "prob_home", "D": "prob_draw", "A": "prob_away"}
        result = result.rename(columns=col_map)

        if self.model_ou25:
            ou = self.model_ou25.predict_proba(X)
            result["prob_over_25"] = ou[:, 1]
            result["prob_under_25"] = ou[:, 0]

        if self.model_btts:
            btts = self.model_btts.predict_proba(X)
            result["prob_btts_yes"] = btts[:, 1]
            result["prob_btts_no"] = btts[:, 0]

        return result

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({
                "model_1x2": self.model_1x2,
                "model_ou25": self.model_ou25,
                "model_btts": self.model_btts,
                "encoder": self.encoder,
            }, f)

    def load(self, path: str | Path) -> None:
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.model_1x2 = data["model_1x2"]
        self.model_ou25 = data.get("model_ou25")
        self.model_btts = data.get("model_btts")
        self.encoder = data["encoder"]
        self.fitted = True
