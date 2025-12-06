from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User
from config import Config
from datetime import datetime
import bcrypt
import re

auth_bp = Blueprint('auth', __name__)

# Password Hashing (bcrypt)
def hash_password(password):
    # Generate salt and hash password
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    try:
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    except Exception:
        return False

def validate_password_strength(password):
    """
    Validate password meets security requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    # if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
    #     return False, "Password must contain at least one special character (!@#$%^&*)"
    # More generelized special character
    if not re.search(r'[^a-zA-Z0-9]', password):
        return False, "Password must contain at least one special character"
    return True, "Password is strong"

# MMU Domain Validation
def validate_mmu_email(email):
    if not email:
        return False, "Email is required"
    
    email = email.strip().lower()
    
    # Basic email format validation using regex
    email_pattern = r'[^@]+@[^@]+\.[^@]+'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    
    # Check if email ends with allowed MMU domains
    allowed_domains = Config.ALLOWED_EMAIL_DOMAINS
    is_valid_domain = any(email.endswith(domain) for domain in allowed_domains)
    
    if not is_valid_domain:
        return False, f"Only MMU emails are allowed ({', '.join(allowed_domains)})"
    
    # Additional validation for student emails
    if email.endswith('@student.mmu.edu.my'):
        local_part = email.split('@')[0]
        
        if len(local_part) < 1:
            return False, "Invalid student email format"
    
    return True, "Valid MMU email"

def validate_student_id(student_id):
    if not student_id:
        return False, "Student ID is required"
    
    # Remove any spaces
    student_id = student_id.strip()
    
    # Check if it's numeric and has valid length
    # if not student_id.isdigit():
    #     return False, "Student ID must contain only numbers"
    # Student Id now has characthers along side numerics
    
    if len(student_id) < 7 or len(student_id) > 12:
        return False, "Student ID must be 7-12 characters"
    
    return True, "Valid student ID"

@auth_bp.route('/api/auth/test', methods=['GET'])
def test_auth():
    return jsonify({
        'message': 'Auth API is working!',
        'timestamp': datetime.utcnow().isoformat(),
        'allowed_domains': Config.ALLOWED_EMAIL_DOMAINS,
        'security': 'bcrypt password hashing enabled'
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
        is_valid_email, email_message = validate_mmu_email(email)
        if not is_valid_email:
            return jsonify({'error': email_message}), 400
        
        # Validate student ID format
        is_valid_id, id_message = validate_student_id(data['student_id'])
        if not is_valid_id:
            return jsonify({'error': id_message}), 400
        
        # Validate password strength
        is_strong, password_message = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({'error': password_message}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        
        if User.query.filter_by(student_id=data['student_id']).first():
            return jsonify({'error': 'Student ID already registered'}), 400
        
        # Hash password using bcrypt
        password_hash = hash_password(data['password'])
        
        # Create new user
        user = User(
            student_id=data['student_id'].strip(),
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
        db.session.rollback()
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
        
        # Check password using bcrypt verification
        if not verify_password(password, user.password_hash):
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