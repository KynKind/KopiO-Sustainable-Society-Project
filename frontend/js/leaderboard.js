// Leaderboard JavaScript - UPDATED FOR FLASK BACKEND
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Load leaderboard data
    await loadLeaderboard();
    
    // Setup event listeners
    setupEventListeners();
});

async function loadLeaderboard(faculty = null) {
    try {
        // Show loading
        document.querySelector('.leaderboard-list').innerHTML = '<div style="text-align: center; padding: 2rem;">Loading leaderboard...</div>';
        
        // Get data from Flask backend
        const leaderboard = await getLeaderboard(faculty, 20);
        
        if (leaderboard.length === 0) {
            document.querySelector('.leaderboard-list').innerHTML = '<div style="text-align: center; padding: 2rem;">No data available</div>';
            return;
        }
        
        // Update top 3 winners
        updateTopWinners(leaderboard);
        
        // Update main leaderboard
        updateMainLeaderboard(leaderboard);
        
        // Update current user position
        updateCurrentUserPosition(leaderboard);
        
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
        document.querySelector('.leaderboard-list').innerHTML = '<div style="text-align: center; padding: 2rem; color: #ff4444;">Failed to load leaderboard</div>';
    }
}

function updateTopWinners(leaderboard) {
    const top3 = leaderboard.slice(0, 3);
    
    // Update positions
    const positions = [
        { selector: '.winner-2', rank: 2 },
        { selector: '.winner-1', rank: 1 },
        { selector: '.winner-3', rank: 3 }
    ];
    
    positions.forEach((pos, index) => {
        const winner = document.querySelector(pos.selector);
        if (winner && top3[index]) {
            const user = top3[index];
            
            // Update avatar
            const avatar = winner.querySelector('.winner-avatar');
            if (avatar) {
                avatar.innerHTML = pos.rank === 1 ? '<i class="fas fa-crown"></i>' : '<i class="fas fa-user"></i>';
            }
            
            // Update name
            const nameElement = winner.querySelector('h3');
            if (nameElement) {
                nameElement.textContent = user.name || 'Anonymous';
            }
            
            // Update faculty
            const facultyElement = winner.querySelector('.winner-faculty');
            if (facultyElement) {
                facultyElement.textContent = user.faculty || 'Unknown Faculty';
            }
            
            // Update points
            const pointsElement = winner.querySelector('.winner-points');
            if (pointsElement) {
                pointsElement.textContent = `${user.points} pts`;
            }
            
            // Update rank
            const rankElement = winner.querySelector('.winner-rank');
            if (rankElement) {
                rankElement.textContent = pos.rank;
            }
        }
    });
}

function updateMainLeaderboard(leaderboard) {
    const listContainer = document.querySelector('.leaderboard-list');
    listContainer.innerHTML = '';
    
    // Start from rank 4
    for (let i = 3; i < Math.min(leaderboard.length, 13); i++) {
        const user = leaderboard[i];
        const rank = i + 1;
        
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
            <div class="rank">${rank}</div>
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
                <strong>${user.name || 'Anonymous'}</strong>
                <span>${user.faculty || 'Unknown Faculty'}</span>
            </div>
            <div class="user-points">${user.points} pts</div>
        `;
        
        listContainer.appendChild(item);
    }
}

function updateCurrentUserPosition(leaderboard) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;
    
    // Find current user in leaderboard
    const userIndex = leaderboard.findIndex(u => u.id === currentUser.id);
    
    if (userIndex >= 0) {
        const user = leaderboard[userIndex];
        const rank = userIndex + 1;
        
        // Remove existing current user entry
        const existing = document.querySelector('.current-user');
        if (existing) existing.remove();
        
        // Create current user entry
        const listContainer = document.querySelector('.leaderboard-list');
        const item = document.createElement('div');
        item.className = 'leaderboard-item current-user';
        item.innerHTML = `
            <div class="rank">${rank}</div>
            <div class="user-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-info">
                <strong>You</strong>
                <span>${currentUser.faculty || 'Unknown Faculty'}</span>
            </div>
            <div class="user-points">${currentUser.points} pts</div>
        `;
        
        // Insert at appropriate position or at the end
        if (rank <= 13) {
            // User is in top 13, already shown
        } else {
            // User is beyond top 13, add after the shown list
            listContainer.appendChild(item);
        }
    }
}

function setupEventListeners() {
    // Faculty filter
    const facultyFilter = document.getElementById('facultyFilter');
    if (facultyFilter) {
        facultyFilter.addEventListener('change', function() {
            const faculty = this.value === 'all' ? null : this.value;
            loadLeaderboard(faculty);
        });
    }
    
    // Search functionality
    const playerSearch = document.getElementById('playerSearch');
    if (playerSearch) {
        playerSearch.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const items = document.querySelectorAll('.leaderboard-item');
            
            items.forEach(item => {
                const name = item.querySelector('strong').textContent.toLowerCase();
                const faculty = item.querySelector('span').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || faculty.includes(searchTerm)) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('loadMore');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async function() {
            // For now, just reload with more items
            await loadLeaderboard(document.getElementById('facultyFilter')?.value || null);
        });
    }
}

// Statistics update (mock data for now)
function updateStatistics() {
    const stats = {
        activePlayers: Math.floor(Math.random() * 500) + 1000,
        gamesPlayed: Math.floor(Math.random() * 10000) + 40000,
        totalPoints: Math.floor(Math.random() * 100000) + 120000,
        challengesCompleted: Math.floor(Math.random() * 5000) + 5000
    };
    
    document.querySelectorAll('.stat-content h3').forEach((stat, index) => {
        const values = Object.values(stats);
        if (index < values.length) {
            stat.textContent = values[index].toLocaleString();
        }
    });
}

// Initialize statistics
updateStatistics();