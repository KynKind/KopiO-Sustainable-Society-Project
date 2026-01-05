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
         2, "Approximately 17% of the Amazon rainforest has been lost in the past 50 years due to deforestation!", "hard"),
        
        # === SUSTAINABLE ENERGY (40 questions) ===
        ("Which renewable energy source is most suitable for providing 24/7 base-load power?", 
         "Hydroelectric dams", "Solar panels", "Wind turbines", "Tidal generators", 
         0, "Hydroelectric dams can provide consistent power day and night, unlike solar and wind which are intermittent.", "hard"),
        
        ("What is the main advantage of wind energy over solar energy?", 
         "Can generate electricity at night", "Requires less maintenance", "More efficient in all locations", "Lower installation cost", 
         0, "Wind turbines can generate electricity 24/7 as long as there's wind, while solar only works during daylight.", "medium"),
        
        ("Which country generates the highest percentage of its electricity from geothermal energy?", 
         "Iceland", "New Zealand", "USA", "Philippines", 
         0, "Iceland generates over 25% of its electricity from geothermal sources due to its volcanic activity.", "hard"),
        
        ("What is 'net metering' in solar energy systems?", 
         "Selling excess electricity back to the grid", "Measuring network efficiency", "Tracking solar panel output", "Calculating carbon credits", 
         0, "Net metering allows solar panel owners to sell excess electricity they generate back to the utility company.", "medium"),
        
        ("How does concentrated solar power (CSP) differ from photovoltaic (PV) solar?", 
         "Uses mirrors to concentrate sunlight for heat", "Is more efficient at night", "Works without sunlight", "Uses different materials", 
         0, "CSP uses mirrors to concentrate sunlight to create heat, which then generates electricity, while PV converts sunlight directly to electricity.", "hard"),
        
        ("What is the typical lifespan of a modern wind turbine?", 
         "20-25 years", "10-15 years", "30-35 years", "5-10 years", 
         0, "Modern wind turbines are designed to last 20-25 years with proper maintenance.", "medium"),
        
        ("Which renewable energy source has the highest capacity factor (percentage of time generating at full capacity)?", 
         "Geothermal", "Solar", "Wind", "Biomass", 
         0, "Geothermal plants can operate at 90-95% capacity factor, compared to 20-40% for solar and wind.", "hard"),
        
        ("What is 'green hydrogen'?", 
         "Hydrogen produced using renewable energy", "Hydrogen from natural gas", "Hydrogen with added color", "Hydrogen from water electrolysis", 
         0, "Green hydrogen is produced through water electrolysis using electricity from renewable sources.", "medium"),
        
        ("Which material is most commonly used in photovoltaic solar panels?", 
         "Silicon", "Copper", "Aluminum", "Glass", 
         0, "Over 90% of solar panels use silicon as the semiconductor material to convert sunlight to electricity.", "easy"),
        
        ("What is the main environmental concern with large hydroelectric dams?", 
         "Habitat destruction and displacement", "High CO2 emissions", "Radioactive waste", "Air pollution", 
         0, "Large dams flood valleys, destroy habitats, and displace communities, though they produce clean electricity.", "medium"),
        
        ("Which country has the world's largest installed solar power capacity?", 
         "China", "USA", "Germany", "Japan", 
         0, "China leads the world with over 300 GW of installed solar capacity as of 2023.", "medium"),
        
        ("What is 'tidal energy' harnessed from?", 
         "The gravitational pull of moon and sun", "Ocean currents", "Wind over water", "Temperature differences", 
         0, "Tidal energy comes from the gravitational forces between Earth, moon, and sun that cause tides.", "hard"),
        
        ("Which renewable energy source uses the 'Rankine cycle' for electricity generation?", 
         "Geothermal", "Solar thermal", "Biomass", "All of the above", 
         3, "Geothermal, solar thermal, and biomass plants all typically use the Rankine cycle with steam turbines.", "hard"),
        
        ("What percentage of global electricity came from renewables in 2022?", 
         "29%", "15%", "45%", "60%", 
         0, "Renewables accounted for 29% of global electricity generation in 2022, up from 20% a decade earlier.", "medium"),
        
        ("Which is NOT a type of wind turbine?", 
         "Vertical-axis", "Horizontal-axis", "Diagonal-axis", "Darrieus", 
         2, "Wind turbines are either horizontal-axis (most common) or vertical-axis (like Darrieus or Savonius).", "medium"),
        
        ("What is 'bioenergy with carbon capture and storage' (BECCS)?", 
         "Negative emissions technology", "A type of biogas", "Carbon trading system", "Biomass certification", 
         0, "BECCS involves growing biomass, burning it for energy, and capturing the CO2, resulting in net removal of CO2 from atmosphere.", "hard"),
        
        ("Which country gets almost 100% of its electricity from renewables?", 
         "Norway", "Costa Rica", "Uruguay", "All of the above", 
         3, "Norway (hydropower), Costa Rica (mix), and Uruguay (wind) all get nearly 100% from renewables.", "hard"),
        
        ("What is the main challenge with solar energy storage?", 
         "Battery cost and capacity", "Panel efficiency", "Land requirements", "Manufacturing emissions", 
         0, "Storing solar energy for use at night requires expensive batteries with limited capacity and lifespan.", "medium"),
        
        ("Which renewable energy source is considered 'dispatchable' (can be turned on/off as needed)?", 
         "Hydroelectric", "Solar", "Wind", "Tidal", 
         0, "Hydroelectric dams can quickly adjust output to match demand, unlike intermittent solar and wind.", "medium"),
        
        ("What is 'agrivoltaics'?", 
         "Combining agriculture with solar panels", "Solar farming", "Vegetable-based solar cells", "Agricultural waste for energy", 
         0, "Agrivoltaics involves installing solar panels above crops, providing shade while generating electricity.", "hard"),
        
        ("What is 'floating solar' or 'floatovoltaics'?", 
         "Solar panels on water bodies", "Solar panels that float in air", "Mobile solar installations", "Underwater solar panels", 
         0, "Floating solar panels are installed on reservoirs, lakes, or ponds to save land and reduce water evaporation.", "medium"),
        
        ("Which renewable energy has the lowest cost per kWh in most regions today?", 
         "Solar PV", "Wind", "Geothermal", "Hydroelectric", 
         0, "Utility-scale solar PV is now the cheapest electricity source in history in most parts of the world.", "hard"),
        
        ("What is 'ocean thermal energy conversion' (OTEC)?", 
         "Using temperature difference in ocean layers", "Harnessing ocean currents", "Wave energy conversion", "Tidal energy", 
         0, "OTEC uses the temperature difference between warm surface water and cold deep water to generate electricity.", "hard"),
        
        ("Which material is being researched as a more efficient alternative to silicon in solar cells?", 
         "Perovskite", "Graphene", "Copper indium gallium selenide", "All of the above", 
         3, "All these materials show promise for higher efficiency and lower cost than traditional silicon solar cells.", "hard"),
        
        ("What is 'distributed generation' in energy systems?", 
         "Small-scale generation near consumption points", "Centralized power plants", "Grid management system", "Energy trading", 
         0, "Distributed generation includes rooftop solar, small wind turbines, and microgrids located close to where electricity is used.", "medium"),
        
        ("Which country pioneered commercial wave energy technology?", 
         "Portugal", "Scotland", "Australia", "USA", 
         1, "Scotland has been a world leader in developing and testing wave energy converters.", "hard"),
        
        ("What is 'green ammonia'?", 
         "Ammonia produced using renewable energy", "Ammonia from organic waste", "Ammonia used as fertilizer", "Ammonia for cleaning", 
         0, "Green ammonia is made using green hydrogen from renewable electricity, potentially replacing fossil fuels in shipping.", "hard"),
        
        ("Which renewable energy source has the highest power density (energy per unit area)?", 
         "Nuclear", "Solar", "Wind", "Biomass", 
         0, "Nuclear has the highest power density, but among renewables, concentrated solar power has relatively high density.", "hard"),
        
        ("What is 'vehicle-to-grid' (V2G) technology?", 
         "Electric cars supplying power back to grid", "Grid charging for vehicles", "Smart charging systems", "Electric bus networks", 
         0, "V2G allows EV batteries to discharge electricity back to the grid during peak demand, helping balance the grid.", "medium"),
        
        ("Which African country gets over 90% of its electricity from hydropower?", 
         "Ethiopia", "Kenya", "South Africa", "Nigeria", 
         0, "Ethiopia's Grand Ethiopian Renaissance Dam will make it Africa's largest hydroelectric producer.", "medium"),
        
        ("What is the 'waste hierarchy' from most to least preferred?", 
         "Reduce, Reuse, Recycle", "Recycle, Reduce, Reuse", "Reuse, Recycle, Reduce", "Reduce, Recycle, Reuse", 
         0, "The waste hierarchy prioritizes reducing consumption first, then reusing items, and finally recycling materials.", "easy"),
        
        ("Which type of plastic is most commonly recycled?", 
         "PET (Type 1)", "PVC (Type 3)", "PS (Type 6)", "Other (Type 7)", 
         0, "PET plastic (water bottles) has the highest recycling rate at about 30% globally.", "medium"),
        
        ("What is 'extended producer responsibility' (EPR)?", 
         "Manufacturers responsible for product end-of-life", "Consumers paying recycling fees", "Government waste management", "Retailer take-back programs", 
         0, "EPR makes producers responsible for the entire lifecycle of their products, including disposal and recycling.", "hard"),
        
        ("Which country has the highest municipal waste recycling rate?", 
         "Germany", "South Korea", "Singapore", "Sweden", 
         0, "Germany recycles about 68% of its municipal waste, the highest rate among major economies.", "hard"),
        
        ("What is 'precycling'?", 
         "Avoiding waste before it's created", "Sorting recyclables", "Preparing items for recycling", "Early stage recycling", 
         0, "Precycling means making purchasing decisions that prevent waste, like buying in bulk or choosing reusable items.", "medium"),
        
        ("Which material can be recycled indefinitely without quality loss?", 
         "Glass", "Aluminum", "Paper", "Plastic", 
         1, "Aluminum can be recycled infinitely without degrading, unlike paper which shortens fibers each time.", "medium"),
        
        ("What percentage of electronic waste (e-waste) is formally recycled globally?", 
         "17.4%", "35%", "50%", "75%", 
         0, "Only 17.4% of e-waste was formally collected and recycled in 2019, despite its valuable materials.", "hard"),
        
        ("Which item takes the longest to decompose in a landfill?", 
         "Glass bottle", "Aluminum can", "Plastic bag", "Newspaper", 
         0, "Glass can take over 1 million years to decompose, though it's inert and doesn't release toxins.", "medium"),
        
        ("What is 'waste-to-energy' (WTE)?", 
         "Burning waste to generate electricity", "Composting organic waste", "Recycling materials", "Landfill gas capture", 
         0, "WTE plants burn municipal solid waste to produce steam for electricity generation, reducing landfill volume.", "medium"),
        
        ("Which country has implemented a successful 'pay-as-you-throw' waste system?", 
         "South Korea", "Japan", "Sweden", "All of the above", 
         3, "All these countries charge households based on the amount of non-recyclable waste they produce.", "hard"),
        
        ("What is 'compostable' plastic made from?", 
         "Plant-based materials like corn starch", "Petroleum with additives", "Recycled plastic", "Biodegradable polymers", 
         0, "Compostable plastics are typically made from renewable resources like corn, sugarcane, or potato starch.", "medium"),
        
        ("Which city was the first to achieve 'zero waste to landfill' status?", 
         "San Francisco", "Tokyo", "Copenhagen", "Toronto", 
         0, "San Francisco diverts over 80% of waste from landfills through aggressive recycling and composting programs.", "hard"),
        
        ("What is 'marine debris' primarily composed of?", 
         "Plastic", "Metal", "Glass", "Paper", 
         0, "Plastic accounts for 80-85% of marine debris, harming marine life and ecosystems.", "medium"),
        
        ("Which recycling method uses magnets to separate materials?", 
         "For ferrous metals", "For aluminum", "For plastics", "For glass", 
         0, "Magnets separate ferrous metals (iron, steel) from other materials in recycling facilities.", "easy"),
        
        ("What is 'downcycling'?", 
         "Recycling into lower-quality products", "Recycling underwater", "Slow recycling process", "Informal recycling", 
         0, "Downcycling turns materials into products of lower quality, like turning plastic bottles into carpet fibers.", "hard"),
        
        ("Which country has banned single-use plastics nationwide?", 
         "Kenya", "Canada", "France", "All of the above", 
         3, "All these countries have implemented nationwide bans on various single-use plastic items.", "medium"),
        
        ("What is 'methane capture' from landfills?", 
         "Collecting landfill gas for energy", "Reducing landfill size", "Covering landfills", "Measuring emissions", 
         0, "Landfill gas (50% methane) can be captured and burned to generate electricity, reducing greenhouse gas emissions.", "medium"),
        
        ("Which item should NEVER go in recycling bins?", 
         "Used pizza boxes", "Broken glass", "Plastic bags", "All of the above", 
         2, "Plastic bags jam recycling machinery; pizza boxes with grease and broken glass are also problematic.", "medium"),
        
        ("What percentage of plastic packaging is used only once before being discarded?", 
         "95%", "50%", "75%", "60%", 
         0, "A shocking 95% of plastic packaging material value is lost after first use, amounting to $80-120 billion annually.", "hard"),
        
        ("Which country introduced the 'Circular Economy Package' with strict recycling targets?", 
         "European Union", "China", "USA", "Japan", 
         0, "The EU's Circular Economy Package sets 65% municipal waste recycling target by 2035.", "hard"),
        
        ("What is the main greenhouse gas responsible for recent global warming?", 
         "Carbon dioxide (CO2)", "Methane (CH4)", "Water vapor", "Nitrous oxide (N2O)", 
         0, "CO2 from burning fossil fuels accounts for about 76% of total greenhouse gas emissions.", "easy"),
        
        ("What does IPCC stand for?", 
         "Intergovernmental Panel on Climate Change", "International Pollution Control Committee", "Institute for Planetary Climate", "International Panel on Carbon Emissions", 
         0, "The IPCC is the UN body for assessing climate change science, providing policymakers with regular assessments.", "medium"),
        
        ("Which sector is the largest contributor to global greenhouse gas emissions?", 
         "Energy (electricity and heat)", "Agriculture", "Transportation", "Industry", 
         0, "Energy production accounts for about 35% of global emissions, followed by agriculture (24%) and industry (21%).", "hard"),
        
        ("What is 'climate resilience'?", 
         "Ability to cope with climate impacts", "Reducing emissions", "Climate monitoring", "Carbon sequestration", 
         0, "Climate resilience involves adapting systems to withstand climate change impacts like floods, droughts, and storms.", "medium"),
        
        ("Which international agreement aims to limit global warming to well below 2°C?", 
         "Paris Agreement", "Kyoto Protocol", "Montreal Protocol", "Copenhagen Accord", 
         0, "The 2015 Paris Agreement commits countries to limit warming to well below 2°C, preferably 1.5°C above pre-industrial levels.", "easy"),
        
        ("What is 'carbon sequestration'?", 
         "Capturing and storing atmospheric CO2", "Reducing carbon emissions", "Measuring carbon footprint", "Trading carbon credits", 
         0, "Carbon sequestration removes CO2 from the atmosphere and stores it in plants, soil, oceans, or geological formations.", "medium"),
        
        ("Which greenhouse gas has the highest global warming potential (over 100 years)?", 
         "Sulfur hexafluoride (SF6)", "Methane (CH4)", "Nitrous oxide (N2O)", "Carbon dioxide (CO2)", 
         0, "SF6 has a global warming potential 23,500 times higher than CO2 over 100 years, though emitted in smaller quantities.", "hard"),
        
        ("What is 'ocean acidification' caused by?", 
         "CO2 absorption by oceans", "Plastic pollution", "Agricultural runoff", "Oil spills", 
         0, "Oceans absorb about 30% of atmospheric CO2, forming carbonic acid that lowers pH and harms marine life.", "medium"),
        
        ("Which year was the hottest on record globally (as of 2023)?", 
         "2023", "2020", "2016", "2019", 
         0, "2023 was the hottest year on record, with global temperatures 1.48°C above pre-industrial levels.", "easy"),
        
        ("What does 'net zero emissions' mean?", 
         "Balancing emitted and removed greenhouse gases", "No emissions at all", "Only natural emissions", "Offsetting all emissions", 
         0, "Net zero means any greenhouse gases emitted are balanced by an equivalent amount removed from the atmosphere.", "medium"),
        
        ("What is 'permafrost' and why is its thawing concerning?", 
         "Permanently frozen ground releasing methane", "Frozen lakes melting", "Glacial ice", "Seasonal frost", 
         0, "Permafrost contains vast amounts of organic matter that release methane when thawed, accelerating warming.", "hard"),
        
        ("Which climate tipping point involves the collapse of major ice sheets?", 
         "West Antarctic Ice Sheet collapse", "Amazon rainforest dieback", "Permafrost thaw", "Atlantic circulation slowdown", 
         0, "The West Antarctic Ice Sheet contains enough ice to raise sea levels by 3.3 meters if it collapses completely.", "hard"),
        
        ("What is 'regenerative agriculture'?", 
         "Farming that improves soil health", "Organic farming", "No-till farming", "Precision agriculture", 
         0, "Regenerative agriculture focuses on rebuilding soil organic matter and restoring degraded soil biodiversity.", "medium"),
        
        ("Which practice helps reduce soil erosion?", 
         "Cover cropping", "Monocropping", "Deep tilling", "Chemical fertilizers", 
         0, "Cover crops protect soil from erosion, improve soil health, and increase organic matter.", "easy"),
        
        ("What is 'food miles'?", 
         "Distance food travels from farm to plate", "Food waste measurement", "Agricultural efficiency", "Food distribution", 
         0, "Reducing food miles lowers carbon emissions from transportation, though production methods matter more than distance.", "medium"),
        
        ("Which farming method uses the least water?", 
         "Drip irrigation", "Flood irrigation", "Sprinkler systems", "Manual watering", 
         0, "Drip irrigation delivers water directly to plant roots, reducing evaporation and using 30-50% less water.", "hard"),
        
        ("What percentage of global freshwater withdrawals go to agriculture?", 
         "70%", "40%", "50%", "30%", 
         0, "Agriculture accounts for about 70% of global freshwater withdrawals, making water efficiency crucial.", "hard"),
        
        ("Which transport mode has the lowest CO2 emissions per passenger-kilometer?", 
         "Electric bicycle", "Electric car", "Bus", "Train", 
         0, "Electric bicycles produce near-zero emissions and are 20 times more energy efficient than cars.", "medium"),
        
        ("What is 'transit-oriented development' (TOD)?", 
         "Dense, walkable development near transit", "Transport planning", "Public transport funding", "Road network design", 
         0, "TOD creates compact, mixed-use communities within walking distance of public transport stations.", "hard"),
        
        ("What percentage of Earth's species have been identified by science?", 
         "About 20%", "About 50%", "About 80%", "About 95%", 
         0, "Scientists have identified about 1.7 million species, but estimate 8-10 million exist - so only about 20% are known.", "hard"),
        
        ("Which ecosystem has the highest biodiversity per unit area?", 
         "Coral reefs", "Tropical rainforests", "Mangrove forests", "Savannas", 
         0, "Coral reefs support 25% of all marine species despite covering less than 1% of ocean floor.", "medium"),
        
        ("What is a '15-minute city'?", 
         "All daily needs within 15-minute walk/bike", "Small city size", "Fast transportation", "Urban planning concept", 
         0, "The 15-minute city concept ensures residents can meet most daily needs within a 15-minute walk or bike ride.", "medium"),
        
        ("Which city is known for its extensive cycling infrastructure?", 
         "Copenhagen", "Amsterdam", "Tokyo", "Portland", 
         1, "Amsterdam has over 400 km of dedicated bike paths and 40% of trips are made by bicycle.", "easy"),
        
        ("What is 'greywater recycling'?", 
         "Reusing water from sinks/showers", "Treating wastewater", "Rainwater harvesting", "Water purification", 
         0, "Greywater from baths, sinks, and washing machines can be reused for toilet flushing and irrigation.", "medium"),
        
        ("What is 'carbon capture and storage' (CCS)?", 
         "Trapping CO2 from industrial sources", "Planting trees", "Renewable energy", "Energy efficiency", 
         0, "CCS captures CO2 emissions from power plants and industry, then stores it underground to prevent atmospheric release.", "hard"),
        
        ("What does the 'Fairtrade' certification guarantee?", 
         "Fair prices and conditions for producers", "Organic production", "Low carbon footprint", "Local production", 
         0, "Fairtrade ensures farmers receive minimum prices, premiums for community development, and safe working conditions.", "medium"),
        
        ("How many UN Sustainable Development Goals (SDGs) are there?", 
         "17", "10", "8", "15", 
         0, "The 17 SDGs were adopted in 2015 as a universal call to end poverty, protect the planet, and ensure prosperity by 2030.", "easy"),
        
    ]
    
    for q in questions:
        cursor.execute('''
            INSERT OR IGNORE INTO quiz_questions 
            (question, option_a, option_b, option_c, option_d, correct_option, fact, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', q)

if __name__ == '__main__':
    init_db()
