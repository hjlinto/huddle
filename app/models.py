from datetime import date, datetime
from .extensions import db

class Game(db.Model):
    __tablename__ = 'games'
    id = db.Column(db.Integer, primary_key=True)
    season = db.Column(db.Integer, nullable=False)
    week = db.Column(db.Integer, nullable=False)
    game_date = db.Column(db.Date, nullable=False)

    home_team = db.Column(db.String(50), nullable=False)
    away_team = db.Column(db.String(50), nullable=False)

    home_score = db.Column(db.Integer, nullable=True)
    away_score = db.Column(db.Integer, nullable=True)

    home_team_wins = db.Column(db.Boolean, nullable=True)

    is_final = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self):
        return {
            "id": self.id,
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


class Odds(db.Model):
    __tablename__ = 'odds'
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False, unique=True)
    spread = db.Column(db.Float, nullable=True)
    total = db.Column(db.Float, nullable=True)
    

    snapshot_ts = db.Column(db.DateTime, nullable=False, default=datetime.now)
    
    game = db.relationship('Game', backref=db.backref('odds', uselist=False))

    def to_dict(self):
        return {
            "id": self.id,
            "game_id": self.game_id,
            "spread": self.spread,
            "total": self.total,
            "snapshot_ts": self.snapshot_ts.isoformat() if self.snapshot_ts else None,
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

class Prediction(db.Model):
    __tablename__ = 'predictions'
    # primary key
    id = db.Column(db.Integer, primary_key=True)
    
    # foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    
    # prediction fields
    predicted_winner = db.Column(db.String(50), nullable=False)
    predicted_spread = db.Column(db.String(20), nullable=True)
    predicted_total = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

    # grading
    winner_correct = db.Column(db.Boolean, nullable=True)
    spread_correct = db.Column(db.Boolean, nullable=True)
    total_correct = db.Column(db.Boolean, nullable=True)
    graded_at = db.Column(db.DateTime, nullable=True)

    # relationships
    user = db.relationship('User', backref=db.backref('predictions', lazy=True))
    game = db.relationship('Game', backref=db.backref('predictions', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'game_id', name='unique_prediction_per_game'),
    )

    def to_dict(self):
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