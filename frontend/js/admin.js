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

async function loadUsersList(page = 1) {
    try {
        const result = await apiRequest(`/admin/users?page=${page}&limit=20`);
        
        const usersTableBody = document.querySelector('#usersTable tbody');
        if (!usersTableBody) return;
        
        usersTableBody.innerHTML = '';
        
        result.users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td>${user.faculty}</td>
                <td>${user.role}</td>
                <td>${user.totalPoints}</td>
                <td>${user.gamesPlayed}</td>
                <td>
                    <button class="btn btn-small btn-primary" onclick="viewUserDetails(${user.id})">View</button>
                    <button class="btn btn-small btn-warning" onclick="changeUserRole(${user.id}, '${user.role}')">Change Role</button>
                    <button class="btn btn-small btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            `;
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
        
        // Display user details in a modal or dedicated section
        alert(`User Details:\n\nName: ${user.firstName} ${user.lastName}\nEmail: ${user.email}\nStudent ID: ${user.studentId}\nFaculty: ${user.faculty}\nRole: ${user.role}\nTotal Points: ${user.totalPoints}\nGames Played: Quiz: ${user.stats.quizGamesPlayed}, Memory: ${user.stats.memoryGamesPlayed}, Puzzle: ${user.stats.puzzleGamesPlayed}, Sorting: ${user.stats.sortingGamesPlayed}`);
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
                // Filter users locally or make a search API call
                await loadUsersList();
            }
        }, 300));
    }
    
    // Role filter
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.addEventListener('change', async function() {
            await loadUsersList();
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
