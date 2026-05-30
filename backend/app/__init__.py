"""
NFL Prediction Pipeline application package.

This package exposes the Flask application factory while keeping startup
logic in app.main.
"""

from app.main import create_app

__all__ = ["create_app"]