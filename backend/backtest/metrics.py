"""Backtesting performance metrics."""

from __future__ import annotations

import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class BacktestMetrics:
    total_bets: int
    winning_bets: int
    win_rate: float
    total_staked: float
    total_profit: float
    roi: float
    max_drawdown: float
    avg_ev: float
    avg_clv: float
    sharpe_ratio: float
    longest_losing_streak: int
    profit_by_market: dict[str, float]
    roi_by_market: dict[str, float]
    monthly_pnl: dict[str, float]


def compute_metrics(bets: pd.DataFrame) -> BacktestMetrics:
    """Compute comprehensive backtesting metrics from a DataFrame of bets.

    Expected columns: market, selection, stake, profit, is_win, ev,
    clv (optional), match_date.
    """
    if bets.empty:
        return _empty_metrics()

    total_bets = len(bets)
    winning_bets = int(bets["is_win"].sum())
    win_rate = winning_bets / total_bets if total_bets > 0 else 0.0
    total_staked = bets["stake"].sum()
    total_profit = bets["profit"].sum()
    roi = total_profit / total_staked if total_staked > 0 else 0.0
    avg_ev = bets["ev"].mean()

    avg_clv = bets["clv"].mean() if "clv" in bets.columns and bets["clv"].notna().any() else 0.0

    cumulative = bets["profit"].cumsum()
    running_max = cumulative.cummax()
    drawdowns = cumulative - running_max
    max_drawdown = abs(drawdowns.min()) if len(drawdowns) > 0 else 0.0

    returns = bets["profit"] / bets["stake"]
    sharpe = (returns.mean() / returns.std()) * np.sqrt(252) if returns.std() > 0 else 0.0

    longest_losing = _longest_streak(bets["is_win"].values, target=0)

    profit_by_market = bets.groupby("market")["profit"].sum().to_dict()
    staked_by_market = bets.groupby("market")["stake"].sum()
    roi_by_market = {
        m: (profit_by_market.get(m, 0) / s) if s > 0 else 0.0
        for m, s in staked_by_market.items()
    }

    bets_copy = bets.copy()
    bets_copy["month"] = pd.to_datetime(bets_copy["match_date"]).dt.to_period("M").astype(str)
    monthly_pnl = bets_copy.groupby("month")["profit"].sum().to_dict()

    return BacktestMetrics(
        total_bets=total_bets,
        winning_bets=winning_bets,
        win_rate=round(win_rate, 4),
        total_staked=round(total_staked, 2),
        total_profit=round(total_profit, 2),
        roi=round(roi, 4),
        max_drawdown=round(max_drawdown, 2),
        avg_ev=round(avg_ev, 4),
        avg_clv=round(avg_clv, 4),
        sharpe_ratio=round(sharpe, 3),
        longest_losing_streak=longest_losing,
        profit_by_market=profit_by_market,
        roi_by_market=roi_by_market,
        monthly_pnl=monthly_pnl,
    )


def _longest_streak(arr: np.ndarray, target: int) -> int:
    max_streak = 0
    current = 0
    for val in arr:
        if val == target:
            current += 1
            max_streak = max(max_streak, current)
        else:
            current = 0
    return max_streak


def _empty_metrics() -> BacktestMetrics:
    return BacktestMetrics(
        total_bets=0, winning_bets=0, win_rate=0.0, total_staked=0.0,
        total_profit=0.0, roi=0.0, max_drawdown=0.0, avg_ev=0.0,
        avg_clv=0.0, sharpe_ratio=0.0, longest_losing_streak=0,
        profit_by_market={}, roi_by_market={}, monthly_pnl={},
    )
