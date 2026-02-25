from pydantic_settings import BaseSettings, SettingsConfigDict

"""
Exact order of reading variable is:
1. OS environment variables (highest priority)
2. .env file values (if .env exists)
3,. Defaults in Settings class (lowest priority)
"""
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_ignore_empty=True)

    # App
    APP_NAME: str = "AGM Portal MVP"
    ENV: str = "dev"  # dev|prod
    API_V1_PREFIX: str = "/api/v1" # Puts /api/v1 in front of every URL so you can version your API later.

    # Security
    SECRET_KEY: str = "change-me" # used to sign login tokens.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60*24  # 1 day
    ALGORITHM: str = "HS256"

    # CORS, Guest List of allowed websites in production.
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Database, The specific "map" to find your Postgres database container.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@db:5432/agm"

    # Optional LLM integration
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o-mini"


settings = Settings()
