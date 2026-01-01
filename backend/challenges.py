"""
Daily Challenges module for Kopi-O
Handles daily login rewards, game completion tracking, and weekly streaks
"""
from datetime import date, datetime
from database import get_db_connection

def get_daily_challenges(user_id):
    """Get today's challenge progress for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today = date.today().isoformat()
        
        # Get or create today's challenge record
        cursor.execute('''
            SELECT daily_login_claimed, game_played_today, weekly_streak_bonus_claimed
            FROM daily_challenges
            WHERE user_id = ? AND challenge_date = ?
        ''', (user_id, today))
        
        progress = cursor.fetchone()
        
        # Get current streak for weekly bonus
        cursor.execute('''
            SELECT current_streak
            FROM user_stats
            WHERE user_id = ?
        ''', (user_id,))
        
        streak_row = cursor.fetchone()
        current_streak = streak_row['current_streak'] if streak_row else 0
        
        conn.close()
        
        return {
            'dailyLogin': {
                'claimed': bool(progress['daily_login_claimed']) if progress else False,
                'points': 10,
                'completed': True  # Always completed if user is logged in
            },
            'playAnyGame': {
                'completed': bool(progress['game_played_today']) if progress else False,
                'progress': 1 if (progress and progress['game_played_today']) else 0,
                'target': 1,
                'points': 20
            },
            'weeklyStreak': {
                'progress': current_streak,
                'target': 7,
                'bonusPoints': 100,
                'canClaim': current_streak >= 7 and not (progress and progress['weekly_streak_bonus_claimed'])
            }
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to get challenges: {str(e)}'}, 500

def claim_daily_login(user_id):
    """Claim daily login bonus"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today = date.today().isoformat()
        
        # Check if already claimed today
        cursor.execute('''
            SELECT daily_login_claimed
            FROM daily_challenges
            WHERE user_id = ? AND challenge_date = ?
        ''', (user_id, today))
        
        existing = cursor.fetchone()
        
        if existing and existing['daily_login_claimed']:
            conn.close()
            return {'error': 'Daily login bonus already claimed today'}, 400
        
        # Create or update today's record
        cursor.execute('''
            INSERT INTO daily_challenges (user_id, challenge_date, daily_login_claimed)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, challenge_date) 
            DO UPDATE SET daily_login_claimed = 1
        ''', (user_id, today))
        
        # Award 10 points
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + 10
            WHERE id = ?
        ''', (user_id,))
        
        # Record activity for profile display
        cursor.execute('''
            INSERT INTO recent_activities (user_id, activity_type, activity_title, points_earned)
            VALUES (?, ?, ?, ?)
        ''', (user_id, 'daily_login', 'Claimed Daily Login Bonus', 10))
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'message': 'Daily login bonus claimed!',
            'pointsEarned': 10
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to claim daily login: {str(e)}'}, 500

def record_game_played(cursor, user_id):
    """Record that user played a game today (called from games.py)"""
    try:
        today = date.today().isoformat()
        
        # Check if game already played today
        cursor.execute('''
            SELECT game_played_today
            FROM daily_challenges
            WHERE user_id = ? AND challenge_date = ?
        ''', (user_id, today))
        
        existing = cursor.fetchone()
        
        # If already marked, no need to update
        if existing and existing['game_played_today']:
            return True
        
        # Mark game as played and award bonus points
        cursor.execute('''
            INSERT INTO daily_challenges (user_id, challenge_date, game_played_today)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, challenge_date) 
            DO UPDATE SET game_played_today = 1
        ''', (user_id, today))
        
        # Award 20 bonus points for first game of the day
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + 20
            WHERE id = ?
        ''', (user_id,))
        
        # Record activity for profile display
        cursor.execute('''
            INSERT INTO recent_activities (user_id, activity_type, activity_title, points_earned)
            VALUES (?, ?, ?, ?)
        ''', (user_id, 'daily_game', 'Completed Daily Game Challenge', 20))
        
        return True
        
    except Exception as e:
        print(f"Error recording game played: {e}")
        return False

def claim_weekly_streak(user_id):
    """Claim weekly streak bonus (7 consecutive days)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        today = date.today().isoformat()
        
        # Get current streak
        cursor.execute('''
            SELECT current_streak
            FROM user_stats
            WHERE user_id = ?
        ''', (user_id,))
        
        streak_row = cursor.fetchone()
        current_streak = streak_row['current_streak'] if streak_row else 0
        
        if current_streak < 7:
            conn.close()
            return {'error': 'Weekly streak requirement not met (need 7 consecutive days)'}, 400
        
        # Check if already claimed
        cursor.execute('''
            SELECT weekly_streak_bonus_claimed
            FROM daily_challenges
            WHERE user_id = ? AND challenge_date = ?
        ''', (user_id, today))
        
        existing = cursor.fetchone()
        
        if existing and existing['weekly_streak_bonus_claimed']:
            conn.close()
            return {'error': 'Weekly streak bonus already claimed'}, 400
        
        # Mark as claimed and award bonus
        cursor.execute('''
            INSERT INTO daily_challenges (user_id, challenge_date, weekly_streak_bonus_claimed)
            VALUES (?, ?, 1)
            ON CONFLICT(user_id, challenge_date) 
            DO UPDATE SET weekly_streak_bonus_claimed = 1
        ''', (user_id, today))
        
        # Award 100 bonus points
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + 100
            WHERE id = ?
        ''', (user_id,))
        
        # Record activity for profile display
        cursor.execute('''
            INSERT INTO recent_activities (user_id, activity_type, activity_title, points_earned)
            VALUES (?, ?, ?, ?)
        ''', (user_id, 'weekly_streak', 'Claimed 7-Day Streak Bonus', 100))
        
        conn.commit()
        conn.close()
        
        return {
            'success': True,
            'message': 'Weekly streak bonus claimed!',
            'pointsEarned': 100
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to claim weekly streak: {str(e)}'}, 500
