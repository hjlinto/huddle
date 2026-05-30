"""
Week routes.

This module owns HTTP endpoints for weekly game and prediction views.
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.week_service import get_week_overview, get_user_week


weeks_bp = Blueprint("weeks", __name__)


@weeks_bp.get("/<string:league>/<int:season>/<int:week>")
def week_overview(league: str, season: int, week: int):
    """
    Return games, odds, and all predictions for a league week.
    """
    result, status_code = get_week_overview(league, season, week)

    return jsonify(result), status_code


@weeks_bp.get("/<string:league>/<int:season>/<int:week>/me")
@jwt_required()
def my_week(league: str, season: int, week: int):
    """
    Return games, odds, and the authenticated user's predictions.
    """
    user_id = int(get_jwt_identity())

    result, status_code = get_user_week(
        user_id=user_id,
        league=league,
        season=season,
        week=week,
    )

    return jsonify(result), status_code