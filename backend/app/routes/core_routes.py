"""
Core application routes.

This module owns application-level utility endpoints that are not tied
to a specific feature domain.
"""

from flask import Blueprint, jsonify


core_bp = Blueprint("core", __name__)


@core_bp.get("/health")
def health():
    """
    Return application health status.

    This endpoint is used by deployment platforms and monitoring systems
    to verify the API is running.
    """
    return jsonify({"status": "ok"})