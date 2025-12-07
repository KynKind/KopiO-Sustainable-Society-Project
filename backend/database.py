"""
Database initialization and management for Kopi-O
"""
import sqlite3
import os
import logging
import bcrypt
from datetime import datetime

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

def init_db():
    """Initialize the database with tables"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
    except Exception as e:
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
    """Insert demo users for testing"""
    # Hash passwords using bcrypt
    def hash_password(password):
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    demo_users = [
        # Student demo account
        ('demo.student@student.mmu.edu.my', hash_password('Student123!'), 'Demo', 'Student', 'STU001', 'Faculty of Computing', 'student', 0),
        # Admin demo account  
        ('admin@student.mmu.edu.my', hash_password('Admin123!'), 'Admin', 'User', 'ADM001', 'Administration', 'admin', 0),
    ]
    
    for user in demo_users:
        try:
            cursor.execute('''
                INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, student_id, faculty, role, total_points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', user)
            
            # Get the user ID for stats
            cursor.execute('SELECT id FROM users WHERE email = ?', (user[0],))
            result = cursor.fetchone()
            if result:
                cursor.execute('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)', (result[0],))
        except Exception as e:
            logger.error(f"Error inserting demo user {user[0]}: {e}")

def insert_sample_questions(cursor):
    """Insert sample sustainability quiz questions"""
    questions = [
        ("Which of these materials takes the longest to decompose in nature?", 
         "Paper cup", "Banana peel", "Plastic bottle", "Cotton T-shirt", 
         2, "Plastic bottles can take up to 450 years to decompose in nature!", "easy"),
        
        ("What is the most energy-efficient way to wash clothes?", 
         "Hot water cycle", "Warm water cycle", "Cold water cycle", "All use same energy", 
         2, "Washing clothes in cold water saves 90% of the energy used by hot water cycles!", "medium"),
        
        ("Which activity saves the most water?", 
         "Turning off tap while brushing", "Taking 5-minute showers", "Fixing a leaky faucet", "Using a dishwasher", 
         1, "A 5-minute shower uses about 40 liters of water, while a 10-minute shower uses 80 liters!", "easy"),
        
        ("What percentage of plastic waste is actually recycled globally?", 
         "9%", "25%", "50%", "75%", 
         0, "Only 9% of all plastic ever produced has been recycled. The rest ends up in landfills or oceans.", "hard"),
        
        ("Which food has the highest carbon footprint?", 
         "Beef", "Chicken", "Tofu", "Local vegetables", 
         0, "Beef production produces 5 times more greenhouse gases than chicken and 20 times more than plant-based proteins!", "medium"),
        
        ("What is the average time it takes for an aluminum can to decompose?", 
         "1 year", "10 years", "80-200 years", "500 years", 
         2, "Aluminum cans take 80-200 years to decompose, but they are infinitely recyclable!", "medium"),
        
        ("How much energy does recycling one aluminum can save compared to making a new one?", 
         "25%", "50%", "75%", "95%", 
         3, "Recycling one aluminum can saves enough energy to power a TV for 3 hours!", "hard"),
        
        ("Which of these is NOT a renewable energy source?", 
         "Solar", "Wind", "Natural gas", "Hydroelectric", 
         2, "Natural gas is a fossil fuel and will eventually run out, unlike renewable sources.", "easy"),
        
        ("What percentage of Earth's water is fresh water?", 
         "3%", "10%", "25%", "50%", 
         0, "Only about 3% of Earth's water is fresh, and most of it is frozen in glaciers!", "medium"),
        
        ("How many trees does it take to absorb the CO2 produced by one car per year?", 
         "5 trees", "20 trees", "50 trees", "100 trees", 
         2, "It takes approximately 50 mature trees to absorb the CO2 emissions from one car driven for a year!", "hard"),
        
        ("What is the most effective way to reduce your carbon footprint?", 
         "Recycling more", "Eating less meat", "Driving less", "Using renewable energy", 
         1, "Reducing meat consumption, especially beef, can reduce your carbon footprint by up to 50%!", "medium"),
        
        ("How much water can a dripping faucet waste per day?", 
         "1 liter", "10 liters", "50 liters", "100 liters", 
         2, "A dripping faucet can waste up to 50 liters of water per day!", "easy"),
        
        ("Which country produces the most renewable energy?", 
         "China", "USA", "Germany", "Denmark", 
         0, "China is the world's largest producer of renewable energy, though Denmark leads in wind energy per capita.", "hard"),
        
        ("How long does it take for a glass bottle to decompose?", 
         "100 years", "500 years", "1000 years", "Never fully decomposes", 
         3, "Glass can take over 1 million years to decompose, but it's 100% recyclable!", "medium"),
        
        ("What percentage of household waste can be recycled or composted?", 
         "20%", "40%", "60%", "80%", 
         2, "About 60% of household waste can be recycled or composted instead of going to landfills!", "medium"),
        
        ("How much plastic enters the ocean every year?", 
         "1 million tons", "8 million tons", "15 million tons", "50 million tons", 
         1, "About 8 million tons of plastic waste enters the ocean each year, equivalent to dumping a garbage truck every minute!", "hard"),
        
        ("What is the best material for reusable shopping bags from an environmental perspective?", 
         "Cotton", "Paper", "Jute", "Recycled plastic", 
         2, "Jute bags have the lowest environmental impact when considering production and durability!", "medium"),
        
        ("How much CO2 does one mature tree absorb per year?", 
         "5 kg", "22 kg", "50 kg", "100 kg", 
         1, "One mature tree can absorb approximately 22 kg of CO2 per year!", "medium"),
        
        ("Which appliance uses the most electricity in a typical home?", 
         "Air conditioning", "Refrigerator", "Television", "Washing machine", 
         0, "Air conditioning typically accounts for the highest energy consumption in homes, especially in hot climates!", "easy"),
        
        ("What percentage of the world's electricity comes from renewable sources?", 
         "10%", "28%", "50%", "75%", 
         1, "As of 2023, approximately 28% of global electricity comes from renewable sources, and growing!", "hard"),
        
        ("How many years does it take for a cigarette butt to decompose?", 
         "1 year", "5 years", "10 years", "18 months", 
         2, "Cigarette butts can take 10-12 years to decompose and are toxic to wildlife!", "medium"),
        
        ("What is the main cause of ocean acidification?", 
         "Plastic pollution", "Oil spills", "CO2 absorption", "Chemical runoff", 
         2, "The ocean absorbs about 30% of atmospheric CO2, which causes acidification!", "hard"),
        
        ("How much energy does an LED bulb save compared to an incandescent bulb?", 
         "25%", "50%", "75%", "90%", 
         2, "LED bulbs use about 75% less energy than incandescent bulbs and last 25 times longer!", "medium"),
        
        ("Which of these activities has the smallest carbon footprint?", 
         "Flying 100 km", "Driving 100 km", "Taking a train 100 km", "Taking a bus 100 km", 
         2, "Train travel has the smallest carbon footprint per passenger for long distances!", "easy"),
        
        ("What percentage of the Amazon rainforest has been lost in the last 50 years?", 
         "5%", "10%", "17%", "30%", 
         2, "Approximately 17% of the Amazon rainforest has been lost in the past 50 years due to deforestation!", "hard")
    ]
    
    for q in questions:
        cursor.execute('''
            INSERT INTO quiz_questions 
            (question, option_a, option_b, option_c, option_d, correct_option, fact, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', q)

if __name__ == '__main__':
    init_db()
