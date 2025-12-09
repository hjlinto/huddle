from flask import Blueprint, jsonify

bp = Blueprint('core', __name__)

@bp.get('/health')

def health():
    return jsonify({"status": "ok"})