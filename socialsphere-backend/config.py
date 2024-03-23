from datetime import timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask import Flask
import os
from config import init_app
from flask_jwt_extended import jwt
from config import db

app = Flask(__name__)
app = init_app(app)
db.init_app(app)
jwt.init_app(app)

"""
This function is used to create all the tables in the database

Args:
    None

Returns:
    None
"""
@app.before_first_request
def create_tables():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)

# Helper methods for initializing the app and database
def init_app(app):
    app.config.from_object(Config)
    return app.test_client()

# config.py is used to configure the Flask application and database connection
class Config:
    SECRET_KEY = '5d01af35185e62bf39a8eccc84551814'
    JWT_SECRET_KEY = 'dbcb89394b0fa1f33f8b39db155296cf'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///db.sqlite'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

db = SQLAlchemy()
jwt = JWTManager()

def init_app(app):
    """
    Initialize the application and database.

    Args:
        app (Flask): The Flask application instance.

    Returns:
        Flask test client: The test client for making requests to the application.

    """
    app.config.from_object(Config)
    db.init_app(app)
    jwt.init_app(app)
    with app.app_context():
        db.create_all()
    return app

# test_config.py is used to override the configuration in config.py for testing purposes   
