from datetime import date
from .extensions import db

class Game(db.Model):
    __fsa__lename__ = 'games'
    id = db.Column(db.Integer, primary_key=True)
    season = db.Column(db.Integer, nullable=False)
    week = db.Column(db.Integer, nullable=False)
    game_date = db.Column(db.Date, nullable=False)

    home_team = db.Column(db.String(50), nullable=False)
    away_team = db.Column(db.String(50), nullable=False)

    home_score = db.Column(db.Integer, nullable=True)
    away_score = db.Column(db.Integer, nullable=True)

    home_team_wins = db.Column(db.Boolean, nullable=True)