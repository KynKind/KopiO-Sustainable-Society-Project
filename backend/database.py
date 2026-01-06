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

def ensure_all_users_have_stats(cursor=None):
    """Ensure all users have corresponding user_stats records
    
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
        
        # Insert user_stats for any users that don't have them
        cursor.execute('''
            INSERT OR IGNORE INTO user_stats (user_id)
            SELECT id FROM users
            WHERE id NOT IN (SELECT user_id FROM user_stats)
        ''')
        
        affected = cursor.rowcount
        if affected > 0:
            logger.info(f"Created user_stats for {affected} users")
            print(f"✅ Created user_stats records for {affected} existing users")
        
        if own_connection and conn:
            conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Error ensuring user_stats: {e}")
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
            played_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
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
    
    # Recent activities table - dedicated tracking for profile display
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recent_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            activity_type TEXT NOT NULL,
            activity_title TEXT NOT NULL,
            points_earned INTEGER DEFAULT 0,
            activity_data TEXT,
            created_at TIMESTAMP DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create index for faster queries
    cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_recent_activities_user_id 
        ON recent_activities(user_id, created_at DESC)
    ''')
    
    # Daily challenges table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_challenges (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            challenge_date DATE NOT NULL,
            daily_login_claimed BOOLEAN DEFAULT 0,
            game_played_today BOOLEAN DEFAULT 0,
            weekly_streak_bonus_claimed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id, challenge_date)
        )
    ''')
    
    conn.commit()
    
    # AUTO-FIX: Verify all existing users so they can login
    fix_unverified_users(cursor)
    conn.commit()  # Commit the auto-verification changes
    
    # AUTO-FIX: Ensure all users have user_stats records
    ensure_all_users_have_stats(cursor)
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
    else:
        # Update demo user faculty to new format
        cursor.execute('''
            UPDATE users SET faculty = 'Faculty of Computing & Informatics (FCI)' 
            WHERE email = 'demo.student@student.mmu.edu.my' AND faculty = 'Faculty of Computing'
        ''')
        if cursor.rowcount > 0:
            conn.commit()
            logger.info("Updated demo user faculty")
    
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
        ('demo.student@student.mmu.edu.my', hash_password('Student123!'), 'Demo', 'Student', 'STU001', 'Faculty of Computing & Informatics (FCI)', 'student', 100, 1),
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
    """Insert 200+ sustainability quiz questions"""
    questions = [
        # === EXISTING 25 QUESTIONS ===
            (1, "What is global warming?", "Cooling of Earth", "Increase in Earth’s temperature", "Heavy rainfall", "More snow", 1, "It means Earth’s temperature is rising.", "easy"),
    (2, "Which gas mainly causes global warming?", "Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen", 2, "CO₂ traps heat in the atmosphere.", "easy"),
    (3, "What does recycling mean?", "Throwing away waste", "Reusing materials", "Burning waste", "Burying trash", 1, "Recycling turns waste into new products.", "easy"),
    (4, "What is renewable energy?", "Energy that runs out", "Energy from fossil fuels", "Energy that can be replaced naturally", "Energy from coal", 2, "Renewable energy comes from natural sources.", "easy"),
    (5, "Which of these is biodegradable?", "Plastic bottle", "Glass jar", "Banana peel", "Metal can", 2, "Organic waste breaks down naturally.", "easy"),
    (6, "What is deforestation?", "Planting trees", "Cutting down forests", "Watering trees", "Growing crops", 1, "Deforestation means removing trees.", "easy"),
    (7, "Which action saves water?", "Leaving tap open", "Fixing leaking pipes", "Long showers", "Washing half loads", 1, "Fixing leaks prevents water waste.", "easy"),
    (8, "What is air pollution?", "Clean air", "Fresh air", "Harmful substances in the air", "Cold air", 2, "Pollution harms air quality.", "easy"),
    (9, "What is climate change?", "Short-term weather", "Long-term weather changes", "Daily temperature", "Rain only", 1, "Climate change affects global patterns.", "easy"),
    (10, "Which transport is most eco-friendly?", "Car", "Bus", "Bicycle", "Plane", 2, "Bicycles do not use fuel.", "easy"),
    (11, "What helps fight climate change?", "Burning coal", "Planting trees", "Deforestation", "Using plastic", 1, "Trees absorb CO₂.", "easy"),
    (12, "What should you do with old electronics?", "Throw in nature", "Recycle as e-waste", "Burn them", "Bury them", 1, "E-waste recycling prevents pollution.", "easy"),
    (13, "Which of these is a renewable resource?", "Coal", "Oil", "Wind", "Natural gas", 2, "Wind energy is renewable.", "easy"),
    (14, "What causes ocean pollution?", "Plastic waste", "Clean water", "Fish", "Sand", 0, "Plastic harms marine life.", "easy"),
    (15, "Which activity increases carbon footprint?", "Walking", "Using public transport", "Driving a car alone", "Cycling", 2, "Cars increase CO₂ emissions.", "easy"),
    (16, "Which material takes shorter time to decompose?", "Plastic", "Glass", "Paper", "Metal", 2, "Paper decomposes faster.", "easy"),
    (17, "What happens if glaciers melt?", "Sea level rises", "Sea dries up", "Earth cools", "More snow", 0, "Melting ice increases sea levels.", "easy"),
    (18, "Which is an effect of pollution?", "Healthy lungs", "Cleaner rivers", "Global warming", "More trees", 2, "Pollution contributes to warming.", "easy"),
    (19, "Which can save electricity?", "Turning off unused lights", "Leaving TV on", "Running AC all day", "Charging all night", 0, "Saving power reduces emissions.", "easy"),
    (20, "Which gas is released by burning fossil fuels?", "Oxygen", "Carbon dioxide", "Hydrogen", "Nitrogen", 1, "CO₂ causes warming.", "easy"),
    (21, "What is global warming?", "Cooling of Earth", "Increase in Earth’s temperature", "Heavy rainfall", "More snow", 2, "It means Earth’s temperature is rising.", "easy"),
    (22, "Which gas contributes most to the greenhouse effect?", "Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen", 2, "Carbon dioxide traps heat in the atmosphere.", "easy"),
    (23, "What is a renewable energy source?", "Coal", "Oil", "Solar power", "Natural gas", 3, "Solar power is naturally replenished.", "easy"),
    (24, "Which of the following is NOT biodegradable?", "Paper", "Plastic", "Fruit peels", "Leaves", 2, "Plastic takes hundreds of years to decompose.", "easy"),
    (25, "What does recycling help reduce?", "Pollution", "Energy usage", "Waste in landfills", "All of the above", 4, "Recycling reduces all these environmental impacts.", "easy"),
    (26, "Which practice helps conserve water?", "Leaving taps running", "Fixing leaks", "Watering lawns at noon", "Washing cars frequently", 2, "Fixing leaks prevents water wastage.", "easy"),
    (27, "What is deforestation?", "Planting trees", "Cutting down forests", "Growing crops", "Building houses", 2, "Deforestation is the removal of forests.", "easy"),
    (28, "Which is a sustainable transportation method?", "Driving alone", "Using bicycles", "Using petrol scooters", "Flying frequently", 2, "Bicycles reduce emissions and save energy.", "easy"),
    (29, "What is composting?", "Throwing food away", "Turning organic waste into fertilizer", "Burning waste", "Recycling plastics", 2, "Composting recycles organic waste naturally.", "easy"),
    (30, "Which energy source produces the least pollution?", "Coal", "Oil", "Wind", "Natural gas", 3, "Wind energy is clean and renewable.", "easy"),
    (31, "Why is protecting biodiversity important?", "For aesthetic purposes only", "To maintain ecosystem balance", "It increases pollution", "It wastes resources", 2, "Biodiversity ensures ecosystem stability.", "medium"),
    (32, "Which of the following is an effect of climate change?", "More predictable weather", "Rising sea levels", "Decreased temperatures globally", "Stable ecosystems", 2, "Climate change causes sea levels to rise.", "medium"),
    (33, "What does 'sustainable development' mean?", "Using resources recklessly", "Meeting present needs without harming future generations", "Destroying forests for growth", "Polluting rivers for industries", 2, "It balances present needs with future resources.", "medium"),
    (34, "Which material is better for the environment?", "Single-use plastic", "Reusable metal bottle", "Plastic bag", "Styrofoam cup", 2, "Reusable items reduce waste.", "medium"),
    (35, "What is an ecological footprint?", "The number of trees you plant", "The environmental impact of your activities", "The area you live in", "The number of animals in your area", 2, "It measures human impact on the planet.", "medium"),
    (36, "Which action reduces air pollution?", "Burning garbage", "Using public transport", "Using diesel excessively", "Using firecrackers", 2, "Public transport reduces vehicle emissions.", "medium"),
    (37, "What is overfishing?", "Fishing too little", "Fishing too many fish faster than they reproduce", "Planting more fish", "Fishing sustainably", 2, "It depletes fish populations faster than they can recover.", "medium"),
    (38, "Which is a consequence of plastic pollution in oceans?", "Cleaner water", "Harming marine life", "Better fish growth", "Stronger ecosystems", 2, "Plastic harms marine animals and ecosystems.", "medium"),
    (39, "What is the main cause of ozone layer depletion?", "CFCs from aerosols", "Wind energy", "Solar panels", "Planting trees", 1, "CFCs damage the ozone layer, increasing UV exposure.", "hard"),
    (40, "Which of these contributes to soil erosion?", "Planting cover crops", "Deforestation", "Terracing farmland", "Mulching", 2, "Removing trees exposes soil to erosion.", "hard"),
    (41, "Which of these is a non-renewable resource?", "Wind", "Solar", "Coal", "Water", 3, "Coal cannot be replenished within a human lifetime.", "easy"),
    (42, "What does 'carbon footprint' measure?", "Amount of carbon in food", "Amount of greenhouse gases emitted", "Forest coverage", "Water usage", 2, "It measures the total greenhouse gases produced by human activities.", "easy"),
    (43, "Which of the following reduces energy consumption?", "Turning off lights when not in use", "Leaving appliances on", "Using multiple heaters", "Driving instead of walking", 1, "Turning off unused appliances saves energy.", "easy"),
    (44, "What is an example of sustainable agriculture?", "Monocropping", "Using chemical-intensive farming", "Crop rotation", "Deforestation", 3, "Crop rotation maintains soil health and biodiversity.", "easy"),
    (45,"Which action helps reduce plastic waste?", "Using single-use plastic bottles", "Carrying reusable bags", "Using plastic straws", "Littering", 2, "Reusable bags help reduce plastic waste.", "easy"),
    (46, "Which of these is an effect of acid rain?", "Healthier forests", "Corroded buildings", "Clean rivers", "Better air quality", 2, "Acid rain damages structures and ecosystems.", "medium"),
    (47, "What is urban heat island effect?", "Cities being cooler than rural areas", "Cities being warmer than surrounding areas", "Rural areas being polluted", "Forests being cleared", 2, "Urban areas are warmer due to human activities and concrete.", "medium"),
    (48, "Which practice helps reduce water pollution?", "Dumping chemicals into rivers", "Planting riparian buffers", "Using pesticides carelessly", "Oil spills in rivers", 2, "Vegetated buffers filter pollutants before they reach water bodies.", "medium"),
    (49, "What is sustainable forestry?", "Cutting all trees at once", "Planting trees to replace harvested ones", "Leaving forests unmanaged", "Burning forests for land", 2, "Sustainable forestry ensures forest regeneration.", "medium"),
    (50, "Which of these is a clean transportation option?", "Diesel truck", "Electric car", "Petrol motorcycle", "Airplane", 2, "Electric vehicles produce less air pollution.", "medium"),
    (51, "What is the purpose of the Paris Agreement?", "To promote industrial growth", "To reduce global greenhouse gas emissions", "To encourage deforestation", "To increase fossil fuel usage", 2, "It is an international treaty to combat climate change.", "medium"),
    (52, "Which type of energy is considered green?", "Coal", "Natural gas", "Hydroelectric", "Oil", 3, "Hydroelectric energy is renewable and clean.", "medium"),
    (53, "What is the main source of microplastics in oceans?", "Natural fibers", "Decomposed plastic products", "Sand", "Saltwater", 2, "Microplastics come from broken-down plastic waste.", "hard"),
    (54, "Which of the following is a consequence of melting glaciers?", "Rising sea levels", "Stable temperatures", "More forests", "Decreased water availability", 1, "Glacier melt contributes to higher sea levels.", "hard"),
    (55, "What is the benefit of green roofs in cities?", "Increase pollution", "Reduce heat and absorb rainwater", "Increase energy use", "Destroy biodiversity", 2, "Green roofs reduce urban heat and manage stormwater.", "hard"),
    (56, "Which international organization monitors climate change?", "UNESCO", "UNFCCC", "WHO", "FAO", 2, "The United Nations Framework Convention on Climate Change monitors climate issues.", "hard"),
    (57, "What does sustainable fishing involve?", "Catching all available fish", "Catching only mature fish and preserving stocks", "Using harmful nets", "Destroying habitats", 2, "It ensures fish populations remain healthy.", "hard"),
    (58, "Which action helps reduce deforestation?", "Planting more trees", "Cutting down more trees", "Using more paper", "Burning forests", 1, "Reforestation counteracts deforestation.", "easy"),
    (59, "Which of these is an effect of climate change on agriculture?", "Longer growing seasons in all regions", "Changes in crop yields", "Stable rainfall patterns", "No effect", 2, "Climate change alters rainfall and temperature, affecting crops.", "medium"),
    (60, "Why is reducing meat consumption linked to sustainability?", "Livestock farming produces greenhouse gases", "Meat is unhealthy", "Plants are tastier", "Meat is expensive", 1, "Livestock contributes significantly to emissions and environmental impact.", "medium"),
    (61, "Which of these is a primary cause of air pollution?", "Trees", "Cars and factories", "Rain", "Wind", 2, "Vehicles and industrial emissions release pollutants into the air.", "easy"),
    (62, "What is the main goal of sustainable living?", "Maximizing profit", "Minimizing environmental impact", "Increasing consumption", "Building more cities", 2, "Sustainable living reduces harm to the environment.", "easy"),
    (63, "Which is an example of a biodegradable material?", "Plastic bottle", "Aluminum can", "Banana peel", "Styrofoam", 3, "Organic materials like banana peels decompose naturally.", "easy"),
    (64,"Which of these reduces electricity consumption at home?", "Leaving devices on standby", "Using LED bulbs", "Using incandescent bulbs", "Overcharging devices", 2, "LED bulbs use much less energy than traditional bulbs.", "easy"),
    (65, "What is the effect of excessive use of chemical fertilizers?", "Healthier soil", "Water pollution and soil degradation", "Increased biodiversity", "Clean rivers", 2, "Chemical runoff harms water bodies and soil quality.", "medium"),
    (66, "Which energy source is considered clean and renewable?", "Coal", "Oil", "Geothermal", "Natural gas", 3, "Geothermal energy is renewable and low in emissions.", "medium"),
    (67, "What is a major cause of ocean acidification?", "Plastic waste", "CO2 emissions", "Oil spills", "Excess fish farming", 2, "Carbon dioxide dissolves in oceans, lowering pH levels.", "medium"),
    (68, "Which of the following is a sustainable water management practice?", "Over-extraction of groundwater", "Rainwater harvesting", "Dumping industrial waste", "Deforestation", 2, "Harvesting rainwater conserves freshwater resources.", "medium"),
    (69, "What is an ecological benefit of wetlands?", "Reduce biodiversity", "Store carbon and filter water", "Increase urban heat", "Increase pollution", 2, "Wetlands act as natural water filters and carbon sinks.", "medium"),
    (70, "Which human activity contributes to soil erosion?", "Planting trees", "Deforestation and overgrazing", "Terracing farmland", "Cover cropping", 2, "Removing vegetation exposes soil to wind and water erosion.", "medium"),
    (71, "Which of these is an effect of melting permafrost?", "Release of methane", "More glaciers", "Stable ecosystems", "Cooler temperatures", 1, "Thawing permafrost releases greenhouse gases like methane.", "hard"),
    (72, "What is the purpose of the UN Sustainable Development Goals (SDGs)?", "Promote global conflict", "Address global social, economic, and environmental issues", "Increase industrial production", "Reduce international cooperation", 2, "SDGs aim to make the world more sustainable and equitable.", "hard"),
    (73, "Which of these is an example of sustainable urban planning?", "Expanding highways endlessly", "Developing public transport and green spaces", "Clearing forests for housing", "Ignoring pollution", 2, "Green urban planning reduces pollution and improves livability.", "hard"),
    (74, "What is the main environmental problem caused by e-waste?", "Air pollution", "Water and soil contamination", "Deforestation", "Climate cooling", 2, "Improper disposal of electronics releases toxic substances.", "hard"),
    (75, "Which of these contributes most to global methane emissions?", "Rice paddies and livestock", "Coal burning", "Solar panels", "Wind turbines", 1, "Agriculture, especially livestock, releases methane into the atmosphere.", "hard"),
    (76, "What does 'circular economy' mean?", "Throwing away products after use", "Reusing, recycling, and minimizing waste", "Increasing production without limit", "Cutting trees for profit", 2, "A circular economy focuses on reducing waste and reusing resources.", "hard"),
    (77, "Which of these human actions helps reduce carbon emissions?", "Driving more cars", "Using public transport", "Cutting down forests", "Using coal extensively", 2, "Public transport reduces per capita carbon emissions.", "medium"),
    (78, "Which of the following is a negative impact of urban sprawl?", "Loss of natural habitats", "Increased biodiversity", "Cleaner air", "Stable soil", 1, "Sprawl destroys natural habitats and increases pollution.", "medium"),
    (79, "Which method helps restore degraded land?", "Overgrazing", "Reforestation", "Building factories", "Dumping waste", 2, "Planting trees and vegetation restores soil and ecosystems.", "medium"),
    (80,"Which of these is a benefit of using renewable energy?", "Higher pollution", "Reduced greenhouse gas emissions", "Resource depletion", "Increased deforestation", 2, "Renewable energy produces less pollution and conserves resources.", "medium"),
    (81, "What is the main goal of environmental conservation?", "Increase industrial growth", "Protect natural resources and ecosystems", "Encourage deforestation", "Promote pollution", 2, "Environmental conservation aims to preserve resources and biodiversity.", "easy"),
    (82, "Which of the following is a greenhouse gas?", "Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen", 2, "Carbon dioxide traps heat in the atmosphere and contributes to warming.", "easy"),
    (83, "Which of these is a sustainable energy practice?", "Burning coal", "Using solar panels", "Using gasoline cars", "Deforestation", 2, "Solar energy is renewable and environmentally friendly.", "easy"),
    (84, "What does 'biodegradable' mean?", "Cannot be broken down", "Can be decomposed naturally", "Releases carbon dioxide", "Is harmful to animals", 2, "Biodegradable materials decompose naturally without harming the environment.", "easy"),
    (85, "Which of these helps reduce urban air pollution?", "Using bicycles", "Driving alone", "Burning trash", "Using diesel vehicles", 1, "Bicycles reduce emissions and improve air quality.", "easy"),
    (86, "What is the major cause of rising sea levels?", "Deforestation", "Melting ice caps and glaciers", "Air pollution", "Overpopulation", 2, "Global warming causes ice to melt, raising sea levels.", "medium"),
    (87, "Which practice helps conserve soil?", "Deforestation", "Terracing and cover crops", "Overgrazing", "Mining", 2, "Terracing and cover crops prevent erosion and maintain soil health.", "medium"),
    (88, "Which of these is an example of a sustainable product?", "Single-use plastic bottles", "Reusable water bottles", "Styrofoam cups", "Plastic bags", 2, "Reusable products reduce waste and are environmentally friendly.", "medium"),
    (89, "What is one effect of ozone layer depletion?", "Increase in UV radiation reaching Earth", "Cleaner air", "Stronger forests", "More rainfall", 1, "Ozone depletion allows more harmful UV rays to reach the Earth.", "medium"),
    (90, "Which human activity increases greenhouse gases the most?", "Using public transport", "Farming and livestock", "Planting trees", "Using solar panels", 2, "Agriculture and livestock produce significant greenhouse gases.", "medium"),
    (91, "What does sustainable fishing ensure?", "Catching all available fish", "Preserving fish populations", "Destroying aquatic habitats", "Using harmful fishing nets", 2, "Sustainable fishing maintains healthy fish populations and ecosystems.", "medium"),
    (92, "Which of these is a consequence of plastic pollution in oceans?", "Cleaner water", "Harming marine animals", "Better coral reefs", "More fish", 2, "Plastic waste harms marine life and ecosystems.", "medium"),
    (93, "Which of these actions helps fight climate change?", "Planting trees", "Burning more fossil fuels", "Using more plastic", "Overfishing", 1, "Trees absorb carbon dioxide and reduce climate change effects.", "medium"),
    (94, "What is an example of a non-renewable resource?", "Wind", "Solar energy", "Natural gas", "Hydropower", 3, "Natural gas cannot be replenished quickly once used.", "easy"),
    (95,"Which of these contributes to desertification?", "Deforestation and overgrazing", "Planting trees", "Irrigation management", "Cover crops", 1, "Removing vegetation and overusing land causes desertification.", "hard"),
    (96, "What is the purpose of rainforests?", "Produce fossil fuels", "Maintain biodiversity and climate balance", "Increase urban development", "Reduce oxygen", 2, "Rainforests are vital for species diversity and climate regulation.", "medium"),
    (97, "Which of these helps reduce carbon emissions in transportation?", "Walking and cycling", "Using gasoline vehicles", "Flying short distances frequently", "Using diesel trucks", 1, "Active transport methods produce zero emissions.", "medium"),
    (98, "What is e-waste?", "Organic waste", "Electronic waste", "Plastic waste", "Metal waste", 2, "E-waste includes old electronics that can pollute if not recycled.", "medium"),
    (99, "Which of these practices is considered sustainable tourism?", "Damaging coral reefs", "Using local resources responsibly", "Excessive energy use", "Littering beaches", 2, "Sustainable tourism minimizes environmental impact.", "hard"),
    (100, "Which of these is a method to reduce food waste?", "Throwing away leftovers", "Composting and careful meal planning", "Overbuying groceries", "Ignoring expiry dates", 2, "Composting and planning meals reduce waste and environmental impact.", "medium"),
    (101, "Which of these is a negative effect of deforestation?", "Increased biodiversity", "Soil erosion and habitat loss", "Better air quality", "Stable climate", 2, "Deforestation causes soil erosion and destroys habitats.", "easy"),
    (102, "What is the primary source of renewable energy from the sun?", "Coal", "Solar power", "Natural gas", "Oil", 2, "Solar power directly converts sunlight into electricity.", "easy"),
    (103, "Which of these reduces water wastage?", "Leaving taps running", "Fixing leaks", "Overwatering lawns", "Washing cars frequently", 2, "Fixing leaks prevents unnecessary water loss.", "easy"),
    (104, "What is the main cause of climate change?", "Natural disasters only", "Human activities like burning fossil fuels", "Solar flares", "Volcanic eruptions only", 2, "Human activities emit greenhouse gases that drive climate change.", "easy"),
    (105, "Which of the following is biodegradable?", "Plastic bag", "Styrofoam cup", "Paper towel", "Aluminum can", 3, "Paper decomposes naturally, unlike plastics and metals.", "easy"),
    (106, "Which energy source does NOT produce greenhouse gases?", "Coal", "Oil", "Wind", "Natural gas", 3, "Wind energy is clean and renewable.", "medium"),
    (107, "What is the purpose of recycling?", "Increase waste", "Conserve resources and reduce pollution", "Pollute rivers", "Cut down trees", 2, "Recycling reduces waste and conserves natural resources.", "medium"),
    (108, "Which human activity contributes to ocean pollution?", "Planting mangroves", "Dumping plastic waste into oceans", "Cleaning beaches", "Using biodegradable products", 2, "Plastic waste harms marine ecosystems.", "medium"),
    (109, "Which of these is a greenhouse gas?", "Oxygen", "Carbon dioxide", "Nitrogen", "Helium", 2, "Carbon dioxide traps heat in the atmosphere, contributing to warming.", "medium"),
    (110, "Which of the following is a sustainable farming method?", "Monocropping without rotation", "Crop rotation and organic farming", "Excessive pesticide use", "Deforestation for farmland", 2, "Sustainable farming maintains soil health and reduces environmental harm.", "medium"),
    (111, "Which of these reduces carbon emissions in daily life?", "Using public transport", "Driving alone", "Using coal stoves", "Excessive air travel", 1, "Public transport reduces per capita emissions.", "medium"),
    (112, "Which is a major effect of plastic pollution on wildlife?", "Healthier ecosystems", "Entanglement and ingestion", "Increased biodiversity", "Cleaner oceans", 2, "Wildlife can get entangled in or ingest plastic, harming them.", "medium"),
    (113, "What is sustainable development?", "Using resources without considering the future", "Meeting present needs while preserving resources for future generations", "Exploiting forests endlessly", "Polluting rivers for industry", 2, "Sustainable development balances present needs with future resources.", "medium"),
    (114, "Which of these contributes to soil degradation?", "Cover cropping", "Overgrazing and deforestation", "Composting", "Planting trees", 2, "Excessive land use and vegetation removal degrade soil.", "medium"),
    (115, "What is the main purpose of the Paris Agreement?", "Promote deforestation", "Reduce global greenhouse gas emissions", "Increase fossil fuel use", "Stop renewable energy projects", 2, "It is an international agreement to combat climate change.", "hard"),
    (116, "Which of these actions helps protect marine biodiversity?", "Overfishing", "Using sustainable fishing practices", "Dumping chemicals into oceans", "Destroying coral reefs", 2, "Sustainable fishing preserves marine populations and ecosystems.", "hard"),
    (117, "Which human activity releases methane into the atmosphere?", "Driving electric cars", "Livestock farming", "Planting trees", "Solar energy production", 2, "Livestock produce methane, a potent greenhouse gas.", "hard"),
    (118, "What is the main goal of a circular economy?", "Maximize waste", "Reduce, reuse, and recycle resources", "Overproduce goods", "Destroy natural habitats", 2, "A circular economy minimizes waste and encourages resource efficiency.", "hard"),
    (119, "Which of these is an effect of global warming?", "Rising sea levels", "More glaciers", "Stable climate", "Less drought", 1, "Global warming causes ice melt and higher sea levels.", "hard"),
    (120, "Which action helps mitigate urban heat islands?", "Adding green roofs and trees", "Building more asphalt roads", "Removing vegetation", "Increasing concrete structures", 1, "Vegetation and green infrastructure reduce city temperatures.", "medium"),
    (121, "Which of these helps conserve energy at home?", "Leaving lights on", "Using energy-efficient appliances", "Using multiple heaters", "Running all electronics at once", 2, "Energy-efficient appliances reduce electricity consumption.", "easy"),
    (122, "Which of the following is a negative impact of deforestation?", "Improved air quality", "Loss of biodiversity", "Increased rainfall", "Stable soil", 2, "Deforestation destroys habitats and reduces biodiversity.", "easy"),
    (123, "What is the main source of energy in a hydroelectric plant?", "Wind", "Water", "Sunlight", "Coal", 2, "Hydroelectric plants use flowing water to generate electricity.", "easy"),
    (124, "Which human activity contributes most to climate change?", "Walking", "Driving fossil fuel vehicles", "Using solar panels", "Planting trees", 2, "Fossil fuel combustion releases greenhouse gases.", "easy"),
    (125, "Which of these is biodegradable?", "Plastic bottle", "Glass bottle", "Food waste", "Aluminum can", 3, "Organic waste decomposes naturally without harming the environment.", "easy"),
    (126, "Which of these reduces air pollution?", "Burning trash", "Using public transport", "Using diesel vehicles", "Overusing firecrackers", 2, "Public transport lowers per capita emissions.", "medium"),
    (127, "What is the effect of melting glaciers on sea levels?", "Sea levels rise", "Sea levels drop", "No effect", "Sea levels stay stable", 1, "Glacier melt adds water to the oceans, raising sea levels.", "medium"),
    (128, "Which practice helps protect soil?", "Deforestation", "Overgrazing", "Terracing farmland", "Excessive mining", 3, "Terracing prevents erosion and preserves soil quality.", "medium"),
    (129, "Which energy source produces the least pollution?", "Coal", "Natural gas", "Wind", "Oil", 3, "Wind energy is clean and renewable.", "medium"),
    (130, "What is composting?", "Burning waste", "Turning organic waste into fertilizer", "Recycling plastics", "Dumping waste in rivers", 2, "Composting converts organic matter into nutrient-rich soil.", "medium"),
    (131, "Which of these contributes most to ocean acidification?", "Plastic waste", "CO2 emissions", "Oil spills", "Overfishing", 2, "Carbon dioxide dissolves in oceans, lowering pH.", "hard"),
    (132, "Which of these is a sustainable transportation method?", "Driving alone", "Carpooling and public transport", "Using diesel scooters", "Frequent flying", 2, "Carpooling and public transport reduce emissions.", "medium"),
    (133, "Which of these is NOT renewable?", "Wind energy", "Solar energy", "Coal", "Hydropower", 3, "Coal is a finite resource and not renewable.", "easy"),
    (134, "Which human activity harms marine life the most?", "Planting mangroves", "Dumping plastic in oceans", "Cleaning beaches", "Using biodegradable products", 2, "Plastic waste damages marine ecosystems.", "medium"),
    (135, "What is the purpose of the Paris Agreement?", "Increase industrial production", "Reduce global greenhouse gas emissions", "Encourage deforestation", "Increase fossil fuel use", 2, "The Paris Agreement is an international climate treaty.", "hard"),
    (136, "Which of these is a renewable energy source?", "Natural gas", "Coal", "Oil", "Solar", 4, "Solar energy is renewable and sustainable.", "easy"),
    (137, "What is the circular economy concept?", "Produce more waste", "Reduce, reuse, and recycle resources", "Exploit forests endlessly", "Increase consumption", 2, "It promotes resource efficiency and waste reduction.", "hard"),
    (138, "Which of these helps reduce plastic waste?", "Using single-use plastics", "Using reusable containers", "Throwing plastic in rivers", "Littering", 2, "Reusable containers reduce environmental pollution.", "easy"),
    (139, "What is overfishing?", "Catching fish faster than they reproduce", "Planting more fish", "Fishing sustainably", "Not fishing at all", 1, "Overfishing depletes fish populations.", "medium"),
    (140, "Which of these actions reduces carbon emissions?", "Driving alone", "Walking and cycling", "Using coal stoves", "Frequent flights", 2, "Active transportation methods produce zero emissions.", "medium"),
    (141, "Which of these contributes to soil erosion?", "Planting cover crops", "Deforestation", "Terracing", "Mulching", 2, "Removing vegetation exposes soil to erosion.", "medium"),
    (142, "Which of these human activities releases methane?", "Planting trees", "Livestock farming", "Driving electric cars", "Solar energy production", 2, "Livestock release methane, a potent greenhouse gas.", "hard"),
    (143, "Which of these helps mitigate urban heat islands?", "Green roofs and trees", "More asphalt roads", "Removing vegetation", "Increasing concrete surfaces", 1, "Vegetation cools urban areas.", "medium"),
    (144, "Which of these is an effect of global warming?", "More glaciers", "Rising sea levels", "Stable climate", "Less drought", 2, "Global warming melts ice and increases sea levels.", "hard"),
    (145, "Which of these is a sustainable farming method?", "Monocropping without rotation", "Crop rotation and organic farming", "Excessive pesticide use", "Deforestation for farmland", 2, "It maintains soil health and reduces environmental impact.", "medium"),
    (146, "Which of these is a greenhouse gas?", "Oxygen", "Carbon dioxide", "Nitrogen", "Helium", 2, "Carbon dioxide traps heat in the atmosphere.", "medium"),
    (147, "What does sustainable development mean?", "Using resources recklessly", "Meeting present needs without harming future generations", "Polluting rivers for industry", "Exploiting forests endlessly", 2, "It balances present needs with future resources.", "medium"),
    (148, "Which of these helps restore degraded land?", "Overgrazing", "Reforestation", "Building factories", "Dumping waste", 2, "Planting vegetation restores soil and ecosystems.", "medium"),
    (149, "What is e-waste?", "Organic waste", "Electronic waste", "Plastic waste", "Metal waste", 2, "Old electronics that are disposed of improperly can pollute the environment.", "medium"),
    (150, "Which of these helps protect marine biodiversity?", "Overfishing", "Sustainable fishing", "Dumping chemicals in oceans", "Destroying coral reefs", 2, "Sustainable fishing maintains healthy marine populations.", "hard"),
    (151, "Which action helps reduce food waste?", "Throwing away leftovers", "Composting and careful meal planning", "Overbuying groceries", "Ignoring expiry dates", 2, "Planning and composting reduce waste and environmental impact.", "medium"),
    (152, "What is recycling?", "Throwing items away", "Reusing and processing materials", "Burning waste", "Ignoring trash", 2, "Recycling converts waste into reusable materials.", "easy"),
    (153, "Which of these is a renewable resource?", "Coal", "Wind", "Oil", "Natural gas", 2, "Wind is naturally replenished and renewable.", "easy"),
    (154, "Which of these is NOT sustainable?", "Planting trees", "Using single-use plastics", "Using solar panels", "Saving water", 2, "Single-use plastics create long-lasting waste.", "easy"),
    (155, "Why should we save water?", "Because water is unlimited", "To conserve resources for future use", "Water is free", "Water is dirty", 2, "Conserving water ensures availability for the future.", "easy"),
    (156, "Which of these is a benefit of planting trees?", "Reduce air pollution", "Increase temperature", "Increase waste", "Reduce oxygen", 1, "Trees clean the air by absorbing carbon dioxide.", "easy"),
    (157, "Which of these is a form of renewable energy?", "Oil", "Coal", "Solar", "Natural gas", 3, "Solar energy comes from the sun and is renewable.", "easy"),
    (158, "What is compost made from?", "Plastic", "Food and plant waste", "Metal", "Glass", 2, "Compost is organic material that enriches soil.", "easy"),
    (159, "Which of these is good for the environment?", "Throwing trash in rivers", "Using reusable bags", "Burning garbage", "Using disposable straws", 2, "Reusable bags reduce plastic pollution.", "easy"),
    (160, "Which of these saves electricity?", "Leaving lights on", "Turning off unused appliances", "Overcharging devices", "Using old bulbs", 2, "Turning off unused devices conserves energy.", "easy"),
    (161, "What is an example of public transport?", "Car", "Bus", "Motorbike", "Airplane", 2, "Buses carry many people, reducing per capita emissions.", "easy"),
    (162, "Which of these is biodegradable?", "Plastic", "Styrofoam", "Paper", "Aluminum", 3, "Paper breaks down naturally over time.", "easy"),
    (163, "What is the main gas responsible for global warming?", "Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen", 2, "Carbon dioxide traps heat in the atmosphere.", "easy"),
    (164, "Which of these helps reduce air pollution?", "Using bicycles", "Driving cars alone", "Burning trash", "Using diesel vehicles", 1, "Bicycles produce no emissions.", "easy"),
    (165, "Which energy source is clean and renewable?", "Coal", "Solar", "Oil", "Natural gas", 2, "Solar energy does not produce harmful emissions.", "easy"),
    (166, "Why should we reduce plastic use?", "It lasts a long time and pollutes", "It is cheap", "It is colorful", "It floats", 1, "Plastic pollution harms ecosystems and wildlife.", "easy"),
    (167, "Which of these helps save water?", "Leaving taps running", "Fixing leaks", "Overwatering plants", "Washing cars every day", 2, "Fixing leaks prevents unnecessary water loss.", "easy"),
    (168, "Which of these is an effect of global warming?", "Cooler temperatures", "Rising sea levels", "More ice", "Stable climate", 2, "Global warming melts ice and increases sea levels.", "easy"),
    (169, "What is deforestation?", "Planting trees", "Cutting down forests", "Growing crops", "Cleaning parks", 2, "Deforestation is the removal of trees and forests.", "easy"),
    (170, "Which of these is a way to reduce waste?", "Throwing everything away", "Using reusable items", "Using disposable plates", "Burning trash", 2, "Reusable items reduce waste generation.", "easy"),
    (171, "What is energy conservation?", "Using energy carelessly", "Saving energy by using less", "Creating energy", "Destroying energy", 2, "Energy conservation means using less energy to reduce waste.", "easy"),
    (172, "Which of these is a source of clean water?", "River with trash", "Polluted lake", "Filtered water", "Sewage", 3, "Filtered water is safe and clean for use.", "easy"),
    (173, "Which of these can reduce car pollution?", "Carpooling", "Driving alone", "Using a petrol car", "Flying", 1, "Sharing rides reduces per capita emissions.", "easy"),
    (174, "Which of these is part of sustainable living?", "Overusing resources", "Recycling and reusing", "Cutting down forests", "Burning fossil fuels", 2, "Recycling and reusing conserve resources.", "easy"),
    (175, "What is green energy?", "Energy from coal", "Energy from renewable sources", "Energy from oil", "Energy from natural gas", 2, "Green energy comes from renewable, clean sources.", "easy"),
    (176, "Which of these protects biodiversity?", "Destroying habitats", "Planting trees and protecting forests", "Polluting rivers", "Cutting down coral reefs", 2, "Protected habitats support wildlife and plants.", "easy"),
    (177, "Which of these is sustainable transportation?", "Walking", "Driving alone", "Flying frequently", "Using diesel scooters", 1, "Walking produces no emissions.", "easy"),
    (178, "Which of these is good for the oceans?", "Throwing plastic into the sea", "Reducing plastic waste", "Dumping chemicals", "Overfishing", 2, "Reducing plastic helps protect marine life.", "easy"),
    (179, "Which of these helps reduce electricity usage?", "Leaving lights on", "Using energy-efficient bulbs", "Overcharging devices", "Using multiple heaters", 2, "Energy-efficient bulbs use less electricity.", "easy"),
    (180, "What is one way to reduce greenhouse gases?", "Planting trees", "Cutting down forests", "Using more cars", "Burning more coal", 1, "Trees absorb carbon dioxide and reduce greenhouse gases.", "easy"),
    (181, "Which of these helps conserve soil?", "Deforestation", "Planting cover crops", "Overgrazing", "Excessive mining", 2, "Cover crops protect soil from erosion.", "easy"),
    (182, "Which of these is a consequence of excessive use of fossil fuels?", "Clean air", "Global warming", "Renewable energy", "Forest growth", 2, "Burning fossil fuels releases greenhouse gases causing global warming.", "medium"),
    (183, "What is the greenhouse effect?", "Trapping of heat by gases in the atmosphere", "Cooling of the Earth", "Rain formation", "Wind currents", 1, "Greenhouse gases trap heat and warm the planet.", "medium"),
    (184, "Which of these human activities contributes to deforestation?", "Planting trees", "Logging for timber", "Using public transport", "Recycling", 2, "Logging removes forests, contributing to deforestation.", "medium"),
    (185, "Which of the following reduces energy consumption?", "Leaving appliances on", "Turning off unused electronics", "Driving cars alone", "Using incandescent bulbs", 2, "Turning off electronics conserves energy.", "medium"),
    (186, "Which of these is a long-term effect of climate change?", "Rising sea levels", "Decreased carbon dioxide", "Stable temperatures", "Better air quality", 1, "Climate change melts ice and raises sea levels.", "medium"),
    (187, "Which of these is NOT a renewable resource?", "Wind", "Solar", "Coal", "Hydropower", 3, "Coal is finite and non-renewable.", "medium"),
    (188, "What is overfishing?", "Catching fish faster than they can reproduce", "Planting fish", "Fishing sustainably", "Ignoring fish populations", 1, "Overfishing depletes fish populations faster than they can recover.", "medium"),
    (189, "Which of these helps reduce water pollution?", "Dumping chemicals", "Planting vegetation buffers along rivers", "Overusing pesticides", "Littering", 2, "Vegetation buffers filter pollutants before they enter water bodies.", "medium"),
    (190, "Which of these gases is a major contributor to global warming?", "Oxygen", "Methane", "Nitrogen", "Argon", 2, "Methane is a potent greenhouse gas contributing to warming.", "medium"),
    (191, "Which action helps preserve soil health?", "Overgrazing", "Using cover crops", "Deforestation", "Mining", 2, "Cover crops prevent erosion and maintain soil fertility.", "medium"),
    (192, "Which of these contributes to urban heat island effect?", "Green parks", "Concrete and asphalt surfaces", "Water bodies", "Trees", 2, "Concrete and asphalt absorb and retain heat.", "medium"),
    (193, "Which of the following is an effect of ocean acidification?", "Stronger coral reefs", "Damage to marine life", "Increase in fish populations", "Cleaner water", 2, "Acidic waters harm coral reefs and marine organisms.", "medium"),
    (194, "Which of these is part of sustainable forestry?", "Clear-cutting forests without replanting", "Planting new trees after logging", "Burning forests", "Ignoring forest management", 2, "Sustainable forestry ensures regeneration and ecosystem health.", "medium"),
    (195, "Which of these human activities releases the most methane?", "Driving electric cars", "Raising livestock", "Using solar panels", "Planting trees", 2, "Livestock produce significant methane emissions.", "medium"),
    (196, "Which of these reduces carbon footprint in daily life?", "Walking or cycling", "Using a private car alone", "Flying frequently", "Overheating homes", 1, "Active transportation reduces greenhouse gas emissions.", "medium"),
    (197, "Which of these is a sustainable agriculture practice?", "Monocropping without rotation", "Crop rotation and organic farming", "Excessive pesticide use", "Deforestation for farmland", 2, "Crop rotation maintains soil health and reduces environmental damage.", "medium"),
    (198, "Which of these is a non-renewable energy source?", "Wind", "Solar", "Oil", "Hydropower", 3, "Oil is finite and cannot be replenished quickly.", "medium"),
    (199, "What is the main purpose of the Paris Agreement?", "Increase industrial production", "Reduce global greenhouse gas emissions", "Promote deforestation", "Increase fossil fuel use", 2, "It is an international treaty to combat climate change.", "medium"),
    (200, "Which of these actions helps combat climate change?", "Planting trees", "Deforestation", "Burning coal", "Overfishing", 1, "Trees absorb carbon dioxide, helping reduce climate change.", "medium"),
    (201, "Which of these is an effect of deforestation on soil?", "Improved fertility", "Soil erosion", "Stable soil", "More water retention", 2, "Removing vegetation exposes soil to erosion.", "medium"),
    (202, "Which of these contributes to biodiversity loss?", "Protecting forests", "Urbanization and habitat destruction", "Reforestation", "Establishing wildlife reserves", 2, "Habitat destruction reduces biodiversity.", "medium"),
    (203, "Which of these is a sustainable water management practice?", "Over-extraction of groundwater", "Rainwater harvesting", "Dumping chemicals in rivers", "Polluting lakes", 2, "Harvesting rainwater conserves freshwater resources.", "medium"),
    (204, "Which of these energy sources emits the least greenhouse gases?", "Coal", "Natural gas", "Wind", "Oil", 3, "Wind energy is clean and renewable.", "medium"),
    (205, "Which of these is a negative effect of global warming?", "More glaciers", "Rising sea levels", "Stable climate", "Cooler temperatures", 2, "Global warming melts ice and raises sea levels.", "medium"),
    (206, "Which of these is part of sustainable urban planning?", "Expanding highways endlessly", "Developing public transport and green spaces", "Clearing forests for housing", "Ignoring pollution", 2, "Green urban planning reduces pollution and improves livability.", "medium"),
    (207, "Which of these helps reduce plastic pollution in oceans?", "Using disposable plastic", "Using reusable items", "Throwing trash in rivers", "Overfishing", 2, "Reusable items reduce plastic entering the oceans.", "medium"),
    (208, "Which of these contributes to soil degradation?", "Cover cropping", "Overgrazing and deforestation", "Composting", "Planting trees", 2, "Excessive land use and vegetation removal degrade soil.", "medium"),
    (209, "Which of these human activities contributes to climate change?", "Planting trees", "Burning fossil fuels", "Using solar panels", "Using wind turbines", 2, "Burning fossil fuels releases greenhouse gases.", "medium"),
    (210, "Which of these helps restore degraded land?", "Overgrazing", "Reforestation", "Building factories", "Dumping waste", 2, "Planting vegetation restores soil and ecosystems.", "medium"),
    (211, "Which of these is a consequence of melting permafrost?", "Release of methane", "More glaciers", "Stable ecosystems", "Cooler temperatures", 1, "Thawing permafrost releases greenhouse gases like methane.", "medium"),
    (212, "Which of these materials takes the longest to decompose in nature?", "Paper cup", "Banana peel", "Plastic bottle", "Cotton T-shirt", 2, "Plastic bottles can take up to 450 years to decompose in nature!", "easy"),
    (213, "What is the most energy-efficient way to wash clothes?", "Hot water cycle", "Warm water cycle", "Cold water cycle", "All use same energy", 2, "Washing clothes in cold water saves 90% of the energy used by hot water cycles!", "medium"),
    (214, "Which activity saves the most water?", "Turning off tap while brushing", "Taking 5-minute showers", "Fixing a leaky faucet", "Using a dishwasher", 1, "A 5-minute shower uses about 40 liters of water, while a 10-minute shower uses 80 liters!", "easy"),
    (215, "What percentage of plastic waste is actually recycled globally?", "9%", "25%", "50%", "75%", 0, "Only 9% of all plastic ever produced has been recycled. The rest ends up in landfills or oceans.", "hard"),
    (216, "Which food has the highest carbon footprint?", "Beef", "Chicken", "Tofu", "Local vegetables", 0, "Beef production produces 5 times more greenhouse gases than chicken and 20 times more than plant-based proteins!", "medium"),
    (217, "What is the average time it takes for an aluminum can to decompose?", "1 year", "10 years", "80-200 years", "500 years", 2, "Aluminum cans take 80-200 years to decompose, but they are infinitely recyclable!", "medium"),
    (218, "How much energy does recycling one aluminum can save compared to making a new one?", "25%", "50%", "75%", "95%", 3, "Recycling one aluminum can saves enough energy to power a TV for 3 hours!", "hard"),
    (219, "Which of these is NOT a renewable energy source?", "Solar", "Wind", "Natural gas", "Hydroelectric", 2, "Natural gas is a fossil fuel and will eventually run out, unlike renewable sources.", "easy"),
    (220, "What percentage of Earth's water is fresh water?", "3%", "10%", "25%", "50%", 0, "Only about 3% of Earth's water is fresh, and most of it is frozen in glaciers!", "medium"),
    (221, "How many trees does it take to absorb the CO2 produced by one car per year?", "5 trees", "20 trees", "50 trees", "100 trees", 2, "It takes approximately 50 mature trees to absorb the CO2 emissions from one car driven for a year!", "hard"),
    (222, "What is the most effective way to reduce your carbon footprint?", "Recycling more", "Eating less meat", "Driving less", "Using renewable energy", 1, "Reducing meat consumption, especially beef, can reduce your carbon footprint by up to 50%!", "medium"),
    (223, "How much water can a dripping faucet waste per day?", "1 liter", "10 liters", "50 liters", "100 liters", 2, "A dripping faucet can waste up to 50 liters of water per day!", "easy"),
    (224, "Which country produces the most renewable energy?", "China", "USA", "Germany", "Denmark", 0, "China is the world's largest producer of renewable energy, though Denmark leads in wind energy per capita.", "hard"),
    (225, "How long does it take for a glass bottle to decompose?", "100 years", "500 years", "1000 years", "Never fully decomposes", 3, "Glass can take over 1 million years to decompose, but it's 100% recyclable!", "medium"),
    (226, "What percentage of household waste can be recycled or composted?", "20%", "40%", "60%", "80%", 2, "About 60% of household waste can be recycled or composted instead of going to landfills!", "medium"),
    (227, "How much plastic enters the ocean every year?", "1 million tons", "8 million tons", "15 million tons", "50 million tons", 1, "About 8 million tons of plastic waste enters the ocean each year, equivalent to dumping a garbage truck every minute!", "hard"),
    (228, "What is the best material for reusable shopping bags from an environmental perspective?", "Cotton", "Paper", "Jute", "Recycled plastic", 2, "Jute bags have the lowest environmental impact when considering production and durability!", "medium"),
    (229, "How much CO2 does one mature tree absorb per year?", "5 kg", "22 kg", "50 kg", "100 kg", 1, "One mature tree can absorb approximately 22 kg of CO2 per year!", "medium"),
    (230,"Which appliance uses the most electricity in a typical home?", "Air conditioning", "Refrigerator", "Television", "Washing machine", 0, "Air conditioning typically accounts for the highest energy consumption in homes, especially in hot climates!", "easy"),
    (231, "What percentage of the world's electricity comes from renewable sources?", "10%", "28%", "50%", "75%", 1, "As of 2023, approximately 28% of global electricity comes from renewable sources, and growing!", "hard"),
    (232, "How many years does it take for a cigarette butt to decompose?", "1 year", "5 years", "10 years", "18 months", 2, "Cigarette butts can take 10-12 years to decompose and are toxic to wildlife!", "medium"),
    (233, "What is the main cause of ocean acidification?", "Plastic pollution", "Oil spills", "CO2 absorption", "Chemical runoff", 2, "The ocean absorbs about 30% of atmospheric CO2, which causes acidification!", "hard"),
    (234, "How much energy does an LED bulb save compared to an incandescent bulb?", "25%", "50%", "75%", "90%", 2, "LED bulbs use about 75% less energy than incandescent bulbs and last 25 times longer!", "medium"),
    (235,"Which of these activities has the smallest carbon footprint?", "Flying 100 km", "Driving 100 km", "Taking a train 100 km", "Taking a bus 100 km", 2, "Train travel has the smallest carbon footprint per passenger for long distances!", "easy"),
    (236, "What is 'greenwashing'?", "Washing clothes with eco-detergent", "Painting a building green", "Deceptive marketing to appear eco-friendly", "Planting trees in cities", 2, "Greenwashing is making false or misleading claims about the environmental benefits of a product.", "medium"),
    (237, "Which of these is a 'Keystone Species'?", "House cat", "Bees", "Pigeons", "Goldfish", 1, "Bees are a keystone species because entire ecosystems depend on them for pollination.", "medium"),
    (238, "What is the primary component of Natural Gas?", "Oxygen", "Methane", "Carbon Dioxide", "Propane", 1, "Methane makes up the majority of natural gas and is a potent greenhouse gas if leaked.", "hard"),
    (239, "What does 'upcycling' mean?", "Recycling plastic bottles", "Turning waste into higher quality products", "Cycling up a hill", "Throwing away old bikes", 1, "Upcycling involves creatively repurposing waste into something of greater value.", "medium"),
    (240, "Which material is used in electric vehicle batteries?", "Lead", "Lithium", "Uranium", "Mercury", 1, "Lithium is the key component in the rechargeable batteries used in electric vehicles.", "medium"),
    (241, "What is the 'Albedo Effect'?", "How trees grow", "How much sunlight a surface reflects", "Ocean currents", "Wind speed", 1, "Light surfaces (ice) reflect heat (high albedo), while dark surfaces (oceans) absorb it.", "hard"),
    (242, "Which country withdrew from the Paris Agreement in 2020 but rejoined in 2021?", "China", "Russia", "USA", "India", 2, "The USA briefly withdrew from the agreement before rejoining under a new administration.", "hard"),
    (243, "What is 'Fast Fashion'?", "Clothes that dry quickly", "Running shoes", "Cheap, trendy clothing produced rapidly", "High-end luxury fashion", 2, "Fast fashion contributes significantly to waste and water pollution.", "medium"),
    (244, "Which of these is a source of biomass energy?", "Uranium", "Wind", "Wood pellets", "Sunlight", 2, "Biomass energy comes from organic materials like wood, crop waste, and manure.", "medium"),
    (245, "What is the main environmental risk of fracking?", "Noise pollution", "Groundwater contamination", "Too much sunlight", "Increased rainfall", 1, "Fracking can leak chemicals and gas into local water supplies.", "hard"),
    (246, "What is a 'Carbon Offset'?", "A type of coal", "Paying to reduce emissions elsewhere", "A tax on cars", "A filter for chimneys", 1, "Offsets involve funding projects like tree planting to compensate for your own emissions.", "medium"),
    (247, "Which layer of the atmosphere protects us from UV rays?", "Troposphere", "Ozone Layer", "Mesosphere", "Exosphere", 1, "The Ozone layer absorbs the majority of the sun's harmful ultraviolet radiation.", "easy"),
    (248, "What is the 'Great Pacific Garbage Patch'?", "A landfill in California", "A floating island of plastic waste", "A recycling center", "A new continent", 1, "It is a massive accumulation of microplastics and debris in the North Pacific Ocean.", "medium"),
    (249, "Which of these is a 'phantom load' or 'vampire power'?", "A ghost in the house", "Energy used by appliances in standby mode", "A power outage", "Solar power at night", 1, "Electronics plugged in but turned off still draw power, known as phantom load.", "medium"),
    (250, "What is 'xeriscaping'?", "Landscaping with ice", "Landscaping that needs little water", "Painting rocks", "Planting tall trees", 1, "Xeriscaping is designing landscapes to minimize water use, often in dry climates.", "hard"),
    (251, "Which gas is released when permafrost melts?", "Oxygen", "Methane", "Helium", "Argon", 1, "Melting permafrost releases trapped methane, accelerating global warming.", "hard"),
    (252, "What is the primary cause of coral bleaching?", "Ocean cooling", "Rising ocean temperatures", "Too many fish", "Lack of salt", 1, "Heat stress causes corals to expel the algae living in their tissues, turning them white.", "medium"),
    (253, "Which sector uses the most fresh water globally?", "Households", "Industry", "Agriculture", "Recreation", 2, "Agriculture consumes about 70% of the world's accessible fresh water.", "hard"),
    (254, "What is 'Planned Obsolescence'?", "Designing products to last forever", "Designing products to break or become outdated quickly", "Recycling plans", "Building bridges", 1, "It creates more waste by forcing consumers to replace items frequently.", "medium"),
    (255, "Which of these is an invasive species in many parts of the world?", "Polar Bear", "Cane Toad", "Panda", "Koala", 1, "Cane Toads are invasive pests that disrupt local ecosystems, particularly in Australia.", "hard"),
    (256, "What does 'organic' farming prohibit?", "Water", "Sunlight", "Synthetic pesticides and fertilizers", "Tractors", 2, "Organic farming relies on natural methods rather than synthetic chemicals.", "medium"),
    (257, "Which light bulb type is the LEAST energy efficient?", "LED", "CFL", "Incandescent", "Halogen", 2, "Incandescent bulbs waste 90% of their energy as heat.", "easy"),
    (258, "What is 'Greywater'?", "Sewage water", "Used water from sinks and showers", "Rainwater", "Ocean water", 1, "Greywater is relatively clean waste water that can be reused for irrigation.", "medium"),
    (259, "Which animal is most threatened by melting sea ice?", "Camel", "Polar Bear", "Tiger", "Gorilla", 1, "Polar bears rely on sea ice to hunt seals.", "easy"),
    (260, "What is the Kyoto Protocol focused on?", "Trade tariffs", "Reducing greenhouse gas emissions", "Internet regulations", "Space exploration", 1, "It was the first major international treaty to set binding targets for emission reductions.", "hard"),
    (261, "Which part of a computer is most toxic if dumped?", "The plastic case", "The keyboard", "The heavy metals in circuit boards", "The mouse pad", 2, "Circuit boards contain lead, mercury, and cadmium.", "medium"),
    (262, "What is 'noise pollution'?", "Loud music only", "Harmful or annoying levels of noise", "Whispering", "Birds singing", 1, "Chronic noise pollution disrupts wildlife and harms human health.", "easy"),
    (263, "Which of these creates 'Light Pollution'?", "The moon", "Excessive artificial lighting at night", "Fireflies", "Lightning", 1, "Light pollution disrupts nocturnal animals and human sleep cycles.", "easy"),
    (264, "What is a 'Food Desert'?", "A place with no sand", "An area with limited access to affordable nutritious food", "A restaurant", "A farm", 1, "Food deserts lead to reliance on processed, packaged foods with high footprints.", "medium"),
    (265, "Which textile fiber is the most water-intensive to grow?", "Hemp", "Cotton", "Bamboo", "Flax", 1, "Conventional cotton requires massive amounts of water and pesticides.", "medium"),
    (266, "What is the 'Montreal Protocol' designed to protect?", "The Ozone Layer", "The Oceans", "The Rainforests", "The Soil", 0, "It successfully phased out CFCs to stop ozone depletion.", "hard"),
    (267, "Which is a 'carbon sink'?", "A coal mine", "A forest", "A factory", "A highway", 1, "Forests absorb and store more carbon than they release.", "medium"),
    (268, "What does 'biodiversity' refer to?", "The number of rocks", "The variety of life in a habitat", "The amount of water", "The size of a forest", 1, "High biodiversity creates stronger, more resilient ecosystems.", "easy"),
    (269, "Which renewable energy relies on the moon's gravity?", "Solar", "Wind", "Tidal energy", "Geothermal", 2, "Tidal energy is generated by the rise and fall of ocean tides caused by the moon.", "medium"),
    (270, "What is 'Geothermal' energy?", "Energy from the air", "Energy from heat inside the Earth", "Energy from waves", "Energy from lightning", 1, "It utilizes the heat stored beneath the Earth's crust.", "medium"),
    (271, "Which of these is a consequence of 'eutrophication'?", "Clear water", "Algal blooms and dead zones", "More fish", "Cleaner beaches", 1, "Excess nutrients cause algae to grow out of control, suffocating aquatic life.", "hard"),
    (272, "What is the main pollutant in 'Smog'?", "Nitrogen", "Ground-level Ozone", "Oxygen", "Water vapor", 1, "Ground-level ozone forms when pollutants react with sunlight.", "hard"),
    (273, "Which continent has the largest hole in the ozone layer over it?", "Europe", "Asia", "Antarctica", "Africa", 2, "The ozone hole is most prominent over Antarctica.", "medium"),
    (274, "What is 'Vermicomposting'?", "Composting with chemicals", "Composting with worms", "Burning compost", "Freezing compost", 1, "Vermicomposting uses worms to break down organic waste quickly.", "medium"),
    (275, "Which of these items cannot be recycled in a standard bin?", "Cardboard", "Aluminum can", "Pizza box with grease", "Plastic bottle", 2, "Grease contaminates the paper recycling process.", "easy"),
    (276, "What is the average lifespan of a solar panel?", "1-2 years", "5-10 years", "25-30 years", "100 years", 2, "Solar panels are durable and typically last 25 to 30 years.", "medium"),
    (277, "Which transportation mode creates the most emissions per person?", "Train", "Bus", "Short-haul flight", "Ferry", 2, "Short flights use huge amounts of fuel for takeoff and landing relative to distance.", "medium"),
    (278, "What is 'Aquaponics'?", "Underwater swimming", "Raising fish and plants together", "Watering lawns", "Fishing in the ocean", 1, "Aquaponics combines aquaculture (fish) and hydroponics (plants) in a symbiotic system.", "hard"),
    (279, "Which country has the highest percentage of electric cars?", "USA", "China", "Norway", "Germany", 2, "Norway leads the world in EV adoption per capita.", "medium"),
    (280, "What is the main ingredient in standard plastic?", "Sand", "Petroleum/Oil", "Wood", "Cotton", 1, "Most plastics are derived from fossil fuels.", "easy"),
    (281, "Which of these birds is extinct due to humans?", "Eagle", "Dodo", "Penguin", "Owl", 1, "The Dodo was hunted to extinction in the 17th century.", "easy"),
    (282, "What is 'Permaculture'?", "Temporary farming", "Sustainable design mimicking nature", "Industrial agriculture", "Chemical farming", 1, "Permaculture creates self-sufficient agricultural ecosystems.", "hard"),
    (283, "Which household item contains mercury?", "LED bulb", "Old thermometers and CFL bulbs", "Toaster", "Book", 1, "Old thermometers and fluorescent bulbs must be disposed of as hazardous waste.", "medium"),
    (284, "What is the 'Greenhouse Effect' necessary for?", "Keeping Earth warm enough for life", "Killing plants", "Creating plastic", "Making the sky blue", 0, "Without the natural greenhouse effect, Earth would be too cold.", "medium"),
    (285, "What is 'Bycatch' in fishing?", "The fish you want to catch", "Unwanted marine life caught accidentally", "Fishing gear", "The boat's engine", 1, "Bycatch kills dolphins, turtles, and non-target fish.", "medium"),
    (286, "Which of these is a benefit of 'Green Roofs'?", "They leak water", "They provide insulation and reduce stormwater runoff", "They are fire hazards", "They increase heating costs", 1, "Green roofs help cool buildings and manage rain.", "medium"),
    (287, "What is the chemical symbol for Ozone?", "O2", "O3", "CO2", "H2O", 1, "Ozone is a molecule made of three oxygen atoms.", "hard"),
    (288, "Which of these decomposes the fastest?", "Apple core", "Nylon fabric", "Leather shoe", "Plastic bag", 0, "An apple core takes about 2 months to decompose.", "easy"),
    (289, "What is 'Desalination'?", "Adding salt to water", "Removing salt from seawater", "Freezing water", "Boiling water", 1, "Desalination makes seawater drinkable but uses a lot of energy.", "medium"),
    (290, "Which of these is a 'Single-Use' plastic?", "Tupperware", "Plastic straw", "Laptop case", "Kayak", 1, "Straws are used once and thrown away.", "easy"),
    (291, "What is the 'Sixth Mass Extinction'?", "A movie", "The current era of high species loss caused by humans", "A dinosaur event", "A new planet", 1, "Scientists believe human activity is driving a mass extinction event.", "hard"),
    (292, "Which fuel produces the most CO2 when burned?", "Natural Gas", "Oil", "Coal", "Wood", 2, "Coal is the most carbon-intensive fossil fuel.", "medium"),
    (293, "What does the 'Energy Star' label mean?", "The product is expensive", "The product is energy efficient", "The product uses solar power", "The product is made of stars", 1, "Energy Star indicates a product meets efficiency standards.", "easy"),
    (294, "Which of these helps reduce the 'Heat Island Effect'?", "More asphalt", "More air conditioners", "Planting urban trees", "Taller buildings", 2, "Trees provide shade and cooling through evapotranspiration.", "medium"),
    (295, "What is 'Bioplastic' made from?", "Petroleum", "Plant materials like corn or sugarcane", "Rocks", "Metal", 1, "Bioplastics are derived from renewable biomass sources.", "medium"),
    (296, "Which of these is a major source of indoor air pollution?", "Open windows", "House plants", "Cooking with solid fuels (wood/coal)", "Electric fans", 2, "Burning wood or coal indoors creates dangerous particulate matter.", "medium"),
    (297, "What is the main goal of 'Rewilding'?", "Building zoos", "Restoring natural ecosystems and wildlife", "Cutting grass", "Farming cattle", 1, "Rewilding aims to return land to its natural state.", "medium"),
    (298, "Which ocean is the largest?", "Atlantic", "Indian", "Pacific", "Arctic", 2, "The Pacific Ocean is the largest and contains the most plastic waste.", "easy"),
    (299, "What is a 'Carbon Tax'?", "A tax on breathing", "A fee imposed on burning carbon-based fuels", "A tax on diamonds", "A rebate for driving", 1, "Carbon taxes encourage companies to switch to cleaner energy.", "medium"),
    (300, "Which of these is a pollinator?", "Mosquito", "Bat", "House fly", "Spider", 1, "Bats are crucial pollinators for many plants, including agave and mangoes.", "medium"),
    (301, "What is the primary environmental impact of palm oil production?", "Water pollution", "Deforestation of rainforests", "Air pollution", "Noise pollution", 1, "Palm oil plantations are a leading cause of rainforest destruction in SE Asia.", "medium"),
    (302, "Which country emits the most CO2 in total?", "USA", "India", "China", "Russia", 2, "China has the highest total emissions, though not the highest per capita.", "medium"),
    (303, "What is 'virtual water'?", "Fake water", "Water used to produce goods and services", "Water in video games", "Rain", 1, "Virtual water is the hidden water cost in products like jeans or beef.", "hard"),
    (304, "Which type of bag is best for the environment?", "Paper", "Plastic", "A reusable bag used hundreds of times", "Cotton used once", 2, "Reusability is key; a cotton bag must be used many times to offset its production footprint.", "medium"),
    (305, "What is 'leachate'?", "A type of vegetable", "Liquid that drains from a landfill", "Rainwater", "River water", 1, "Leachate is a toxic liquid that can contaminate groundwater near landfills.", "hard"),
    (306, "Which of these is a symptom of 'Sick Building Syndrome'?", "Feeling happy", "Headaches and respiratory issues", "Hunger", "Sleepiness", 1, "Poor indoor air quality causes health issues for building occupants.", "hard"),
    (307, "What is the 'Anthropocene'?", "A type of dinosaur", "The current geological epoch dominated by human activity", "A type of machine", "A future planet", 1, "It describes the period where human activity is the dominant influence on climate.", "hard"),
    (308, "Which energy source creates radioactive waste?", "Solar", "Nuclear", "Wind", "Hydro", 1, "Nuclear power creates hazardous waste that must be stored for thousands of years.", "medium"),
    (309, "What is 'monoculture'?", "Growing one crop over a large area", "Growing many crops", "Urban farming", "Forestry", 0, "Monoculture depletes soil nutrients and increases vulnerability to pests.", "medium"),
    (310, "Which is the most recycled material in the world?", "Plastic", "Steel", "Paper", "Glass", 1, "Steel is the most recycled material by weight globally.", "hard"),
    (311, "What does 'EPR' stand for in waste management?", "Every Person Recycles", "Extended Producer Responsibility", "Energy Power Resource", "Eat Plant Roots", 1, "EPR makes manufacturers responsible for the entire lifecycle of their products.", "hard"),
    (312, "Which of these reduces the lifespan of a smartphone?", "Using a case", "Overcharging and overheating the battery", "Cleaning the screen", "Updating apps", 1, "Heat degrades lithium-ion batteries rapidly.", "easy"),
    (313, "What is a 'microbead'?", "A small insect", "Tiny plastic particles in cosmetics", "A type of seed", "A water drop", 1, "Microbeads are banned in many places because they pollute oceans.", "medium"),
    (314, "Which date is Earth Day celebrated?", "March 22", "April 22", "June 5", "December 12", 1, "April 22nd is the global day of support for environmental protection.", "easy"),
    (315, "What is 'silvopasture'?", "Mining silver", "Integrating trees and grazing livestock", "Cutting down trees", "Feeding cows silver", 1, "Silvopasture is a sustainable method that absorbs carbon and benefits animals.", "hard"),
    (316, "Which cloud type traps the most heat?", "Cirrus", "Stratus", "Cumulus", "Fog", 0, "High, thin Cirrus clouds allow sunlight in but trap heat radiating from Earth.", "hard"),
    (317, "What is the main advantage of bamboo?", "It grows very slowly", "It grows incredibly fast and requires no pesticides", "It needs lots of water", "It is hard to harvest", 1, "Bamboo is a highly renewable resource due to its rapid growth rate.", "medium"),
    (318, "Which gas smells like rotten eggs and comes from landfills?", "Oxygen", "Hydrogen Sulfide", "Carbon Dioxide", "Nitrogen", 1, "Hydrogen Sulfide is a byproduct of decomposition.", "medium"),
    (319, "What is 'Ecological Restoration'?", "Building malls", "Assisting the recovery of a damaged ecosystem", "Painting trees", "Farming", 1, "It includes reforestation and removing invasive species.", "medium"),
    (320, "Which is a 'secondary' pollutant?", "Smoke from a fire", "Car exhaust", "Acid rain", "Dust", 2, "Acid rain forms when primary pollutants react in the atmosphere.", "hard"),
    (321, "What is the 'Doomsday Vault'?", "A movie set", "A global seed bank in Svalbard", "A bunker for billionaires", "A bank for money", 1, "It stores seeds from around the world to ensure food security in disasters.", "medium"),
    (322, "Which of these uses the most water in a standard shower?", "Low-flow showerhead", "Standard showerhead", "Bucket bath", "Sponge bath", 1, "Standard heads use far more water than efficient low-flow models.", "easy"),
    (323, "What is 'environmental racism'?", "Hating nature", "Disproportionate impact of environmental hazards on people of color", "Racism in parks", "None of the above", 1, "It refers to the placement of landfills or toxic sites near marginalized communities.", "hard"),
    (324, "Which of these is a benefit of composting?", "Increases landfill waste", "Reduces methane emissions from landfills", "Smells bad", "Attracts tigers", 1, "Composting prevents organic waste from rotting anaerobically in landfills.", "medium"),
    (325, "What is 'Slow Food'?", "Cooking slowly", "A movement promoting local, traditional, and sustainable food", "Fast food", "Eating slowly", 1, "Slow Food opposes fast food and preserves local food cultures.", "medium"),
    (326, "Which energy source is most dependent on weather?", "Nuclear", "Coal", "Solar and Wind", "Geothermal", 2, "Intermittency is a challenge for solar and wind power.", "easy"),
    (327, "What is 'green manure'?", "Painted poop", "Crops grown to be plowed back into the soil", " Artificial fertilizer", "Cow dung", 1, "Green manure crops (cover crops) add nutrients to the soil.", "hard"),
    (328, "Which of these is a persistent organic pollutant (POP)?", "Water", "DDT", "Salt", "Iron", 1, "DDT is a toxic pesticide that lingers in the environment for decades.", "hard"),
    (329, "What does 'FSC' certified paper mean?", "Faster Shipping Company", "Forest Stewardship Council (sustainable sourcing)", "Free School Copy", "Fake Sustainable Certification", 1, "FSC ensures the paper comes from responsibly managed forests.", "medium"),
    (330, "Which of these is an example of 'point source' pollution?", "Runoff from many farms", "Pipe discharging waste from a factory", "Car exhaust from a city", "Trash on a beach", 1, "Point source pollution comes from a single, identifiable location.", "hard"),
    (331, "What is the main gas in the Sun?", "Oxygen", "Hydrogen", "Helium", "Nitrogen", 1, "The sun is mostly hydrogen, which powers it through fusion.", "medium"),
    (332, "Which of these is the cleanest burning fossil fuel?", "Coal", "Oil", "Natural Gas", "Peat", 2, "Natural gas produces less CO2 than coal or oil, though still a fossil fuel.", "medium"),
    (333, "What is 'Cradle to Cradle' design?", "Designing beds", "Designing products to be fully recycled into new products", "Designing for trash", "Designing for babies", 1, "It mimics nature where waste equals food for the next cycle.", "hard"),
    (334, "Which ecosystem stores the most carbon per hectare?", "Rainforest", "Peatland/Wetlands", "Desert", "Grassland", 1, "Peatlands are the most efficient carbon sinks on Earth.", "hard"),
    (335, "What is 'ocean dead zone' caused by?", "Shark attacks", "Nutrient pollution depleting oxygen", "Too much salt", "Cold water", 1, "Fertilizer runoff causes algae blooms that consume all oxygen.", "medium"),
    (336, "Which of these is a benefit of eating local?", "More packaging", "Reduced food miles and emissions", "More expensive", "Less taste", 1, "Local food requires less transportation fuel.", "easy"),
    (337, "What is 'thermal pollution'?", "Global warming", "Releasing heated water into rivers/lakes", "Burning trash", "Summer heat", 1, "Hot water from factories harms aquatic life by reducing oxygen levels.", "medium"),
    (338, "Which of these is a rare earth element used in magnets?", "Iron", "Neodymium", "Gold", "Silver", 1, "Neodymium is crucial for wind turbines and EV motors.", "hard"),
    (339, "What is the 'IPCC'?", "International Pizza Club", "Intergovernmental Panel on Climate Change", "Internet Protocol Control", "Indian Pacific Climate Center", 1, "The IPCC provides scientific assessments on climate change.", "hard"),
    (340, "Which of these helps insulate a home?", "Open windows", "Double-glazed windows", "Thin walls", "Metal roof", 1, "Double-glazing traps air to keep heat in (or out).", "medium"),
    (341, "What is 'agroforestry'?", "Cutting forests for farms", "Growing trees and crops together", "Building farms in cities", "Forest fires", 1, "It is a land-use management system combining trees and shrubs with crops.", "medium"),
    (342, "Which of these is a sign of good soil health?", "Presence of earthworms", "Dry and cracked surface", "Hard like concrete", "No bugs", 0, "Earthworms aerate the soil and break down organic matter.", "easy"),
    (343, "What is the main environmental issue with fast food packaging?", "It is too heavy", "It is often non-recyclable and greasy", "It is expensive", "It creates jobs", 1, "Mixed materials and food residue make recycling difficult.", "medium"),
    (344, "Which of these is a 'climate tipping point'?", "A hot summer", "The collapse of the Amazon rainforest", "A rainy day", "A hurricane", 1, "A tipping point is a critical threshold leading to irreversible change.", "hard"),
    (345, "What is 'rainwater harvesting'?", "Dancing in rain", "Collecting rain for reuse", "Stopping rain", "Making rain", 1, "It reduces reliance on municipal water supplies.", "easy"),
    (346, "Which of these is a biological hazard?", "Radiation", "Bacteria/Viruses", "Noise", "Chemicals", 1, "Biological hazards come from living organisms.", "medium"),
    (347, "What does 'Fair Trade' certify?", "Goods are cheap", "Fair wages and ethical treatment for farmers", "Free trade", "Fast shipping", 1, "Fair Trade ensures producers in developing countries get a fair deal.", "medium"),
    (348, "Which of these creates the least waste?", "Liquid soap in plastic", "Bar soap in paper", "Body wash with microbeads", "Disposable wipes", 1, "Bar soap usually has minimal, plastic-free packaging.", "easy"),
    (349, "What is 'sea level rise' primarily caused by?", "More fish", "Thermal expansion and melting land ice", "More boats", "Heavier rain", 1, "As water warms, it expands, and melting glaciers add volume.", "medium"),
    (350, "Which country has the most forest area?", "Brazil", "Canada", "Russia", "USA", 2, "Russia holds the largest area of forest in the world (The Taiga).", "medium"),
    (351, "What is a 'brownfield' site?", "A field of wheat", "Contaminated industrial land", "A desert", "A park", 1, "Brownfields are previously developed lands that may be polluted.", "hard"),
    (352, "Which is the most common gas in Earth's atmosphere?", "Oxygen", "Nitrogen", "Carbon Dioxide", "Argon", 1, "Nitrogen makes up about 78% of the atmosphere.", "medium"),
    (353, "What is 'hydroponics'?", "Growing plants in soil", "Growing plants in nutrient-rich water without soil", "Watering plants", "Genetic modification", 1, "Hydroponics saves space and water compared to traditional farming.", "medium"),
    (354, "Which of these is a disadvantage of dams?", "They produce clean energy", "They disrupt fish migration and sediment flow", "They store water", "They create lakes", 1, "Dams block rivers, hurting fish populations like salmon.", "medium"),
    (355, "What is 'waste-to-energy'?", "Burning trash to generate electricity", "Throwing batteries in fire", "Cycling to work", "Eating leftovers", 0, "Incineration reduces waste volume and generates power, though emissions are a concern.", "medium"),
    (356, "Which of these protects coastal areas from storms?", "Mangrove forests", "Sand castles", "Plastic walls", "Roads", 0, "Mangroves absorb wave energy and prevent erosion.", "medium"),
    (357, "What is 'overgrazing'?", "Eating too much", "Animals eating vegetation faster than it grows back", "Feeding animals too much", "Planting too much grass", 1, "Overgrazing leads to soil erosion and desertification.", "medium"),
    (358, "Which of these is a CFC replacement that is also a greenhouse gas?", "HFC (Hydrofluorocarbons)", "Oxygen", "Nitrogen", "Helium", 0, "HFCs saved the ozone but trap heat; they are now being phased out.", "hard"),
    (359, "What is the 'tragedy of the commons'?", "A sad play", "Individuals depleting a shared resource for self-interest", "A park closing", "A war", 1, "It explains why shared resources (like oceans) are often over-exploited.", "hard"),
    (360, "Which of these is a sustainable alternative to plastic wrap?", "Aluminum foil", "Beeswax wraps", "More plastic", "Styrofoam", 1, "Beeswax wraps are washable, reusable, and biodegradable.", "easy"),
    (361, "What is 'particulate matter' (PM2.5)?", "Tiny particles in the air that damage lungs", "Rain drops", "Sand grains", "Hail", 0, "PM2.5 is fine dust/smoke that penetrates deep into the respiratory system.", "hard"),
    (362, "Which of these is a benefit of crop rotation?", "Depletes soil", "Breaks pest cycles and improves soil health", "Uses more water", "Grows less food", 1, "Changing crops prevents pests from establishing and replenishes nutrients.", "medium"),
    (363, "What is 'biomimicry'?", "Copying nature to solve human problems", "Drawing animals", "Acting like a biological hazard", "Cloning", 0, "Velcro (inspired by burrs) is a classic example of biomimicry.", "hard"),
    (364, "Which of these helps cool a city naturally?", "Air conditioning", "Evapotranspiration from trees", "Car exhaust", "Concrete", 1, "Trees release water vapor which cools the surrounding air.", "medium"),
    (365, "What is the primary cause of acid rain?", "Sulfur dioxide and nitrogen oxides", "Carbon dioxide", "Methane", "Dust", 0, "These chemicals come from burning fossil fuels and react with water in clouds.", "hard"),
    (366, "Which of these is a 'soft' energy path?", "Nuclear", "Coal", "Efficiency and renewables", "Oil sands", 2, "Soft energy relies on renewable flows and efficiency rather than depletion.", "hard"),
    (367, "What is 'genetic erosion'?", "Soil erosion", "Loss of genetic diversity within a species", "DNA replication", " GMOs", 1, "It makes crops more vulnerable to disease as variety is lost.", "hard"),
    (368, "Which of these is the most efficient way to heat water?", "Gas boiler", "Electric resistance", "Solar thermal heater", "Coal fire", 2, "Solar thermal uses direct heat from the sun.", "medium"),
    (369, "What is a 'hybrid' car?", "A car with two engines (gas and electric)", "A flying car", "A solar car", "A diesel car", 0, "Hybrids switch between fuel and battery to save gas.", "easy"),
    (370, "Which of these is an example of 'environmental justice'?", "Polluting everywhere equally", "Ensuring everyone has equal protection from environmental harm", "Suing nature", "Building jails", 1, "It addresses the unfair distribution of environmental burdens.", "hard"),
    (371, "What is the 'Goldilocks Zone'?", "A fairy tale", "The habitable zone around a star where water can be liquid", "A gold mine", "A cold place", 1, "Earth is in the Goldilocks zone, not too hot and not too cold.", "medium"),
    (372, "Which of these degrades soil quality?", "Compost", "Salinization (salt buildup)", "Mulch", "Worms", 1, "Salinization often occurs from improper irrigation in dry areas.", "hard"),
    (373, "What is 'transpiration'?", "Humans sweating", "Plants releasing water vapor", "Rivers flowing", "Rain falling", 1, "It is part of the water cycle driven by plants.", "medium"),
    (374, "Which of these is a threat to bees?", "Flowers", "Neonicotinoid pesticides", "Clean water", "Trees", 1, "Certain pesticides confuse bees and damage their nervous systems.", "medium"),
    (375, "What is 'bauxite' mined for?", "Gold", "Aluminum", "Iron", "Copper", 1, "Bauxite mining is energy-intensive and causes deforestation.", "hard"),
    (376, "Which of these is a 'climate refugee'?", "Someone moving for better weather", "Someone forced to move due to climate change impacts", "A tourist", "A scientist", 1, "Rising seas and droughts are forcing people to displace.", "medium"),
    (377, "What is the 'Precautionary Principle'?", "Act only when sure", "Better safe than sorry (take action to prevent harm even if science isn't final)", "Ignore risks", "Take risks", 1, "It guides environmental policy to avoid potential disasters.", "hard"),
    (378, "Which of these is a benefit of biodiversity in farming?", "More pests", "Natural pest control and resilience", "Lower yields", "More chemicals", 1, " diverse farm attracts predators that eat pests.", "medium"),
    (379, "What is 'run-of-river' hydro?", "A dam", "Hydro power without a large reservoir", "A water slide", "Fishing", 1, "It has a smaller environmental footprint than large dams.", "hard"),
    (380, "Which of these is an 'indicator species'?", "Rock", "Lichens", "Plastic", "Car", 1, "Lichens are sensitive to air pollution and indicate air quality.", "medium"),
    (381, "What is the main problem with invasive species?", "They are ugly", "They outcompete native species for resources", "They eat too slowly", "They are too small", 1, "They can drive native species to extinction.", "easy"),
    (382, "Which of these is a 'regenerative' practice?", "Tilling soil deeply", "No-till farming", "Burning crop residue", "Overgrazing", 1, "No-till keeps carbon in the soil and preserves structure.", "hard"),
    (383, "What is 'El Niño'?", "A storm", "A climate pattern warming the Pacific Ocean", "A cold wind", "A local rain", 1, "El Niño disrupts global weather patterns causing floods and droughts.", "hard"),
    (384, "Which of these is a source of microfibers?", "Cotton shirts", "Synthetic fleece jackets", "Wool sweaters", "Silk scarves", 1, "Washing fleece releases plastic fibers into water systems.", "medium"),
    (385, "What is 'green building'?", "Painting a house green", "Construction that is resource-efficient and eco-friendly", "Building in a forest", "Building with grass", 1, "LEED is a common certification for green buildings.", "medium"),
    (386, "Which of these is a 'global common'?", "Your house", "The Atmosphere", "A private park", "A car", 1, "Global commons are resources shared by all nations.", "medium"),
    (387, "What is 'fly-tipping'?", "Tipping a waiter", "Illegal dumping of waste", "Flying a plane", "Bird watching", 1, "It pollutes land and is illegal.", "medium"),
    (388, "Which of these is a benefit of wetlands?", "They cause floods", "They control floods and filter water", "They are dry", "They have no animals", 1, "Wetlands act as natural sponges.", "medium"),
    (389, "What is 'bottom trawling'?", "Fishing on the surface", "Dragging heavy nets across the sea floor", "Swimming deep", "Planting coral", 1, "It destroys seafloor habitats like coral reefs.", "medium"),
    (390, "Which of these is a 'non-point source' pollution?", "A factory pipe", "Urban runoff from streets", "A sewer pipe", "A specific drain", 1, "It comes from many diffuse sources.", "hard"),
    (391, "What is the 'Ozone Hole' caused by?", "CO2", "CFCs (Chlorofluorocarbons)", "Methane", "Water", 1, "CFCs break down ozone molecules.", "medium"),
    (392, "Which of these is a sustainable protein source?", "Beef", "Insects/Crickets", "Shark fin", "Whale", 1, "Insects require very little water and feed compared to cattle.", "medium"),
    (393, "What is 'peak oil'?", "The highest mountain", "The point where oil production reaches its maximum and begins to decline", "Expensive oil", "Clean oil", 1, "It suggests fossil fuels are finite and will run out.", "hard"),
    (394, "Which of these is a benefit of community gardens?", "More concrete", "Local food and social connection", "More pollution", "Less nature", 1, "They utilize urban space for food and community.", "easy"),
    (395, "What is 'dark sky' conservation?", "Turning off lights to see stars and protect wildlife", "Painting the sky", "Always night", "Using black lights", 0, "It reduces light pollution.", "medium"),
    (396, "Which of these is a 'brownout'?", "A mudslide", "A drop in voltage in an electrical power supply", "A dirt road", "Dead grass", 1, "It often happens when energy demand exceeds supply.", "medium"),
    (397, "What is 'reforestation'?", "Cutting trees", "Planting trees in an area where there was forest", "Building forts", "Farming corn", 1, "It helps restore lost ecosystems.", "easy"),
    (398, "Which of these is a 'natural resource'?", "Plastic", "Sunlight", "Nylon", "Glass", 1, "Sunlight is a renewable natural resource.", "easy"),
    (399, "What is the 'Great Green Wall'?", "A painted wall", "An initiative to plant trees across Africa", "A vine", "A fence", 1, "It aims to stop the spread of the Sahara desert.", "hard"),
    (400, "What is the purpose of World Environment Day?", "To sell products", "To raise awareness and action for the environment", "To celebrate winter", "To watch TV", 1, "It is the UN's principal vehicle for encouraging awareness and action.", "easy"),
        
    ]
    
    for q in questions:
        # Skip the first element (question ID) as it's auto-generated
        cursor.execute('''
            INSERT OR IGNORE INTO quiz_questions 
            (question, option_a, option_b, option_c, option_d, correct_option, fact, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', q[1:])

if __name__ == '__main__':
    init_db()
