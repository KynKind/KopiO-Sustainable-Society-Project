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
from email_service import generate_verification_token, send_verification_email

def hash_password(password):
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password, password_hash):
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))

def validate_mmu_email(email):
    """Validate that email is from MMU domain (including ALL subdomains)"""
    email_lower = email.lower().strip()
    # Accept @mmu.edu.my and ANY subdomain ending with .mmu.edu.my
    if email_lower.endswith('@mmu.edu.my'):
        return True
    if '.mmu.edu.my' in email_lower and '@' in email_lower:
        domain = email_lower.split('@')[1]
        if domain.endswith('mmu.edu.my'):
            return True
    return False

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
    """Register a new user with email verification"""
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
            return {'error': 'Only MMU email addresses are allowed (e.g., @mmu.edu.my or @student.mmu.edu.my)'}, 400
        
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
        
        # Check if email verification is required
        if Config.EMAIL_VERIFICATION_REQUIRED:
            # Generate verification token and send email
            verification_token = generate_verification_token()
            token_expires = datetime.utcnow() + Config.VERIFICATION_TOKEN_EXPIRES
            email_verified = 0
        else:
            # Skip verification - auto-verify the user
            verification_token = None
            token_expires = None
            email_verified = 1
        
        cursor.execute('''
            INSERT INTO users (email, password_hash, first_name, last_name, student_id, faculty, email_verified, verification_token, verification_token_expires)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (email, password_hash, first_name, last_name, student_id, faculty, email_verified, verification_token, token_expires))
        
        user_id = cursor.lastrowid
        
        # Create user stats entry
        cursor.execute('''
            INSERT INTO user_stats (user_id) VALUES (?)
        ''', (user_id,))
        
        conn.commit()
        conn.close()
        
        # Send verification email only if required
        if Config.EMAIL_VERIFICATION_REQUIRED:
            email_sent = send_verification_email(email, first_name, verification_token)
            
            if not email_sent:
                # Email failed but user was created - they can use resend
                return {
                    'message': 'Registration successful! However, we could not send the verification email. Please try resending it.',
                    'requiresVerification': True,
                    'email': email
                }, 201
            
            return {
                'message': 'Registration successful! Please check your email to verify your account.',
                'requiresVerification': True,
                'email': email
            }, 201
        else:
            # Auto-verified - return token so user can login immediately
            token = generate_token(user_id, email, 'student')
            return {
                'message': 'Registration successful!',
                'token': token,
                'user': {
                    'id': user_id,
                    'email': email,
                    'firstName': first_name,
                    'lastName': last_name,
                    'studentId': student_id,
                    'faculty': faculty,
                    'role': 'student',
                    'totalPoints': 0
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
                   student_id, faculty, role, total_points, email_verified
            FROM users WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return {'error': 'Invalid email or password'}, 401
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return {'error': 'Invalid email or password'}, 401
        
        # Check if email is verified (only if verification is required)
        if Config.EMAIL_VERIFICATION_REQUIRED and not user['email_verified']:
            return {'error': 'Please verify your email before logging in. Check your inbox for the verification link.', 'requiresVerification': True, 'email': email}, 401
        
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

def verify_email_token(token):
    """Verify user's email with token"""
    try:
        if not token:
            return {'error': 'Verification token is required'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user with this verification token
        cursor.execute('''
            SELECT id, email, first_name, verification_token_expires, email_verified
            FROM users 
            WHERE verification_token = ?
        ''', (token,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'Invalid verification token'}, 400
        
        # Check if already verified
        if user['email_verified']:
            conn.close()
            return {'message': 'Email already verified! You can now login.', 'success': True}, 200
        
        # Check if token expired
        if user['verification_token_expires']:
            try:
                # Handle both string and datetime objects from SQLite
                if isinstance(user['verification_token_expires'], str):
                    token_expires = datetime.fromisoformat(user['verification_token_expires'])
                else:
                    token_expires = user['verification_token_expires']
                    
                if datetime.utcnow() > token_expires:
                    conn.close()
                    return {'error': 'Verification token has expired. Please request a new one.', 'expired': True}, 400
            except (ValueError, TypeError) as e:
                # If parsing fails, treat as expired for security
                conn.close()
                return {'error': 'Invalid verification token. Please request a new one.', 'expired': True}, 400
        
        # Mark email as verified
        cursor.execute('''
            UPDATE users 
            SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL
            WHERE id = ?
        ''', (user['id'],))
        
        conn.commit()
        conn.close()
        
        return {
            'message': 'Email verified successfully! You can now login.',
            'success': True
        }, 200
        
    except Exception as e:
        return {'error': f'Verification failed: {str(e)}'}, 500

def resend_verification_email(email):
    """Resend verification email to user"""
    try:
        email = email.lower().strip()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Find user
        cursor.execute('''
            SELECT id, first_name, email_verified, verification_token_expires
            FROM users 
            WHERE email = ?
        ''', (email,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'Email not found'}, 404
        
        # Check if already verified
        if user['email_verified']:
            conn.close()
            return {'message': 'Email already verified! You can login now.'}, 200
        
        # Check if last token was created recently (within 60 seconds) to prevent spam
        if user['verification_token_expires']:
            try:
                if isinstance(user['verification_token_expires'], str):
                    last_token_time = datetime.fromisoformat(user['verification_token_expires'])
                else:
                    last_token_time = user['verification_token_expires']
                
                # Token was generated for 24 hours ahead, so subtract that to get creation time
                token_created_at = last_token_time - Config.VERIFICATION_TOKEN_EXPIRES
                time_since_last_request = datetime.utcnow() - token_created_at
                
                if time_since_last_request.total_seconds() < 60:
                    conn.close()
                    return {'error': 'Please wait before requesting another verification email. Check your spam folder.'}, 429
            except (ValueError, TypeError):
                # If parsing fails, allow regeneration
                pass
        
        # Generate new verification token
        verification_token = generate_verification_token()
        token_expires = datetime.utcnow() + Config.VERIFICATION_TOKEN_EXPIRES
        
        # Update user with new token
        cursor.execute('''
            UPDATE users 
            SET verification_token = ?, verification_token_expires = ?
            WHERE id = ?
        ''', (verification_token, token_expires, user['id']))
        
        conn.commit()
        conn.close()
        
        # Send verification email
        email_sent = send_verification_email(email, user['first_name'], verification_token)
        
        if not email_sent:
            return {'error': 'Failed to send verification email. Please try again later.'}, 500
        
        return {
            'message': 'Verification email sent! Please check your inbox.',
            'success': True
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to resend verification: {str(e)}'}, 500

