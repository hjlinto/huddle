from app import create_app
from app.extensions import db
from app import models

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    
    app.run(debug=True, use_reloader=False)
