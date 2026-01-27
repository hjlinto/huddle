from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Game, Prediction

weeks_bp = Blueprint("weeks", __name__)

# Returns all predictions for the week (all users)
@weeks_bp.get("/<int:season>/<int:week>")
def week_overview(season: int, week: int):
    games = Game.query.filter_by(season=season, week=week).all()

    response = []
    for g in games:
        preds = Prediction.query.filter_by(game_id=g.id).all()
        response.append({
            "game": g.to_dict(),
            "odds": g.odds.to_dict() if g.odds else None,
            "predictions": [p.to_dict() for p in preds],
        })

    return jsonify({
        "season": season,
        "week": week,
        "games": response
    }), 200

# Returns games, odds, *current user's* prediction
@weeks_bp.get("/<int:season>/<int:week>/me")
@jwt_required()
def my_week(season: int, week: int):
    user_id = int(get_jwt_identity())

    games = Game.query.filter_by(season=season, week=week).all()

    response = []
    for g in games:
        my_pred = Prediction.query.filter_by(
            game_id=g.id,
            user_id=user_id
        ).first()

        response.append({
            "game": g.to_dict(),
            "odds": g.odds.to_dict() if g.odds else None,
            "my_prediction": my_pred.to_dict() if my_pred else None,
        })

    return jsonify({
        "season": season,
        "week": week,
        "games": response
    }), 200
