"""Kelly criterion for optimal bet sizing."""

from __future__ import annotations

from backend.config import get_settings


class KellyCalculator:
    """Fractional Kelly criterion for bankroll management.

    Full Kelly maximizes long-term growth but has high variance.
    We use fractional Kelly (default 25%) for more conservative sizing.
    """

    def __init__(
        self,
        fraction: float | None = None,
        max_bet_pct: float | None = None,
        bankroll: float | None = None,
    ):
        settings = get_settings()
        self.fraction = fraction if fraction is not None else settings.kelly_fraction
        self.max_bet_pct = max_bet_pct if max_bet_pct is not None else settings.max_bet_fraction
        self.bankroll = bankroll if bankroll is not None else settings.bankroll

    def full_kelly(self, prob: float, odds: float) -> float:
        """Full Kelly fraction: f* = (bp - q) / b where b = odds - 1."""
        if odds <= 1.0 or prob <= 0 or prob >= 1:
            return 0.0
        b = odds - 1.0
        q = 1.0 - prob
        kelly = (b * prob - q) / b
        return max(kelly, 0.0)

    def fractional_kelly(self, prob: float, odds: float) -> float:
        fk = self.full_kelly(prob, odds) * self.fraction
        return min(fk, self.max_bet_pct)

    def suggested_stake(self, prob: float, odds: float) -> float:
        frac = self.fractional_kelly(prob, odds)
        return round(frac * self.bankroll, 2)

    def update_bankroll(self, new_bankroll: float) -> None:
        self.bankroll = new_bankroll

    @staticmethod
    def expected_growth_rate(prob: float, odds: float, fraction: float) -> float:
        """Geometric growth rate for a given stake fraction."""
        if fraction <= 0 or prob <= 0 or prob >= 1 or odds <= 1:
            return 0.0
        import math
        win_growth = math.log(1 + fraction * (odds - 1))
        loss_growth = math.log(1 - fraction)
        return prob * win_growth + (1 - prob) * loss_growth
