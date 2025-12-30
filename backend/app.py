"""
Main Flask application for Kopi-O Sustainable Society Project
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime
from config import config
from database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('kopio.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import modules
import auth
import games
import leaderboard
import profile
import admin
import challenges

# Initialize Flask app
app = Flask(__name__)
env = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config.get(env, config['development']))

# Log startup
logger.info(f"Starting Kopi-O API in {env} mode")

# Enable CORS
# Note: Configure CORS_ORIGINS environment variable in production
# Default allows common development ports
default_cors = 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:5000,http://0.0.0.0:3000,http://localhost:5500,http://127.0.0.1:5500'
cors_origins_str = os.environ.get('CORS_ORIGINS', default_cors)
cors_origins = cors_origins_str.split(',') if cors_origins_str and cors_origins_str != '*' else '*'

if cors_origins == '*':
    logger.warning("CORS is set to allow all origins. This should only be used in development!")

CORS(app, resources={
    r"/api/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False
    }
})

# Initialize database
init_db()

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Kopi-O API is running'}), 200

# Public stats endpoint for homepage
@app.route('/api/public/stats', methods=['GET'])
def public_stats():
    """Get public platform statistics (no authentication required)"""
    result, status = admin.get_platform_statistics()
    return jsonify(result), status

# ==================== Authentication Endpoints ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    result, status = auth.register_user(data)
    return jsonify(result), status

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    data = request.get_json()
    result, status = auth.login_user(data)
    return jsonify(result), status

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
    """Verify JWT token"""
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Token is required'}), 400
    
    result, status = auth.verify_token_endpoint(token)
    return jsonify(result), status

@app.route('/api/auth/me', methods=['GET'])
@auth.token_required
def get_current_user():
    """Get current user info from token"""
    result, status = auth.verify_token_endpoint(request.headers.get('Authorization', '').split(' ')[-1])
    return jsonify(result), status

@app.route('/api/auth/verify-email', methods=['POST'])
def verify_email():
    """Verify user's email with token"""
    data = request.get_json()
    token = data.get('token')
    
    if not token:
        return jsonify({'error': 'Verification token is required'}), 400
    
    result, status = auth.verify_email_token(token)
    return jsonify(result), status

