# Kopi-O Backend API

Flask backend for the Kopi-O Sustainable Society Project.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Initialize the database:
```bash
python database.py
```

3. Run the server:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user info (requires token)

### Games
- `GET /api/games/quiz/questions` - Get random quiz questions
- `POST /api/games/quiz/submit` - Submit quiz answers
- `POST /api/games/memory/submit` - Submit memory game score
- `POST /api/games/puzzle/submit` - Submit puzzle game score
- `POST /api/games/sorting/submit` - Submit sorting game score

### Leaderboard
- `GET /api/leaderboard/global` - Get global leaderboard
- `GET /api/leaderboard/faculty/<faculty>` - Get faculty leaderboard
- `GET /api/leaderboard/search?q=<query>` - Search leaderboard
- `GET /api/leaderboard/top?limit=<n>` - Get top N players
- `GET /api/leaderboard/rank/<user_id>` - Get user rank

### Profile
- `GET /api/profile/me` - Get current user profile
- `GET /api/profile/<user_id>` - Get user profile by ID
- `GET /api/profile/stats` - Get current user statistics
- `GET /api/profile/achievements` - Get current user achievements

### Admin (requires admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/<user_id>` - Get user details
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/users/<user_id>/role` - Update user role
- `DELETE /api/admin/users/<user_id>` - Delete user
- `PUT /api/admin/users/<user_id>/password` - Reset user password

## Authentication

Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## MMU Email Validation

Registration requires an MMU email address ending with `@mmu.edu.my`

## Database

Uses SQLite database (`kopio.db`) with the following tables:
- `users` - User accounts
- `quiz_questions` - Quiz questions (25 sustainability questions included)
- `game_scores` - Game score history
- `user_stats` - User statistics and streaks
