"""Time-based data splitting to prevent data leakage."""

from __future__ import annotations

from datetime import date
from dataclasses import dataclass

import pandas as pd


@dataclass
class DataSplit:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame
    train_end: date
    val_end: date


def time_based_split(
    df: pd.DataFrame,
    train_pct: float = 0.6,
    val_pct: float = 0.2,
    date_col: str = "match_date",
) -> DataSplit:
    """Split data chronologically to prevent look-ahead bias.

    The most recent data goes to test, the middle to validation,
    and the earliest data to training. No random shuffling.
    """
    df = df.sort_values(date_col).copy()
    n = len(df)

    train_end_idx = int(n * train_pct)
    val_end_idx = int(n * (train_pct + val_pct))

    train = df.iloc[:train_end_idx]
    validation = df.iloc[train_end_idx:val_end_idx]
    test = df.iloc[val_end_idx:]

    train_end = train[date_col].max()
    val_end = validation[date_col].max() if not validation.empty else train_end

    if hasattr(train_end, "date"):
        train_end = train_end.date()
    if hasattr(val_end, "date"):
        val_end = val_end.date()

    return DataSplit(
        train=train,
        validation=validation,
        test=test,
        train_end=train_end,
        val_end=val_end,
    )


def expanding_window_splits(
    df: pd.DataFrame,
    initial_train_pct: float = 0.4,
    step_pct: float = 0.1,
    date_col: str = "match_date",
) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
    """Generate expanding training window splits for walk-forward analysis."""
    df = df.sort_values(date_col).copy()
    n = len(df)
    splits = []

    train_end = int(n * initial_train_pct)
    step_size = max(int(n * step_pct), 1)

    while train_end < n:
        test_end = min(train_end + step_size, n)
        train = df.iloc[:train_end]
        test = df.iloc[train_end:test_end]
        if not test.empty:
            splits.append((train, test))
        train_end = test_end

    return splits
