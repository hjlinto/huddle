from flask import Blueprint, request, jsonify
from app.models import User
from app.extensions import db

users_bp = Blueprint('users', __name__)

@users_bp.post('/')
def create_user():
    data = request.get_json()

    u = User(
        username=data['username'],
        email=data['email']
    )

    db.session.add(u)
    db.session.commit()
    
    return jsonify(u.to_dict()), 201

@users_bp.get('/')
def list_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])
