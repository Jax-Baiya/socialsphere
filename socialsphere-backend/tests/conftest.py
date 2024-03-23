# conftest.py
import pytest
from app import create_app, db  # Update import based on your actual app structure

@pytest.fixture
def app():
    """Create and configure an instance of the Flask application."""
    app = create_app('testing')
    with app.app_context():
        db.create_all()

    yield app

    with app.app_context():
        db.drop_all()

@pytest.fixture
def client(app):
    """Create an instance of the Flask test client.

    Args:
        app (Flask): An instance of the Flask application.

    Returns:
        FlaskTestClient: An instance of the Flask test client.
    """
    return app.test_client()

@pytest.fixture
def init_database():
    # Initialize and populate the database with mock data
    pass
