"""
Odds model.

This module owns the durable database representation of betting lines
attached to a game.
"""

from datetime import datetime

from app.db import db


class Odds(db.Model):
    """Database model for spread and total values for a game."""

    __tablename__ = "odds"

    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(
        db.Integer,
        db.ForeignKey("games.id"),
        nullable=False,
        unique=True,
    )
    spread = db.Column(db.Float, nullable=True)
    total = db.Column(db.Float, nullable=True)
    snapshot_ts = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    game = db.relationship("Game", backref=db.backref("odds", uselist=False))

    def to_dict(self) -> dict:
        """Serialize odds for API responses."""
        return {
            "id": self.id,
            "game_id": self.game_id,
            "spread": self.spread,
            "total": self.total,
            "snapshot_ts": self.snapshot_ts.isoformat() if self.snapshot_ts else None,
        }