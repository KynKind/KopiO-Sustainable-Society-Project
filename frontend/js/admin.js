// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Please login to access the admin dashboard.');
        window.location.href = 'login.html';
        return;
    }

    // Verify current user is admin
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        console.error('Auth error:', error);
        alert('Authentication failed. Please login again.');
        window.location.href = 'login.html';
        return;
    }

    // Load platform statistics
    await loadPlatformStats();
    
    // Load users list
    await loadUsersList();
    
    // Set up event listeners
    setupEventListeners();
});

async function loadPlatformStats() {
    try {
        const stats = await apiRequest('/admin/stats');
        
        // Update statistics on the page
        document.getElementById('totalUsers').textContent = stats.totalUsers?.toLocaleString() || '0';
        document.getElementById('totalGames').textContent = stats.totalGames?.toLocaleString() || '0';
        document.getElementById('totalPoints').textContent = stats.totalPoints?.toLocaleString() || '0';
        document.getElementById('activeUsers').textContent = stats.activeUsers?.toLocaleString() || '0';
        
        // Update stat changes
        const weeklyUsersEl = document.getElementById('weeklyUsers');
        if (weeklyUsersEl && stats.recentRegistrations !== undefined) {
            weeklyUsersEl.textContent = `+${stats.recentRegistrations} this week`;
        }
        
        const avgPointsEl = document.getElementById('avgPoints');
        if (avgPointsEl && stats.averagePointsPerUser !== undefined) {
            avgPointsEl.textContent = `Avg: ${stats.averagePointsPerUser} pts/user`;
        }
        
        const todayGamesEl = document.getElementById('todayGames');
        if (todayGamesEl) {
            if (stats.totalGames === 0) {
                todayGamesEl.textContent = 'No games yet';
                todayGamesEl.classList.remove('positive');
                todayGamesEl.classList.add('neutral');
            } else {
                todayGamesEl.textContent = `${stats.totalGames} total plays`;
            }
        }
        
        // Display top faculties if there's a section for it
        const topFacultiesContainer = document.getElementById('topFaculties');
        if (topFacultiesContainer && stats.topFaculties) {
            topFacultiesContainer.innerHTML = stats.topFaculties.map(f => 
                `<div class="faculty-item">
                    <span class="faculty-name">${escapeHtml(f.faculty)}</span>
                    <span class="faculty-points">${f.totalPoints.toLocaleString()} points</span>
                </div>`
            ).join('');
        }
        
        // Display games by type
        const gamesByTypeContainer = document.getElementById('gamesByType');
        if (gamesByTypeContainer && stats.gamesByType) {
            gamesByTypeContainer.innerHTML = Object.entries(stats.gamesByType).map(([type, count]) => 
                `<div class="game-stat">
                    <span class="game-type">${escapeHtml(type)}</span>
                    <span class="game-count">${count.toLocaleString()}</span>
                </div>`
            ).join('');
        }
        
        // Update Game Analytics - Game Popularity Chart
        const gamePopularityChart = document.getElementById('gamePopularityChart');
        if (gamePopularityChart && stats.gamesByType) {
            const gameTypes = {
                'quiz': 'Quiz',
                'memory': 'Memory',
                'sorting': 'Sorting',
                'puzzle': 'Puzzle'
            };
            
            // Find max value for scaling
            const maxGames = Math.max(...Object.values(stats.gamesByType), 1);
            
            gamePopularityChart.innerHTML = Object.entries(gameTypes).map(([key, label]) => {
                const count = stats.gamesByType[key] || 0;
                const percentage = maxGames > 0 ? Math.max((count / maxGames) * 100, 5) : 5; // Min 5% for visibility
                return `<div class="chart-bar" style="height: ${percentage}%" title="${label}: ${count} games">
                    <span>${label}</span>
                </div>`;
            }).join('');
        }
        
        // Update Activity Metrics
        const activeUsersMetric = document.getElementById('activeUsersMetric');
        if (activeUsersMetric && stats.activeUsers !== undefined) {
            activeUsersMetric.textContent = stats.activeUsers.toLocaleString();
        }
        
        const recentRegistrations = document.getElementById('recentRegistrations');
        if (recentRegistrations && stats.recentRegistrations !== undefined) {
            recentRegistrations.textContent = `+${stats.recentRegistrations}`;
        }
        
        const avgPointsMetric = document.getElementById('avgPointsMetric');
        if (avgPointsMetric && stats.averagePointsPerUser !== undefined) {
            avgPointsMetric.textContent = stats.averagePointsPerUser.toLocaleString(undefined, {maximumFractionDigits: 1});
        }
    } catch (error) {
        console.error('Error loading platform stats:', error);
        showMessage('Failed to load platform statistics', 'error');
    }
}

