import csv
from datetime import datetime

from app.extensions import db
from app.models import Game, Odds


def load_odds_from_csv(csv_path: str) -> None:
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        loaded = 0
        updated = 0

        for row in reader:
            season = int(row["season"])
            week = int(row["week"])

            home_team = row["home_team"].strip()
            away_team = row["away_team"].strip()

            spread = (
                float(row["spread"])
                if row.get("spread") not in (None, "", "NA")
                else None
            )

            total = (
                float(row["total"])
                if row.get("total") not in (None, "", "NA")
                else None
            )

            game = Game.query.filter_by(
                season=season,
                week=week,
                home_team=home_team,
                away_team=away_team
            ).first()

            if not game:
                print(
                    f"Game not found for season {season}, "
                    f"week {week}, {away_team} vs {home_team}"
                )
                continue

            existing_odds = Odds.query.filter_by(game_id=game.id).first()

            if existing_odds:
                existing_odds.spread = spread
                existing_odds.total = total
                existing_odds.snapshot_ts = datetime.utcnow()

                updated += 1

            else:
                odds = Odds(
                    game_id=game.id,
                    spread=spread,
                    total=total,
                    snapshot_ts=datetime.utcnow()
                )

                db.session.add(odds)

                loaded += 1

    db.session.commit()

    print(f"Odds loaded: {loaded}")
    print(f"Odds updated: {updated}")