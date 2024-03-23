from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate # Import Migrate

app = Flask(__name__)
CORS(app)

# Configuration setup here...
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://jax:2112@localhost/socialsphere_db'
app.config['SECRET_KEY'] = '5d01af35185e62bf39a8eccc84551814'
app.config['JWT_SECRET_KEY'] = 'dbcb89394b0fa1f33f8b39db155296cf'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


db = SQLAlchemy(app)    # Initialize SQLAlchemy
migrate = Migrate(app, db) # initialize Migrate
jwt = JWTManager(app)

# Import and register the Blueprints
from app.views.auth import auth_blueprint
from app.views.analytics import analytics_blueprint
from app.views.preferences import preferences_blueprint

app.register_blueprint(auth_blueprint, url_prefix='/api/auth')
app.register_blueprint(analytics_blueprint, url_prefix='/api/analytics')
app.register_blueprint(preferences_blueprint, url_prefix='/api/preferences')
