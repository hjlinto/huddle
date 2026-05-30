"""
Test prediction creation command.

Creates sample predictions for local development and manual testing.
"""

from app import create_app
from app.db import db
from app.models import Game, Prediction, User


def create_test_predictions() -> None:
    """
    Create sample predictions for the first available games.
    """
    app = create_app()

    with app.app_context():
        user = _get_or_create_test_user()
        games = (
            Game.query
            .order_by(Game.season, Game.week, Game.game_date)
            .limit(4)
            .all()
        )

        created = 0

        for game in games:
            existing_prediction = Prediction.query.filter_by(
                user_id=user.id,
                game_id=game.id,
            ).first()

            if existing_prediction:
                continue

            prediction = Prediction(
                user_id=user.id,
                game_id=game.id,
                predicted_winner="home",
                predicted_spread="home",
                predicted_total="over",
            )

            db.session.add(prediction)
            created += 1

        db.session.commit()

    print(f"Created {created} test predictions.")


def _get_or_create_test_user() -> User:
    """
    Return the local test user, creating it when needed.
    """
    user = User.query.filter_by(username="hunter").first()

    if user:
        return user

    user = User(
        username="hunter",
        email="hunter@example.com",
    )
    user.set_password("Password123")

    db.session.add(user)
    db.session.commit()

    return user


if __name__ == "__main__":
    create_test_predictions()