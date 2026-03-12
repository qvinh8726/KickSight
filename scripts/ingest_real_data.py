"""
Ingest real match data from football-data.org and odds from the-odds-api.com.

Usage:
    python scripts/ingest_real_data.py              # Ingest all
    python scripts/ingest_real_data.py --seed        # Seed synthetic data only
    python scripts/ingest_real_data.py --matches     # Ingest real matches only
    python scripts/ingest_real_data.py --odds        # Ingest real odds only
    python scripts/ingest_real_data.py --train       # Train models + predict
"""

import sys
import os
import asyncio
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import sync_engine, Base
from backend.config import get_settings


def init_tables():
    print("[1/5] Creating database tables...")
    Base.metadata.create_all(sync_engine)
    print("  Tables created successfully.")


async def ingest_matches():
    settings = get_settings()
    if not settings.football_data_api_key:
        print("[2/5] SKIPPED: FOOTBALL_DATA_API_KEY not set in .env")
        return

    print("[2/5] Ingesting real match data from football-data.org...")
    from backend.data.ingestion import DataIngestionService
    svc = DataIngestionService()

    competitions = [
        (2001, 2024, "UEFA Champions League"),
        (2018, 2024, "UEFA Europa League"),
        (2021, 2024, "English Premier League"),
        (2014, 2024, "La Liga"),
        (2002, 2024, "Bundesliga"),
        (2019, 2024, "Serie A"),
        (2015, 2024, "Ligue 1"),
    ]

    total = 0
    for comp_id, season, name in competitions:
        try:
            count = await svc.ingest_competition_matches(comp_id, season)
            print(f"  {name}: {count} matches ingested")
            total += count
        except Exception as e:
            print(f"  {name}: FAILED - {e}")
        await asyncio.sleep(6)

    print(f"  Total: {total} matches ingested")


async def ingest_odds():
    settings = get_settings()
    if not settings.odds_api_key:
        print("[3/5] SKIPPED: ODDS_API_KEY not set in .env")
        return

    print("[3/5] Ingesting bookmaker odds from the-odds-api.com...")
    from backend.data.ingestion import DataIngestionService
    svc = DataIngestionService()

    sports = [
        ("soccer_epl",                 "Premier League"),
        ("soccer_spain_la_liga",        "La Liga"),
        ("soccer_germany_bundesliga",   "Bundesliga"),
        ("soccer_italy_serie_a",        "Serie A"),
        ("soccer_france_ligue_1",       "Ligue 1"),
        ("soccer_uefa_champs_league",   "Champions League"),
        ("soccer_uefa_europa_league",   "Europa League"),
    ]

    total = 0
    for sport_key, name in sports:
        try:
            count = await svc.ingest_odds(sport=sport_key)
            print(f"  {name}: {count} odds records")
            total += count
        except Exception as e:
            print(f"  {name}: FAILED - {e}")

    print(f"  Total: {total} odds records ingested")


def seed_synthetic():
    print("[2/5] Seeding synthetic data...")
    from scripts.seed_data import seed
    seed()
    print("  Seed complete.")


def train_models():
    print("[4/5] Training ML models...")
    try:
        from backend.data.processors import DataProcessor
        from backend.prediction.ensemble import EnsemblePredictor

        processor = DataProcessor()
        df = processor.load_matches_df()

        if df.empty or len(df) < 30:
            print("  SKIPPED: Not enough match data for training (need 30+)")
            return

        ensemble = EnsemblePredictor()
        metrics = ensemble.fit(df)
        print(f"  Models trained: {list(metrics.keys())}")
        return ensemble, df
    except Exception as e:
        print(f"  Training FAILED: {e}")
        return None, None


def generate_predictions(ensemble=None, df=None):
    print("[5/5] Generating predictions for upcoming matches...")
    try:
        if ensemble is None or df is None:
            from backend.data.processors import DataProcessor
            from backend.prediction.ensemble import EnsemblePredictor

            processor = DataProcessor()
            df = processor.load_matches_df()
            if df.empty:
                print("  SKIPPED: No match data")
                return

            ensemble = EnsemblePredictor()
            ensemble.fit(df)

        scheduled_ids = set(df[df["status"] == "scheduled"]["match_id"].tolist())
        if not scheduled_ids:
            print("  No upcoming scheduled matches to predict")
            return

        all_predictions = ensemble.predict(df)
        predictions = [p for p in all_predictions if p.match_id in scheduled_ids]
        print(f"  Generated {len(predictions)} predictions")

        from backend.database import SyncSession
        from backend.models.prediction import Prediction
        from backend.betting.value import ValueDetector

        detector = ValueDetector()
        count = 0
        with SyncSession() as session:
            for pred in predictions:
                model_probs = {
                    "prob_home": pred.prob_home,
                    "prob_draw": pred.prob_draw,
                    "prob_away": pred.prob_away,
                    "prob_over_25": pred.prob_over_25,
                    "prob_under_25": pred.prob_under_25,
                    "prob_btts_yes": pred.prob_btts_yes,
                    "prob_btts_no": pred.prob_btts_no,
                }

                best_market = None
                best_ev = 0
                best_selection = None
                is_vb = False

                value_bets = detector.find_value_bets(pred.match_id, model_probs, {}, pred.confidence)
                if value_bets:
                    top = value_bets[0]
                    best_market = top.market
                    best_selection = top.selection
                    best_ev = top.ev
                    is_vb = True

                f = lambda v: float(v) if v is not None else None
                p = Prediction(
                    match_id=int(pred.match_id),
                    model_name="ensemble",
                    prob_home=f(pred.prob_home),
                    prob_draw=f(pred.prob_draw),
                    prob_away=f(pred.prob_away),
                    prob_over_25=f(pred.prob_over_25),
                    prob_under_25=f(pred.prob_under_25),
                    prob_btts_yes=f(pred.prob_btts_yes),
                    prob_btts_no=f(pred.prob_btts_no),
                    projected_home_goals=f(pred.projected_home_goals),
                    projected_away_goals=f(pred.projected_away_goals),
                    asian_handicap_lean=pred.asian_handicap_lean,
                    confidence=f(pred.confidence),
                    is_value_bet=is_vb,
                    best_bet_market=best_market,
                    best_bet_selection=best_selection,
                    best_bet_ev=best_ev,
                )
                session.add(p)
                count += 1
            session.commit()

        print(f"  Saved {count} predictions to database")

    except Exception as e:
        print(f"  Predictions FAILED: {e}")


async def main():
    parser = argparse.ArgumentParser(description="KickSight Data Pipeline")
    parser.add_argument("--seed", action="store_true", help="Seed synthetic data only")
    parser.add_argument("--matches", action="store_true", help="Ingest real matches only")
    parser.add_argument("--odds", action="store_true", help="Ingest odds only")
    parser.add_argument("--train", action="store_true", help="Train models + predict only")
    args = parser.parse_args()

    specific = args.seed or args.matches or args.odds or args.train
    run_all = not specific

    print("=" * 50)
    print("KickSight Data Pipeline")
    print("=" * 50)

    if run_all or args.seed:
        init_tables()

    if args.seed:
        seed_synthetic()
        return

    if run_all or args.matches:
        await ingest_matches()

    if run_all or args.odds:
        await ingest_odds()

    if run_all or args.train:
        ensemble, df = train_models()
        generate_predictions(ensemble, df)

    print("=" * 50)
    print("Pipeline complete!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
