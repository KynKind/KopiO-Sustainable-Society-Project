// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is authenticated and is admin
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!currentUser.id || currentUser.role !== 'admin') {
        alert('Access denied. Admin privileges required.');
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
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalGames').textContent = stats.totalGames || 0;
        document.getElementById('totalPoints').textContent = stats.totalPoints || 0;
        document.getElementById('activeUsers').textContent = stats.activeUsers || 0;
        
        // Display top faculties if there's a section for it
        const topFacultiesContainer = document.getElementById('topFaculties');
        if (topFacultiesContainer && stats.topFaculties) {
            topFacultiesContainer.innerHTML = stats.topFaculties.map(f => 
                `<div class="faculty-item">
                    <span class="faculty-name">${f.faculty}</span>
                    <span class="faculty-points">${f.totalPoints} points</span>
                </div>`
            ).join('');
        }
        
        // Display games by type
        const gamesByTypeContainer = document.getElementById('gamesByType');
        if (gamesByTypeContainer && stats.gamesByType) {
            gamesByTypeContainer.innerHTML = Object.entries(stats.gamesByType).map(([type, count]) => 
                `<div class="game-stat">
                    <span class="game-type">${type}</span>
                    <span class="game-count">${count}</span>
                </div>`
            ).join('');
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
        
        result.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(String(user.id))}</td>
                <td>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.faculty)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td>${escapeHtml(String(user.totalPoints))}</td>
                <td>${escapeHtml(String(user.gamesPlayed))}</td>
                <td class="action-buttons">
                </td>
            `;
            
            // Add action buttons with event listeners (safer than inline onclick)
            const actionsCell = row.querySelector('.action-buttons');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-small btn-primary';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => viewUserDetails(user.id));
            actionsCell.appendChild(viewBtn);
            
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-small btn-warning';
            roleBtn.textContent = 'Change Role';
            roleBtn.addEventListener('click', () => changeUserRole(user.id, user.role));
            actionsCell.appendChild(roleBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            actionsCell.appendChild(deleteBtn);
            
            usersTableBody.appendChild(row);
        });
        
        // Update pagination if exists
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
}

async function searchUsers(query) {
    // Filter users based on search query
    try {
        const result = await apiRequest(`/admin/users?page=1&limit=50`);
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
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(String(user.id))}</td>
                <td>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.faculty)}</td>
                <td>${escapeHtml(user.role)}</td>
                <td>${escapeHtml(String(user.totalPoints))}</td>
                <td>${escapeHtml(String(user.gamesPlayed))}</td>
                <td class="action-buttons">
                </td>
            `;
            
            const actionsCell = row.querySelector('.action-buttons');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn btn-small btn-primary';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => viewUserDetails(user.id));
            actionsCell.appendChild(viewBtn);
            
            const roleBtn = document.createElement('button');
            roleBtn.className = 'btn btn-small btn-warning';
            roleBtn.textContent = 'Change Role';
            roleBtn.addEventListener('click', () => changeUserRole(user.id, user.role));
            actionsCell.appendChild(roleBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-small btn-danger';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));
            actionsCell.appendChild(deleteBtn);
            
            usersTableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error searching users:', error);
        showMessage('Search failed', 'error');
    }
}

function updatePagination(currentPage, totalPages) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;
    
    paginationContainer.innerHTML = '';
    
    for (let i = 1; i <= Math.min(totalPages, 10); i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'btn btn-primary' : 'btn';
        pageBtn.onclick = () => loadUsersList(i);
        paginationContainer.appendChild(pageBtn);
    }
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
