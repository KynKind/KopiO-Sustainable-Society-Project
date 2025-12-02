import os
from datetime import timedelta

class Config:
    SECRET_KEY = 'kopio-sustainable-society-2025-week-5-11-project'
    JWT_SECRET_KEY = 'kopio-jwt-key-2025-change-for-production'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///kopio.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    ALLOWED_EMAIL_DOMAINS = ['@student.mmu.edu.my', '@mmu.edu.my']
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB