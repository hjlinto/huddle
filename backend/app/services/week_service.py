"""
Week service.

This module owns weekly game lookup and weekly prediction response assembly.
"""

from app.models import Game, Prediction


ALLOWED_LEAGUES = {"nfl", "ncaaf"}


def get_week_overview(league: str, season: int, week: int) -> tuple[dict, int]:
    """
    Return games, odds, and all predictions for a league week.
    """
    normalized_league = _normalize_league(league)

    if normalized_league not in ALLOWED_LEAGUES:
        return {"error": "Invalid league"}, 404

    games = Game.query.filter_by(
        league=normalized_league,
        season=season,
        week=week,
    ).all()

    response_games = []

    for game in games:
        predictions = Prediction.query.filter_by(game_id=game.id).all()

        response_games.append(
            {
                "game": game.to_dict(),
                "odds": game.odds.to_dict() if game.odds else None,
                "predictions": [
                    prediction.to_dict() for prediction in predictions
                ],
            }
        )

    return {
        "league": normalized_league,
        "season": season,
        "week": week,
        "games": response_games,
    }, 200


def get_user_week(
    user_id: int,
    league: str,
    season: int,
    week: int,
) -> tuple[dict, int]:
    """
    Return games, odds, and one user's predictions for a league week.
    """
    normalized_league = _normalize_league(league)

    if normalized_league not in ALLOWED_LEAGUES:
        return {"error": "Invalid league"}, 404

    games = Game.query.filter_by(
        league=normalized_league,
        season=season,
        week=week,
    ).all()

    response_games = []

    for game in games:
        user_prediction = Prediction.query.filter_by(
            game_id=game.id,
            user_id=user_id,
        ).first()

        response_games.append(
            {
                "game": game.to_dict(),
                "odds": game.odds.to_dict() if game.odds else None,
                "my_prediction": (
                    user_prediction.to_dict() if user_prediction else None
                ),
            }
        )

    return {
        "league": normalized_league,
        "season": season,
        "week": week,
        "games": response_games,
    }, 200


def _normalize_league(league: str) -> str:
    """
    Normalize league identifiers before validation and querying.
    """
    return (league or "").strip().lower()