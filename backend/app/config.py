"""
Application configuration.

This module owns environment variable loading and Flask configuration values.

Feature logic, database queries, and route behavior should not live here.
"""

import os

from dotenv import load_dotenv


# Environment variables are loaded once during configuration setup so the
# rest of the application can read settings from a single source.
load_dotenv()


class Config:
    """
    Runtime configuration for the Flask backend.

    This class centralizes environment-specific settings so secrets,
    database URLs, and Flask options are not scattered across the app.
    """

    SECRET_KEY = os.getenv("SECRET_KEY")

    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "nfl_predictions")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

    DATABASE_URL = os.getenv("DATABASE_URL")

    SQLALCHEMY_DATABASE_URI = (
        DATABASE_URL
        if DATABASE_URL
        else (
            f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
            f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        )
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False