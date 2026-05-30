"""
Authentication routes.

This module owns HTTP endpoints for registration and login.

Request parsing and JSON responses belong here.
Authentication business logic belongs in the auth service.
"""

from flask import Blueprint, jsonify, request

from app.services.auth_service import login_user, register_user


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    """
    Register a new user account.
    """
    result, status_code = register_user(request.get_json() or {})
    return jsonify(result), status_code


@auth_bp.post("/login")
def login():
    """
    Authenticate a user and return a JWT access token.
    """
    result, status_code = login_user(request.get_json() or {})
    return jsonify(result), status_code