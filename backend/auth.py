"""
Authentication module for Kopi-O
Handles user registration, login, and JWT token management
"""
import bcrypt
import jwt
import re
from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, request
from database import get_db_connection
from config import Config

def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def validate_mmu_email(email):
    """Validate that email ends with mmu.edu.my domain"""
    email_lower = email.lower()
    return email_lower.endswith('@mmu.edu.my') or email_lower.endswith('.mmu.edu.my')

def validate_password(password):
    """
    Validate password strength:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is valid"

def generate_token(user_id, email, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + Config.JWT_ACCESS_TOKEN_EXPIRES
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
    return token

def decode_token(token):
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        # Verify token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token is invalid or expired'}), 401
        
        # Add user info to request context
        request.user_id = payload['user_id']
        request.user_email = payload['email']
        request.user_role = payload['role']
        
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not hasattr(request, 'user_role') or request.user_role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

def register_user(data):
    """Register a new user"""
    try:
        # Validate required fields
        required_fields = ['email', 'password', 'firstName', 'lastName', 'studentId', 'faculty']
        for field in required_fields:
            if field not in data or not data[field]:
                return {'error': f'{field} is required'}, 400
        
        email = data['email'].lower().strip()
        password = data['password']
        first_name = data['firstName'].strip()
        last_name = data['lastName'].strip()
        student_id = data['studentId'].strip()
        faculty = data['faculty']
        
        # Validate MMU email
        if not validate_mmu_email(email):
            return {'error': 'Only MMU email addresses (@mmu.edu.my) are allowed'}, 400
        
        # Validate password strength
        is_valid, message = validate_password(password)
        if not is_valid:
            return {'error': message}, 400
        
        # Check if user already exists
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return {'error': 'Email already registered'}, 409
        
        cursor.execute('SELECT id FROM users WHERE student_id = ?', (student_id,))
        if cursor.fetchone():
            conn.close()
            return {'error': 'Student ID already registered'}, 409
        
        # Hash password and create user
        password_hash = hash_password(password)
        
        cursor.execute('''
            INSERT INTO users (email, password_hash, first_name, last_name, student_id, faculty)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (email, password_hash, first_name, last_name, student_id, faculty))
        
        user_id = cursor.lastrowid
        
        # Create user stats entry
        cursor.execute('''
            INSERT INTO user_stats (user_id) VALUES (?)
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        # Generate token
        token = generate_token(user_id, email, 'student')
        
        return {
            'message': 'Registration successful',
            'token': token,
            'user': {
                'id': user_id,
                'email': email,
                'firstName': first_name,
                'lastName': last_name,
                'studentId': student_id,
                'faculty': faculty,
                'role': 'student'
            }
        }, 201
        
    except Exception as e:
        return {'error': f'Registration failed: {str(e)}'}, 500

def login_user(data):
    """Login user and return JWT token"""
    try:
        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return {'error': 'Email and password are required'}, 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, email, password_hash, first_name, last_name, 
                   student_id, faculty, role, total_points
            FROM users WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return {'error': 'Invalid email or password'}, 401
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return {'error': 'Invalid email or password'}, 401
        
        # Generate token
        token = generate_token(user['id'], user['email'], user['role'])
        
        return {
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'firstName': user['first_name'],
                'lastName': user['last_name'],
                'studentId': user['student_id'],
                'faculty': user['faculty'],
                'role': user['role'],
                'totalPoints': user['total_points']
            }
        }, 200
        
    except Exception as e:
        return {'error': f'Login failed: {str(e)}'}, 500

def verify_token_endpoint(token):
    """Verify JWT token and return user info"""
    payload = decode_token(token)
    if not payload:
        return {'error': 'Invalid or expired token'}, 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, email, first_name, last_name, student_id, faculty, role, total_points
            FROM users WHERE id = ?
        ''', (payload['user_id'],))
        
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return {'error': 'User not found'}, 404
        
        return {
            'valid': True,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'firstName': user['first_name'],
                'lastName': user['last_name'],
                'studentId': user['student_id'],
                'faculty': user['faculty'],
                'role': user['role'],
                'totalPoints': user['total_points']
            }
        }, 200
        
    except Exception as e:
        return {'error': f'Verification failed: {str(e)}'}, 500
