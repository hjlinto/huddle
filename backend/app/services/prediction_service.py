"""
Prediction service.

This module owns prediction query, creation, update, and ownership logic.

HTTP request parsing should live in prediction routes.
Prediction schema definitions should live in models.
"""

from app.db import db
from app.models import Prediction


def get_user_predictions(
    user_id: int,
    season: int | None = None,
    week: int | None = None,
) -> tuple[list[dict], int]:
    """
    Return predictions for a user, optionally filtered by season and week.
    """
    query = Prediction.query.filter_by(user_id=user_id)

    if season is not None:
        query = query.filter_by(season=season)

    if week is not None:
        query = query.filter_by(week=week)

    predictions = query.all()

    return [prediction.to_dict() for prediction in predictions], 200


def create_or_update_user_prediction(user_id: int, data: dict) -> tuple[dict, int]:
    """
    Create a new prediction or update the user's existing prediction for a game.
    """
    game_id = data.get("game_id")
    predicted_winner = data.get("predicted_winner")

    if not game_id or not predicted_winner:
        return {"message": "game_id and predicted_winner are required"}, 400

    prediction = Prediction.query.filter_by(
        user_id=user_id,
        game_id=game_id,
    ).first()

    if not prediction:
        prediction = Prediction(
            user_id=user_id,
            game_id=game_id,
        )
        db.session.add(prediction)

    prediction.predicted_winner = predicted_winner
    prediction.predicted_spread = data.get("predicted_spread")
    prediction.predicted_total = data.get("predicted_total")

    # Prediction persistence is centralized here so routes do not own
    # database transaction behavior.
    db.session.commit()

    return prediction.to_dict(), 200


def update_user_prediction(
    user_id: int,
    prediction_id: int,
    data: dict,
) -> tuple[dict, int]:
    """
    Update an existing prediction if it belongs to the authenticated user.
    """
    prediction = Prediction.query.get(prediction_id)

    if not prediction:
        return {"message": "Prediction not found"}, 404

    if prediction.user_id != user_id:
        return {"message": "Forbidden"}, 403

    if "predicted_winner" in data:
        prediction.predicted_winner = data["predicted_winner"]

    if "predicted_spread" in data:
        prediction.predicted_spread = data["predicted_spread"]

    if "predicted_total" in data:
        prediction.predicted_total = data["predicted_total"]

    db.session.commit()

    return prediction.to_dict(), 200