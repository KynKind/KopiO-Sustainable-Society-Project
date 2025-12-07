# Kopi-O Sustainable Society Project

A web app for MMU students to learn sustainability through games and compete on leaderboards.

## 🚀 Quick Start (2 Minutes)

### 1. Clone & Setup
```bash
git clone https://github.com/KynKind/KopiO-Sustainable-Society-Project.git
cd KopiO-Sustainable-Society-Project
```

### 2. Start Backend (Terminal 1)
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### 3. Start Frontend (Terminal 2)
```bash
cd frontend
python -m http.server 3000
```

### 4. Open Browser
```
http://localhost:3000/html/login.html
```

---

## 🔐 Login Credentials

| Account | Email | Password |
|---------|-------|----------|
| Student | `demo.student@student.mmu.edu.my` | `Student123!` |
| Admin | `admin@student.mmu.edu.my` | `Admin123!` |

---

## 📝 Register Your Own Account

1. Go to: `http://localhost:3000/html/register.html`
2. Use any MMU email (`@student.mmu.edu.my` or `@mmu.edu.my`)
3. Password must have: 8+ chars, uppercase, lowercase, number, special char
4. Click Register → You're logged in immediately!

---

## 🎮 Features

- **4 Games**: Quiz, Memory, Puzzle, Sorting
- **Leaderboard**: Compete with other students
- **Profile**: Track your points and achievements
- **Admin Panel**: Manage users (admin only)

---

## 🗂️ Project Structure

```
KopiO-Sustainable-Society-Project/
├── backend/
│   ├── app.py           # Main Flask server
│   ├── auth.py          # Login/Register
│   ├── database.py      # SQLite database
│   └── requirements.txt
├── frontend/
│   ├── html/            # All pages
│   ├── css/             # Styles
│   └── js/              # JavaScript
```

---

## 🔧 Troubleshooting

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill
```

### Reset database
```bash
cd backend
rm -f kopio.db
python app.py
```

### CORS errors
Make sure backend is running on port 5000 before opening the frontend.

---

## 📧 Contact

For issues, use GitHub Issues page.

---

**Made with ☕ by Kopi-O Team | MMU Cyberjaya**