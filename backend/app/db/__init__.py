"""
Database package.

This package owns database extension access and database setup helpers.
"""

from app.db.extensions import db

__all__ = ["db"]