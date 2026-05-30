"""
User routes.

This module owns HTTP endpoints for authenticated user profile and
user prediction statistics.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.user_service import get_user_profile, get_user_stats


users_bp = Blueprint("users", __name__)


@users_bp.get("/me")
@jwt_required()
def me():
    """
    Return the authenticated user's profile.
    """
    user_id = int(get_jwt_identity())

    result, status_code = get_user_profile(user_id)

    return jsonify(result), status_code


@users_bp.get("/<string:league>/me/stats")
@jwt_required()
def my_stats(league: str):
    """
    Return league-specific stats for the authenticated user.
    """
    user_id = int(get_jwt_identity())
    season = request.args.get("season", type=int)
    week = request.args.get("week", type=int)

    result, status_code = get_user_stats(
        user_id=user_id,
        league=league,
        season=season,
        week=week,
        include_user=False,
    )

    return jsonify(result), status_code


@users_bp.get("/<int:user_id>/stats")
@jwt_required()
def user_stats(user_id: int):
    """
    Return stats for a specific user if requested by that same user.
    """
    current_user_id = int(get_jwt_identity())

    if user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403

    season = request.args.get("season", type=int)
    week = request.args.get("week", type=int)

    result, status_code = get_user_stats(
        user_id=user_id,
        season=season,
        week=week,
        include_user=True,
    )

    return jsonify(result), status_code