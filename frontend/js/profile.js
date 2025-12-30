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
        
        const dailyPoints = document.querySelector('.points-card:nth-child(4) .points-amount');
        if (dailyPoints) {
            // Calculate daily login or use puzzle points
            const dailyLoginPoints = pointsBreakdown.puzzle || 0;
            dailyPoints.textContent = `${dailyLoginPoints} pts`;
        }

        // Update game performance stats
        this.updateGamePerformance(profile.stats);

        // Render recent activity
        this.renderRecentActivity(profile.recentGames);
    }

    updateGamePerformance(stats) {
        const statItems = document.querySelectorAll('.stat-item');
        
        if (statItems.length >= 4) {
            // Quiz stats
            const quizGames = stats.quizGamesPlayed || 0;
            statItems[0].querySelector('.progress-value').textContent = quizGames > 0 ? '75%' : '0%';
            statItems[0].querySelector('.stat-detail').textContent = `${quizGames} games completed`;
            
            // Memory stats
            const memoryGames = stats.memoryGamesPlayed || 0;
            statItems[1].querySelector('.progress-value').textContent = memoryGames > 0 ? '82%' : '0%';
            statItems[1].querySelector('.stat-detail').textContent = `${memoryGames} games completed`;
            
            // Sorting stats
            const sortingGames = stats.sortingGamesPlayed || 0;
            statItems[2].querySelector('.progress-value').textContent = sortingGames > 0 ? '90%' : '0%';
            statItems[2].querySelector('.stat-detail').textContent = `${sortingGames} games completed`;
            
            // Puzzle stats
            const puzzleGames = stats.puzzleGamesPlayed || 0;
            statItems[3].querySelector('.progress-value').textContent = puzzleGames > 0 ? '68%' : '0%';
            statItems[3].querySelector('.stat-detail').textContent = `${puzzleGames} games completed`;
        }
    }

    renderRecentActivity(games) {
        const activityList = document.querySelector('.activity-list');
        if (!activityList) return;

        if (!games || games.length === 0) {
            activityList.innerHTML = '<p style=\"text-align: center; padding: 2rem; color: #666;\">No recent activity. Start playing to see your history!</p>';
            return;
        }

        activityList.innerHTML = games.map(game => {
            const gameIcon = this.getGameIcon(game.gameType);
            const gameTitle = this.capitalize(game.gameType);
            // Backend now sends ISO format with timezone: "2025-12-30T08:20:43+08:00"
            const timeAgo = this.formatDate(new Date(game.playedAt));
            
            return `
                <div class="activity-item">
                    <div class="activity-icon success">
                        <i class="${gameIcon}"></i>
                    </div>
                    <div class="activity-content">
                        <strong>Completed ${gameTitle} Game</strong>
                        <span>Earned ${game.points} points • ${timeAgo}</span>
                    </div>
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
