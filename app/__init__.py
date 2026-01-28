from datetime import timedelta
import os
from flask import Flask
from .config import Config
from .extensions import db
from .routes import bp as core_bp
from app.api import register_api
from . import models
from flask_cors import CORS
from flask_jwt_extended import JWTManager


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "dev-change-me")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
    JWTManager(app)

  
    CORS(app, resources={r'/api/*': {"origins": "*"}})

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(core_bp)
    register_api(app)

    return app