@app.route('/api/auth/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    result, status = auth.resend_verification_email(email)
    return jsonify(result), status

# ==================== Quiz Game Endpoints ====================

@app.route('/api/games/quiz/questions', methods=['GET'])
@auth.token_required
def get_quiz_questions():
    """Get random quiz questions"""
    count = request.args.get('count', type=int)
    result, status = games.get_random_quiz_questions(count)
    return jsonify(result), status

@app.route('/api/games/quiz/submit', methods=['POST'])
@auth.token_required
def submit_quiz():
    """Submit quiz answers and get score"""
    data = request.get_json()
    result, status = games.submit_quiz_score(request.user_id, data)
    return jsonify(result), status

# ==================== Memory Game Endpoints ====================

@app.route('/api/games/memory/submit', methods=['POST'])
@auth.token_required
def submit_memory_game():
    """Submit memory game score"""
    data = request.get_json()
    result, status = games.submit_memory_game_score(request.user_id, data)
    return jsonify(result), status

# ==================== Puzzle Game Endpoints ====================

@app.route('/api/games/puzzle/submit', methods=['POST'])
@auth.token_required
def submit_puzzle_game():
    """Submit puzzle game score"""
    data = request.get_json()
    result, status = games.submit_puzzle_game_score(request.user_id, data)
    return jsonify(result), status

# ==================== Sorting Game Endpoints ====================

@app.route('/api/games/sorting/submit', methods=['POST'])
@auth.token_required
def submit_sorting_game():
    """Submit sorting game score"""
    data = request.get_json()
    result, status = games.submit_sorting_game_score(request.user_id, data)
    return jsonify(result), status

# ==================== Leaderboard Endpoints ====================

@app.route('/api/leaderboard/global', methods=['GET'])
def get_global_leaderboard():
    """Get global leaderboard"""
    limit = request.args.get('limit', 50, type=int)
    page = request.args.get('page', 1, type=int)
    offset = (page - 1) * limit
    query = request.args.get('q', '')
    
    result, status = leaderboard.get_global_leaderboard(limit, offset, query if query else None)
    return jsonify(result), status

@app.route('/api/leaderboard/faculty/<faculty>', methods=['GET'])
def get_faculty_leaderboard(faculty):
    """Get leaderboard for specific faculty"""
    limit = request.args.get('limit', 50, type=int)
    page = request.args.get('page', 1, type=int)
    offset = (page - 1) * limit
    query = request.args.get('q', '')
    
    result, status = leaderboard.get_faculty_leaderboard(faculty, limit, offset, query if query else None)
    return jsonify(result), status

@app.route('/api/leaderboard/search', methods=['GET'])
def search_leaderboard():
    """Search leaderboard"""
    query = request.args.get('q', '')
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    result, status = leaderboard.search_leaderboard(query)
    return jsonify(result), status

@app.route('/api/leaderboard/top', methods=['GET'])
def get_top_players():
    """Get top players for homepage"""
    limit = request.args.get('limit', 3, type=int)
    result, status = leaderboard.get_top_players(limit)
    return jsonify(result), status

@app.route('/api/leaderboard/rank/<int:user_id>', methods=['GET'])
def get_user_rank(user_id):
    """Get specific user's rank"""
    result, status = leaderboard.get_user_rank(user_id)
    return jsonify(result), status

# ==================== Profile Endpoints ====================

@app.route('/api/profile/me', methods=['GET'])
@auth.token_required
def get_my_profile():
    """Get current user's profile"""
    result, status = profile.get_user_profile(request.user_id)
    return jsonify(result), status

@app.route('/api/profile/<int:user_id>', methods=['GET'])
@auth.token_required
def get_user_profile_by_id(user_id):
    """Get any user's profile"""
    result, status = profile.get_user_profile(user_id)
    return jsonify(result), status

@app.route('/api/profile/stats', methods=['GET'])
@auth.token_required
def get_my_stats():
    """Get current user's detailed statistics"""
    result, status = profile.get_user_stats(request.user_id)
    return jsonify(result), status

@app.route('/api/profile/achievements', methods=['GET'])
@auth.token_required
def get_my_achievements():
    """Get current user's achievements"""
    result, status = profile.get_user_achievements(request.user_id)
    return jsonify(result), status

# ==================== Admin Endpoints ====================

@app.route('/api/admin/users', methods=['GET'])
@auth.token_required
@auth.admin_required
def get_all_users():
    """Get all users (admin only)"""
    limit = request.args.get('limit', 50, type=int)
    page = request.args.get('page', 1, type=int)
    offset = (page - 1) * limit
    role_filter = request.args.get('role')
    
    result, status = admin.get_all_users(limit, offset, role_filter)
    return jsonify(result), status

@app.route('/api/admin/users/<int:user_id>', methods=['GET'])
@auth.token_required
@auth.admin_required
def get_user_details(user_id):
    """Get detailed user information (admin only)"""
    result, status = admin.get_user_details(user_id)
    return jsonify(result), status

@app.route('/api/admin/stats', methods=['GET'])
@auth.token_required
@auth.admin_required
def get_platform_stats():
    """Get platform statistics (admin only)"""
    result, status = admin.get_platform_statistics()
    return jsonify(result), status

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@auth.token_required
@auth.admin_required
def update_user_role(user_id):
    """Update user role (admin only)"""
    data = request.get_json()
    new_role = data.get('role')
    
    if not new_role:
        return jsonify({'error': 'Role is required'}), 400
    
    result, status = admin.update_user_role(request.user_id, user_id, new_role)
    return jsonify(result), status

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@auth.token_required
@auth.admin_required
def delete_user(user_id):
    """Delete user (admin only)"""
    result, status = admin.delete_user(request.user_id, user_id)
    return jsonify(result), status

@app.route('/api/admin/users/<int:user_id>/password', methods=['PUT'])
@auth.token_required
@auth.admin_required
def reset_user_password(user_id):
    """Reset user password (admin only)"""
    data = request.get_json()
    new_password = data.get('password')
    
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400
    
    result, status = admin.reset_user_password(request.user_id, user_id, new_password)
    return jsonify(result), status

# ==================== Daily Challenges Endpoints ====================

@app.route('/api/challenges/daily', methods=['GET'])
@auth.token_required
def get_challenges():
    """Get today's challenge progress"""
    result, status = challenges.get_daily_challenges(request.user_id)
    return jsonify(result), status

@app.route('/api/challenges/claim-daily-login', methods=['POST'])
@auth.token_required
def claim_login():
    """Claim daily login bonus"""
    result, status = challenges.claim_daily_login(request.user_id)
    return jsonify(result), status

@app.route('/api/challenges/claim-weekly-streak', methods=['POST'])
@auth.token_required
def claim_streak():
    """Claim weekly streak bonus"""
    result, status = challenges.claim_weekly_streak(request.user_id)
    return jsonify(result), status

# Error handlers
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Error: {request.url} not found")
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Error: {str(error)}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(error):
    logger.error(f"Unhandled exception: {str(error)}", exc_info=True)
    # Return generic error in production, detailed error in development
    if app.config.get('DEBUG'):
        return jsonify({'error': str(error)}), 500
    return jsonify({'error': 'An unexpected error occurred'}), 500

# Request logging middleware
@app.before_request
def log_request():
    logger.info(f"{request.method} {request.path} - IP: {request.remote_addr}")

@app.after_request
def log_response(response):
    logger.info(f"{request.method} {request.path} - Status: {response.status_code}")
    return response

# Run the application
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    logger.info(f"Starting server on port {port} with debug={debug_mode}")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
