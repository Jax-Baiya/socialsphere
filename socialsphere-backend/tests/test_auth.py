# tests/test_auth.py
import json

def test_registration(test_client):
    """
    GIVEN a Flask application
    WHEN the '/register' page is requested (POST)
    THEN check the response is valid
    """
    response = test_client.post('/register', data=json.dumps({
        'username': 'testuser',
        'password': 'testpassword'
    }), content_type='application/json')
    assert response.status_code == 200
    assert b"User registered successfully" in response.data

def test_login(test_client):
    """
    GIVEN a Flask application
    WHEN the '/login' page is requested (POST)
    THEN check the response is valid
    """
    # Assumes the user is already registered
    response = test_client.post('/login', data=json.dumps({
        'username': 'testuser',
        'password': 'testpassword'
    }), content_type='application/json')
    assert response.status_code == 200
    assert b"access_token" in response.data
