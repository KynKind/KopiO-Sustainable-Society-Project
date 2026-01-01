"""
Leaderboard module for Kopi-O
Handles leaderboard queries with faculty filtering and search
"""
from database import get_db_connection

def get_global_leaderboard(limit=50, offset=0, query=None):
    """Get global leaderboard"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        sql = '''
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.faculty,
                u.total_points,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.current_streak
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.role = 'student'
        '''
        params = []
        
        if query:
            sql += " AND (LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))"
            params.extend([f'%{query}%', f'%{query}%'])
        
        sql += ' ORDER BY u.total_points DESC, u.created_at ASC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(sql, tuple(params))
        
        users = []
        rank = offset + 1
        
        for row in cursor.fetchall():
            users.append({
                'rank': rank,
                'id': row['id'],
                'name': f"{row['first_name']} {row['last_name']}",
                'email': row['email'],
                'faculty': row['faculty'],
                'totalPoints': row['total_points'],
                'gamesPlayed': (row['quiz_games_played'] or 0) + 
                              (row['memory_games_played'] or 0) + 
                              (row['puzzle_games_played'] or 0) + 
                              (row['sorting_games_played'] or 0),
                'currentStreak': row['current_streak'] or 0
            })
            rank += 1
        
        # Get total count
        count_sql = 'SELECT COUNT(*) FROM users u WHERE u.role = "student"'
        count_params = []
        if query:
            count_sql += " AND (LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))"
            count_params.extend([f'%{query}%', f'%{query}%'])
        cursor.execute(count_sql, tuple(count_params))
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'leaderboard': users,
            'total': total,
            'page': offset // limit + 1,
            'limit': limit
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get leaderboard: {str(e)}'}, 500

def get_faculty_leaderboard(faculty, limit=50, offset=0, query=None):
    """Get leaderboard filtered by faculty"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Map known faculty codes (from the dropdown) to possible stored name variants
        # so selection values like 'fci' match users stored as 'Faculty of Computing' or similar
        FACULTY_CODE_TO_NAMES = {
            'fci': [
                'Faculty of Computing & Informatics (FCI)',
                'Faculty of Computing',
                'Computing',
                'FCI'
            ],
            'fom': [
                'Faculty of Management (FOM)',
                'Faculty of Management',
                'Management',
                'FOM'
            ],
            'faie': [
                'Faculty of Artificial Intelligence & Engineering (FAIE)',
                'Faculty of Artificial Intelligence & Engineering',
                'Artificial Intelligence',
                'FAIE'
            ],
            'fcm': [
                'Faculty of Creative Multimedia (FCM)',
                'Faculty of Creative Multimedia',
                'Creative Multimedia',
                'FCM'
            ],
            'fca': [
                'Faculty of Cinematic Arts (FCA)',
                'Faculty of Cinematic Arts',
                'Cinematic Arts',
                'FCA'
            ],
            'fob': [
                'Faculty of Business (FOB)',
                'Faculty of Business',
                'Business',
                'FOB'
            ],
            'fac': [
                'Faculty of Applied Communication (FAC)',
                'Faculty of Applied Communication',
                'Applied Communication',
                'FAC'
            ],
            'fist': [
                'Faculty of Information Science & Technology (FIST)',
                'Faculty of Information Science & Technology',
                'Information Science',
                'FIST'
            ]
        }

        # Build search terms: include the raw input and any mapped full name variants
        search_terms = [faculty]
        mapped_names = FACULTY_CODE_TO_NAMES.get(faculty.lower())
        if mapped_names:
            for name in mapped_names:
                if name and name not in search_terms:
                    search_terms.append(name)

        # Build SQL conditions dynamically to search any of the terms (exact or substring, case-insensitive)
        conditions = " OR ".join(["(LOWER(u.faculty) = LOWER(?) OR LOWER(u.faculty) LIKE '%' || LOWER(?) || '%')" for _ in search_terms])

        sql = f'''
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.faculty,
                u.total_points,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.current_streak
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.role = 'student' 
              AND ({conditions})
        '''
        params = []
        for term in search_terms:
            # each term provides two placeholders (equality and LIKE)
            params.extend([term, term])
        
        if query:
            sql += " AND (LOWER(u.first_name || ' ' || u.last_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))"
            params.extend([f'%{query}%', f'%{query}%'])
        
        sql += ' ORDER BY u.total_points DESC, u.created_at ASC LIMIT ? OFFSET ?'
        params.extend([limit, offset])

        cursor.execute(sql, tuple(params))
        
        users = []
        rank = offset + 1
        
        for row in cursor.fetchall():
            users.append({
                'rank': rank,
                'id': row['id'],
                'name': f"{row['first_name']} {row['last_name']}",
                'email': row['email'],
                'faculty': row['faculty'],
                'totalPoints': row['total_points'],
                'gamesPlayed': (row['quiz_games_played'] or 0) + 
                              (row['memory_games_played'] or 0) + 
                              (row['puzzle_games_played'] or 0) + 
                              (row['sorting_games_played'] or 0),
                'currentStreak': row['current_streak'] or 0
            })
            rank += 1
        
        # Get total count for faculty using the same dynamic search terms
        count_conditions = " OR ".join(["(LOWER(faculty) = LOWER(?) OR LOWER(faculty) LIKE '%' || LOWER(?) || '%')" for _ in search_terms])
        count_sql = f'''
            SELECT COUNT(*) FROM users 
            WHERE role = "student" AND ({count_conditions})
        '''
        count_params = []
        for term in search_terms:
            count_params.extend([term, term])
        if query:
            count_sql += " AND (LOWER(first_name || ' ' || last_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))"
            count_params.extend([f'%{query}%', f'%{query}%'])
        cursor.execute(count_sql, tuple(count_params))
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'leaderboard': users,
            'faculty': faculty,
            'total': total,
            'page': offset // limit + 1,
            'limit': limit
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get faculty leaderboard: {str(e)}'}, 500

