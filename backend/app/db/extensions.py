"""
Database extensions.

This module owns SQLAlchemy extension creation.

Application startup should initialize this extension with the Flask app.
Models should import this shared db object instead of creating their own.
"""

from flask_sqlalchemy import SQLAlchemy


db = SQLAlchemy()