"""
Prediction routes.

This module owns HTTP endpoints for listing, creating, and updating
authenticated user predictions.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.prediction_service import (
    create_or_update_user_prediction,
    get_user_predictions,
    update_user_prediction,
)


predictions_bp = Blueprint("predictions", __name__)


@predictions_bp.get("/")
@jwt_required()
def list_predictions():
    """
    Return predictions for the authenticated user.
    """
    user_id = int(get_jwt_identity())
    season = request.args.get("season", type=int)
    week = request.args.get("week", type=int)

    result, status_code = get_user_predictions(user_id, season, week)

    return jsonify(result), status_code


@predictions_bp.post("/")
@jwt_required()
def create_or_update_prediction():
    """
    Create or update a prediction for the authenticated user.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    result, status_code = create_or_update_user_prediction(user_id, data)

    return jsonify(result), status_code


@predictions_bp.put("/<int:prediction_id>")
@jwt_required()
def update_prediction(prediction_id: int):
    """
    Update an existing prediction owned by the authenticated user.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    result, status_code = update_user_prediction(user_id, prediction_id, data)

    return jsonify(result), status_code