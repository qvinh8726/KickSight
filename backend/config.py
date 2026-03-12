from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kicksight"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/kicksight"
    database_url_async: str = ""
    redis_url: str = "redis://localhost:6379/0"

    football_data_api_key: str = ""
    odds_api_key: str = ""
    openai_api_key: str = ""

    kelly_fraction: float = 0.25
    min_ev_threshold: float = 0.03
    max_bet_fraction: float = 0.05
    bankroll: float = 1000.0

    log_level: str = "INFO"
    environment: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}

    def get_async_url(self) -> str:
        if self.database_url_async:
            return self.database_url_async
        url = self.database_url_sync or self.database_url
        return url.replace("psycopg2", "asyncpg").replace("postgresql://", "postgresql+asyncpg://")

    def get_sync_url(self) -> str:
        if self.database_url_sync and "psycopg2" in self.database_url_sync:
            return self.database_url_sync
        url = self.database_url
        return url.replace("asyncpg", "psycopg2").replace("postgresql://", "postgresql+psycopg2://")


@lru_cache
def get_settings() -> Settings:
    return Settings()
