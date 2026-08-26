from functools import cached_property

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Los valores de abajo son solo el fallback si la variable no aparece ni en
    # el entorno ni en .env. Precedencia: shell > .env > este default.
    app_name: str = "Cashero API"
    environment: str = "local"
    # Origenes permitidos por CORS, separados por comas.
    cors_origins: str = "http://localhost:5173"

    @cached_property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
