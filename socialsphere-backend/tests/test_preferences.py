# tests/test_user_preferences.py
import json

def test_update_preferences(test_client):
    """
    GIVEN a Flask application and authenticated user
    WHEN the '/preferences' endpoint is hit (PUT)
    THEN check the user preferences are updated correctly
    """
    # This test will need an authentication setup, like a login fixture or token
    response = test_client.put('/preferences', data=json.dumps({
        'theme': 'dark',
        'notifications': 'enabled'
    }), content_type='application/json', headers={'Authorization': 'Bearer YOUR_JWT_TOKEN'})
    assert response.status_code == 200
    assert b"Preferences updated successfully" in response.data
