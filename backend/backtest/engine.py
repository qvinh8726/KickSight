"""Backtesting engine for historical simulation of betting strategies."""

from __future__ import annotations

from datetime import date
from dataclasses import dataclass, asdict

import pandas as pd
import numpy as np
import structlog

from backend.backtest.splits import time_based_split, expanding_window_splits, DataSplit
from backend.backtest.metrics import compute_metrics, BacktestMetrics
from backend.features.builder import FeatureBuilder
from backend.prediction.ensemble import EnsemblePredictor
from backend.betting.odds import OddsConverter
from backend.betting.value import ValueDetector
from backend.betting.kelly import KellyCalculator

logger = structlog.get_logger()


class BacktestEngine:
    """Simulates historical betting performance with proper temporal splits.

    Trains models only on past data, predicts forward, and tracks P&L.
    Supports walk-forward analysis with expanding windows.
    """

    def __init__(
        self,
        min_ev: float = 0.03,
        kelly_fraction: float = 0.25,
        bankroll: float = 1000.0,
    ):
        self.min_ev = min_ev
        self.kelly_fraction = kelly_fraction
        self.initial_bankroll = bankroll
        self.converter = OddsConverter()

    def run_backtest(
        self,
        df: pd.DataFrame,
        odds_df: pd.DataFrame | None = None,
        train_pct: float = 0.6,
        val_pct: float = 0.2,
    ) -> tuple[BacktestMetrics, pd.DataFrame]:
        """Run a single train/val/test backtest."""
        split = time_based_split(df, train_pct=train_pct, val_pct=val_pct)
        logger.info(
            "backtest_split",
            train=len(split.train),
            val=len(split.validation),
            test=len(split.test),
            train_end=str(split.train_end),
        )

        ensemble = EnsemblePredictor()
        train_data = pd.concat([split.train, split.validation])
        ensemble.fit(train_data)

        bets = self._simulate_bets(ensemble, split.test, odds_df)
        metrics = compute_metrics(bets)

        logger.info(
            "backtest_result",
            total_bets=metrics.total_bets,
            roi=metrics.roi,
            profit=metrics.total_profit,
        )
        return metrics, bets

    def run_walk_forward(
        self,
        df: pd.DataFrame,
        odds_df: pd.DataFrame | None = None,
        initial_train_pct: float = 0.4,
        step_pct: float = 0.1,
    ) -> tuple[BacktestMetrics, pd.DataFrame]:
        """Walk-forward backtest with expanding training window."""
        splits = expanding_window_splits(df, initial_train_pct, step_pct)
        all_bets = []

        for i, (train, test) in enumerate(splits):
            logger.info("walk_forward_fold", fold=i, train_size=len(train), test_size=len(test))
            ensemble = EnsemblePredictor()
            ensemble.fit(train)
            fold_bets = self._simulate_bets(ensemble, test, odds_df)
            all_bets.append(fold_bets)

        if all_bets:
            combined = pd.concat(all_bets, ignore_index=True)
        else:
            combined = pd.DataFrame()

        metrics = compute_metrics(combined)
        return metrics, combined

    def _simulate_bets(
        self,
        ensemble: EnsemblePredictor,
        test_df: pd.DataFrame,
        odds_df: pd.DataFrame | None,
    ) -> pd.DataFrame:
        predictions = ensemble.predict(test_df)
        detector = ValueDetector(min_ev=self.min_ev)
        kelly = KellyCalculator(fraction=self.kelly_fraction, bankroll=self.initial_bankroll)

        bet_records = []

        for pred in predictions:
            odds_row = self._get_odds_for_match(pred.match_id, odds_df)
            if not odds_row:
                continue

            model_probs = {
                "prob_home": pred.prob_home,
                "prob_draw": pred.prob_draw,
                "prob_away": pred.prob_away,
                "prob_over_25": pred.prob_over_25,
                "prob_under_25": pred.prob_under_25,
                "prob_btts_yes": pred.prob_btts_yes,
                "prob_btts_no": pred.prob_btts_no,
            }

            value_bets = detector.find_value_bets(
                pred.match_id, model_probs, odds_row, pred.confidence
            )

            match_row = test_df[test_df["match_id"] == pred.match_id]
            if match_row.empty:
                continue
            match = match_row.iloc[0]

            for vb in value_bets:
                is_win = self._check_win(vb, match)
                profit = (vb.suggested_stake * (vb.bookmaker_odds - 1)) if is_win else -vb.suggested_stake

                closing_odds = odds_row.get(f"{vb.selection}_close", vb.bookmaker_odds)
                clv = self._compute_clv(vb.bookmaker_odds, closing_odds)

                bet_records.append({
                    "match_id": pred.match_id,
                    "match_date": match.get("match_date"),
                    "market": vb.market,
                    "selection": vb.selection,
                    "model_prob": vb.model_prob,
                    "bookmaker_odds": vb.bookmaker_odds,
                    "fair_odds": vb.fair_odds,
                    "ev": vb.ev,
                    "stake": vb.suggested_stake,
                    "profit": round(profit, 2),
                    "is_win": int(is_win),
                    "closing_odds": closing_odds,
                    "clv": clv,
                })

        return pd.DataFrame(bet_records)

    def _get_odds_for_match(self, match_id: int, odds_df: pd.DataFrame | None) -> dict:
        if odds_df is None or odds_df.empty:
            return {}
        match_odds = odds_df[odds_df["match_id"] == match_id]
        if match_odds.empty:
            return {}
        return match_odds.iloc[0].to_dict()

    @staticmethod
    def _check_win(bet, match: pd.Series) -> bool:
        if bet.market == "1x2":
            result = match.get("result", "")
            return (
                (bet.selection == "home" and result == "H")
                or (bet.selection == "draw" and result == "D")
                or (bet.selection == "away" and result == "A")
            )
        elif bet.market == "over_25":
            total = match.get("total_goals", 0)
            return bool(bet.selection == "over" and total > 2)
        elif bet.market == "under_25":
            total = match.get("total_goals", 0)
            return bool(bet.selection == "under" and total < 3)
        elif bet.market == "btts":
            btts = match.get("btts", 0)
            return bool(
                (bet.selection == "yes" and btts == 1)
                or (bet.selection == "no" and btts == 0)
            )
        return False

    @staticmethod
    def _compute_clv(opening_odds: float, closing_odds: float) -> float:
        if closing_odds <= 1.0 or opening_odds <= 1.0:
            return 0.0
        implied_open = 1.0 / opening_odds
        implied_close = 1.0 / closing_odds
        return round(implied_close - implied_open, 4)
