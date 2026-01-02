from flask import Blueprint, request, jsonify
from app.models import Game, Prediction

weeks_bp = Blueprint('weeks', __name__)

@weeks_bp.get('/<int:season>/<int:week>')
def week_overview(season, week):
    games = Game.query.filter_by(season=season, week=week).all()

    response = []
    for g in games:
        preds = Prediction.query.filter_by(game_id=g.id).all()
        response.append({
            'game': g.to_dict(),
            'odds': g.odds.to_dict() if g.odds else None,
            'predictions': [p.to_dict() for p in preds]
        })

    return jsonify(response)
