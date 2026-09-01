from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # The values below are only the fallback when the variable is present neither
    # in the environment nor in .env. Precedence: shell > .env > this default.
    app_name: str = "Cashero API"
    environment: str = "local"
    # CORS allowed origins, comma-separated.
    cors_origins: str = "http://localhost:5173"

    # --- Supabase (used only as the Postgres database) ---
    # Postgres connection string for SQLAlchemy async (asyncpg driver).
    # Dashboard -> Project Settings -> Database -> Connection string -> "URI".
    # Must start with postgresql+asyncpg://
    database_url: str = ""

    # --- Auth ---
    # Shared secret the single client must send in the X-API-Key header.
    # Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    api_key: str = ""

    @cached_property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
