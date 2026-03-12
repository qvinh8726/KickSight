"""
KickSight Automated Data Pipeline
Chạy tự động qua cron job trên EC2.

Modes:
  --odds       Fetch odds mới (mỗi 30 phút)
  --matches    Fetch kết quả + lịch thi đấu (mỗi 6 giờ)
  --predict    Tạo predictions từ data mới (mỗi 6 giờ, sau --matches)
  --train      Retrain ML models (mỗi tuần, Chủ nhật 3:00)
  --full       Chạy toàn bộ pipeline (mỗi ngày 2:00)
"""

import sys
import os
import asyncio
import argparse
import logging
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(LOG_DIR, "pipeline.log"), encoding="utf-8"),
    ],
)
log = logging.getLogger("pipeline")

# ─── Major leagues only ────────────────────────────────────────────────────────
# football-data.org competition IDs (season 2025)
MAJOR_COMPETITIONS = [
    (2001, 2024, "UEFA Champions League"),
    (2018, 2024, "UEFA Europa League"),
    (2021, 2024, "English Premier League"),
    (2014, 2024, "La Liga"),
    (2002, 2024, "Bundesliga"),
    (2019, 2024, "Serie A"),
    (2015, 2024, "Ligue 1"),
]

# the-odds-api.com sport keys
MAJOR_ODDS_SPORTS = [
    ("soccer_epl",                   "Premier League"),
    ("soccer_spain_la_liga",         "La Liga"),
    ("soccer_germany_bundesliga",    "Bundesliga"),
    ("soccer_italy_serie_a",         "Serie A"),
    ("soccer_france_ligue_1",        "Ligue 1"),
    ("soccer_uefa_champs_league",    "Champions League"),
    ("soccer_uefa_europa_league",    "Europa League"),
]


def log_sep(title: str):
    log.info("=" * 50)
    log.info(f"  {title}")
    log.info("=" * 50)


# ─── 1. Fetch odds (every 30 min) ─────────────────────────────────────────────
async def run_odds():
    log_sep("ODDS UPDATE")
    from backend.config import get_settings
    settings = get_settings()

    if not settings.odds_api_key:
        log.warning("ODDS_API_KEY not set — skipping odds ingestion")
        return 0

    from backend.data.ingestion import DataIngestionService
    svc = DataIngestionService()
    total = 0

    for sport_key, name in MAJOR_ODDS_SPORTS:
        try:
            count = await svc.ingest_odds(sport=sport_key)
            log.info(f"  {name}: {count} odds records")
            total += count
        except Exception as e:
            log.error(f"  {name}: FAILED — {e}")

    log.info(f"Odds done: {total} total records")
    return total


# ─── 2. Fetch match data (every 6 hours) ──────────────────────────────────────
async def run_matches():
    log_sep("MATCHES UPDATE")
    from backend.config import get_settings
    settings = get_settings()

    if not settings.football_data_api_key:
        log.warning("FOOTBALL_DATA_API_KEY not set — skipping match ingestion")
        return 0

    from backend.data.ingestion import DataIngestionService
    svc = DataIngestionService()
    total = 0

    for comp_id, season, name in MAJOR_COMPETITIONS:
        try:
            count = await svc.ingest_competition_matches(comp_id, season)
            log.info(f"  {name} ({season}): {count} matches")
            total += count
            await asyncio.sleep(7)  # football-data.org rate limit: 10 req/min
        except Exception as e:
            log.error(f"  {name}: FAILED — {e}")
            await asyncio.sleep(7)

    log.info(f"Matches done: {total} total")
    return total


