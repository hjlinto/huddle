from flask import Blueprint, jsonify
from scripts.load_games_from_csv import load_games_from_csv
from scripts.load_odds_from_csv import load_odds_from_csv

bp = Blueprint('core', __name__)

@bp.get('/health')

def health():
    return jsonify({"status": "ok"})

@bp.route("/seed")
def seed_database():
    """
    Seeds database with week 1 data.
    """

    load_games_from_csv("data/nfl/week1_nfl.csv")
    load_odds_from_csv("data/nfl/week1_nfl.csv")
    load_games_from_csv("data/ncaaf/week1_ncaaf.csv")
    load_odds_from_csv("data/ncaaf/week1_ncaaf.csv")

    return {"message": "Database seeded successfully."}