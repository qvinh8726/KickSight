"""Backtesting API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from dataclasses import asdict

from backend.api.schemas import BacktestRequest, BacktestOut
from backend.data.processors import DataProcessor
from backend.backtest.engine import BacktestEngine

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


@router.post("/run", response_model=BacktestOut)
async def run_backtest(request: BacktestRequest):
    processor = DataProcessor()
    df = processor.load_matches_df(
        competition=request.competition,
        min_date=request.min_date,
    )

    if df.empty or len(df) < 50:
        raise HTTPException(status_code=400, detail="Insufficient match data for backtesting (need 50+ matches)")

    odds_df = processor.load_odds_df()
    df = processor.merge_match_odds(df, odds_df)

    engine = BacktestEngine(
        min_ev=request.min_ev,
        kelly_fraction=request.kelly_fraction,
    )
    metrics, _ = engine.run_backtest(
        df, odds_df,
        train_pct=request.train_pct,
        val_pct=request.val_pct,
    )

    return BacktestOut(**asdict(metrics))


@router.post("/walk-forward", response_model=BacktestOut)
async def run_walk_forward(request: BacktestRequest):
    processor = DataProcessor()
    df = processor.load_matches_df(
        competition=request.competition,
        min_date=request.min_date,
    )

    if df.empty or len(df) < 50:
        raise HTTPException(status_code=400, detail="Insufficient match data")

    odds_df = processor.load_odds_df()
    df = processor.merge_match_odds(df, odds_df)

    engine = BacktestEngine(
        min_ev=request.min_ev,
        kelly_fraction=request.kelly_fraction,
    )
    metrics, _ = engine.run_walk_forward(df, odds_df)

    return BacktestOut(**asdict(metrics))
