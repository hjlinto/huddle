import os
from dotenv import load_dotenv

# Load environment variables from a .env file if it exists
load_dotenv()

class Config:
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key')

    # PostgreSQL settings
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'password')
    POSTGRES_DB = os.getenv('POSTGRES_DB', 'nfl_predictions')
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', '5432')

    DATABASE_URL = os.getenv("DATABASE_URL")

    if DATABASE_URL:
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
    else:
        SQLALCHEMY_DATABASE_URI = (
            f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
            f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False
