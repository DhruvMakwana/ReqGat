from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://reqgat:reqgat_dev@localhost:5432/reqgat"
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ENCRYPTION_KEY: str = "dev-encryption-key-32bytes-fernet="
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    STORAGE_PATH: str = "./storage/documents"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]


settings = Settings()
