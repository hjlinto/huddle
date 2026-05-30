"""
Database table creation command.

Creates all database tables defined by the application's models.
"""

from app import create_app
from app.db import db


def create_tables() -> None:
    """
    Create all database tables.
    """
    app = create_app()

    with app.app_context():
        db.create_all()

    print("Database tables created successfully.")


if __name__ == "__main__":
    create_tables()