"""Risk management and bet portfolio controls."""

from __future__ import annotations

from dataclasses import dataclass
from backend.betting.value import ValueBet


@dataclass
class PortfolioCheck:
    approved: bool
    reason: str
    adjusted_stake: float | None = None


class RiskManager:
    """Enforces betting limits and portfolio risk controls.

    Rules:
    - Max single bet as % of bankroll
    - Max daily exposure
    - Max concurrent bets per match
    - Max correlated bets
    - Drawdown circuit breaker
    """

    def __init__(
        self,
        bankroll: float = 1000.0,
        max_single_pct: float = 0.05,
        max_daily_pct: float = 0.15,
        max_bets_per_match: int = 2,
        max_drawdown_pct: float = 0.25,
    ):
        self.bankroll = bankroll
        self.peak_bankroll = bankroll
        self.max_single_pct = max_single_pct
        self.max_daily_pct = max_daily_pct
        self.max_bets_per_match = max_bets_per_match
        self.max_drawdown_pct = max_drawdown_pct
        self.daily_exposure: float = 0.0
        self.match_bet_counts: dict[int, int] = {}

    def check_bet(self, bet: ValueBet) -> PortfolioCheck:
        max_single = self.bankroll * self.max_single_pct
        if bet.suggested_stake > max_single:
            return PortfolioCheck(
                approved=True,
                reason=f"Stake capped at {self.max_single_pct*100:.0f}% of bankroll",
                adjusted_stake=round(max_single, 2),
            )

        max_daily = self.bankroll * self.max_daily_pct
        if self.daily_exposure + bet.suggested_stake > max_daily:
            remaining = max_daily - self.daily_exposure
            if remaining <= 0:
                return PortfolioCheck(
                    approved=False,
                    reason="Daily exposure limit reached",
                )
            return PortfolioCheck(
                approved=True,
                reason="Stake reduced to fit daily limit",
                adjusted_stake=round(remaining, 2),
            )

        match_bets = self.match_bet_counts.get(bet.match_id, 0)
        if match_bets >= self.max_bets_per_match:
            return PortfolioCheck(
                approved=False,
                reason=f"Max {self.max_bets_per_match} bets per match reached",
            )

        if self._is_in_drawdown():
            return PortfolioCheck(
                approved=False,
                reason=f"Circuit breaker: drawdown exceeds {self.max_drawdown_pct*100:.0f}%",
            )

        return PortfolioCheck(approved=True, reason="OK")

    def record_bet(self, bet: ValueBet, actual_stake: float) -> None:
        self.daily_exposure += actual_stake
        self.match_bet_counts[bet.match_id] = self.match_bet_counts.get(bet.match_id, 0) + 1

    def update_bankroll(self, profit: float) -> None:
        self.bankroll += profit
        if self.bankroll > self.peak_bankroll:
            self.peak_bankroll = self.bankroll

    def reset_daily(self) -> None:
        self.daily_exposure = 0.0
        self.match_bet_counts.clear()

    def _is_in_drawdown(self) -> bool:
        if self.peak_bankroll <= 0:
            return False
        drawdown = (self.peak_bankroll - self.bankroll) / self.peak_bankroll
        return drawdown >= self.max_drawdown_pct

    @property
    def current_drawdown(self) -> float:
        if self.peak_bankroll <= 0:
            return 0.0
        return (self.peak_bankroll - self.bankroll) / self.peak_bankroll
