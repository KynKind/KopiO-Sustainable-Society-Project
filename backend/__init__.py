from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for frontend
    CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"], supports_credentials=True)
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    
    # Import and register blueprints
    from auth import auth_bp
    from games import games_bp
    from admin import admin_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(games_bp)
    app.register_blueprint(admin_bp)
    
    return app