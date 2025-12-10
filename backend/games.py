"""
Games module for Kopi-O
Handles all game APIs: Quiz, Memory, Puzzle, Sorting
"""
import json
import random
from datetime import datetime, date
from database import get_db_connection
from config import Config

def get_random_quiz_questions(count=None):
    """Get random quiz questions"""
    try:
        # --- FIXED START ---
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Determine how many questions to fetch
        if count is None:
            # If count is None, assume default or all questions
            count_to_fetch = Config.DEFAULT_QUIZ_QUESTION_COUNT if hasattr(Config, 'DEFAULT_QUIZ_QUESTION_COUNT') else 10
        else:
            count_to_fetch = count

        # Check total questions available
        cursor.execute('SELECT COUNT(*) FROM quiz_questions')
        total = cursor.fetchone()['COUNT(*)'] # Ensure correct dict key if using RowFactory
        
        if total == 0:
            conn.close()
            return {'error': 'No quiz questions found in the database.'}, 500

        # Adjust count if too high
        final_count = min(count_to_fetch, total)
        # --- FIXED END ---
        
        cursor.execute('''
            SELECT id, question, option_a, option_b, option_c, option_d, difficulty
            FROM quiz_questions
            ORDER BY RANDOM()
            LIMIT ?
        ''', (final_count,))
        
        questions = []
        for row in cursor.fetchall():
            questions.append({
                'id': row['id'],
                'question': row['question'],
                'options': [
                    row['option_a'],
                    row['option_b'],
                    row['option_c'],
                    row['option_d']
                ],         
                'difficulty': row['difficulty']
            })
        
        conn.close()
        
        return {
            'questions': questions,
            'timeLimit': Config.QUIZ_TIME_LIMIT
        }, 200
        
    except Exception as e:
        # Include the error in the server log for diagnosis
        print(f"Error getting quiz questions: {e}")
        return {'error': f'Failed to get questions: {str(e)}'}, 500

