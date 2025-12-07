# Kopi-O Sustainable Society Project

A full-stack web application for MMU Cyberjaya students to learn about sustainability through interactive games, compete on leaderboards, and earn points.

## 🎮 Features

### For Students
- **Authentication**: Secure registration and login with MMU email (@mmu.edu.my and subdomains like @student.mmu.edu.my)
- **Email Verification**: Verify your email address to activate your account
- **4 Interactive Games**:
  - Quiz Game: Test sustainability knowledge with 25+ questions
  - Memory Game: Match eco-friendly symbols
  - Puzzle Game: Solve sustainability-themed puzzles (5 levels)
  - Sorting Game: Learn proper waste sorting
- **Leaderboard**: Compete globally or by faculty
- **Profile**: Track points, stats, achievements, and play history
- **Streaks**: Maintain daily play streaks for bonus points

### For Admins
- User management (view, edit, delete users)
- Platform statistics
- Game analytics
- Role management

## 🏗️ Tech Stack

### Backend
- **Language**: Python 3.9+
- **Framework**: Flask 3.0
- **Database**: SQLite with 4 tables (users, quiz_questions, game_scores, user_stats)
- **Authentication**: JWT tokens with bcrypt password hashing
- **API**: RESTful JSON API

### Frontend
- **Languages**: HTML5, CSS3, JavaScript ES6+
- **No frameworks**: Pure JavaScript for maximum compatibility
- **Responsive Design**: Mobile-first approach
- **API Integration**: Fetch API for backend communication

## 📁 Project Structure

```
KopiO-Sustainable-Society-Project/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── auth.py             # Authentication logic
│   ├── games.py            # Game APIs
│   ├── leaderboard.py      # Leaderboard APIs
│   ├── profile.py          # Profile APIs
│   ├── admin.py            # Admin APIs
│   ├── config.py           # Configuration
│   ├── database.py         # Database initialization
│   ├── requirements.txt    # Python dependencies
│   └── .env.example        # Environment variables template
├── frontend/
│   ├── html/               # HTML pages (15 pages)
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript files
│   │   ├── api-config.js   # API configuration
│   │   ├── auth.js         # Authentication UI
│   │   ├── quiz_game.js    # Quiz game logic
│   │   ├── memory_game.js  # Memory game logic
│   │   ├── puzzle_game.js  # Puzzle game logic
│   │   ├── sorting_game.js # Sorting game logic
│   │   ├── leaderboard.js  # Leaderboard UI
│   │   ├── profile.js      # Profile UI
│   │   ├── admin.js        # Admin dashboard
│   │   └── script.js       # Global utilities
│   └── assets/             # Images and media
└── .gitignore
```

## 🚀 Getting Started

