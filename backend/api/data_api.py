"""Data ingestion API endpoints."""

from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, HTTPException
from pathlib import Path
import tempfile

from backend.data.ingestion import DataIngestionService
from backend.data.loaders import CSVLoader, JSONLoader

router = APIRouter(prefix="/api/data", tags=["data"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/ingest/competition")
async def ingest_competition(competition_id: int, season: int):
    service = DataIngestionService()
    count = await service.ingest_competition_matches(competition_id, season)
    return {"status": "ok", "matches_ingested": count}


@router.post("/ingest/worldcup")
async def ingest_world_cup():
    service = DataIngestionService()
    count = await service.ingest_world_cup_2026()
    return {"status": "ok", "matches_ingested": count}


@router.post("/ingest/odds")
async def ingest_odds(sport: str = "soccer_fifa_world_cup"):
    service = DataIngestionService()
    count = await service.ingest_odds(sport=sport)
    return {"status": "ok", "odds_ingested": count}


@router.post("/upload/csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_UPLOAD_SIZE // 1024 // 1024}MB)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loader = CSVLoader()
        count = loader.load(tmp_path)
        return {"status": "ok", "rows_loaded": count}
    finally:
        Path(tmp_path).unlink(missing_ok=True)


@router.post("/upload/json")
async def upload_json(file: UploadFile = File(...)):
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="File must be JSON")

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=413, detail=f"File too large (max {MAX_UPLOAD_SIZE // 1024 // 1024}MB)")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        loader = JSONLoader()
        count = loader.load(tmp_path)
        return {"status": "ok", "rows_loaded": count}
    finally:
        Path(tmp_path).unlink(missing_ok=True)
