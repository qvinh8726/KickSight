"""Generate predictions for upcoming matches and store in DB."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import SyncSession
from backend.data.processors import DataProcessor
from backend.prediction.ensemble import EnsemblePredictor
from backend.betting.value import ValueDetector
from backend.betting.odds import OddsConverter
from backend.models.prediction import Prediction


def main():
    print("Loading all match data for model training...")
    processor = DataProcessor()
    all_df = processor.load_matches_df()
    print(f"Total matches: {len(all_df)}")

    print("Training ensemble model...")
    ensemble = EnsemblePredictor()
    ensemble.fit(all_df[all_df["status"] == "finished"])

    upcoming = all_df[all_df["status"] == "scheduled"]
    print(f"\nPredicting {len(upcoming)} upcoming matches...")

    if upcoming.empty:
        print("No upcoming matches found.")
        return

    predictions = ensemble.predict(upcoming)
    print(f"Generated {len(predictions)} predictions")

    odds_df = processor.load_odds_df()
    detector = ValueDetector(min_ev=0.03)
    converter = OddsConverter()

    with SyncSession() as session:
        for pred in predictions:
            match_odds = odds_df[odds_df["match_id"] == pred.match_id] if not odds_df.empty else None
            odds_dict = match_odds.iloc[0].to_dict() if match_odds is not None and not match_odds.empty else {}

            model_probs = {
                "prob_home": pred.prob_home,
                "prob_draw": pred.prob_draw,
                "prob_away": pred.prob_away,
                "prob_over_25": pred.prob_over_25,
                "prob_under_25": pred.prob_under_25,
                "prob_btts_yes": pred.prob_btts_yes,
                "prob_btts_no": pred.prob_btts_no,
            }
            value_bets = detector.find_value_bets(pred.match_id, model_probs, odds_dict, pred.confidence)

            best_bet = value_bets[0] if value_bets else None

            db_pred = Prediction(
                match_id=pred.match_id,
                model_name="ensemble_v1",
                prob_home=pred.prob_home,
                prob_draw=pred.prob_draw,
                prob_away=pred.prob_away,
                prob_over_25=pred.prob_over_25,
                prob_under_25=pred.prob_under_25,
                prob_btts_yes=pred.prob_btts_yes,
                prob_btts_no=pred.prob_btts_no,
                projected_home_goals=pred.projected_home_goals,
                projected_away_goals=pred.projected_away_goals,
                asian_handicap_lean=pred.asian_handicap_lean,
                confidence=pred.confidence,
                is_value_bet=len(value_bets) > 0,
                best_bet_market=best_bet.market if best_bet else None,
                best_bet_selection=best_bet.selection if best_bet else None,
                best_bet_ev=best_bet.ev if best_bet else None,
                kelly_fraction=best_bet.kelly_fraction if best_bet else None,
                suggested_stake=best_bet.suggested_stake if best_bet else None,
            )
            session.add(db_pred)

            status = "VALUE" if value_bets else "     "
            print(
                f"  [{status}] Match #{pred.match_id}: "
                f"H={pred.prob_home:.0%} D={pred.prob_draw:.0%} A={pred.prob_away:.0%} "
                f"| Score: {pred.projected_scoreline} | Conf: {pred.confidence:.0%}"
            )

        session.commit()
        print(f"\nSaved {len(predictions)} predictions to database")


if __name__ == "__main__":
    main()
