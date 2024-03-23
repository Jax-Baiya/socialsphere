from ..app import create_db

def test_create_db():
    """
    GIVEN a create_db function
    WHEN the function is called
    THEN check if the database tables are created
    """
    create_db()
    # Add assertions here to check if the database tables are created
    assert ...