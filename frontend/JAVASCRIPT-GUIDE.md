# JavaScript Architecture Guide

This document explains the JavaScript file structure and which scripts should be used on which pages.

## ⚠️ IMPORTANT: Script Usage Rules

### Core Scripts (Used on ALL pages)
- **api-config.js**: API configuration and base URL settings
- **script.js**: Common functionality (navigation, auth state, mobile menu)

### Page-Specific Scripts

| HTML File | Specific JS File | Purpose |
|-----------|-----------------|---------|
| `index.html` | `index.js` | Homepage stats, top players preview (top 3), challenges preview |
| `leaderboard.html` | `leaderboard.js` | Full leaderboard with filtering, search, pagination |
| `my_profile.html` | `profile.js` | User profile management and statistics |
| `challenges.html` | `challenges.js` | Daily challenges and rewards management |
| `admin.html` | `admin.js` | Admin panel functionality |
| `login.html` | `auth.js` | Login functionality |
| `register.html` | `auth.js` | Registration functionality |
| `forgot_password.html` | `auth.js` | Password reset functionality |
| `quiz_game.html` | `quiz_game.js` | Quiz game logic |
| `memory_game.html` | `memory_game.js` | Memory game logic |
| `puzzle_game.html` | `puzzle_game.js` | Puzzle game logic |
| `sorting_game.html` | `sorting_game.js` | Sorting game logic |

## 🚫 Common Mistakes to Avoid

### ❌ DO NOT use `leaderboard.js` on `index.html`
**Why?** `leaderboard.js` is designed for the full leaderboard page with:
- Complete user list with pagination
- Faculty filtering
- Search functionality
- Detailed rankings

The homepage only needs a preview of the top 3 players, which is handled by `index.js`.

### ❌ DO NOT use `index.js` on `leaderboard.html`
**Why?** `index.js` is designed for the homepage and provides:
- Homepage statistics (total players, total points, games today)
- Top 3 players preview only
- Daily challenges preview

The full leaderboard page needs the complete `leaderboard.js` functionality.

## 📋 Script Loading Order

Always maintain this order:
1. **api-config.js** (must be loaded first - defines API settings)
2. **[page-specific].js** (the specialized script for that page)
3. **script.js** (common functionality - should be last)

### Example for index.html:
```html
<script src="../js/api-config.js"></script>
<script src="../js/index.js"></script>
<script src="../js/script.js"></script>
```

### Example for leaderboard.html:
```html
<script src="../js/api-config.js"></script>
<script src="../js/leaderboard.js"></script>
<script src="../js/script.js"></script>
```

## 🔍 How to Identify the Correct Script

1. **Look at the HTML page name** - usually matches the JS file name
2. **Check what elements the page has**:
   - Has `id="topPlayersPreview"` + `id="heroTotalPlayers"` → use `index.js`
   - Has `id="leaderboardTable"` + `id="facultyFilter"` → use `leaderboard.js`
3. **Read the comments** in the HTML file near the `<script>` tags

## 🛠️ Merge Conflict Resolution

If you encounter a merge conflict in script tags:

1. **Identify the page**: Is it `index.html` or `leaderboard.html`?
2. **Choose the correct script**:
   - For `index.html` → keep `index.js`
   - For `leaderboard.html` → keep `leaderboard.js`
3. **Never mix them** - each page has its own specialized script

### Example Conflict Resolution:
```html
<<<<<<< branch-a
    <script src="../js/leaderboard.js"></script>
=======
    <script src="../js/index.js"></script>
>>>>>>> branch-b
```

**If in index.html** → Choose `index.js`
**If in leaderboard.html** → Choose `leaderboard.js`

## 📞 Need Help?

- Check this guide first
- Look at the HTML comments near script tags
- Compare with other similar pages
- If still unsure, ask for clarification before making changes

---

**Last Updated**: 2025-12-30
**Maintainer**: Kopi-O Development Team
