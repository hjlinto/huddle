import re
from flask import Blueprint, request, jsonify
from app.models import User
from app.extensions import db
from flask_jwt_extended import create_access_token

auth_bp = Blueprint("auth", __name__, url_prefix='/api/auth')

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def is_valid_password(pw: str) -> bool:
    if not pw or len(pw) < 8:
        return False
    if not re.search(r"[A=Za-z]", pw):
        return False
    if not re.search(r"\d", pw):
        return False
    return True

# User Registration Endpoint
@auth_bp.post('/register')
def register():
    data = request.get_json()

    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not email or not password:
        return jsonify({"message": "Username, email, and password are required"}), 400

    if not EMAIL_RE.match(email):
        return jsonify({"message": "Invalid email format"}), 400

    if not is_valid_password(password):
        return jsonify({"message": "Password does not meet complexity requirements"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already taken"}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400
    
    user = User(username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

# User Login Endpoint
@auth_bp.post('/login')
def login():
    data = request.get_json() or {}
    
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({"access_token": access_token}), 200
    