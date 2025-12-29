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
                // Clear player search input when filtering by faculty
                const searchInput = document.getElementById('playerSearch');
                if (searchInput) {
                    searchInput.value = '';
                }
                await this.loadLeaderboard();
            });
        }

        // change leaderboardSearch to playerSearch
        const searchInput = document.getElementById('playerSearch');
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
            // leaderboard-list
            const listContainer = document.querySelector('.leaderboard-list');
            if (listContainer) listContainer.innerHTML = '<div class="loading">Loading...</div>';

            let endpoint = `/leaderboard/global?page=${this.currentPage}&limit=${this.limit}`;
            if (this.currentFaculty && this.currentFaculty !== 'all') {
                // Include pagination when filtering by faculty (use stored faculty value)
                endpoint = `/leaderboard/faculty/${encodeURIComponent(this.currentFaculty)}?page=${this.currentPage}&limit=${this.limit}`;
            }

            const data = await apiRequest(endpoint, { skipAuth: true });
            this.renderLeaderboard(data.leaderboard);
            
            if (data.total && data.limit) {
                this.updatePagination(data.page, Math.ceil(data.total / data.limit));
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async searchLeaderboard(query) {
        try {
            const data = await apiRequest(`/leaderboard/search?q=${encodeURIComponent(query)}`, { skipAuth: true });
            this.renderLeaderboard(data.results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    renderLeaderboard(users) {
        const listContainer = document.querySelector('.leaderboard-list');
        if (!listContainer || !users) return;

        if (users.length === 0) {
            listContainer.innerHTML = '<div class="no-results">No champions found!</div>';
            return;
        }

        listContainer.innerHTML = users.map(user => `
            <div class="leaderboard-item">
                <div class="rank ${user.rank <= 3 ? 'rank-' + user.rank : ''}">${user.rank || '-'}</div>
                <div class="user-avatar"><i class="fas fa-user"></i></div>
                <div class="user-info">
                    <strong>${user.name}</strong>
                    <span>${user.faculty}</span>
                </div>
                <div class="user-stats">
                    <span><i class="fas fa-fire"></i> ${user.currentStreak || 0} streak</span>
                </div>
                <div class="user-points">${user.totalPoints.toLocaleString()} pts</div>
            </div>
        `).join('');
    }

    updatePagination(currentPage, totalPages) {
        const footer = document.querySelector('.leaderboard-footer');
        if (!footer) return;
        if (currentPage < totalPages) {
            footer.innerHTML = `<button class="btn btn-secondary" onclick="leaderboardManager.goToPage(${currentPage + 1})">Load More</button>`;
        } else {
            footer.innerHTML = '<p>End of list</p>';
        }
    }

    async goToPage(page) {
        this.currentPage = page;
        await this.loadLeaderboard();
    }
}

// preview top players
async function loadTopPlayers() {
    try {
        const data = await apiRequest('/leaderboard/top', { skipAuth: true });
        const players = data.topPlayers;

        players.forEach(player => {
            const card = document.querySelector(`.winner-${player.rank}`);
            if (card) {
                card.querySelector('h3').textContent = player.name;
                card.querySelector('.winner-faculty').textContent = player.faculty;
                card.querySelector('.winner-points').textContent = `${player.totalPoints.toLocaleString()} pts`;
            }
        });
    } catch (error) { console.error(error); }
}

let leaderboardManager;
document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.leaderboard-list')) {
        leaderboardManager = new LeaderboardManager();
    }
    if (document.querySelector('.top-winners')) {
        loadTopPlayers();
    }
});