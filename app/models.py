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
