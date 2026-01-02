from flask import Blueprint, request, jsonify
from app.models import Prediction

predictions_bp = Blueprint('predictions', __name__)

@predictions_bp.get('/')
def list_predictions():
    season = request.args.get('season', type=int)
    week = request.args.get('week', type=int)

    q = Prediction.query
    if season:
        q = q.filter_by(season=season)
    if week:
        q = q.filter_by(week=week)

    return jsonify([p.to_dict() for p in q.all()])

@predictions_bp.post('/')
def create_prediction():
    data = request.get_json()

    p = Prediction(
        user_id=data['user_id'],
        game_id=data['game_id'],
        predicted_winner=data['predicted_winner'],
        predicted_spread=data.get('predicted_spread'),
        predicted_total=data.get('predicted_total')
    )

    from app.extensions import db
    db.session.add(p)
    db.session.commit()
    
    return jsonify(p.to_dict()), 201