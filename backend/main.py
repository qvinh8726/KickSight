"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from backend.database import async_engine, Base
from backend.api.schemas import HealthOut
from backend.api.matches import router as matches_router, teams_router
from backend.api.predictions import router as predictions_router
from backend.api.backtest_api import router as backtest_router
from backend.api.analysis_api import router as analysis_router
from backend.api.data_api import router as data_router
from backend.config import get_settings

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(get_settings().log_level),
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await async_engine.dispose()


app = FastAPI(
    title="KickSight - Football Betting AI",
    description=(
        "KickSight predicts match probabilities, detects value bets, "
        "and generates AI reports for the 2026 FIFA World Cup. "
        "Predictions are probability-based estimates, not profit guarantees."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(matches_router)
app.include_router(teams_router)
app.include_router(predictions_router)
app.include_router(backtest_router)
app.include_router(analysis_router)
app.include_router(data_router)


@app.get("/api/health", response_model=HealthOut)
async def health():
    return HealthOut(status="healthy", version="1.0.0", models_loaded=False)
