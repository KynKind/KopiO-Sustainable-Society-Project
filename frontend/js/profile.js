// Profile JavaScript with API Integration

class ProfileManager {
    constructor() {
        this.init();
    }

    async init() {
        await this.loadProfile();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logout();
            });
        }
    }

    async loadProfile() {
        try {
            // Show loading state
            const profileContainer = document.querySelector('.profile-container');
            if (profileContainer) {
                profileContainer.style.opacity = '0.5';
            }

            const data = await apiRequest('/profile/me');
            
            this.renderProfile(data);
            await this.loadStats();
            
            // Remove loading state
            if (profileContainer) {
                profileContainer.style.opacity = '1';
            }
            
        } catch (error) {
            console.error('Error loading profile:', error);
            showMessage('Failed to load profile data', 'error');
        }
    }

    renderProfile(profile) {
        // Update profile header
        const profileName = document.querySelector('.profile-info h1');
        if (profileName) {
            profileName.textContent = `${profile.firstName} ${profile.lastName}`;
        }

        const profileFaculty = document.querySelector('.profile-faculty');
        if (profileFaculty) {
            profileFaculty.textContent = profile.faculty;
        }

        const profileEmail = document.querySelector('.profile-email');
        if (profileEmail) {
            profileEmail.textContent = profile.email;
        }

        const profileId = document.querySelector('.profile-id');
        if (profileId) {
            profileId.textContent = `Student ID: ${profile.studentId}`;
        }

        // Update stats
        const stats = document.querySelectorAll('.profile-stat');
        if (stats.length >= 4) {
            stats[0].querySelector('strong').textContent = profile.totalPoints.toLocaleString();
            stats[1].querySelector('strong').textContent = profile.globalRank;
            stats[2].querySelector('strong').textContent = profile.stats.totalGamesPlayed;
            stats[3].querySelector('strong').textContent = profile.currentStreak;
        }

        // Update points breakdown
        const pointsBreakdown = profile.pointsBreakdown;
        
        const quizPoints = document.querySelector('.points-card:nth-child(1) .points-amount');
        if (quizPoints) quizPoints.textContent = `${pointsBreakdown.quiz} pts`;
        
        const memoryPoints = document.querySelector('.points-card:nth-child(2) .points-amount');
        if (memoryPoints) memoryPoints.textContent = `${pointsBreakdown.memory} pts`;
        
        const sortingPoints = document.querySelector('.points-card:nth-child(3) .points-amount');
        if (sortingPoints) sortingPoints.textContent = `${pointsBreakdown.sorting} pts`;
        
        const puzzlePoints = document.querySelector('.points-card:nth-child(4) .points-amount');
        if (puzzlePoints) puzzlePoints.textContent = `${pointsBreakdown.puzzle} pts`;

        // Render recent games
        this.renderRecentGames(profile.recentGames);
    }

    renderRecentGames(games) {
        const container = document.getElementById('recentGames');
        if (!container) return;

        if (!games || games.length === 0) {
            container.innerHTML = '<p>No games played yet. Start playing to see your history!</p>';
            return;
        }

        container.innerHTML = games.map(game => {
            const date = new Date(game.playedAt);
            const gameIcon = this.getGameIcon(game.gameType);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${gameIcon}"></i>
                    </div>
                    <div class="activity-info">
                        <strong>${this.capitalize(game.gameType)} Game</strong>
                        <span>${this.formatDate(date)}</span>
                    </div>
                    <div class="activity-points">+${game.points} pts</div>
                </div>
            `;
        }).join('');
    }

    async loadStats() {
        try {
            const data = await apiRequest('/profile/stats');
            this.renderDetailedStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    renderDetailedStats(stats) {
        // Update games played by type
        const gamesPlayed = stats.gamesPlayed;
        
        // You can add more detailed stats visualization here if needed
        console.log('Detailed stats:', stats);
    }

    getGameIcon(gameType) {
        const icons = {
            'quiz': 'fas fa-question-circle',
            'memory': 'fas fa-lightbulb',
            'puzzle': 'fas fa-puzzle-piece',
            'sorting': 'fas fa-recycle'
        };
        return icons[gameType] || 'fas fa-gamepad';
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString();
    }
}

// Initialize profile manager when DOM is loaded
let profileManager;

document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.profile-container')) {
        profileManager = new ProfileManager();
    }
});
