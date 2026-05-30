"""
Weekly data ingestion service.

This module owns loading game and odds data from weekly CSV files.
"""

import csv
from datetime import datetime

from app.db import db
from app.models import Game, Odds


def ingest_week_csv(csv_file_path: str, league: str, season: int, week: int) -> dict:
    """
    Load game and odds records from a weekly CSV file.
    """
    games_created = 0
    games_updated = 0
    odds_created = 0
    odds_updated = 0

    with open(csv_file_path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            game, was_created = _upsert_game(row, league, season, week)
            db.session.add(game)
            db.session.flush()

            odds, odds_was_created = _upsert_odds(row, game.id)
            db.session.add(odds)

            if was_created:
                games_created += 1
            else:
                games_updated += 1

            if odds_was_created:
                odds_created += 1
            else:
                odds_updated += 1

    db.session.commit()

    return {
        "games_created": games_created,
        "games_updated": games_updated,
        "odds_created": odds_created,
        "odds_updated": odds_updated,
    }


def _upsert_game(row: dict, league: str, season: int, week: int) -> tuple[Game, bool]:
    """
    Create or update a game from one CSV row.
    """
    normalized_league = league.strip().lower()

    game = Game.query.filter_by(
        league=normalized_league,
        season=season,
        week=week,
        home_team=row["home_team"].strip(),
        away_team=row["away_team"].strip(),
    ).first()

    was_created = game is None

    if was_created:
        game = Game(
            league=normalized_league,
            season=season,
            week=week,
            home_team=row["home_team"].strip(),
            away_team=row["away_team"].strip(),
        )

    game.game_date = datetime.strptime(row["game_date"], "%Y-%m-%d").date()
    game.home_score = _optional_int(row.get("home_score"))
    game.away_score = _optional_int(row.get("away_score"))
    game.home_team_wins = _optional_bool(row.get("home_team_wins"))
    game.is_final = _optional_bool(row.get("is_final")) or False

    return game, was_created


def _upsert_odds(row: dict, game_id: int) -> tuple[Odds, bool]:
    """
    Create or update odds for a game from one CSV row.
    """
    odds = Odds.query.filter_by(game_id=game_id).first()
    was_created = odds is None

    if was_created:
        odds = Odds(game_id=game_id)

    odds.spread = _optional_float(row.get("spread"))
    odds.total = _optional_float(row.get("total"))
    odds.snapshot_ts = datetime.utcnow()

    return odds, was_created


def _optional_int(value: str | None) -> int | None:
    """
    Convert optional CSV integer values.
    """
    if value in (None, "", "NA"):
        return None

    return int(value)


def _optional_float(value: str | None) -> float | None:
    """
    Convert optional CSV decimal values.
    """
    if value in (None, "", "NA"):
        return None

    return float(value)


def _optional_bool(value: str | None) -> bool | None:
    """
    Convert optional CSV boolean values.
    """
    if value in (None, "", "NA"):
        return None

    return value.strip().lower() == "true"