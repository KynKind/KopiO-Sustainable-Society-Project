from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Game, Leaderboard
from sqlalchemy import func, desc
import json
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__)

def check_admin():
    """Check if current user is admin"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return user and user.is_admin

@admin_bp.route('/api/admin/users', methods=['GET'])
@jwt_required()
def get_all_users():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')
        
        # Build query
        query = User.query
        
        if search:
            query = query.filter(
                (User.email.contains(search)) |
                (User.first_name.contains(search)) |
                (User.last_name.contains(search)) |
                (User.student_id.contains(search))
            )
        
        # Pagination
        pagination = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        users = [user.to_dict() for user in pagination.items]
        
        return jsonify({
            'success': True,
            'users': users,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/users/<int:user_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def manage_user(user_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        user = User.query.get_or_404(user_id)
        
        if request.method == 'GET':
            # Get user details
            user_games = Game.query.filter_by(user_id=user_id).count()
            user_points = user.points
            
            return jsonify({
                'success': True,
                'user': user.to_dict(),
                'stats': {
                    'games_played': user_games,
                    'total_points': user_points,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None
                }
            })
        
        elif request.method == 'PUT':
            # Update user
            data = request.get_json()
            
            if 'points' in data:
                user.points = data['points']
            
            if 'is_admin' in data:
                user.is_admin = data['is_admin']
            
            if 'is_verified' in data:
                user.is_verified = data['is_verified']
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'User updated successfully',
                'user': user.to_dict()
            })
        
        elif request.method == 'DELETE':
            # Delete user
            db.session.delete(user)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'User deleted successfully'
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def get_admin_stats():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        # User statistics
        total_users = User.query.count()
        active_users = User.query.filter(User.last_login >= datetime.utcnow() - timedelta(days=7)).count()
        admin_users = User.query.filter_by(is_admin=True).count()
        
        # Game statistics
        total_games = Game.query.count()
        total_points = db.session.query(func.sum(Game.score)).scalar() or 0
        
        # Daily stats (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        daily_stats = db.session.query(
            func.date(Game.played_at).label('date'),
            func.count(Game.id).label('games'),
            func.sum(Game.score).label('points')
        ).filter(Game.played_at >= seven_days_ago).group_by(func.date(Game.played_at)).all()
        
        # Faculty distribution
        faculty_stats = db.session.query(
            User.faculty,
            func.count(User.id).label('users'),
            func.sum(User.points).label('points')
        ).group_by(User.faculty).all()
        
        stats = {
            'users': {
                'total': total_users,
                'active_last_7_days': active_users,
                'admins': admin_users,
                'regular': total_users - admin_users
            },
            'games': {
                'total': total_games,
                'total_points': total_points,
                'average_points': round(total_points / total_games, 2) if total_games > 0 else 0
            },
            'daily_stats': [
                {
                    'date': date.isoformat() if hasattr(date, 'isoformat') else str(date),
                    'games': games or 0,
                    'points': points or 0
                }
                for date, games, points in daily_stats
            ],
            'faculty_stats': [
                {
                    'faculty': faculty,
                    'users': users or 0,
                    'points': points or 0
                }
                for faculty, users, points in faculty_stats
            ]
        }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/admin/games', methods=['GET'])
@jwt_required()
def get_all_games():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        games = Game.query.order_by(desc(Game.played_at)).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        game_list = []
        for game in games.items:
            user = User.query.get(game.user_id)
            game_list.append({
                'id': game.id,
                'game_type': game.game_type,
                'score': game.score,
                'level': game.level,
                'time_spent': game.time_spent,
                'played_at': game.played_at.isoformat() if game.played_at else None,
                'user': {
                    'id': user.id if user else None,
                    'name': f'{user.first_name} {user.last_name}' if user else 'Unknown',
                    'email': user.email if user else None
                } if user else None
            })
        
        return jsonify({
            'success': True,
            'games': game_list,
            'pagination': {
                'page': games.page,
                'per_page': games.per_page,
                'total': games.total,
                'pages': games.pages
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500