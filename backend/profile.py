"""
Profile module for Kopi-O
Handles user profile data and statistics
"""
from database import get_db_connection

def get_user_profile(user_id):
    """Get user profile with complete statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user data
        cursor.execute('''
            SELECT 
                u.id,
                u.email,
                u.first_name,
                u.last_name,
                u.student_id,
                u.faculty,
                u.role,
                u.total_points,
                u.created_at,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.quiz_points,
                us.memory_points,
                us.puzzle_points,
                us.sorting_points,
                us.current_streak
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Get user's rank
        cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE role = 'student' AND total_points > ?
        ''', (user['total_points'],))
        
        rank = cursor.fetchone()[0] + 1
        
        # Get recent game history
        cursor.execute('''
            SELECT game_type, points_earned, played_at
            FROM game_scores
            WHERE user_id = ?
            ORDER BY played_at DESC
            LIMIT 10
        ''', (user_id,))
        
        recent_games = []
        for row in cursor.fetchall():
            recent_games.append({
                'gameType': row['game_type'],
                'points': row['points_earned'],
                'playedAt': row['played_at']
            })
        
        conn.close()
        
        profile = {
            'id': user['id'],
            'email': user['email'],
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'studentId': user['student_id'],
            'faculty': user['faculty'],
            'role': user['role'],
            'totalPoints': user['total_points'],
            'globalRank': rank,
            'currentStreak': user['current_streak'] or 0,
            'memberSince': user['created_at'],
            'stats': {
                'quizGamesPlayed': user['quiz_games_played'] or 0,
                'memoryGamesPlayed': user['memory_games_played'] or 0,
                'puzzleGamesPlayed': user['puzzle_games_played'] or 0,
                'sortingGamesPlayed': user['sorting_games_played'] or 0,
                'totalGamesPlayed': (user['quiz_games_played'] or 0) + 
                                   (user['memory_games_played'] or 0) + 
                                   (user['puzzle_games_played'] or 0) + 
                                   (user['sorting_games_played'] or 0)
            },
            'pointsBreakdown': {
                'quiz': user['quiz_points'] or 0,
                'memory': user['memory_points'] or 0,
                'puzzle': user['puzzle_points'] or 0,
                'sorting': user['sorting_points'] or 0
            },
            'recentGames': recent_games
        }
        
        return profile, 200
        
    except Exception as e:
        return {'error': f'Failed to get profile: {str(e)}'}, 500

def get_user_stats(user_id):
    """Get detailed user statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get basic stats
        cursor.execute('''
            SELECT 
                quiz_games_played,
                memory_games_played,
                puzzle_games_played,
                sorting_games_played,
                quiz_points,
                memory_points,
                puzzle_points,
                sorting_points,
                current_streak
            FROM user_stats
            WHERE user_id = ?
        ''', (user_id,))
        
        stats = cursor.fetchone()
        
        if not stats:
            conn.close()
            return {'error': 'Stats not found'}, 404
        
        # Get best scores for each game type
        cursor.execute('''
            SELECT 
                game_type,
                MAX(points_earned) as best_score,
                AVG(points_earned) as avg_score
            FROM game_scores
            WHERE user_id = ?
            GROUP BY game_type
        ''', (user_id,))
        
        best_scores = {}
        avg_scores = {}
        
        for row in cursor.fetchall():
            best_scores[row['game_type']] = row['best_score']
            avg_scores[row['game_type']] = round(row['avg_score'], 1)
        
        # Get games played by date (last 7 days)
        cursor.execute('''
            SELECT 
                DATE(played_at) as play_date,
                COUNT(*) as games_count
            FROM game_scores
            WHERE user_id = ?
            AND played_at >= DATE('now', '-7 days')
            GROUP BY DATE(played_at)
            ORDER BY play_date DESC
        ''', (user_id,))
        
        daily_activity = []
        for row in cursor.fetchall():
            daily_activity.append({
                'date': row['play_date'],
                'gamesPlayed': row['games_count']
            })
        
        conn.close()
        
        return {
            'gamesPlayed': {
                'quiz': stats['quiz_games_played'] or 0,
                'memory': stats['memory_games_played'] or 0,
                'puzzle': stats['puzzle_games_played'] or 0,
                'sorting': stats['sorting_games_played'] or 0
            },
            'pointsEarned': {
                'quiz': stats['quiz_points'] or 0,
                'memory': stats['memory_points'] or 0,
                'puzzle': stats['puzzle_points'] or 0,
                'sorting': stats['sorting_points'] or 0
            },
            'bestScores': best_scores,
            'averageScores': avg_scores,
            'currentStreak': stats['current_streak'] or 0,
            'dailyActivity': daily_activity
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get stats: {str(e)}'}, 500

def get_user_achievements(user_id):
    """Get user achievements and milestones"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                u.total_points,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.current_streak
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.id = ?
        ''', (user_id,))
        
        data = cursor.fetchone()
        conn.close()
        
        if not data:
            return {'error': 'User not found'}, 404
        
        achievements = []
        
        # Points milestones
        if data['total_points'] >= 1000:
            achievements.append({
                'id': 'points_1000',
                'name': 'Sustainability Champion',
                'description': 'Earned 1000 total points',
                'icon': 'trophy',
                'unlocked': True
            })
        
        if data['total_points'] >= 500:
            achievements.append({
                'id': 'points_500',
                'name': 'Eco Warrior',
                'description': 'Earned 500 total points',
                'icon': 'medal',
                'unlocked': True
            })
        
        # Games played milestones
        total_games = (data['quiz_games_played'] or 0) + \
                     (data['memory_games_played'] or 0) + \
                     (data['puzzle_games_played'] or 0) + \
                     (data['sorting_games_played'] or 0)
        
        if total_games >= 50:
            achievements.append({
                'id': 'games_50',
                'name': 'Dedicated Player',
                'description': 'Played 50 games',
                'icon': 'gamepad',
                'unlocked': True
            })
        
        # Streak achievements
        if data['current_streak'] >= 7:
            achievements.append({
                'id': 'streak_7',
                'name': 'Weekly Warrior',
                'description': '7-day play streak',
                'icon': 'fire',
                'unlocked': True
            })
        
        return {'achievements': achievements}, 200
        
    except Exception as e:
        return {'error': f'Failed to get achievements: {str(e)}'}, 500
