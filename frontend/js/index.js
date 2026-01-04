// Homepage data loader + navbar fix
document.addEventListener('DOMContentLoaded', async function() {
    // --- Navbar login/profile fix ---
    const authBtn = document.getElementById('authBtn');
    const userGreeting = document.getElementById('userGreeting');

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user')); // assumes 'user' object stored on login
    if (user && user.username) {
        authBtn.textContent = 'Profile';
        authBtn.href = 'my_profile.html';
        userGreeting.textContent = `Hi, ${user.username}`;
    } else {
        authBtn.textContent = 'Login';
        authBtn.href = 'login.html';
        userGreeting.textContent = '';
    }

    // --- Original homepage code ---
    await loadHomeStats();
    await loadTopPlayers();
    await loadChallenges();
});

// Utility function to escape HTML and prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Existing functions remain unchanged
async function loadHomeStats() {
    try {
        const stats = await apiRequest('/public/stats', { skipAuth: true });
        const totalPlayers = document.getElementById('heroTotalPlayers');
        if (totalPlayers) totalPlayers.textContent = stats.totalUsers?.toLocaleString() || '0';
        const totalPoints = document.getElementById('heroTotalPoints');
        if (totalPoints) totalPoints.textContent = stats.totalPoints?.toLocaleString() || '0';
        const gamesToday = document.getElementById('heroGamesToday');
        if (gamesToday) gamesToday.textContent = stats.totalGames?.toLocaleString() || '0';
    } catch (error) {
        console.error('Error loading home stats:', error);
        document.getElementById('heroTotalPlayers').textContent = '0';
        document.getElementById('heroTotalPoints').textContent = '0';
        document.getElementById('heroGamesToday').textContent = '0';
    }
}

async function loadTopPlayers() {
    try {
        const data = await apiRequest('/leaderboard/top?limit=3', { skipAuth: true });
        const container = document.getElementById('topPlayersPreview');
        if (!data.users || data.users.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">No players yet. Be the first to play and earn points!</p>';
            return;
        }
        container.innerHTML = data.users.map((user, index) => `
            <div class="leaderboard-item">
                <div class="rank rank-${index + 1}">${index + 1}</div>
                <div class="user-info">
                    <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
                    <span>${escapeHtml(user.faculty)}</span>
                </div>
                <div class="user-points">${user.totalPoints.toLocaleString()} pts</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading top players:', error);
        const container = document.getElementById('topPlayersPreview');
        container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">Unable to load leaderboard. Please try again later.</p>';
    }
}

async function loadChallenges() {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        const data = await apiRequest('/challenges/daily');

        const loginProgress = document.getElementById('loginProgress');
        const loginStatus = document.getElementById('loginStatus');
        if (loginProgress && loginStatus) {
            if (data.dailyLogin.claimed) {
                loginProgress.style.width = '100%';
                loginProgress.style.backgroundColor = '#4CAF50';
                loginStatus.textContent = '✓ Claimed +10 points';
                loginStatus.style.color = '#4CAF50';
            } else if (data.dailyLogin.completed) {
                loginProgress.style.width = '100%';
                loginStatus.textContent = 'Ready to claim +10 points!';
                loginStatus.style.color = '#D4AF37';
            } else {
                loginProgress.style.width = '0%';
                loginStatus.textContent = '+10 points daily';
            }
        }

        const gameProgress = document.getElementById('gameProgress');
        const gameStatus = document.getElementById('gameStatus');
        if (gameProgress && gameStatus) {
            const progress = (data.playAnyGame.progress / data.playAnyGame.target) * 100;
            gameProgress.style.width = progress + '%';
            if (data.playAnyGame.completed) {
                gameProgress.style.backgroundColor = '#4CAF50';
                gameStatus.textContent = `✓ ${data.playAnyGame.progress}/${data.playAnyGame.target} game - Earned +20 points!`;
                gameStatus.style.color = '#4CAF50';
            } else {
                gameStatus.textContent = `${data.playAnyGame.progress}/${data.playAnyGame.target} game - Earn +20 points!`;
            }
        }

        const streakProgress = document.getElementById('streakProgress');
        const streakStatus = document.getElementById('streakStatus');
        if (streakProgress && streakStatus) {
            const progress = Math.min((data.weeklyStreak.progress / data.weeklyStreak.target) * 100, 100);
            streakProgress.style.width = progress + '%';
            if (data.weeklyStreak.canClaim) {
                streakProgress.style.backgroundColor = '#FFA500';
                streakStatus.textContent = `${data.weeklyStreak.progress}/${data.weeklyStreak.target} days - Claim +${data.weeklyStreak.bonusPoints} bonus!`;
                streakStatus.style.color = '#FFA500';
            } else if (data.weeklyStreak.progress >= data.weeklyStreak.target) {
                streakProgress.style.backgroundColor = '#4CAF50';
                streakStatus.textContent = `✓ ${data.weeklyStreak.progress}/${data.weeklyStreak.target} days - Claimed +${data.weeklyStreak.bonusPoints} bonus!`;
                streakStatus.style.color = '#4CAF50';
            } else {
                streakStatus.textContent = `${data.weeklyStreak.progress}/${data.weeklyStreak.target} days - +${data.weeklyStreak.bonusPoints} points bonus!`;
            }
        }

    } catch (error) {
        console.error('Error loading challenges:', error);
        const loginStatus = document.getElementById('loginStatus');
        const gameStatus = document.getElementById('gameStatus');
        const streakStatus = document.getElementById('streakStatus');
        if (loginStatus) loginStatus.textContent = 'Failed to load';
        if (gameStatus) gameStatus.textContent = 'Failed to load';
        if (streakStatus) streakStatus.textContent = 'Failed to load';
    }
}
