import argparse
import csv
from datetime import datetime

from app import create_app
from app.extensions import db
from app.models import Game, Odds

required_week_columns = {"game_date", "home_team", "away_team", "spread", "total"}
optional_finals_columns = {"home_score", "away_score"}


def read_csv(path: str):
    with open(path, "r", newline="", encoding="utf-8-sig") as csvfile:
        reader = csv.DictReader(csvfile)
        return list(reader), set(reader.fieldnames or [])


def parse_date(s: str):
    s = (s or "").strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Date '{s}' is not in a recognized format")


def as_float(x):
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s.lower() == "null":
        return None
    return float(s)


def as_int_or_none(x):
    if x is None:
        return None
    s = str(x).strip()
    if s == "" or s.lower() == "null":
        return None
    return int(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--league", type=str, required =True, choices=["nfl", "ncaaf"], help="League to ingest data for")
    ap.add_argument("--season", type=int, required=True, help="Season year to ingest data for")
    ap.add_argument("--week", type=int, required=True, help="Week number to ingest data for")
    ap.add_argument("--weekfile", type=str, required=True, help="Week CSV file containing games+odds and optional finals")
    ap.add_argument("--grade", action="store_true", help="If set, grade predictions after ingesting finals (only if finals present)")
    args = ap.parse_args()

    app = create_app()
    with app.app_context():
        rows, cols = read_csv(args.weekfile)

        missing = required_week_columns - cols
        if missing:
            raise SystemExit(f"weekfile missing columns: {sorted(missing)}")

        has_finals_cols = optional_finals_columns.issubset(cols)

        games_upserted = 0
        odds_upserted = 0
        finals_upserted = 0
        any_finals_applied = False
        graded_count = 0

        for r in rows:
            game_date = parse_date(r.get("game_date"))
            home = r["home_team"].strip()
            away = r["away_team"].strip()

            # Upsert game by (season, week, home_team, away_team)
            g = Game.query.filter_by(
                league=args.league,
                season=args.season,
                week=args.week,
                home_team=home,
                away_team=away,
            ).first()

            if not g:
                g = Game(
                    league=args.league,
                    season=args.season,
                    week=args.week,
                    home_team=home,
                    away_team=away,
                    game_date=game_date,
                )
                db.session.add(g)
            else:
                g.game_date = game_date

            games_upserted += 1

            db.session.flush()

            # Upsert odds via relationship g.odds
            spread = as_float(r.get("spread"))
            total = as_float(r.get("total"))

            o = getattr(g, "odds", None)
            if not o:
                o = Odds(game_id=g.id)
                db.session.add(o)

            o.spread = spread
            o.total = total
            odds_upserted += 1

            # Optional finals (only if the columns exist and values are present)
            if has_finals_cols:
                home_score = as_int_or_none(r.get("home_score"))
                away_score = as_int_or_none(r.get("away_score"))

                # Only apply finals if BOTH scores are present
                if home_score is not None and away_score is not None:
                    g.home_score = home_score
                    g.away_score = away_score
                    g.is_final = True
                    finals_upserted += 1
                    any_finals_applied = True

        db.session.commit()

        # Auto-grading trigger (only if finals actually ingested)
        if args.grade:
            if not has_finals_cols:
                print("--grade was set but weekfile has no home_score/away_score columns. Skipping grading.")
            elif not any_finals_applied:
                print("--grade was set but no rows had both scores present. Skipping grading.")
            else:
                from scripts.grade_predictions import grade_all
                graded_count = grade_all()
                db.session.commit()

        # Summary printout
        print("Ingestion complete")
        print(f"Season {args.season} Week {args.week}")
        print(f"Games upserted:  {games_upserted}")
        print(f"Odds upserted:   {odds_upserted}")
        if has_finals_cols:
            print(f"Finals applied:  {finals_upserted}")
        if args.grade:
            print(f"Predictions graded: {graded_count}")

if __name__ == "__main__":
    main()