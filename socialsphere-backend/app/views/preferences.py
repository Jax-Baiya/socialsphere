from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User
from app import db
import json
import traceback

print(traceback.format_exc())

preferences_blueprint = Blueprint('preferences', __name__)

@preferences_blueprint.route('/', methods=['PUT'])
@jwt_required()
def update_preferences():
    current_username = get_jwt_identity()
    user = User.query.filter_by(username=current_username).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    try:
        preferences = request.get_json()
        user.set_preferences(preferences)
        db.session.commit()
        return jsonify({"message": "Preferences updated successfully"}), 200
    except Exception as e:
        tb = traceback.format_exc()  # This will give you the full traceback
        current_app.logger.error(f'Error updating preferences: {e}\n{tb}')
        db.session.rollback()
        return jsonify({"message": "An error occurred while updating preferences"}), 500
    
def set_preferences(self, preferences):
    self.preferences = json.dumps(preferences)