def final_submit_quiz_score(user_id, data): # Changed function name
    """Calculates final metrics (e.g., time bonus) and saves game history."""
    try:
        if 'answers' not in data or not isinstance(data['answers'], list):
            return {'error': 'Answers are required'}, 400
        
        answers = data['answers']
        time_taken = data.get('timeTaken', 0)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get correct answers
        question_ids = [ans['questionId'] for ans in answers]
        placeholders = ','.join('?' * len(question_ids))
            
        correct_answers = {row['id']: row for row in cursor.fetchall()}
        
        # Calculate score
        correct_count = 0
        results = []
        
        for answer in answers:
            question_id = answer['questionId']
            user_answer = answer['answer']
            
            if question_id in correct_answers:
                correct = correct_answers[question_id]['correct_option']
                is_correct = user_answer == correct
                
                if is_correct:
                    correct_count += 1
                
                results.append({
                    'questionId': question_id,
                    'userAnswer': user_answer,
                    'correctAnswer': correct,
                    'isCorrect': is_correct,
                    'fact': correct_answers[question_id]['fact']
                })
        
        # 100 marks per correct
        points = 0 
        time_bonus = 0

        
        # Save score
        game_data = json.dumps({
             'correctCount': correct_count,
             'totalQuestions': len(answers),
             'timeTaken': time_taken,
             'timeBonus': time_bonus
        })
        
        cursor.execute('''
            INSERT INTO game_scores (user_id, game_type, score, points_earned, game_data)
            VALUES (?, ?, ?, ?, ?)
            # Use 'points' from the point bonus logic, or set to 0 if not needed for history
        ''', (user_id, 'quiz', correct_count, points, game_data))
        
        # Update total points
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (points, user_id))
        
        # Update streak
        update_user_streak(cursor, user_id)
        
        conn.commit()
        conn.close()
        
        return {
                'score': correct_count,
                'totalQuestions': len(answers),
                'points': points, # This should be the total final score (you may need to calculate the sum of per-question points + bonuses)
                'timeBonus': time_bonus,
                'results': results
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to submit score: {str(e)}'}, 500

def submit_memory_game_score(user_id, data):
    """Submit memory game score"""
    try:
        moves = data.get('moves', 0)
        time_taken = data.get('timeTaken', 0)
        level = data.get('level', 1)
        
        # Calculate points based on performance
        base_points = Config.MEMORY_GAME_BASE_POINTS
        
        # Bonus for fewer moves (max 20 bonus points)
        if moves <= 15:
            move_bonus = 20
        elif moves <= 20:
            move_bonus = 15
        elif moves <= 25:
            move_bonus = 10
        else:
            move_bonus = 0
        
        # Time bonus (max 10 points)
        if time_taken < 60:
            time_bonus = 10
        elif time_taken < 90:
            time_bonus = 5
        else:
            time_bonus = 0
        
        # Level multiplier
        level_multiplier = 1 + (level - 1) * 0.5
        
        points = int((base_points + move_bonus + time_bonus) * level_multiplier)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        game_data = json.dumps({
            'moves': moves,
            'timeTaken': time_taken,
            'level': level,
            'moveBonus': move_bonus,
            'timeBonus': time_bonus
        })
        
        cursor.execute('''
            INSERT INTO game_scores (user_id, game_type, score, points_earned, game_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, 'memory', moves, points, game_data))
        
        cursor.execute('''
            UPDATE user_stats
            SET memory_games_played = memory_games_played + 1,
                memory_points = memory_points + ?,
                last_played_date = ?
            WHERE user_id = ?
        ''', (points, date.today().isoformat(), user_id))
        
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (points, user_id))
        
        update_user_streak(cursor, user_id)
        
        conn.commit()
        conn.close()
        
        return {
            'points': points,
            'moveBonus': move_bonus,
            'timeBonus': time_bonus
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to submit score: {str(e)}'}, 500

def submit_puzzle_game_score(user_id, data):
    """Submit puzzle game score"""
    try:
        moves = data.get('moves', 0)
        time_taken = data.get('timeTaken', 0)
        puzzle_number = data.get('puzzleNumber', 1)
        
        base_points = Config.PUZZLE_GAME_BASE_POINTS
        
        # Move bonus
        if moves <= 50:
            move_bonus = 15
        elif moves <= 100:
            move_bonus = 10
        elif moves <= 150:
            move_bonus = 5
        else:
            move_bonus = 0
        
        # Time bonus
        if time_taken < 120:
            time_bonus = 10
        elif time_taken < 180:
            time_bonus = 5
        else:
            time_bonus = 0
        
        points = base_points + move_bonus + time_bonus
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        game_data = json.dumps({
            'moves': moves,
            'timeTaken': time_taken,
            'puzzleNumber': puzzle_number,
            'moveBonus': move_bonus,
            'timeBonus': time_bonus
        })
        
        cursor.execute('''
            INSERT INTO game_scores (user_id, game_type, score, points_earned, game_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, 'puzzle', moves, points, game_data))
        
        cursor.execute('''
            UPDATE user_stats
            SET puzzle_games_played = puzzle_games_played + 1,
                puzzle_points = puzzle_points + ?,
                last_played_date = ?
            WHERE user_id = ?
        ''', (points, date.today().isoformat(), user_id))
        
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (points, user_id))
        
        update_user_streak(cursor, user_id)
        
        conn.commit()
        conn.close()
        
        return {
            'points': points,
            'moveBonus': move_bonus,
            'timeBonus': time_bonus
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to submit score: {str(e)}'}, 500

def submit_sorting_game_score(user_id, data):
    """Submit sorting game score"""
    try:
        correct_sorts = data.get('correctSorts', 0)
        total_items = data.get('totalItems', 0)
        time_taken = data.get('timeTaken', 0)
        level = data.get('level', 1)
        
        if total_items == 0:
            return {'error': 'Invalid game data'}, 400
        
        accuracy = (correct_sorts / total_items) * 100
        base_points = Config.SORTING_GAME_BASE_POINTS
        
        # Accuracy bonus
        if accuracy == 100:
            accuracy_bonus = 20
        elif accuracy >= 90:
            accuracy_bonus = 15
        elif accuracy >= 80:
            accuracy_bonus = 10
        elif accuracy >= 70:
            accuracy_bonus = 5
        else:
            accuracy_bonus = 0
        
        # Time bonus
        if time_taken < 30:
            time_bonus = 10
        elif time_taken < 45:
            time_bonus = 5
        else:
            time_bonus = 0
        
        # Level multiplier
        level_multiplier = 1 + (level - 1) * 0.3
        
        points = int((base_points + accuracy_bonus + time_bonus) * level_multiplier)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        game_data = json.dumps({
            'correctSorts': correct_sorts,
            'totalItems': total_items,
            'accuracy': accuracy,
            'timeTaken': time_taken,
            'level': level,
            'accuracyBonus': accuracy_bonus,
            'timeBonus': time_bonus
        })
        
        cursor.execute('''
            INSERT INTO game_scores (user_id, game_type, score, points_earned, game_data)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, 'sorting', correct_sorts, points, game_data))
        
        cursor.execute('''
            UPDATE user_stats
            SET sorting_games_played = sorting_games_played + 1,
                sorting_points = sorting_points + ?,
                last_played_date = ?
            WHERE user_id = ?
        ''', (points, date.today().isoformat(), user_id))
        
        cursor.execute('''
            UPDATE users
            SET total_points = total_points + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (points, user_id))
        
        update_user_streak(cursor, user_id)
        
        conn.commit()
        conn.close()
        
        return {
            'points': points,
            'accuracy': accuracy,
            'accuracyBonus': accuracy_bonus,
            'timeBonus': time_bonus
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to submit score: {str(e)}'}, 500

def update_user_streak(cursor, user_id):
    """Update user's play streak"""
    try:
        cursor.execute('''
            SELECT last_played_date, current_streak
            FROM user_stats
            WHERE user_id = ?
        ''', (user_id,))
        
        result = cursor.fetchone()
        if not result:
            return
        
        last_played = result['last_played_date']
        current_streak = result['current_streak']
        
        today = date.today().isoformat()
        
        if last_played is None:
            # First time playing
            new_streak = 1
        elif last_played == today:
            # Already played today
            new_streak = current_streak
        else:
            # Check if played yesterday
            from datetime import timedelta
            yesterday = (date.today() - timedelta(days=1)).isoformat()
            
            if last_played == yesterday:
                # Streak continues
                new_streak = current_streak + 1
            else:
                # Streak broken
                new_streak = 1
        
        cursor.execute('''
            UPDATE user_stats
            SET current_streak = ?
            WHERE user_id = ?
        ''', (new_streak, user_id))
        
    except Exception as e:
        print(f"Error updating streak: {e}")

def check_single_quiz_answer(user_id, data):
    """Checks a single answer, awards points, and updates user totals."""
    try:
        question_id = data.get('questionId')
        user_answer = data.get('userAnswer')

        try:
            user_answer = int(user_answer)
        except (ValueError, TypeError):
                    # This handles cases where the value is missing or not convertible
            return {'error': 'Invalid answer value format.'}, 400
        
        if question_id is None or user_answer is None:
            return {'error': 'Question ID and answer are required'}, 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Fetch the correct answer and score value
        cursor.execute('''
            SELECT correct_option, difficulty
            FROM quiz_questions
            WHERE id = ?
        ''', (question_id,))
        
        question_data = cursor.fetchone()
        
        if not question_data:
            conn.close()
            return {'error': 'Question not found'}, 404

        correct_option = question_data['correct_option']
        is_correct = user_answer == correct_option
        points_awarded = 0
        
        if is_correct:
            # Assuming Config.QUIZ_POINTS_PER_CORRECT is defined (e.g., 100)
            points_awarded = Config.QUIZ_POINTS_PER_CORRECT 
            
            # Update user's total points in the 'users' table
            cursor.execute('''
                UPDATE users
                SET total_points = total_points + ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (points_awarded, user_id))
            
            # Update user stats for immediate reflection
            cursor.execute('''
                UPDATE user_stats
                SET quiz_points = quiz_points + ?
                WHERE user_id = ?
            ''', (points_awarded, user_id))
            
            # NOTE: We skip game_scores insertion here and do it only on final_submit

            conn.commit()
            
        conn.close()
        
        return {
            'isCorrect': is_correct,
            'pointsAwarded': points_awarded,
            'correctAnswerIndex': correct_option # Needed for optional frontend visual feedback
        }, 200
        
    except Exception as e:
        return {'error': f'Failed to check answer: {str(e)}'}, 500