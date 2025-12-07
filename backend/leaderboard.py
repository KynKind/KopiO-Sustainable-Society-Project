"""
Leaderboard module for Kopi-O
Handles leaderboard queries with faculty filtering and search
"""
from database import get_db_connection

def get_global_leaderboard(limit=50, offset=0):
    """Get global leaderboard"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
            ORDER BY u.total_points DESC, u.created_at ASC
            LIMIT ? OFFSET ?
        ''', (limit, offset))
        
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
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = "student"')
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

def get_faculty_leaderboard(faculty, limit=50, offset=0):
    """Get leaderboard filtered by faculty"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
            WHERE u.role = 'student' AND u.faculty = ?
            ORDER BY u.total_points DESC, u.created_at ASC
            LIMIT ? OFFSET ?
        ''', (faculty, limit, offset))
        
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
        
        # Get total count for faculty
        cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE role = "student" AND faculty = ?
        ''', (faculty,))
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
                'name': f"{row['first_name']} {row['last_name']}",
                'faculty': row['faculty'],
                'totalPoints': row['total_points']
            })
            rank += 1
        
        conn.close()
        
        return {'topPlayers': players}, 200
        
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
