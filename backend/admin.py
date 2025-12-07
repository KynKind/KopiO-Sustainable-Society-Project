"""
Admin module for Kopi-O
Handles admin-only operations like user management and statistics
"""
from database import get_db_connection
from auth import hash_password

def get_all_users(limit=50, offset=0, role_filter=None):
    """Get all users with pagination"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = '''
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
                us.sorting_games_played
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
        '''
        
        params = []
        
        if role_filter:
            query += ' WHERE u.role = ?'
            params.append(role_filter)
        
        query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?'
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        
        users = []
        for row in cursor.fetchall():
            users.append({
                'id': row['id'],
                'email': row['email'],
                'firstName': row['first_name'],
                'lastName': row['last_name'],
                'studentId': row['student_id'],
                'faculty': row['faculty'],
                'role': row['role'],
                'totalPoints': row['total_points'],
                'createdAt': row['created_at'],
                'gamesPlayed': (row['quiz_games_played'] or 0) + 
                              (row['memory_games_played'] or 0) + 
                              (row['puzzle_games_played'] or 0) + 
                              (row['sorting_games_played'] or 0)
            })
        
        # Get total count
        if role_filter:
            cursor.execute('SELECT COUNT(*) FROM users WHERE role = ?', (role_filter,))
        else:
            cursor.execute('SELECT COUNT(*) FROM users')
        
        total = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'users': users,
            'total': total,
            'page': offset // limit + 1,
            'limit': limit
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get users: {str(e)}'}, 500

def get_user_details(user_id):
    """Get detailed information about a specific user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
                u.updated_at,
                us.quiz_games_played,
                us.memory_games_played,
                us.puzzle_games_played,
                us.sorting_games_played,
                us.quiz_points,
                us.memory_points,
                us.puzzle_points,
                us.sorting_points,
                us.current_streak,
                us.last_played_date
            FROM users u
            LEFT JOIN user_stats us ON u.id = us.user_id
            WHERE u.id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Get recent activity
        cursor.execute('''
            SELECT game_type, score, points_earned, played_at
            FROM game_scores
            WHERE user_id = ?
            ORDER BY played_at DESC
            LIMIT 20
        ''', (user_id,))
        
        recent_activity = []
        for row in cursor.fetchall():
            recent_activity.append({
                'gameType': row['game_type'],
                'score': row['score'],
                'points': row['points_earned'],
                'playedAt': row['played_at']
            })
        
        conn.close()
        
        return {
            'id': user['id'],
            'email': user['email'],
            'firstName': user['first_name'],
            'lastName': user['last_name'],
            'studentId': user['student_id'],
            'faculty': user['faculty'],
            'role': user['role'],
            'totalPoints': user['total_points'],
            'createdAt': user['created_at'],
            'updatedAt': user['updated_at'],
            'stats': {
                'quizGamesPlayed': user['quiz_games_played'] or 0,
                'memoryGamesPlayed': user['memory_games_played'] or 0,
                'puzzleGamesPlayed': user['puzzle_games_played'] or 0,
                'sortingGamesPlayed': user['sorting_games_played'] or 0,
                'quizPoints': user['quiz_points'] or 0,
                'memoryPoints': user['memory_points'] or 0,
                'puzzlePoints': user['puzzle_points'] or 0,
                'sortingPoints': user['sorting_points'] or 0,
                'currentStreak': user['current_streak'] or 0,
                'lastPlayedDate': user['last_played_date']
            },
            'recentActivity': recent_activity
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get user details: {str(e)}'}, 500

def get_platform_statistics():
    """Get overall platform statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Total users
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = "student"')
        total_users = cursor.fetchone()[0]
        
        # Total admins
        cursor.execute('SELECT COUNT(*) FROM users WHERE role = "admin"')
        total_admins = cursor.fetchone()[0]
        
        # Total points awarded
        cursor.execute('SELECT COALESCE(SUM(total_points), 0) FROM users')
        total_points = cursor.fetchone()[0]
        
        # Total games played
        cursor.execute('SELECT COUNT(*) FROM game_scores')
        total_games = cursor.fetchone()[0]
        
        # Games by type
        cursor.execute('''
            SELECT game_type, COUNT(*) as count
            FROM game_scores
            GROUP BY game_type
        ''')
        
        games_by_type = {}
        for row in cursor.fetchall():
            games_by_type[row['game_type']] = row['count']
        
        # Average points per user
        cursor.execute('SELECT AVG(total_points) FROM users WHERE role = "student"')
        avg_points = cursor.fetchone()[0] or 0
        
        # Recent registrations (last 7 days)
        cursor.execute('''
            SELECT COUNT(*) FROM users 
            WHERE role = "student" 
            AND created_at >= DATE('now', '-7 days')
        ''')
        recent_registrations = cursor.fetchone()[0]
        
        # Active users (played in last 7 days)
        cursor.execute('''
            SELECT COUNT(DISTINCT user_id) FROM game_scores
            WHERE played_at >= DATE('now', '-7 days')
        ''')
        active_users = cursor.fetchone()[0]
        
        # Top faculty by total points
        cursor.execute('''
            SELECT faculty, SUM(total_points) as total
            FROM users
            WHERE role = "student"
            GROUP BY faculty
            ORDER BY total DESC
            LIMIT 5
        ''')
        
        top_faculties = []
        for row in cursor.fetchall():
            top_faculties.append({
                'faculty': row['faculty'],
                'totalPoints': row['total']
            })
        
        conn.close()
        
        return {
            'totalUsers': total_users,
            'totalAdmins': total_admins,
            'totalPoints': total_points,
            'totalGames': total_games,
            'gamesByType': games_by_type,
            'averagePointsPerUser': round(avg_points, 1),
            'recentRegistrations': recent_registrations,
            'activeUsers': active_users,
            'topFaculties': top_faculties
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get statistics: {str(e)}'}, 500

def update_user_role(admin_user_id, target_user_id, new_role):
    """Update a user's role (admin only)"""
    try:
        if new_role not in ['student', 'admin']:
            return {'error': 'Invalid role'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if target user exists
        cursor.execute('SELECT id, role FROM users WHERE id = ?', (target_user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Update role
        cursor.execute('''
            UPDATE users 
            SET role = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_role, target_user_id))
        
        conn.commit()
        conn.close()
        
        return {
            'message': 'User role updated successfully',
            'userId': target_user_id,
            'newRole': new_role
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to update role: {str(e)}'}, 500

def delete_user(admin_user_id, target_user_id):
    """Delete a user (admin only)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE id = ?', (target_user_id,))
        if not cursor.fetchone():
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Don't allow deleting yourself
        if admin_user_id == target_user_id:
            conn.close()
            return {'error': 'Cannot delete your own account'}, 400
        
        # Delete related records
        cursor.execute('DELETE FROM game_scores WHERE user_id = ?', (target_user_id,))
        cursor.execute('DELETE FROM user_stats WHERE user_id = ?', (target_user_id,))
        cursor.execute('DELETE FROM users WHERE id = ?', (target_user_id,))
        
        conn.commit()
        conn.close()
        
        return {'message': 'User deleted successfully'}, 200
        
    except Exception as e:
        return {'error': f'Failed to delete user: {str(e)}'}, 500

def reset_user_password(admin_user_id, target_user_id, new_password):
    """Reset a user's password (admin only)"""
    try:
        from auth import validate_password
        
        # Validate new password
        is_valid, message = validate_password(new_password)
        if not is_valid:
            return {'error': message}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE id = ?', (target_user_id,))
        if not cursor.fetchone():
            conn.close()
            return {'error': 'User not found'}, 404
        
        # Hash and update password
        password_hash = hash_password(new_password)
        
        cursor.execute('''
            UPDATE users 
            SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (password_hash, target_user_id))
        
        conn.commit()
        conn.close()
        
        return {'message': 'Password reset successfully'}, 200
        
    except Exception as e:
        return {'error': f'Failed to reset password: {str(e)}'}, 500
