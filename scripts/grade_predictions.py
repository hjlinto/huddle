from datetime import datetime
from app import create_app
from app.extensions import db
from app.models import Game, Odds, Prediction

def grade_all() -> None:
    app = create_app()
    with app.app_context():
        preds = (
            Prediction.query
            .join(Game, Prediction.game_id == Game.id)
            .filter(Game.home_score.isnot(None), Game.away_score.isnot(None))
            .all()
        )
        graded = 0
        skipped_no_odds = 0

        for p in preds:
            g = p.game
            o = getattr(g, "odds", None)

            # Winner grading
            home_wins = (g.home_score > g.away_score)
            winner_pick_home = (p.predicted_winner == "home")
            p.winner_correct = (winner_pick_home == home_wins)

            # Spread and total require odds for grading
            if not o:
                p.spread_correct = None
                p.total_correct = None
                skipped_no_odds += 1
                p.graded_at = datetime.now()
                graded += 1
                continue

            # Spread grading
            margin = g.home_score - g.away_score
            spread = margin + (o.spread if o.spread is not None else 0.0)
            if spread == 0:
                p.spread_correct = None # Push
            else:
                home_covered = (spread > 0)
                spread_pick_home = (p.predicted_spread == "home")
                p.spread_correct = (spread_pick_home == home_covered)

            # Total grading
            points = g.home_score + g.away_score
            if o.total is None:
                p.total_correct = None
            else:
                if points == o.total:
                    p.total_correct = None # Push
                else:
                    went_over = (points > o.total)
                    total_pick_over = (p.predicted_total == "over")
                    p.total_correct = (total_pick_over == went_over)

            p.graded_at = datetime.now()
            graded += 1
        
        db.session.commit()
        print(f"Graded {graded} predictions, skipped {skipped_no_odds} due to missing odds.")

if __name__ == "__main__":
    grade_all()
