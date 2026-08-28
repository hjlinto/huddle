"""
Game model.

This module owns the durable database representation of a scheduled
football game.
"""

from app.db import db


class Game(db.Model):
    """Database model for an NFL or NCAAF game."""

    __tablename__ = "games"
    __table_args__ = (
        db.UniqueConstraint(
            "source",
            "source_event_id",
            name="uq_games_source_event_id",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    league = db.Column(db.String(50), nullable=False)
    season = db.Column(db.Integer, nullable=False)
    week = db.Column(db.Integer, nullable=False)
    game_date = db.Column(db.Date, nullable=False)
    game_time = db.Column(db.Time, nullable=True)
    source = db.Column(db.String(50), nullable=True)
    source_event_id = db.Column(db.String(50), nullable=True)

    home_team = db.Column(db.String(100), nullable=False)
    away_team = db.Column(db.String(100), nullable=False)
    home_rank = db.Column(db.Integer, nullable=True)
    away_rank = db.Column(db.Integer, nullable=True)
    home_record = db.Column(db.String(50), nullable=True)
    away_record = db.Column(db.String(50), nullable=True)

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
            "game_time": self.game_time.isoformat() if self.game_time else None,
            "source": self.source,
            "source_event_id": self.source_event_id,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "home_rank": self.home_rank,
            "away_rank": self.away_rank,
            "home_record": self.home_record,
            "away_record": self.away_record,
            "home_score": self.home_score,
            "away_score": self.away_score,
            "home_team_wins": self.home_team_wins,
            "is_final": self.is_final,
        }
