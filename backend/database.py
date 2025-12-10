"""
Database initialization and management for Kopi-O
"""
import sqlite3
import os
import logging
import bcrypt
from datetime import datetime
from questions_data import QUIZ_QUESTIONS

logger = logging.getLogger(__name__)

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'kopio.db')

def get_db_connection():
    """Get a database connection with error handling"""
    try:
        conn = sqlite3.connect(DATABASE_PATH, timeout=10.0)
        conn.row_factory = sqlite3.Row
        # Enable foreign key constraints
        conn.execute("PRAGMA foreign_keys = ON")
        return conn
    except sqlite3.Error as e:
        logger.error(f"Database connection error: {e}")
        raise

def fix_unverified_users(cursor=None):
    """Fix any unverified users by setting email_verified = 1
    
    Args:
        cursor: Optional database cursor. If provided, uses this cursor.
                If not provided, creates its own connection.
    """
    own_connection = cursor is None
    conn = None
    
    try:
        if own_connection:
            conn = get_db_connection()
            cursor = conn.cursor()
        
        # Update ALL users to be verified
        cursor.execute('UPDATE users SET email_verified = 1 WHERE email_verified = 0')
        
        affected = cursor.rowcount
        if affected > 0:
            logger.info(f"Auto-verified {affected} users")
            print(f"✅ Auto-verified {affected} existing users")
        
        if own_connection and conn:
            conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Error fixing unverified users: {e}")
        if own_connection and conn:
            conn.rollback()
        raise
    finally:
        if own_connection and conn:
            conn.close()

def init_db():
    """Initialize the database with tables"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except sqlite3.Error as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            student_id TEXT UNIQUE NOT NULL,
            faculty TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            total_points INTEGER DEFAULT 0,
            email_verified BOOLEAN DEFAULT 0,
            verification_token TEXT,
            verification_token_expires TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Quiz questions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_option INTEGER NOT NULL,
            fact TEXT,
            difficulty TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Game scores table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_type TEXT NOT NULL,
            score INTEGER NOT NULL,
            points_earned INTEGER NOT NULL,
            game_data TEXT,
            played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # User statistics table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            quiz_games_played INTEGER DEFAULT 0,
            memory_games_played INTEGER DEFAULT 0,
            puzzle_games_played INTEGER DEFAULT 0,
            sorting_games_played INTEGER DEFAULT 0,
            quiz_points INTEGER DEFAULT 0,
            memory_points INTEGER DEFAULT 0,
            puzzle_points INTEGER DEFAULT 0,
            sorting_points INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            last_played_date DATE,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    
    # AUTO-FIX: Verify all existing users so they can login
    fix_unverified_users(cursor)
    conn.commit()  # Commit the auto-verification changes
    
    # Insert sample quiz questions if none exist
    cursor.execute('SELECT COUNT(*) FROM quiz_questions')
    if cursor.fetchone()[0] == 0:
        insert_sample_questions(cursor)
        conn.commit()
    
    # Insert demo users if they don't exist
    cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'demo.student@student.mmu.edu.my'")
    if cursor.fetchone()[0] == 0:
        insert_demo_users(cursor)
        conn.commit()
        logger.info("Demo users created successfully!")
    
    conn.close()
    logger.info("Database initialized successfully!")
    print("Database initialized successfully!")

def insert_demo_users(cursor):
    """Insert demo users for testing - PRE-VERIFIED so they can login immediately"""
    # Hash passwords using bcrypt
    def hash_password(password):
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    demo_users = [
        # (email, password_hash, first_name, last_name, student_id, faculty, role, total_points, email_verified)
        # Student demo account - email_verified = 1
        ('demo.student@student.mmu.edu.my', hash_password('Student123!'), 'Demo', 'Student', 'STU001', 'Faculty of Computing', 'student', 100, 1),
        # Admin demo account - email_verified = 1
        ('admin@student.mmu.edu.my', hash_password('Admin123!'), 'Admin', 'User', 'ADM001', 'Administration', 'admin', 500, 1),
    ]
    
    for user in demo_users:
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, student_id, faculty, role, total_points, email_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', user)
            
            # Get the user ID for stats
            cursor.execute('SELECT id FROM users WHERE email = ?', (user[0],))
            result = cursor.fetchone()
            if result:
                cursor.execute('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)', (result[0],))
        except Exception as e:
            logger.error(f"Error inserting demo user {user[0]}: {e}")

def insert_sample_questions(cursor):
    cursor.executemany("""
        INSERT INTO questions 
        (question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, QUIZ_QUESTIONS)
    
if __name__ == '__main__':
    init_db()
