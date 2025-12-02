from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    faculty = db.Column(db.String(100), nullable=False)
    points = db.Column(db.Integer, default=0)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=True)  # True for testing
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    games = db.relationship('Game', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'faculty': self.faculty,
            'points': self.points,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class Game(db.Model):
    __tablename__ = 'games'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_type = db.Column(db.String(20), nullable=False)  # quiz, memory, sorting, puzzle
    score = db.Column(db.Integer, nullable=False)
    time_spent = db.Column(db.Integer)  # seconds
    level = db.Column(db.Integer, default=1)
    details = db.Column(db.Text)  # JSON as text
    played_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'game_type': self.game_type,
            'score': self.score,
            'time_spent': self.time_spent,
            'level': self.level,
            'details': json.loads(self.details) if self.details else {},
            'played_at': self.played_at.isoformat() if self.played_at else None
        }

class Leaderboard(db.Model):
    __tablename__ = 'leaderboard'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    total_points = db.Column(db.Integer, nullable=False, default=0)
    rank = db.Column(db.Integer)
    faculty_rank = db.Column(db.Integer)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('leaderboard_entry', uselist=False))