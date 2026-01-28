from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models import Prediction, User, Game

users_bp = Blueprint("users", __name__)


def _record(preds, attr: str):
    vals = [getattr(p, attr, None) for p in preds]
    wins = sum(v is True for v in vals)
    losses = sum(v is False for v in vals)
    pushes = sum(v is None for v in vals)
    total = len(vals)
    return {
        "wins": wins,
        "losses": losses,
        "pushes": pushes,
        "total": total,
        "win_pct": (wins / total) if total else 0.0,
    }

# Current user profile
@users_bp.get("/me")
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    u = User.query.get_or_404(user_id)

    return jsonify(u.to_dict()), 200

# Current user stats
@users_bp.get("/<string:league>/me/stats")
@jwt_required()
def my_stats(league: str):
    league = (league or "").strip().lower()
    if league not in ("nfl", "cfb"):
        return jsonify({"error": "Invalid league"}), 400
    
    user_id = int(get_jwt_identity())

    season = request.args.get("season", type=int)
    week = request.args.get("week", type=int)

    q = (
        db.session.query(Prediction)
        .join(Game, Prediction.game_id == Game.id)
        .filter(Prediction.user_id == user_id)
        .filter(Prediction.graded_at.isnot(None))
        .filter(Game.league == league)
    )

    if season is not None:
        q = q.filter(Game.season == season)
    if week is not None:
        q = q.filter(Game.week == week)

    preds = q.all()

    return jsonify({
        "league": league,
        "counts": {"predictions": len(preds)},
        "winner": _record(preds, "winner_correct"),
        "ats": _record(preds, "spread_correct"),
        "total": _record(preds, "total_correct"),
        "season": season,
        "week": week,
    }), 200


# Stats by user_id
@users_bp.get("/<int:user_id>/stats")
@jwt_required()
def user_stats(user_id: int):
    current_user_id = int(get_jwt_identity())
    if user_id != current_user_id:
        return jsonify({"error": "Forbidden"}), 403

    u = User.query.get_or_404(user_id)

    season = request.args.get("season", type=int)
    week = request.args.get("week", type=int)

    q = (
        db.session.query(Prediction)
        .join(Game, Prediction.game_id == Game.id)
        .filter(Prediction.user_id == user_id)
        .filter(Prediction.graded_at.isnot(None))
    )

    if season is not None:
        q = q.filter(Game.season == season)
    if week is not None:
        q = q.filter(Game.week == week)

    preds = q.all()

    return jsonify({
        "user": u.to_dict(),
        "counts": {"predictions": len(preds)},
        "winner": _record(preds, "winner_correct"),
        "ats": _record(preds, "spread_correct"),
        "total": _record(preds, "total_correct"),
        "season": season,
        "week": week,
    }), 200
