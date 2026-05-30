"""
Route registration.

This module owns attaching route blueprints to the Flask application.

Individual route implementations should remain in their respective route
modules so application startup does not need to know endpoint details.
"""

from app.routes.auth_routes import auth_bp
from app.routes.core_routes import core_bp
from app.routes.prediction_routes import predictions_bp
from app.routes.user_routes import users_bp
from app.routes.week_routes import weeks_bp


def register_routes(app) -> None:
    """
    Register all application route blueprints.
    """

    app.register_blueprint(core_bp)

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth",
    )

    app.register_blueprint(
        predictions_bp,
        url_prefix="/api/predictions",
    )

    app.register_blueprint(
        users_bp,
        url_prefix="/api/users",
    )

    app.register_blueprint(
        weeks_bp,
        url_prefix="/api/weeks",
    )