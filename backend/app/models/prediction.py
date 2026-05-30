"""
Prediction model.

This module owns the durable database representation of a user's pick
for a specific game.
"""

from datetime import datetime

from app.db import db


class Prediction(db.Model):
    """Database model for a user's game prediction."""

    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey("games.id"), nullable=False)

    predicted_winner = db.Column(db.String(50), nullable=False)
    predicted_spread = db.Column(db.String(20), nullable=True)
    predicted_total = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    winner_correct = db.Column(db.Boolean, nullable=True)
    spread_correct = db.Column(db.Boolean, nullable=True)
    total_correct = db.Column(db.Boolean, nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", backref=db.backref("predictions", lazy=True))
    game = db.relationship("Game", backref=db.backref("predictions", lazy=True))

    __table_args__ = (
        db.UniqueConstraint("user_id", "game_id", name="unique_prediction_per_game"),
    )

    def to_dict(self) -> dict:
        """Serialize a prediction for API responses."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "game_id": self.game_id,
            "predicted_winner": self.predicted_winner,
            "predicted_spread": self.predicted_spread,
            "predicted_total": self.predicted_total,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "winner_correct": self.winner_correct,
            "spread_correct": self.spread_correct,
            "total_correct": self.total_correct,
            "graded_at": self.graded_at.isoformat() if self.graded_at else None,
        }