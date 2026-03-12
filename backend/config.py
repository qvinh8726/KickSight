from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/football_betting"
    database_url_sync: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/football_betting"
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

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
