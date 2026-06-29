import os

class Settings:
    APP_NAME = "KinoKompaniya"
    APP_VERSION = "1.0.0"
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:secret_password_1337@postgres:5432/kinodb")
    SECRET_KEY = os.getenv("JWT_SECRET", "super_secret_coursework_key_9999")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

settings = Settings()