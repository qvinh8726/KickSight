"""Value bet detection by comparing model vs market probabilities."""

from __future__ import annotations

from dataclasses import dataclass
from backend.betting.odds import OddsConverter
from backend.betting.kelly import KellyCalculator
from backend.config import get_settings


@dataclass
class ValueBet:
    match_id: int
    market: str
    selection: str
    model_prob: float
    fair_odds: float
    bookmaker_odds: float
    implied_prob: float
    edge: float
    ev: float
    confidence: float
    kelly_fraction: float
    suggested_stake: float
    risk_rating: str


class ValueDetector:
    """Identifies value bets where model probability exceeds market probability.

    Only flags bets with positive expected value above a configurable threshold.
    Assigns confidence scores and risk ratings.
    """

    def __init__(self, min_ev: float | None = None, min_confidence: float = 0.3):
        settings = get_settings()
        self.min_ev = min_ev if min_ev is not None else settings.min_ev_threshold
        self.min_confidence = min_confidence
        self.converter = OddsConverter()
        self.kelly = KellyCalculator()

    def find_value_bets(
        self,
        match_id: int,
        model_probs: dict[str, float],
        bookmaker_odds: dict[str, float],
        confidence: float = 0.5,
    ) -> list[ValueBet]:
        """Compare model probabilities to bookmaker odds across all markets."""
        value_bets = []

        market_mappings = [
            ("1x2", "home", "prob_home", "home_current"),
            ("1x2", "draw", "prob_draw", "draw_current"),
            ("1x2", "away", "prob_away", "away_current"),
            ("over_25", "over", "prob_over_25", "over_25_current"),
            ("under_25", "under", "prob_under_25", "under_25_current"),
            ("btts", "yes", "prob_btts_yes", "btts_yes_current"),
            ("btts", "no", "prob_btts_no", "btts_no_current"),
        ]

        for market, selection, prob_key, odds_key in market_mappings:
            model_prob = model_probs.get(prob_key)
            bookie_odds = bookmaker_odds.get(odds_key)

            if model_prob is None or bookie_odds is None or bookie_odds <= 1.0:
                continue

            implied_prob = self.converter.decimal_to_implied(bookie_odds)
            fair_odds = self.converter.implied_to_decimal(model_prob)
            edge = model_prob - implied_prob
            ev = (model_prob * (bookie_odds - 1)) - (1 - model_prob)

            if ev < self.min_ev:
                continue
            if confidence < self.min_confidence:
                continue

            kelly_frac = self.kelly.fractional_kelly(model_prob, bookie_odds)
            suggested_stake = self.kelly.suggested_stake(model_prob, bookie_odds)
            risk = self._assess_risk(ev, confidence, model_prob)

            value_bets.append(ValueBet(
                match_id=match_id,
                market=market,
                selection=selection,
                model_prob=round(model_prob, 4),
                fair_odds=round(fair_odds, 2),
                bookmaker_odds=bookie_odds,
                implied_prob=round(implied_prob, 4),
                edge=round(edge, 4),
                ev=round(ev, 4),
                confidence=round(confidence, 3),
                kelly_fraction=round(kelly_frac, 4),
                suggested_stake=round(suggested_stake, 2),
                risk_rating=risk,
            ))

        value_bets.sort(key=lambda x: x.ev, reverse=True)
        return value_bets

    @staticmethod
    def _assess_risk(ev: float, confidence: float, model_prob: float) -> str:
        score = ev * 0.4 + confidence * 0.3 + model_prob * 0.3
        if score > 0.5:
            return "low"
        elif score > 0.3:
            return "medium"
        return "high"
