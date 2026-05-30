"""
Application startup.

This module owns Flask application creation, extension registration,
startup configuration, and route registration.

Feature logic should live in services.
HTTP endpoint behavior should live in routes.
Database schema definitions should live in models.
"""

from datetime import timedelta
import os

from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from app.config import Config
from app.db.extensions import db
from app.models import Game, Odds, Prediction, User
from app.routes import register_routes


def create_app(config_class: type[Config] = Config) -> Flask:
    """
    Create and configure the Flask application.

    The application factory assembles the backend at startup without
    owning feature-specific business logic.
    """
    app = Flask(__name__)
    app.config.from_object(config_class)

    jwt_secret = os.environ.get("JWT_SECRET_KEY")

    if not jwt_secret:
        raise RuntimeError("JWT_SECRET_KEY environment variable is required.")

    app.config["JWT_SECRET_KEY"] = jwt_secret
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

    # Flask extensions are initialized here so startup behavior remains
    # centralized and predictable.
    db.init_app(app)
    JWTManager(app)

    # The public API is exposed under /api even though the internal code
    # organization lives in the routes package.
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Model imports above ensure SQLAlchemy knows about table definitions
    # before creating missing database tables.
    with app.app_context():
        db.create_all()

    # Route registration is delegated to the routes layer so this module
    # assembles the app without owning endpoint details.
    register_routes(app)

    return app