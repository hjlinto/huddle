"""
Targeted weekly database reset command.

Deletes predictions, odds, and games for one league/season/week. It also
applies the game columns needed by ESPN ingestion before deleting rows.
"""

import argparse
import sys
from pathlib import Path

from sqlalchemy import inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[2]
sys.path.append(str(BACKEND_DIR))

from app import create_app
from app.db import db


GAME_COLUMNS = {
    "game_time": "TIME",
    "source": "VARCHAR(50)",
    "source_event_id": "VARCHAR(50)",
    "home_rank": "INTEGER",
    "away_rank": "INTEGER",
    "home_record": "VARCHAR(50)",
    "away_record": "VARCHAR(50)",
}


def main() -> None:
    """Reset one league/season/week in the configured database."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--league", default="ncaaf")
    parser.add_argument("--season", required=True, type=int)
    parser.add_argument("--week", required=True, type=int)
    parser.add_argument("--confirm-reset", action="store_true")
    args = parser.parse_args()

    if not args.confirm_reset:
        raise SystemExit("Refusing to reset without --confirm-reset.")

    app = create_app()

    with app.app_context():
        _ensure_game_columns()
        result = _delete_week(
            league=args.league,
            season=args.season,
            week=args.week,
        )

    print("Weekly reset complete")
    print(f"League: {args.league}")
    print(f"Season: {args.season}")
    print(f"Week: {args.week}")
    print(f"Predictions deleted: {result['predictions_deleted']}")
    print(f"Odds deleted: {result['odds_deleted']}")
    print(f"Games deleted: {result['games_deleted']}")


def _ensure_game_columns() -> None:
    existing_columns = {
        column["name"] for column in inspect(db.engine).get_columns("games")
    }

    for column_name, column_type in GAME_COLUMNS.items():
        if column_name not in existing_columns:
            db.session.execute(
                text(f"ALTER TABLE games ADD COLUMN {column_name} {column_type}")
            )

    if db.engine.dialect.name == "postgresql":
        db.session.execute(text("ALTER TABLE games ALTER COLUMN home_team TYPE VARCHAR(100)"))
        db.session.execute(text("ALTER TABLE games ALTER COLUMN away_team TYPE VARCHAR(100)"))
        db.session.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_constraint
                        WHERE conname = 'uq_games_source_event_id'
                    ) THEN
                        ALTER TABLE games
                        ADD CONSTRAINT uq_games_source_event_id
                        UNIQUE (source, source_event_id);
                    END IF;
                END $$;
                """
            )
        )

    db.session.commit()


def _delete_week(league: str, season: int, week: int) -> dict:
    params = {
        "league": league.strip().lower(),
        "season": season,
        "week": week,
    }

    if db.engine.dialect.name == "postgresql":
        predictions_result = db.session.execute(
            text(
                """
                DELETE FROM predictions
                USING games
                WHERE predictions.game_id = games.id
                    AND games.league = :league
                    AND games.season = :season
                    AND games.week = :week
                """
            ),
            params,
        )
        odds_result = db.session.execute(
            text(
                """
                DELETE FROM odds
                USING games
                WHERE odds.game_id = games.id
                    AND games.league = :league
                    AND games.season = :season
                    AND games.week = :week
                """
            ),
            params,
        )
    else:
        game_ids = (
            "SELECT id FROM games "
            "WHERE league = :league AND season = :season AND week = :week"
        )
        predictions_result = db.session.execute(
            text(f"DELETE FROM predictions WHERE game_id IN ({game_ids})"),
            params,
        )
        odds_result = db.session.execute(
            text(f"DELETE FROM odds WHERE game_id IN ({game_ids})"),
            params,
        )

    games_result = db.session.execute(
        text(
            """
            DELETE FROM games
            WHERE league = :league
                AND season = :season
                AND week = :week
            """
        ),
        params,
    )

    db.session.commit()

    return {
        "predictions_deleted": predictions_result.rowcount,
        "odds_deleted": odds_result.rowcount,
        "games_deleted": games_result.rowcount,
    }


if __name__ == "__main__":
    main()
