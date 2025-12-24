from app import create_app
from app.extensions import db
from app.models import User, Game, Prediction

def run() -> None:
    app = create_app()
    with app.app_context():
        # Create a new user
        user = User.query.filter_by(username='hunter').first()
        if not user:
            user = User(username='hunter')
            db.session.add(user)
            db.session.commit()
        
        games =Game.query.order_by(Game.season, Game.week, Game.game_date).limit(4).all()

        for g in games:
            existing = Prediction.query.filter_by(user_id=user.id, game_id=g.id).first()
            if existing:
                continue

            p = Prediction(
                user_id=user.id,
                game_id=g.id,
                predicted_winner='home',
                predicted_spread='home',
                predicted_total='over'
            )
            db.session.add(p)
        
        db.session.commit()
        print("Predictions added successfully.")

if __name__ == '__main__':
    run()
