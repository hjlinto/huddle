"""
Database reset command.

Drops and recreates every table for the configured DATABASE_URL. This is
destructive and requires an explicit confirmation flag.
"""

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(BACKEND_DIR))

from app import create_app
from app.db import db


def main() -> None:
    """Reset all database tables for the configured backend database."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--confirm-reset",
        action="store_true",
        help="Actually drop and recreate all configured database tables.",
    )
    args = parser.parse_args()

    if not args.confirm_reset:
        raise SystemExit("Refusing to reset without --confirm-reset.")

    app = create_app()

    with app.app_context():
        db.drop_all()
        db.create_all()

    print("Database tables dropped and recreated successfully.")


if __name__ == "__main__":
    main()
