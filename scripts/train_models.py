"""Train all prediction models and save to disk."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pathlib import Path

from backend.data.processors import DataProcessor
from backend.features.builder import FeatureBuilder
from backend.prediction.poisson import PoissonGoalModel
from backend.prediction.logistic import LogisticBaseline
from backend.prediction.xgboost_model import XGBoostPredictor
from backend.prediction.lightgbm_model import LightGBMPredictor

MODEL_DIR = Path("models")


def main():
    MODEL_DIR.mkdir(exist_ok=True)

    print("Loading data...")
    processor = DataProcessor()
    df = processor.load_matches_df()
    print(f"Loaded {len(df)} matches")

    print("Building features...")
    builder = FeatureBuilder()
    df = builder.build(df)

    X, y_1x2 = builder.get_training_data(df, target="result")
    finished = df[df["status"] == "finished"]
    y_ou25 = finished.loc[X.index, "over_25"] if "over_25" in finished.columns else None
    y_btts = finished.loc[X.index, "btts"] if "btts" in finished.columns else None
    print(f"Training data: {X.shape[0]} samples, {X.shape[1]} features")

    print("\n1. Training Poisson model...")
    poisson = PoissonGoalModel()
    poisson.fit(df)
    print(f"   Poisson fitted: {len(poisson.attack)} teams")

    print("\n2. Training Logistic Regression...")
    lr = LogisticBaseline()
    lr_metrics = lr.fit(X, y_1x2)
    lr.save(MODEL_DIR / "logistic.pkl")
    print(f"   Accuracy: {lr_metrics['accuracy']:.3f}")

    print("\n3. Training XGBoost...")
    xgb = XGBoostPredictor()
    xgb_metrics = xgb.fit(X, y_1x2, y_ou25, y_btts)
    xgb.save(MODEL_DIR / "xgboost.pkl")
    print(f"   1X2 logloss: {xgb_metrics.get('1x2_train_logloss', 'N/A'):.4f}")

    print("\n4. Training LightGBM...")
    lgbm = LightGBMPredictor()
    lgbm_metrics = lgbm.fit(X, y_1x2, y_ou25, y_btts)
    lgbm.save(MODEL_DIR / "lightgbm.pkl")
    print(f"   1X2 logloss: {lgbm_metrics.get('1x2_train_logloss', 'N/A'):.4f}")

    print("\n5. Cross-validating XGBoost...")
    cv_results = xgb.cross_validate(X, y_1x2, n_splits=5)
    print(f"   CV logloss: {cv_results['cv_logloss_mean']:.4f} (+/- {cv_results['cv_logloss_std']:.4f})")

    print("\nAll models trained and saved to ./models/")
    print("\nTop 10 XGBoost features:")
    sorted_feats = sorted(xgb.feature_importance_.items(), key=lambda x: x[1], reverse=True)
    for fname, imp in sorted_feats[:10]:
        print(f"  {fname:35s} {imp:.4f}")


if __name__ == "__main__":
    main()
