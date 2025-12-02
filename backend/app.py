from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, User
from auth import auth_bp
from games import games_bp
from admin import admin_bp
from datetime import datetime
import hashlib

app = Flask(__name__)
app.config.from_object(Config)

# Setup extensions
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:5500"], supports_credentials=True)
jwt = JWTManager(app)
db.init_app(app)

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(games_bp)
app.register_blueprint(admin_bp)

# Password hashing function
def hash_password(password):
    return hashlib.sha256(f"kopio-salt-{password}".encode()).hexdigest()

# Create database tables and initial data
with app.app_context():
    db.create_all()
    
    # Create admin user if not exists
    admin_email = 'admin@student.mmu.edu.my'
    admin_user = User.query.filter_by(email=admin_email).first()
    
    if not admin_user:
        admin_user = User(
            student_id='87654321',
            email=admin_email,
            password_hash=hash_password('Admin123!'),
            first_name='Admin',
            last_name='User',
            faculty='FCI',
            points=5000,
            is_admin=True,
            is_verified=True
        )
        db.session.add(admin_user)
        db.session.commit()
        print(f"✅ Created admin user: {admin_email} / Admin123!")
    
    # Create demo student user if not exists
    demo_email = 'student@student.mmu.edu.my'
    demo_user = User.query.filter_by(email=demo_email).first()
    
    if not demo_user:
        demo_user = User(
            student_id='12345678',
            email=demo_email,
            password_hash=hash_password('Student123!'),
            first_name='Demo',
            last_name='Student',
            faculty='FCI',
            points=1250,
            is_admin=False,
            is_verified=True
        )
        db.session.add(demo_user)
        db.session.commit()
        print(f"✅ Created demo user: {demo_email} / Student123!")

@app.route('/')
def home():
    return jsonify({
        'message': 'Kopi-O Sustainable Society API',
        'status': 'running',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat(),
        'week': 5,
        'target': 'Week 11 Presentation'
    })

@app.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy',
        'database': 'connected',
        'timestamp': datetime.utcnow().isoformat(),
        'endpoints': {
            'auth': ['/api/auth/login', '/api/auth/register', '/api/auth/me'],
            'games': ['/api/games/submit', '/api/games/leaderboard', '/api/games/history/<user_id>'],
            'admin': ['/api/admin/users', '/api/admin/stats']
        }
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 KOPI-O SUSTAINABLE SOCIETY - FLASK BACKEND")
    print("=" * 60)
    print("📡 API Server: http://localhost:5000")
    print("🔗 Health Check: http://localhost:5000/api/health")
    print("👤 Demo Accounts:")
    print("   Admin: admin@student.mmu.edu.my / Admin123!")
    print("   Student: student@student.mmu.edu.my / Student123!")
    print("=" * 60)
    print("📱 Frontend: Open frontend/html/index.html with Live Server")
    print("⚠️  Make sure both servers are running!")
    print("=" * 60)
    
    app.run(debug=True, port=5000)