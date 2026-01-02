from .predictions import predictions_bp
from .users import users_bp
from .weeks import weeks_bp

def register_api(app):
    app.register_blueprint(predictions_bp, url_prefix='/api/predictions')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(weeks_bp, url_prefix='/api/weeks')