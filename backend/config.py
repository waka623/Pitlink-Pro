"""Application settings."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ROOT = Path(__file__).resolve().parent.parent
_BACKEND = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(_ROOT / ".env"), extra="ignore")

    DATABASE_URL: str = f"sqlite+aiosqlite:///{(_BACKEND / 'pitlink.db').as_posix()}"
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@pitlink.pro"
    PRICING_MIN_DISCOUNT: float = 0.7
    PRICING_MAX_PREMIUM: float = 1.3
    PRICING_IDLE_MULTIPLIER: float = 0.8
    PRICING_NEW_CUSTOMER_WEEKDAY_MULTIPLIER: float = 0.65
    PRICING_PEAK_MULTIPLIER: float = 1.1
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    WEATHER_API_KEY: str = ""
    LINE_CHANNEL_ACCESS_TOKEN: str = ""
    LINE_CHANNEL_SECRET: str = ""
    RESERVATION_SYSTEM_NAME: str = "店舗予約システム"
    RESERVATION_API_URL: str = ""
    RESERVATION_API_KEY: str = ""


settings = Settings()
