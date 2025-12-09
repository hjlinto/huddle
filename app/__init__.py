from flask import Flask
from .config import Config
from .extensions import db
from .routes import bp as core_bp
from . import models

def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(core_bp)

    return app