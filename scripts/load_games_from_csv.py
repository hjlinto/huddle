import csv
from datetime import datetime
from app.extensions import db
from app.models import Game

def load_games_from_csv(csv_file_path: str):
    with open(csv_file_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            game_date = datetime.strptime(row['game_date'], '%Y-%m-%d').date()

            home_score = int(row['home_score']) if row['home_score'] else None
            away_score = int(row['away_score']) if row['away_score'] else None

            home_team_wins = (
                row["home_team_wins"].strip().lower() == 'true'
                if row["home_team_wins"]
                else None
            )

            game = Game(
                season=int(row['season']),
                week=int(row['week']),
                game_date=game_date,
                home_team=row['home_team'],
                away_team=row['away_team'],
                home_score=home_score,
                away_score=away_score,
                home_team_wins=home_team_wins
            )

            db.session.add(game)

    db.session.commit()
    print("Games loaded successfully.")