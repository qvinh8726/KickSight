"""API client wrappers for external football data sources."""

from __future__ import annotations

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential
from backend.config import get_settings

logger = structlog.get_logger()


class FootballDataClient:
    """Client for football-data.org API (free tier supports international matches)."""

    BASE_URL = "https://api.football-data.org/v4"

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.football_data_api_key
        self.headers = {"X-Auth-Token": self.api_key}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
    async def _get(self, endpoint: str, params: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.BASE_URL}{endpoint}",
                headers=self.headers,
                params=params or {},
            )
            resp.raise_for_status()
            return resp.json()

    async def get_competitions(self) -> dict:
        return await self._get("/competitions")

    async def get_competition_matches(
        self, competition_id: int, season: int | None = None, matchday: int | None = None
    ) -> dict:
        params = {}
        if season:
            params["season"] = season
        if matchday:
            params["matchday"] = matchday
        return await self._get(f"/competitions/{competition_id}/matches", params)

    async def get_team(self, team_id: int) -> dict:
        return await self._get(f"/teams/{team_id}")

    async def get_match(self, match_id: int) -> dict:
        return await self._get(f"/matches/{match_id}")

    async def get_world_cup_matches(self, season: int = 2026) -> dict:
        return await self.get_competition_matches(competition_id=2000, season=season)


class OddsAPIClient:
    """Client for the-odds-api.com for bookmaker odds."""

    BASE_URL = "https://api.the-odds-api.com/v4"

    def __init__(self):
        settings = get_settings()
        self.api_key = settings.odds_api_key

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
    async def _get(self, endpoint: str, params: dict | None = None) -> dict:
        base_params = {"apiKey": self.api_key}
        if params:
            base_params.update(params)
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(f"{self.BASE_URL}{endpoint}", params=base_params)
            resp.raise_for_status()
            return resp.json()

    async def get_soccer_odds(
        self,
        sport: str = "soccer_fifa_world_cup",
        regions: str = "eu,uk",
        markets: str = "h2h,totals,spreads",
    ) -> list[dict]:
        data = await self._get(
            f"/sports/{sport}/odds",
            {"regions": regions, "markets": markets, "oddsFormat": "decimal"},
        )
        return data

    async def get_available_sports(self) -> list[dict]:
        return await self._get("/sports")
