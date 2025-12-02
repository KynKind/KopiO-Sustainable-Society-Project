from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from config import Config
from datetime import datetime
import hashlib

auth_bp = Blueprint('auth', __name__)

def hash_password(password):
    return hashlib.sha256(f"kopio-salt-{password}".encode()).hexdigest()

def validate_mmu_email(email):
    return any(email.endswith(domain) for domain in Config.ALLOWED_EMAIL_DOMAINS)

@auth_bp.route('/api/auth/test', methods=['GET'])
def test_auth():
    return jsonify({
        'message': 'Auth API is working!',
        'timestamp': datetime.utcnow().isoformat(),
        'allowed_domains': Config.ALLOWED_EMAIL_DOMAINS
    })

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['student_id', 'email', 'password', 'first_name', 'last_name', 'faculty']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate MMU email
        email = data['email'].strip().lower()
        if not validate_mmu_email(email):
            return jsonify({'error': 'Only MMU student emails (@student.mmu.edu.my) are allowed'}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(student_id=data['student_id']).first():
            return jsonify({'error': 'Student ID already registered'}), 400
        
        # Hash password
        password_hash = hash_password(data['password'])
        
        # Create new user
        user = User(
            student_id=data['student_id'],
            email=email,
            password_hash=password_hash,
            first_name=data['first_name'].strip(),
            last_name=data['last_name'].strip(),
            faculty=data['faculty'],
            is_verified=True  # Auto-verify for now
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Create JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'email': user.email,
                'is_admin': user.is_admin,
                'faculty': user.faculty
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Registration successful!',
            'token': access_token,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        # Find user
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if hash_password(password) != user.password_hash:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create JWT token
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                'email': user.email,
                'is_admin': user.is_admin,
                'faculty': user.faculty
            }
        )
        
        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'token': access_token,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'success': True,
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    # In JWT, logout is client-side (just remove token)
    return jsonify({'success': True, 'message': 'Logged out successfully'})