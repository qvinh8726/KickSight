"""Odds conversion and margin removal utilities."""

from __future__ import annotations

import numpy as np


class OddsConverter:
    """Convert between odds formats and remove bookmaker overround."""

    @staticmethod
    def decimal_to_implied(odds: float) -> float:
        if odds <= 1.0:
            return 1.0
        return 1.0 / odds

    @staticmethod
    def implied_to_decimal(prob: float) -> float:
        if prob <= 0:
            return 100.0
        return 1.0 / prob

    @staticmethod
    def american_to_decimal(american: float) -> float:
        if american > 0:
            return (american / 100.0) + 1.0
        elif american < 0:
            return (100.0 / abs(american)) + 1.0
        return 1.0

    @staticmethod
    def fractional_to_decimal(numerator: float, denominator: float) -> float:
        return (numerator / denominator) + 1.0

    @staticmethod
    def compute_overround(odds_list: list[float]) -> float:
        """Sum of implied probabilities minus 1.0 gives the margin."""
        return sum(1.0 / o for o in odds_list if o > 0) - 1.0

    @staticmethod
    def remove_margin(odds_list: list[float], method: str = "multiplicative") -> list[float]:
        """Remove bookmaker margin to get fair probabilities.

        Methods:
        - multiplicative: proportional reduction (most common)
        - power: Shin's method approximation
        - additive: equal margin reduction
        """
        implied = [1.0 / o if o > 0 else 0.0 for o in odds_list]
        total = sum(implied)

        if total <= 0:
            n = len(odds_list)
            return [1.0 / n] * n

        if method == "multiplicative":
            fair = [p / total for p in implied]
        elif method == "additive":
            margin = total - 1.0
            n = len(implied)
            reduction = margin / n
            fair = [max(p - reduction, 0.001) for p in implied]
            fair_total = sum(fair)
            fair = [p / fair_total for p in fair]
        elif method == "power":
            fair = _shin_method(implied)
        else:
            fair = [p / total for p in implied]

        return fair

    @staticmethod
    def fair_odds_from_probs(probs: list[float]) -> list[float]:
        return [1.0 / p if p > 0 else 999.0 for p in probs]


def _shin_method(implied: list[float], tol: float = 1e-8, max_iter: int = 100) -> list[float]:
    """Shin's method for removing margin, better for skewed markets."""
    n = len(implied)
    total = sum(implied)
    z = 0.0

    for _ in range(max_iter):
        z_new = (total - 1.0) / (n - 1.0)
        denom = sum(
            np.sqrt(z_new**2 + 4 * (1 - z_new) * p**2 / total)
            for p in implied
        )
        z_new = 2 * (total - 1.0) / denom if denom > 0 else 0.0

        if abs(z_new - z) < tol:
            break
        z = z_new

    fair = []
    for p in implied:
        disc = z**2 + 4 * (1 - z) * p**2 / total
        fair_p = (np.sqrt(max(disc, 0)) - z) / (2 * (1 - z)) if (1 - z) != 0 else p / total
        fair.append(max(fair_p, 0.001))

    fair_total = sum(fair)
    return [p / fair_total for p in fair]
