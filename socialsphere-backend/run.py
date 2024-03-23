from app import app
from flask import jsonify

@app.route('/')
def index():
    return jsonify({"message": "Welcome to the SocialSphere Dashboard API"})


if __name__ == '__main__':
    app.run(debug=True)
