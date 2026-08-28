"""
ESPN college football scoreboard ingestion.

This module maps ESPN scoreboard data into the app's game and odds tables.
"""

from datetime import datetime

from app.db import db
from app.models import Game, Odds
from app.services.espn_scoreboard_client import (
    fetch_espn_fbs_scoreboard,
    map_espn_event,
)


def ingest_espn_fbs_week(
    season: int,
    week: int,
    season_type: int = 2,
    group: int = 80,
) -> dict:
    """
    Fetch and upsert one ESPN FBS scoreboard week.
    """
    payload = fetch_espn_fbs_scoreboard(
        season=season,
        week=week,
        season_type=season_type,
        group=group,
    )
    games = [map_espn_event(event) for event in payload.get("events", [])]

    return ingest_espn_games(games=games, season=season, week=week)


def ingest_espn_games(games: list[dict], season: int, week: int) -> dict:
    """
    Upsert normalized ESPN games and odds.
    """
    games_created = 0
    games_updated = 0
    odds_created = 0
    odds_updated = 0

    for row in games:
        game, was_created = _upsert_game(row=row, season=season, week=week)
        db.session.add(game)
        db.session.flush()

        odds, odds_was_created = _upsert_odds(row=row, game_id=game.id)
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


def _upsert_game(row: dict, season: int, week: int) -> tuple[Game, bool]:
    game = None

    if row.get("source_event_id"):
        game = Game.query.filter_by(
            source=row["source"],
            source_event_id=row["source_event_id"],
        ).first()

    if not game:
        game = Game.query.filter_by(
            league="ncaaf",
            season=season,
            week=week,
            home_team=row["home_team"],
            away_team=row["away_team"],
        ).first()

    was_created = game is None

    if was_created:
        game = Game(
            league="ncaaf",
            season=season,
            week=week,
            home_team=row["home_team"],
            away_team=row["away_team"],
        )

    game.game_date = row["game_date"]
    game.game_time = row["game_time"]
    game.source = row["source"]
    game.source_event_id = row["source_event_id"]
    game.home_rank = row["home_rank"]
    game.away_rank = row["away_rank"]
    game.home_record = row["home_record"]
    game.away_record = row["away_record"]
    game.home_score = row["home_score"]
    game.away_score = row["away_score"]
    game.home_team_wins = row["home_team_wins"]
    game.is_final = row["is_final"]

    return game, was_created


def _upsert_odds(row: dict, game_id: int) -> tuple[Odds, bool]:
    odds = Odds.query.filter_by(game_id=game_id).first()
    was_created = odds is None

    if was_created:
        odds = Odds(game_id=game_id)

    odds.spread = row["spread"]
    odds.total = row["total"]
    odds.snapshot_ts = datetime.utcnow()

    return odds, was_created
