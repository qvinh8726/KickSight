"""Run a full backtest from the command line."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dataclasses import asdict
import json

from backend.data.processors import DataProcessor
from backend.backtest.engine import BacktestEngine


def main():
    print("Loading match data...")
    processor = DataProcessor()
    df = processor.load_matches_df()
    print(f"Loaded {len(df)} matches")

    odds_df = processor.load_odds_df()
    print(f"Loaded {len(odds_df)} odds records")

    if not odds_df.empty:
        df = processor.merge_match_odds(df, odds_df)

    print("\nRunning backtest (60/20/20 split)...")
    engine = BacktestEngine(min_ev=0.03, kelly_fraction=0.25, bankroll=1000.0)
    metrics, bets = engine.run_backtest(df, odds_df, train_pct=0.6, val_pct=0.2)

    print("\n" + "=" * 60)
    print("BACKTEST RESULTS")
    print("=" * 60)
    print(f"Total Bets:       {metrics.total_bets}")
    print(f"Winning Bets:     {metrics.winning_bets}")
    print(f"Win Rate:         {metrics.win_rate:.1%}")
    print(f"Total Staked:     ${metrics.total_staked:.2f}")
    print(f"Total Profit:     ${metrics.total_profit:.2f}")
    print(f"ROI:              {metrics.roi:.1%}")
    print(f"Max Drawdown:     ${metrics.max_drawdown:.2f}")
    print(f"Sharpe Ratio:     {metrics.sharpe_ratio:.3f}")
    print(f"Avg EV:           {metrics.avg_ev:.1%}")
    print(f"Avg CLV:          {metrics.avg_clv:.1%}")
    print(f"Losing Streak:    {metrics.longest_losing_streak}")

    print("\nPerformance by Market:")
    for market, profit in metrics.profit_by_market.items():
        roi = metrics.roi_by_market.get(market, 0)
        print(f"  {market:15s}  P&L: ${profit:8.2f}  ROI: {roi:.1%}")

    if not bets.empty:
        bets.to_csv("backtest_results.csv", index=False)
        print(f"\nDetailed bets saved to backtest_results.csv ({len(bets)} bets)")


if __name__ == "__main__":
    main()
