from app import db
from werkzeug.security import generate_password_hash
import json
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(80))
    preferences = db.Column(db.String, nullable=True) # JSON data as a string
    # Add more fields as per your project requirements

    def __init__(self, username, password, role='user'):
        self.username = username
        self.password = generate_password_hash(password)
        # Set the role, default to 'user' if not provided or invalid
        self.role = role if role in ['user', 'admin'] else 'user'
        # Here you could also set other permissions or attributes based on role

    def __repr__(self):
        return '<User %r>' % self.username

    def set_preferences(self, preferences):
        self.preferences = json.dumps(preferences)

    def get_preferences(self):
        return json.loads(self.preferences) if self.preferences else {}
