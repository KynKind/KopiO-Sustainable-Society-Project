// Leaderboard JavaScript with API Integration

class LeaderboardManager {
    constructor() {
        this.currentFaculty = 'all';
        this.currentPage = 1;
        this.limit = 20;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadLeaderboard();
    }

    setupEventListeners() {
        const facultyFilter = document.getElementById('facultyFilter');
        if (facultyFilter) {
            facultyFilter.addEventListener('change', async (e) => {
                this.currentFaculty = e.target.value;
                this.currentPage = 1;
                await this.loadLeaderboard();
            });
        }

        const searchInput = document.getElementById('leaderboardSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    const query = e.target.value.trim();
                    if (query.length >= 2) {
                        await this.searchLeaderboard(query);
                    } else if (query.length === 0) {
                        await this.loadLeaderboard();
                    }
                }, 300);
            });
        }
    }

    async loadLeaderboard() {
        try {
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList) {
                leaderboardList.innerHTML = '<div class="loading">Loading leaderboard...</div>';
            }

            let endpoint = `/leaderboard/global?page=${this.currentPage}&limit=${this.limit}`;
            
            if (this.currentFaculty && this.currentFaculty !== 'all') {
                endpoint = `/leaderboard/faculty/${this.currentFaculty}?page=${this.currentPage}&limit=${this.limit}`;
            }

            const data = await apiRequest(endpoint, { skipAuth: true });
            
            this.renderLeaderboard(data.leaderboard);
            this.updatePagination(data.page, Math.ceil(data.total / data.limit));
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList) {
                leaderboardList.innerHTML = '<div class="error">Failed to load leaderboard. Please try again.</div>';
            }
        }
    }

    async searchLeaderboard(query) {
        try {
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList) {
                leaderboardList.innerHTML = '<div class="loading">Searching...</div>';
            }

            const data = await apiRequest(`/leaderboard/search?q=${encodeURIComponent(query)}`, { skipAuth: true });
            
            this.renderLeaderboard(data.results);
            
        } catch (error) {
            console.error('Error searching leaderboard:', error);
            const leaderboardList = document.getElementById('leaderboardList');
            if (leaderboardList) {
                leaderboardList.innerHTML = '<div class="error">Search failed. Please try again.</div>';
            }
        }
    }

    renderLeaderboard(users) {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;

        if (users.length === 0) {
            leaderboardList.innerHTML = '<div class="no-results">No users found.</div>';
            return;
        }

        leaderboardList.innerHTML = users.map(user => `
            <div class="leaderboard-item">
                <div class="rank ${this.getRankClass(user.rank)}">${user.rank}</div>
                <div class="user-info">
                    <strong>${this.escapeHtml(user.name)}</strong>
                    <span>${this.escapeHtml(user.faculty)}</span>
                </div>
                <div class="user-stats">
                    <span><i class="fas fa-gamepad"></i> ${user.gamesPlayed} games</span>
                    <span><i class="fas fa-fire"></i> ${user.currentStreak} day streak</span>
                </div>
                <div class="user-points">${user.totalPoints.toLocaleString()} pts</div>
            </div>
        `).join('');
    }

    getRankClass(rank) {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        return '';
    }

    updatePagination(currentPage, totalPages) {
        const pagination = document.getElementById('pagination');
        if (!pagination || totalPages <= 1) {
            if (pagination) pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        if (currentPage > 1) {
            html += `<button class="btn btn-secondary" onclick="leaderboardManager.goToPage(${currentPage - 1})">Previous</button>`;
        }
        
        html += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;
        
        if (currentPage < totalPages) {
            html += `<button class="btn btn-secondary" onclick="leaderboardManager.goToPage(${currentPage + 1})">Next</button>`;
        }
        
        pagination.innerHTML = html;
    }

    async goToPage(page) {
        this.currentPage = page;
        await this.loadLeaderboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Load top players for homepage
async function loadTopPlayers() {
    try {
        const data = await apiRequest('/leaderboard/top?limit=3', { skipAuth: true });
        
        const topWinners = document.querySelector('.top-winners');
        if (!topWinners || !data.topPlayers || data.topPlayers.length === 0) return;

        // Update the winners display
        const players = data.topPlayers;
        
        if (players[0]) {
            const winner1 = topWinners.querySelector('.winner-1 .winner-info');
            if (winner1) {
                winner1.querySelector('h3').textContent = players[0].name;
                winner1.querySelector('.winner-faculty').textContent = players[0].faculty;
                winner1.querySelector('.winner-points').textContent = `${players[0].totalPoints.toLocaleString()} pts`;
            }
        }
        
        if (players[1]) {
            const winner2 = topWinners.querySelector('.winner-2 .winner-info');
            if (winner2) {
                winner2.querySelector('h3').textContent = players[1].name;
                winner2.querySelector('.winner-faculty').textContent = players[1].faculty;
                winner2.querySelector('.winner-points').textContent = `${players[1].totalPoints.toLocaleString()} pts`;
            }
        }
        
        if (players[2]) {
            const winner3 = topWinners.querySelector('.winner-3 .winner-info');
            if (winner3) {
                winner3.querySelector('h3').textContent = players[2].name;
                winner3.querySelector('.winner-faculty').textContent = players[2].faculty;
                winner3.querySelector('.winner-points').textContent = `${players[2].totalPoints.toLocaleString()} pts`;
            }
        }
        
    } catch (error) {
        console.error('Error loading top players:', error);
    }
}

// Load homepage leaderboard preview
async function loadLeaderboardPreview() {
    try {
        const data = await apiRequest('/leaderboard/top?limit=3', { skipAuth: true });
        
        const previewContainer = document.querySelector('.leaderboard-preview');
        if (!previewContainer || !data.topPlayers) return;

        previewContainer.innerHTML = data.topPlayers.map((player, index) => `
            <div class="leaderboard-item">
                <div class="rank rank-${index + 1}">${index + 1}</div>
                <div class="user-info">
                    <strong>${player.name}</strong>
                    <span>${player.faculty}</span>
                </div>
                <div class="user-points">${player.totalPoints.toLocaleString()} pts</div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading leaderboard preview:', error);
    }
}

// Initialize leaderboard manager when DOM is loaded
let leaderboardManager;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize on leaderboard page
    if (document.getElementById('leaderboardList')) {
        leaderboardManager = new LeaderboardManager();
    }
    
    // Load top players on leaderboard page
    if (document.querySelector('.top-winners')) {
        loadTopPlayers();
    }
    
    // Load preview on homepage
    if (document.querySelector('.leaderboard-preview')) {
        loadLeaderboardPreview();
    }
});
