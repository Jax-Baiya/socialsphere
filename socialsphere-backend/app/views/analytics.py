from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User

# Blueprint for analytics routes
analytics_blueprint = Blueprint('analytics', __name__)

@analytics_blueprint.route('/data', methods=['GET'])
@jwt_required(optional=True) # Ensure only authorized users can access this route
def fetch_analytics():
    current_username = get_jwt_identity()  # This is the username, not the user ID.
    current_user = User.query.filter_by(username=current_username).first()

    if current_user is None or current_user.role != 'user':
        return jsonify({'msg': 'Insufficient permissions'}), 403
    # Replace with actual logic to fetch analytics from your data source
    # Dummy data for demonstrations
    
    analytics_data = {
        "user_interactions": 150, 
        "content_views": 1000, 
        "content_shares": 200,
        "page_views": 1200,
        "new_followers": 35,
        "new_signups": 5
        # More analytics data here
    }
    return jsonify(analytics_data)
