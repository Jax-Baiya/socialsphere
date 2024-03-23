# tests/test_models.py
import pytest
from ..app.models import User  # Adjust import path as needed

def test_new_user():
    """
    GIVEN a User model
    WHEN a new User is created
    THEN check the email, hashed_password, authenticated, and active fields are defined correctly
    """
    user = User('test@example.com', 'FlaskIsAwesome123')
    assert user.email == 'test@example.com'
    assert user.check_password('FlaskIsAwesome123') is True
    assert user.authenticated is False
    assert user.active is True
