from flask import Blueprint, request, jsonify
from app.models import Prediction, User
from app.extensions import db

users_bp = Blueprint('users', __name__)

# Create a new user
@users_bp.post('/')
def create_user():
    data = request.get_json()

    u = User(
        username=data['username'],
    )

    db.session.add(u)
    db.session.commit()
    
    return jsonify(u.to_dict()), 201

# List all users
@users_bp.get('/')
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])

# Get statistics for a specific user's predictions
@users_bp.get('/<int:user_id>/stats')
def user_stats(user_id):

    u = User.query.get(user_id)
    if not u:
        return jsonify({'error': 'User not found'}), 404
    
    preds = (
        Prediction.query
        .filter(Prediction.user_id == user_id)
        .filter(Prediction.graded_at.isnot(None))
        .all()
    )

    def record(attr: str):
        vals = [getattr(p, attr) for p in preds]
        wins = sum(v is True for v in vals)
        losses = sum(v is False for v in vals)
        pushes = sum(v is None for v in vals)
        return {
            'wins': wins,
            'losses': losses,
            'pushes': pushes,
            'total': len(vals),
            'win_pct': wins / len(vals) if vals else 0.0
        }

    return jsonify({
        'user': u.to_dict(),
        'counts': {
            'predictions': len(preds),
        },
        'winner': record('winner_correct'),
        'ats': record('spread_correct'),
        'total': record('total_correct')
    })