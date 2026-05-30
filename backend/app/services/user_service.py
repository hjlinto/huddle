"""
User service.

This module owns user profile lookup and prediction statistics aggregation.

HTTP request parsing should live in user routes.
Database schema definitions should live in models.
"""

from app.db import db
from app.models import Game, Prediction, User


ALLOWED_LEAGUES = {"nfl", "ncaaf"}


def get_user_profile(user_id: int) -> tuple[dict, int]:
    """
    Return profile data for a user.
    """
    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found"}, 404

    return user.to_dict(), 200


def get_user_stats(
    user_id: int,
    league: str | None = None,
    season: int | None = None,
    week: int | None = None,
    include_user: bool = False,
) -> tuple[dict, int]:
    """
    Return graded prediction statistics for a user.
    """
    normalized_league = _normalize_league(league)

    if normalized_league and normalized_league not in ALLOWED_LEAGUES:
        return {"error": "Invalid league"}, 400

    user = User.query.get(user_id)

    if not user:
        return {"error": "User not found"}, 404

    query = (
        db.session.query(Prediction)
        .join(Game, Prediction.game_id == Game.id)
        .filter(Prediction.user_id == user_id)
        .filter(Prediction.graded_at.isnot(None))
    )

    if normalized_league:
        query = query.filter(Game.league == normalized_league)

    if season is not None:
        query = query.filter(Game.season == season)

    if week is not None:
        query = query.filter(Game.week == week)

    predictions = query.all()

    response = {
        "counts": {"predictions": len(predictions)},
        "winner": _build_record(predictions, "winner_correct"),
        "ats": _build_record(predictions, "spread_correct"),
        "total": _build_record(predictions, "total_correct"),
        "season": season,
        "week": week,
    }

    if normalized_league:
        response["league"] = normalized_league

    if include_user:
        response["user"] = user.to_dict()

    return response, 200


def _build_record(predictions: list[Prediction], attr: str) -> dict:
    """
    Build win/loss/push statistics from a prediction result field.
    """
    values = [getattr(prediction, attr, None) for prediction in predictions]

    wins = sum(value is True for value in values)
    losses = sum(value is False for value in values)
    pushes = sum(value is None for value in values)
    total = len(values)

    return {
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "total": total,
        "win_pct": (wins / total) if total else 0.0,
    }


def _normalize_league(league: str | None) -> str | None:
    """
    Normalize optional league input for filtering.
    """
    if not league:
        return None

    return league.strip().lower()