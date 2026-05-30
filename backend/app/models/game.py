"""
Game model.

This module owns the durable database representation of a scheduled
football game.
"""

from app.db import db


class Game(db.Model):
    """Database model for an NFL or NCAAF game."""

    __tablename__ = "games"

    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.String(50), nullable=False)
    season = db.Column(db.Integer, nullable=False)
    week = db.Column(db.Integer, nullable=False)
    game_date = db.Column(db.Date, nullable=False)

    home_team = db.Column(db.String(50), nullable=False)
    away_team = db.Column(db.String(50), nullable=False)

    home_score = db.Column(db.Integer, nullable=True)
    away_score = db.Column(db.Integer, nullable=True)
    home_team_wins = db.Column(db.Boolean, nullable=True)
    is_final = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self) -> dict:
        """Serialize a game for API responses."""
        return {
            "id": self.id,
            "league": self.league,
            "season": self.season,
            "week": self.week,
            "game_date": self.game_date.isoformat() if self.game_date else None,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "home_score": self.home_score,
            "away_score": self.away_score,
            "home_team_wins": self.home_team_wins,
            "is_final": self.is_final,
        }