# ─── 3. Generate predictions (after match update) ─────────────────────────────
def run_predict():
    log_sep("PREDICTIONS")
    try:
        from backend.data.processors import DataProcessor
        from backend.prediction.ensemble import EnsemblePredictor
        from backend.database import SyncSession
        from backend.models.prediction import Prediction
        from backend.betting.value import ValueDetector

        processor = DataProcessor()
        df = processor.load_matches_df()

        if df.empty or len(df) < 10:
            log.warning(f"Not enough data ({len(df)} rows) — skipping predictions")
            return 0

        ensemble = EnsemblePredictor()
        # Load saved model if exists (avoid full retraining every 6h)
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "ensemble.pkl")
        if os.path.exists(model_path):
            import pickle
            with open(model_path, "rb") as f:
                ensemble = pickle.load(f)
            log.info("  Loaded existing model from disk")
        else:
            log.info("  No saved model — fitting now...")
            if len(df) >= 30:
                ensemble.fit(df)
            else:
                log.warning("  Not enough data to fit model")
                return 0

        scheduled = df[df["status"] == "scheduled"]
        if scheduled.empty:
            log.info("  No upcoming matches to predict")
            return 0

        all_preds = ensemble.predict(df)
        scheduled_ids = set(scheduled["match_id"].tolist())
        preds = [p for p in all_preds if p.match_id in scheduled_ids]

        detector = ValueDetector()
        count = 0
        with SyncSession() as session:
            for pred in preds:
                model_probs = {
                    "prob_home": pred.prob_home, "prob_draw": pred.prob_draw,
                    "prob_away": pred.prob_away, "prob_over_25": pred.prob_over_25,
                    "prob_under_25": pred.prob_under_25,
                    "prob_btts_yes": pred.prob_btts_yes, "prob_btts_no": pred.prob_btts_no,
                }
                vbs = detector.find_value_bets(pred.match_id, model_probs, {}, pred.confidence)
                top = vbs[0] if vbs else None
                f = lambda v: float(v) if v is not None else None
                p = Prediction(
                    match_id=int(pred.match_id), model_name="ensemble",
                    prob_home=f(pred.prob_home), prob_draw=f(pred.prob_draw),
                    prob_away=f(pred.prob_away), prob_over_25=f(pred.prob_over_25),
                    prob_under_25=f(pred.prob_under_25), prob_btts_yes=f(pred.prob_btts_yes),
                    prob_btts_no=f(pred.prob_btts_no),
                    projected_home_goals=f(pred.projected_home_goals),
                    projected_away_goals=f(pred.projected_away_goals),
                    asian_handicap_lean=pred.asian_handicap_lean,
                    confidence=f(pred.confidence),
                    is_value_bet=bool(top), best_bet_market=top.market if top else None,
                    best_bet_selection=top.selection if top else None,
                    best_bet_ev=top.ev if top else 0,
                )
                session.merge(p)
                count += 1
            session.commit()

        log.info(f"Predictions done: {count} saved")
        return count

    except Exception as e:
        log.error(f"Predictions FAILED: {e}", exc_info=True)
        return 0


# ─── 4. Retrain ML models (weekly) ────────────────────────────────────────────
def run_train():
    log_sep("MODEL TRAINING")
    try:
        import pickle
        from backend.data.processors import DataProcessor
        from backend.prediction.ensemble import EnsemblePredictor

        processor = DataProcessor()
        df = processor.load_matches_df()

        if df.empty or len(df) < 30:
            log.warning(f"Not enough data ({len(df)} rows) for training — need 30+")
            return False

        log.info(f"  Training on {len(df)} matches...")
        ensemble = EnsemblePredictor()
        metrics = ensemble.fit(df)
        log.info(f"  Models: {list(metrics.keys())}")
        for name, m in metrics.items():
            log.info(f"    {name}: accuracy={m.get('accuracy', '?'):.3f}")

        # Save model to disk
        model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        os.makedirs(model_dir, exist_ok=True)
        model_path = os.path.join(model_dir, "ensemble.pkl")
        with open(model_path, "wb") as f:
            pickle.dump(ensemble, f)
        log.info(f"  Model saved to {model_path}")
        return True

    except Exception as e:
        log.error(f"Training FAILED: {e}", exc_info=True)
        return False


# ─── Main ──────────────────────────────────────────────────────────────────────
async def main():
    parser = argparse.ArgumentParser(description="KickSight Auto Pipeline")
    parser.add_argument("--odds",    action="store_true", help="Fetch odds only (every 30min)")
    parser.add_argument("--matches", action="store_true", help="Fetch match data (every 6h)")
    parser.add_argument("--predict", action="store_true", help="Generate predictions (every 6h)")
    parser.add_argument("--train",   action="store_true", help="Retrain ML models (weekly)")
    parser.add_argument("--full",    action="store_true", help="Full pipeline (daily)")
    args = parser.parse_args()

    start = datetime.now()
    log.info(f"Pipeline started at {start.strftime('%Y-%m-%d %H:%M:%S')}")

    if args.odds:
        await run_odds()

    elif args.matches:
        await run_matches()
        run_predict()

    elif args.predict:
        run_predict()

    elif args.train:
        trained = run_train()
        if trained:
            run_predict()

    elif args.full:
        await run_matches()
        await run_odds()
        trained = run_train()
        if trained:
            run_predict()

    else:
        parser.print_help()

    elapsed = (datetime.now() - start).total_seconds()
    log.info(f"Pipeline finished in {elapsed:.1f}s")


if __name__ == "__main__":
    asyncio.run(main())
