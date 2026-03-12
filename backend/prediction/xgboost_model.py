"""XGBoost model for match outcome prediction."""

from __future__ import annotations

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import log_loss
import pickle
from pathlib import Path


class XGBoostPredictor:
    """Gradient-boosted tree model for 1X2, over/under, and BTTS markets.

    Uses time-series cross-validation to avoid data leakage.
    Supports multi-output predictions.
    """

    DEFAULT_PARAMS = {
        "objective": "multi:softprob",
        "num_class": 3,
        "max_depth": 6,
        "learning_rate": 0.05,
        "n_estimators": 500,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 5,
        "gamma": 0.1,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "eval_metric": "mlogloss",
        "tree_method": "hist",
        "random_state": 42,
    }

    def __init__(self, params: dict | None = None):
        self.params = {**self.DEFAULT_PARAMS, **(params or {})}
        self.model_1x2: xgb.XGBClassifier | None = None
        self.model_ou25: xgb.XGBClassifier | None = None
        self.model_btts: xgb.XGBClassifier | None = None
        self.encoder = LabelEncoder()
        self.fitted = False
        self.feature_importance_: dict[str, float] = {}

    def fit(
        self,
        X: pd.DataFrame,
        y_1x2: pd.Series,
        y_ou25: pd.Series | None = None,
        y_btts: pd.Series | None = None,
    ) -> dict:
        y_encoded = self.encoder.fit_transform(y_1x2)

        params_1x2 = {k: v for k, v in self.params.items() if k != "n_estimators"}
        n_estimators = self.params.get("n_estimators", 500)

        self.model_1x2 = xgb.XGBClassifier(n_estimators=n_estimators, **params_1x2)
        self.model_1x2.fit(
            X, y_encoded,
            eval_set=[(X, y_encoded)],
            verbose=False,
        )

        self.feature_importance_ = dict(
            zip(X.columns, self.model_1x2.feature_importances_)
        )

        metrics = {"1x2_train_logloss": log_loss(y_encoded, self.model_1x2.predict_proba(X))}

        if y_ou25 is not None:
            params_binary = {
                k: v for k, v in self.params.items()
                if k not in ("num_class", "objective", "n_estimators")
            }
            self.model_ou25 = xgb.XGBClassifier(
                n_estimators=n_estimators,
                objective="binary:logistic",
                eval_metric="logloss",
                **params_binary,
            )
            self.model_ou25.fit(X, y_ou25.astype(int), verbose=False)
            metrics["ou25_train_logloss"] = log_loss(y_ou25, self.model_ou25.predict_proba(X)[:, 1])

        if y_btts is not None:
            params_binary = {
                k: v for k, v in self.params.items()
                if k not in ("num_class", "objective", "n_estimators")
            }
            self.model_btts = xgb.XGBClassifier(
                n_estimators=n_estimators,
                objective="binary:logistic",
                eval_metric="logloss",
                **params_binary,
            )
            self.model_btts.fit(X, y_btts.astype(int), verbose=False)
            metrics["btts_train_logloss"] = log_loss(y_btts, self.model_btts.predict_proba(X)[:, 1])

        self.fitted = True
        metrics["n_samples"] = len(X)
        metrics["n_features"] = X.shape[1]
        return metrics

    def predict_proba(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise RuntimeError("Model not fitted")

        probs_1x2 = self.model_1x2.predict_proba(X)
        classes = list(self.encoder.classes_)
        result = pd.DataFrame(probs_1x2, columns=classes, index=X.index)
        col_map = {"H": "prob_home", "D": "prob_draw", "A": "prob_away"}
        result = result.rename(columns=col_map)

        if self.model_ou25:
            ou_probs = self.model_ou25.predict_proba(X)
            result["prob_over_25"] = ou_probs[:, 1]
            result["prob_under_25"] = ou_probs[:, 0]

        if self.model_btts:
            btts_probs = self.model_btts.predict_proba(X)
            result["prob_btts_yes"] = btts_probs[:, 1]
            result["prob_btts_no"] = btts_probs[:, 0]

        return result

    def cross_validate(
        self, X: pd.DataFrame, y: pd.Series, n_splits: int = 5
    ) -> dict:
        y_encoded = self.encoder.fit_transform(y)
        tscv = TimeSeriesSplit(n_splits=n_splits)
        scores = []

        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y_encoded[train_idx], y_encoded[val_idx]

            params = {k: v for k, v in self.params.items() if k != "n_estimators"}
            model = xgb.XGBClassifier(n_estimators=self.params.get("n_estimators", 500), **params)
            model.fit(X_train, y_train, eval_set=[(X_val, y_val)], verbose=False)

            probs = model.predict_proba(X_val)
            scores.append(log_loss(y_val, probs))

        return {
            "cv_logloss_mean": np.mean(scores),
            "cv_logloss_std": np.std(scores),
            "n_splits": n_splits,
        }

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({
                "model_1x2": self.model_1x2,
                "model_ou25": self.model_ou25,
                "model_btts": self.model_btts,
                "encoder": self.encoder,
                "feature_importance": self.feature_importance_,
            }, f)

    def load(self, path: str | Path) -> None:
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.model_1x2 = data["model_1x2"]
        self.model_ou25 = data.get("model_ou25")
        self.model_btts = data.get("model_btts")
        self.encoder = data["encoder"]
        self.feature_importance_ = data.get("feature_importance", {})
        self.fitted = True