### Prerequisites
- Python 3.9 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)
- pip (Python package manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KynKind/KopiO-Sustainable-Society-Project.git
   cd KopiO-Sustainable-Society-Project
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   python database.py  # Initialize database with sample questions
   ```

3. **Configure environment (optional but recommended)**
   ```bash
   cp .env.example .env
   # Edit .env to customize settings
   ```
   
   **For Email Verification (Optional):**
   - Set up SMTP email settings in `.env` to enable actual email sending
   - For Gmail: Generate an App Password at Google Account > Security > 2-Step Verification > App passwords
   - If email is not configured, verification links will be printed to console (development mode)
   
   Example email configuration in `.env`:
   ```env
   MAIL_SERVER=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_DEFAULT_SENDER=noreply@kopio.com
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the backend server**
   ```bash
   python app.py
   ```
   Server will start at `http://localhost:5000`

5. **Open the frontend**
   Open `frontend/html/index.html` in your browser, or use a local web server:
   ```bash
   cd ../frontend
   python -m http.server 3000
   ```
   Then navigate to `http://localhost:3000/html/index.html`

## 🔐 Authentication

### Email Validation
- Only MMU email addresses are allowed to register
- Supported formats: `@mmu.edu.my` and subdomains like `@student.mmu.edu.my`, `@staff.mmu.edu.my`

### Email Verification
- After registration, users must verify their email address
- A verification email is sent with a secure link (valid for 24 hours)
- Users cannot login until their email is verified
- Verification emails can be resent if needed

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

### Creating an Admin Account
1. First register a student account via the registration page
2. Update the role in database:
   ```bash
   cd backend
   sqlite3 kopio.db "UPDATE users SET role='admin' WHERE email='your-email@mmu.edu.my';"
   ```
3. Login again to access admin panel

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify` - Verify JWT token
- `GET /api/auth/me` - Get current user (requires auth)

### Games
- `GET /api/games/quiz/questions` - Get random quiz questions
- `POST /api/games/quiz/submit` - Submit quiz answers
- `POST /api/games/memory/submit` - Submit memory game score
- `POST /api/games/puzzle/submit` - Submit puzzle game score
- `POST /api/games/sorting/submit` - Submit sorting game score

### Leaderboard
- `GET /api/leaderboard/global` - Get global leaderboard
- `GET /api/leaderboard/faculty/:faculty` - Get faculty leaderboard
- `GET /api/leaderboard/search?q=<query>` - Search leaderboard
- `GET /api/leaderboard/top?limit=<n>` - Get top N players
- `GET /api/leaderboard/rank/:userId` - Get user's rank

### Profile
- `GET /api/profile/me` - Get current user profile
- `GET /api/profile/:userId` - Get user profile by ID
- `GET /api/profile/stats` - Get detailed statistics
- `GET /api/profile/achievements` - Get user achievements

### Admin (requires admin role)
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:userId` - Get user details
- `GET /api/admin/stats` - Get platform statistics
- `PUT /api/admin/users/:userId/role` - Update user role
- `DELETE /api/admin/users/:userId` - Delete user
- `PUT /api/admin/users/:userId/password` - Reset user password

## 🎮 Game Scoring

### Quiz Game
- Base: 10 points per correct answer
- Time Bonus: Up to 10 points for speed
- Total: 5 questions per game

### Memory Game
- Base: 50 points
- Move Bonus: Up to 20 points for efficiency
- Time Bonus: Up to 10 points for speed

### Puzzle Game
- Base: 30 points
- Move Bonus: Up to 15 points for efficiency
- Time Bonus: Up to 10 points for speed

### Sorting Game
- Base: 20 points
- Accuracy Bonus: Up to 20 points
- Time Bonus: Up to 10 points

## 📊 Database Schema

### users
- id, email, password_hash, first_name, last_name
- student_id, faculty, role, total_points
- created_at, updated_at

### quiz_questions
- id, question, option_a, option_b, option_c, option_d
- correct_option, fact, difficulty
- created_at

### game_scores
- id, user_id, game_type, score, points_earned
- game_data (JSON), played_at

### user_stats
- id, user_id, quiz_games_played, memory_games_played
- puzzle_games_played, sorting_games_played
- quiz_points, memory_points, puzzle_points, sorting_points
- current_streak, last_played_date

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication (24-hour expiry)
- ✅ Email domain validation
- ✅ Role-based access control
- ✅ CORS configuration
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (HTML escaping)
- ✅ Debug mode disabled by default

## 🔧 Configuration

All configuration is done through environment variables. See `backend/.env.example` for:
- Secret keys (SECRET_KEY, JWT_SECRET_KEY)
- Flask settings (FLASK_ENV, FLASK_DEBUG, PORT)
- CORS origins
- Database path
- Game settings
- JWT token expiration
- Logging configuration

### Production Deployment
1. Generate strong secret keys:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. Set `FLASK_ENV=production` and `FLASK_DEBUG=False`
3. Configure proper CORS_ORIGINS (specific domains, no wildcards)
4. Use HTTPS
5. Consider using PostgreSQL or MySQL instead of SQLite
6. Set up database backups
7. Configure rate limiting at reverse proxy level

## 🐛 Troubleshooting

### Backend Issues

**Port 5000 already in use**
```bash
# Find and kill the process
lsof -ti:5000 | xargs kill
# Or use a different port
PORT=5001 python app.py
```

**Database errors**
```bash
# Reinitialize the database
cd backend
rm kopio.db
python database.py
```

**CORS errors**
- Ensure backend is running
- Check CORS_ORIGINS in .env includes your frontend URL
- For development, you can use `CORS_ORIGINS=*` (not for production)

### Frontend Issues

**API calls failing**
- Verify backend is running at http://localhost:5000
- Check browser console for CORS errors
- Ensure you're logged in (check localStorage for authToken)

**JavaScript files not loading**
- Serve from a web server, not file:// protocol
- Verify all script paths are correct in HTML files

## 🤝 Contributing

This is a student project for MMU Cyberjaya. Contributors should follow the existing code structure and ensure all changes pass security checks.

## 📝 License

This project is created for educational purposes at MMU Cyberjaya.

## 🙏 Acknowledgments

- **Sponsor**: Seng Hung Hygiene Supplies Sdn. Bhd.
- **Institution**: Multimedia University (MMU) Cyberjaya
- **Course**: Sustainable Society Project

## 📧 Contact

For questions or support, please contact the development team through the project's GitHub issues page.

---

**Made with ☕ by Kopi-O Team**
