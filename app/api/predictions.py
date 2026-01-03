from flask import Blueprint, request, jsonify
from app.models import Prediction
from app.extensions import db

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
def create_or_update_prediction():
    data = request.get_json()

    user_id = data['user_id']
    game_id = data['game_id']

    p = Prediction.query.filter_by(
        user_id=user_id,
        game_id=game_id
    ).first()

    if not p:
        p = Prediction(
            user_id=user_id,
            game_id=game_id
        )
        db.session.add(p)

    # set/update prediction fields
    p.predicted_winner = data['predicted_winner']
    p.predicted_spread = data.get('predicted_spread')
    p.predicted_total = data.get('predicted_total')

    db.session.commit()
    return jsonify(p.to_dict()), 200

@predictions_bp.put('/<int:prediction_id>')
def update_prediction(prediction_id: int):
    data = request.get_json() or {}
    p = Prediction.query.get_or_404(prediction_id)

    # allow updating any of these
    if 'predicted_winner' in data:
        p.predicted_winner = data['predicted_winner']
    if 'predicted_spread' in data:
        p.predicted_spread = data['predicted_spread']
    if 'predicted_total' in data:
        p.predicted_total = data['predicted_total']

    from app.extensions import db
    db.session.commit()
    return jsonify(p.to_dict())
