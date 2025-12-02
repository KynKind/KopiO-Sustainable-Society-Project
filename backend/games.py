from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Game, Leaderboard
from sqlalchemy import desc, func
import json
from datetime import datetime

games_bp = Blueprint('games', __name__)

def update_leaderboard():
    """Update leaderboard rankings"""
    # Update global rankings
    users_by_points = User.query.order_by(User.points.desc()).all()
    
    for rank, user in enumerate(users_by_points, 1):
        lb_entry = Leaderboard.query.filter_by(user_id=user.id).first()
        if not lb_entry:
            lb_entry = Leaderboard(user_id=user.id, total_points=user.points)
            db.session.add(lb_entry)
        
        lb_entry.total_points = user.points
        lb_entry.rank = rank
    
    # Update faculty rankings
    faculties = db.session.query(User.faculty).distinct().all()
    for (faculty,) in faculties:
        faculty_users = User.query.filter_by(faculty=faculty).order_by(User.points.desc()).all()
        for rank, user in enumerate(faculty_users, 1):
            lb_entry = Leaderboard.query.filter_by(user_id=user.id).first()
            if lb_entry:
                lb_entry.faculty_rank = rank
    
    db.session.commit()

@games_bp.route('/api/games/submit', methods=['POST'])
@jwt_required()
def submit_game():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate required fields
        if not data.get('game_type') or not data.get('score'):
            return jsonify({'error': 'Game type and score are required'}), 400
        
        # Valid game types
        valid_game_types = ['quiz', 'memory', 'sorting', 'puzzle']
        if data['game_type'] not in valid_game_types:
            return jsonify({'error': f'Invalid game type. Must be one of: {valid_game_types}'}), 400
        
        # Create game record
        game = Game(
            user_id=user_id,
            game_type=data['game_type'],
            score=data['score'],
            time_spent=data.get('time_spent', 0),
            level=data.get('level', 1),
            details=json.dumps(data.get('details', {}))
        )
        
        db.session.add(game)
        
        # Update user points
        user = User.query.get(user_id)
        if user:
            user.points += data['score']
        
        db.session.commit()
        
        # Update leaderboard
        update_leaderboard()
        
        return jsonify({
            'success': True,
            'message': 'Game score submitted successfully',
            'game_id': game.id,
            'points_added': data['score'],
            'total_points': user.points if user else 0
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@games_bp.route('/api/games/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        faculty = request.args.get('faculty')
        limit = int(request.args.get('limit', 10))
        
        # Build query
        query = db.session.query(
            User, Leaderboard.rank, Leaderboard.faculty_rank
        ).join(Leaderboard, User.id == Leaderboard.user_id)
        
        if faculty and faculty != 'all':
            query = query.filter(User.faculty == faculty)
        
        # Order by rank
        query = query.order_by(Leaderboard.rank).limit(limit)
        
        results = query.all()
        
        leaderboard = []
        for user, rank, faculty_rank in results:
            leaderboard.append({
                'id': user.id,
                'name': f'{user.first_name} {user.last_name}',
                'email': user.email,
                'faculty': user.faculty,
                'points': user.points,
                'rank': rank,
                'faculty_rank': faculty_rank
            })
        
        return jsonify({
            'success': True,
            'leaderboard': leaderboard,
            'faculty': faculty,
            'count': len(leaderboard)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@games_bp.route('/api/games/history/<int:user_id>', methods=['GET'])
@jwt_required()
def get_game_history(user_id):
    try:
        # Verify the requesting user can access this history
        current_user_id = get_jwt_identity()
        if int(current_user_id) != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        games = Game.query.filter_by(user_id=user_id).order_by(desc(Game.played_at)).limit(20).all()
        
        history = []
        for game in games:
            history.append({
                'id': game.id,
                'game_type': game.game_type,
                'score': game.score,
                'time_spent': game.time_spent,
                'level': game.level,
                'played_at': game.played_at.isoformat() if game.played_at else None,
                'details': json.loads(game.details) if game.details else {}
            })
        
        return jsonify({
            'success': True,
            'history': history,
            'count': len(history)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@games_bp.route('/api/games/stats', methods=['GET'])
def get_game_stats():
    try:
        # Total games played
        total_games = Game.query.count()
        
        # Total points awarded
        total_points = db.session.query(func.sum(Game.score)).scalar() or 0
        
        # Games by type
        games_by_type = db.session.query(
            Game.game_type, 
            func.count(Game.id).label('count'),
            func.sum(Game.score).label('total_points')
        ).group_by(Game.game_type).all()
        
        stats = {
            'total_games': total_games,
            'total_points': total_points,
            'games_by_type': [
                {
                    'game_type': game_type,
                    'count': count,
                    'total_points': total_pts or 0
                }
                for game_type, count, total_pts in games_by_type
            ]
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500