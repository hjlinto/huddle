"""
Authentication service.

This module owns registration, login, credential validation, and token
creation for authenticated users.
"""

import re

from flask_jwt_extended import create_access_token

from app.db import db
from app.models import User


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PASSWORD_LETTER_RE = re.compile(r"[A-Za-z]")
PASSWORD_NUMBER_RE = re.compile(r"\d")


def register_user(data: dict) -> tuple[dict, int]:
    """
    Validate registration data and create a new user account.
    """
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return {"message": "Username, email, and password are required"}, 400

    if not _is_valid_email(email):
        return {"message": "Invalid email format"}, 400

    if not _is_valid_password(password):
        return {"message": "Password does not meet complexity requirements"}, 400

    if User.query.filter_by(username=username).first():
        return {"message": "Username already taken"}, 400

    if User.query.filter_by(email=email).first():
        return {"message": "Email already registered"}, 400

    user = User(username=username, email=email)
    user.set_password(password)

    # Registration owns creating the durable identity record so later
    # login requests can authenticate against stored credentials.
    db.session.add(user)
    db.session.commit()

    return {"message": "User registered successfully"}, 201


def login_user(data: dict) -> tuple[dict, int]:
    """
    Validate login credentials and create an access token.
    """
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    user = User.query.filter(
        (User.username == identifier)
        | (User.email == identifier.lower())
    ).first()

    if not user or not user.check_password(password):
        return {"message": "Invalid credentials"}, 401

    # JWT identity is stored as a string so flask-jwt-extended can
    # serialize and recover the authenticated user id consistently.
    access_token = create_access_token(identity=str(user.id))

    return {"access_token": access_token}, 200


def _is_valid_email(email: str) -> bool:
    """
    Return whether an email matches the application's accepted format.
    """
    return bool(EMAIL_RE.match(email))


def _is_valid_password(password: str) -> bool:
    """
    Return whether a password meets minimum account requirements.
    """
    if not password or len(password) < 8:
        return False

    if not PASSWORD_LETTER_RE.search(password):
        return False

    if not PASSWORD_NUMBER_RE.search(password):
        return False

    return True