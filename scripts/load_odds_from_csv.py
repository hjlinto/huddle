import csv
from datetime import datetime

from app import create_app
from app.extensions import db
from app.models import Game, Odds

def load_odds_from_csv(csv_path: str) -> None:
    app = create_app()
    with app.app_context():
        with open(csv_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            loaded = 0
            updated = 0

            for row in reader:
                season = int(row["season"])
                week = int(row["week"])
                home_team = row["home_team"].strip()
                away_team = row["away_team"].strip()

                spread = float(row["spread"]) if row.get("spread") not in (None, "", "NA") else None
                total = float(row["total"]) if row.get("total") not in (None, "", "NA") else None

                game = Game.query.filter_by(
                    season=season,
                    week=week,
                    home_team=home_team,
                    away_team=away_team
                ).first()

                if not game:
                    print(f"Game not found for season {season}, week {week}, {away_team} vs {home_team}")
                    continue

                existing = Odds.query.filter_by(game_id=game.id).first()
                if existing:
                    existing.spread = spread
                    existing.total = total
                    existing.snapshot_ts = datetime.now()
                    updated += 1
                else:
                    db.session.add(Odds(
                            game_id=game.id,
                            spread=spread,
                            total=total,
                            snapshot_ts=datetime.now()
                        ))
                    loaded += 1
        db.session.commit()
        print(f"Odds loaded: {loaded}, Odds updated: {updated}")

if __name__ == "__main__":
    load_odds_from_csv("data/odds_sample.csv")