async function loadUsersList(page = 1, roleFilter = null) {
    try {
        let url = `/admin/users?page=${page}&limit=20`;
        if (roleFilter) {
            url += `&role=${roleFilter}`;
        }
        
        const result = await apiRequest(url);
        
        const usersTableBody = document.querySelector('#usersTable tbody');
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '';
        
        if (!result.users || result.users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
            return;
        }
        
        result.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
                            <span>${escapeHtml(user.email)}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.studentId)}</td>
                <td>${escapeHtml(user.faculty)}</td>
                <td>${user.totalPoints.toLocaleString()}</td>
                <td>${user.gamesPlayed || 0}</td>
                <td><span class="status-badge active">Active</span></td>
                <td>
                    <div class="action-buttons">
                    </div>
                </td>
            `;
            
            // Add action buttons with event listeners (safer than inline onclick)
            const actionsCell = row.querySelector('.action-buttons');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-icon';
            viewBtn.title = 'View Details';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            viewBtn.addEventListener('click', () => viewUserDetails(user.id));
            actionsCell.appendChild(viewBtn);
            
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn-icon';
            roleBtn.title = 'Change Role';
            roleBtn.innerHTML = '<i class="fas fa-user-cog"></i>';
            roleBtn.addEventListener('click', () => changeUserRole(user.id, user.role));
            actionsCell.appendChild(roleBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.title = 'Delete User';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            actionsCell.appendChild(deleteBtn);
            
            usersTableBody.appendChild(row);
        });
        
        // Update user count
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) {
            const start = (page - 1) * result.limit + 1;
            const end = Math.min(page * result.limit, result.total);
            userCountEl.textContent = `Showing ${start}-${end} of ${result.total} users`;
        }
        
        // Update pagination
        updatePagination(result.page, Math.ceil(result.total / result.limit));
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Failed to load users list', 'error');
    }
}

async function viewUserDetails(userId) {
    try {
        const user = await apiRequest(`/admin/users/${userId}`);
        
        // Create a better formatted display instead of alert
        const detailsHtml = `
            <div class="user-details-modal">
                <h3>User Details</h3>
                <div class="detail-row"><strong>Name:</strong> ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</div>
                <div class="detail-row"><strong>Email:</strong> ${escapeHtml(user.email)}</div>
                <div class="detail-row"><strong>Student ID:</strong> ${escapeHtml(user.studentId)}</div>
                <div class="detail-row"><strong>Faculty:</strong> ${escapeHtml(user.faculty)}</div>
                <div class="detail-row"><strong>Role:</strong> ${escapeHtml(user.role)}</div>
                <div class="detail-row"><strong>Total Points:</strong> ${user.totalPoints}</div>
                <h4>Games Played</h4>
                <div class="detail-row">Quiz: ${user.stats.quizGamesPlayed}</div>
                <div class="detail-row">Memory: ${user.stats.memoryGamesPlayed}</div>
                <div class="detail-row">Puzzle: ${user.stats.puzzleGamesPlayed}</div>
                <div class="detail-row">Sorting: ${user.stats.sortingGamesPlayed}</div>
            </div>
        `;
        
        // For now, use alert but with better formatting
        // In production, this should be replaced with a proper modal
        const plainText = `User Details:\n\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nStudent ID: ${user.studentId}\nFaculty: ${user.faculty}\nRole: ${user.role}\nTotal Points: ${user.totalPoints}\n\nGames Played:\nQuiz: ${user.stats.quizGamesPlayed}\nMemory: ${user.stats.memoryGamesPlayed}\nPuzzle: ${user.stats.puzzleGamesPlayed}\nSorting: ${user.stats.sortingGamesPlayed}`;
        alert(plainText);
        
        // TODO: Replace with proper modal in HTML
    } catch (error) {
        console.error('Error viewing user details:', error);
        showMessage('Failed to load user details', 'error');
    }
}

async function changeUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'student' : 'admin';
    
    if (!confirm(`Change user role to ${newRole}?`)) {
        return;
    }
    
    try {
        await apiRequest(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
        });
        
        showMessage('User role updated successfully', 'success');
        await loadUsersList();
    } catch (error) {
        console.error('Error changing user role:', error);
        showMessage(error.message || 'Failed to update user role', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        await apiRequest(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
        
        showMessage('User deleted successfully', 'success');
        await loadUsersList();
        await loadPlatformStats(); // Refresh stats
    } catch (error) {
        console.error('Error deleting user:', error);
        showMessage(error.message || 'Failed to delete user', 'error');
    }
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(async function(e) {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                // Implement actual search
                await searchUsers(query);
            } else if (query.length === 0) {
                // Reset to full list if search is cleared
                await loadUsersList();
            }
        }, 300));
    }
    
    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', async function() {
            const role = this.value;
            await loadUsersList(1, role);
        });
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshStats');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            await loadPlatformStats();
            await loadUsersList();
            showMessage('Data refreshed', 'success');
        });
    }
    
    // Export button
    const exportBtn = document.getElementById('exportReport');
    if (exportBtn) {
        exportBtn.addEventListener('click', async function() {
            try {
                showMessage('Exporting data...', 'info');
                const stats = await apiRequest('/admin/stats');
                const users = await apiRequest('/admin/users?limit=1000');
                
                const data = {
                    exportDate: new Date().toISOString(),
                    platformStats: stats,
                    users: users.users
                };
                
                const dataStr = JSON.stringify(data, null, 2);
                const dataBlob = new Blob([dataStr], {type: 'application/json'});
                const url = URL.createObjectURL(dataBlob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = `kopio-data-export-${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                
                URL.revokeObjectURL(url);
                showMessage('Data exported successfully!', 'success');
            } catch (error) {
                console.error('Export error:', error);
                showMessage('Failed to export data', 'error');
            }
        });
    }
}

