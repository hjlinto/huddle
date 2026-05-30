"""
Prediction grading service.

This module owns winner, spread, and total grading for completed games.
"""

from datetime import datetime

from app.db import db
from app.models import Game, Prediction


def grade_all_predictions() -> dict:
    """
    Grade all predictions attached to games with final scores.
    """
    predictions = (
        Prediction.query
        .join(Game, Prediction.game_id == Game.id)
        .filter(Game.home_score.isnot(None), Game.away_score.isnot(None))
        .all()
    )

    graded = 0
    skipped_no_odds = 0

    for prediction in predictions:
        game = prediction.game
        odds = getattr(game, "odds", None)

        _grade_winner(prediction, game)

        if not odds:
            prediction.spread_correct = None
            prediction.total_correct = None
            prediction.graded_at = datetime.utcnow()

            skipped_no_odds += 1
            graded += 1
            continue

        _grade_spread(prediction, game, odds)
        _grade_total(prediction, game, odds)

        prediction.graded_at = datetime.utcnow()
        graded += 1

    db.session.commit()

    return {
        "graded": graded,
        "skipped_no_odds": skipped_no_odds,
    }


def _grade_winner(prediction: Prediction, game: Game) -> None:
    """
    Grade whether the selected winner matched the final result.
    """
    home_wins = game.home_score > game.away_score
    picked_home = prediction.predicted_winner == "home"

    prediction.winner_correct = picked_home == home_wins


def _grade_spread(prediction: Prediction, game: Game, odds) -> None:
    """
    Grade whether the selected team covered the spread.
    """
    margin = game.home_score - game.away_score
    adjusted_margin = margin + (odds.spread if odds.spread is not None else 0.0)

    if adjusted_margin == 0:
        prediction.spread_correct = None
        return

    home_covered = adjusted_margin > 0
    picked_home = prediction.predicted_spread == "home"

    prediction.spread_correct = picked_home == home_covered


def _grade_total(prediction: Prediction, game: Game, odds) -> None:
    """
    Grade whether the selected total matched over or under.
    """
    if odds.total is None:
        prediction.total_correct = None
        return

    points = game.home_score + game.away_score

    if points == odds.total:
        prediction.total_correct = None
        return

    went_over = points > odds.total
    picked_over = prediction.predicted_total == "over"

    prediction.total_correct = picked_over == went_over