def search_leaderboard(query):
    """Search leaderboard by name or email"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        search_pattern = f"%{query}%"
        
        cursor.execute('''
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                u.faculty,
                u.total_points,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.current_streak
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.role = 'student' 
            AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)
            ORDER BY u.total_points DESC, u.created_at ASC
            LIMIT 20
        ''', (search_pattern, search_pattern, search_pattern))
        
        users = []
        
        for row in cursor.fetchall():
            users.append({
                'id': row['id'],
                'name': f"{row['first_name']} {row['last_name']}",
                'email': row['email'],
                'faculty': row['faculty'],
                'totalPoints': row['total_points'],
                'gamesPlayed': (row['quiz_games_played'] or 0) + 
                              (row['memory_games_played'] or 0) + 
                              (row['puzzle_games_played'] or 0) + 
                              (row['sorting_games_played'] or 0),
                'currentStreak': row['current_streak'] or 0
            })
        
        conn.close()
        
        return {
            'results': users,
            'query': query
        }, 200
        
    except Exception as e:
        return {'error': f'Search failed: {str(e)}'}, 500

def get_top_players(limit=3):
    """Get top N players for homepage preview"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.faculty,
                u.total_points
            FROM users u
            WHERE u.role = 'student'
            ORDER BY u.total_points DESC, u.created_at ASC
            LIMIT ?
        ''', (limit,))
        
        players = []
        rank = 1
        
        for row in cursor.fetchall():
            players.append({
                'rank': rank,
                'firstName': row['first_name'],
                'lastName': row['last_name'],
                'faculty': row['faculty'],
                'totalPoints': row['total_points']
            })
            rank += 1
        
        conn.close()
        
        return {'users': players}, 200
        
    except Exception as e:
        return {'error': f'Failed to get top players: {str(e)}'}, 500

def get_user_rank(user_id):
    """Get a specific user's rank"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user's points
        cursor.execute('SELECT total_points FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Count users with more points
        cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE role = 'student' AND total_points > ?
        ''', (user['total_points'],))
        
        rank = cursor.fetchone()[0] + 1
        
        conn.close()
        
        return {'rank': rank}, 200
        
    except Exception as e:
        return {'error': f'Failed to get user rank: {str(e)}'}, 500