async function searchUsers(query) {
    // Filter users based on search query
    try {
        const result = await apiRequest(`/admin/users?page=1&limit=100`);
        const usersTableBody = document.querySelector('#usersTable tbody');
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '';
        
        // Filter users locally
        const filteredUsers = result.users.filter(user => {
            const searchLower = query.toLowerCase();
            return user.firstName.toLowerCase().includes(searchLower) ||
                   user.lastName.toLowerCase().includes(searchLower) ||
                   user.email.toLowerCase().includes(searchLower) ||
                   user.studentId.includes(query);
        });
        
        if (filteredUsers.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found matching your search</td></tr>';
            return;
        }
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="user-info">
                            <strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong>
                            <span>${escapeHtml(user.email)}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(user.studentId)}</td>
                <td>${escapeHtml(user.faculty)}</td>
                <td>${user.totalPoints.toLocaleString()}</td>
                <td>${user.gamesPlayed || 0}</td>
                <td><span class="status-badge active">Active</span></td>
                <td>
                    <div class="action-buttons">
                    </div>
                </td>
            `;
            
            const actionsCell = row.querySelector('.action-buttons');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-icon';
            viewBtn.title = 'View Details';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            viewBtn.addEventListener('click', () => viewUserDetails(user.id));
            actionsCell.appendChild(viewBtn);
            
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn-icon';
            roleBtn.title = 'Change Role';
            roleBtn.innerHTML = '<i class="fas fa-user-cog"></i>';
            roleBtn.addEventListener('click', () => changeUserRole(user.id, user.role));
            actionsCell.appendChild(roleBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-icon';
            deleteBtn.title = 'Delete User';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            actionsCell.appendChild(deleteBtn);
            
            usersTableBody.appendChild(row);
        });
        
        // Update user count
        const userCountEl = document.getElementById('userCount');
        if (userCountEl) {
            userCountEl.textContent = `Showing ${filteredUsers.length} matching users`;
        }
        
        // Hide pagination during search
        const paginationContainer = document.getElementById('pagination');
        if (paginationContainer) {
            paginationContainer.innerHTML = '';
        }
    } catch (error) {
        console.error('Error searching users:', error);
        showMessage('Search failed', 'error');
    }
}

function updatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-icon';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) loadUsersList(currentPage - 1);
    });
    paginationContainer.appendChild(prevBtn);
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(pageInfo);
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-icon';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) loadUsersList(currentPage + 1);
    });
    paginationContainer.appendChild(nextBtn);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showMessage(message, type) {
    // Reuse the showMessage function from script.js if available
    if (typeof window.showMessage === 'function') {
        window.showMessage(message, type);
    } else {
        alert(message);
    }
}

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
