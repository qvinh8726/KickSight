"""Logistic regression baseline for 1X2 prediction."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.calibration import CalibratedClassifierCV
import pickle
from pathlib import Path


class LogisticBaseline:
    """Multinomial logistic regression for 1X2 outcomes.

    Serves as a baseline model. Uses calibrated probabilities via
    Platt scaling for well-calibrated outputs.
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.encoder = LabelEncoder()
        self.model = None
        self.fitted = False
        self.classes_ = ["A", "D", "H"]

    def fit(self, X: pd.DataFrame, y: pd.Series) -> dict:
        y_encoded = self.encoder.fit_transform(y)
        self.classes_ = list(self.encoder.classes_)

        X_scaled = self.scaler.fit_transform(X)

        base_model = LogisticRegression(
            solver="lbfgs",
            max_iter=1000,
            C=1.0,
        )
        self.model = CalibratedClassifierCV(base_model, cv=5, method="isotonic")
        self.model.fit(X_scaled, y_encoded)
        self.fitted = True

        train_probs = self.model.predict_proba(X_scaled)
        train_preds = self.model.predict(X_scaled)
        accuracy = np.mean(train_preds == y_encoded)

        return {"accuracy": accuracy, "n_samples": len(y)}

    def predict_proba(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.fitted:
            raise RuntimeError("Model not fitted")

        X_scaled = self.scaler.transform(X)
        probs = self.model.predict_proba(X_scaled)

        result = pd.DataFrame(probs, columns=self.classes_, index=X.index)
        col_map = {"H": "prob_home", "D": "prob_draw", "A": "prob_away"}
        result = result.rename(columns=col_map)

        for col in ["prob_home", "prob_draw", "prob_away"]:
            if col not in result.columns:
                result[col] = 1 / 3

        return result[["prob_home", "prob_draw", "prob_away"]]

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({"model": self.model, "scaler": self.scaler, "encoder": self.encoder}, f)

    def load(self, path: str | Path) -> None:
        with open(path, "rb") as f:
            data = pickle.load(f)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.encoder = data["encoder"]
        self.classes_ = list(self.encoder.classes_)
        self.fitted = True
