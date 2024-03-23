from app import db
from app.models import User

def clear_user_table():
    try:
        num_rows_deleted = db.session.query(User).delete()
        db.session.commit()
        print(f"Deleted {num_rows_deleted} user(s)")
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")

if __name__ == '__main__':
    clear_user_table()
