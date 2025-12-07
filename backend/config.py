"""
Configuration settings for the Kopi-O backend application
"""
import os
from datetime import timedelta

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Database
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'kopio.db')
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5000']
    
    # MMU Email validation
    # Allow both @mmu.edu.my and subdomains like @student.mmu.edu.my
    ALLOWED_EMAIL_DOMAIN = 'mmu.edu.my'
    
    # Game settings
    QUIZ_QUESTIONS_PER_GAME = 5
    QUIZ_TIME_LIMIT = 60  # seconds
    
    # Points system
    QUIZ_POINTS_PER_CORRECT = 10
    MEMORY_GAME_BASE_POINTS = 50
    PUZZLE_GAME_BASE_POINTS = 30
    SORTING_GAME_BASE_POINTS = 20

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
