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

class Odds(db.Model):
    __tablename__ = 'odds'
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False, unique=True)
    spread = db.Column(db.Float, nullable=True)
    total = db.Column(db.Float, nullable=True)
    

    snapshot_ts = db.Column(db.DateTime, nullable=False, default=datetime.now)
    
    game = db.relationship('Game', backref=db.backref('odds', uselist=False))

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now)

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