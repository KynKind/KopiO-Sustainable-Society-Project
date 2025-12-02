// Main Navigation and Utilities
const API_BASE_URL = 'http://localhost:5000/api';

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }));
}

// Game Card Animations
document.addEventListener('DOMContentLoaded', function() {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
});

// Simple Form Validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ff4444';
            isValid = false;
        } else {
            input.style.borderColor = '#E0D3B8';
        }
    });

    return isValid;
}

// Points Animation
function animatePoints(element, newPoints) {
    const pointsElement = document.getElementById(element);
    if (!pointsElement) return;

    let currentPoints = parseInt(pointsElement.textContent) || 0;
    const increment = Math.ceil((newPoints - currentPoints) / 30);
    let current = currentPoints;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= newPoints) || (increment < 0 && current <= newPoints)) {
            current = newPoints;
            clearInterval(timer);
        }
        pointsElement.textContent = current.toLocaleString();
    }, 50);
}

// Local Storage Helper Functions
function saveToLocalStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

// Check if user is logged in and redirect if not
function checkAuth(redirectToLogin = true) {
    const token = localStorage.getItem('token');
    const user = getFromLocalStorage('currentUser');
    
    if (!token || !user) {
        // Don't redirect from login/register pages
        const currentPage = window.location.pathname;
        const authPages = ['/login.html', '/register.html', '/forgot_password.html'];
        
        if (redirectToLogin && !authPages.some(page => currentPage.includes(page))) {
            window.location.href = 'login.html';
        }
        return null;
    }
    
    return user;
}

// Get current user with token
function getCurrentUser() {
    return {
        user: getFromLocalStorage('currentUser'),
        token: localStorage.getItem('token')
    };
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', data = null, requiresAuth = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
        method,
        headers,
        credentials: 'include'
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            // Handle authentication errors
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = 'login.html';
            }
            throw new Error(result.error || `API error: ${response.status}`);
        }
        
        return result;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
}

// Submit game score to backend
async function submitGameScore(gameType, score, timeSpent = 0, level = 1, details = {}) {
    try {
        const result = await apiRequest('/games/submit', 'POST', {
            game_type: gameType,
            score: score,
            time_spent: timeSpent,
            level: level,
            details: details
        });
        
        if (result.success) {
            // Update local user points
            const user = getFromLocalStorage('currentUser');
            if (user) {
                user.points = result.total_points;
                saveToLocalStorage('currentUser', user);
            }
            
            return result;
        }
    } catch (error) {
        console.error('Failed to submit game score:', error);
        // Fallback to localStorage
        const user = getFromLocalStorage('currentUser');
        if (user) {
            user.points = (user.points || 0) + score;
            saveToLocalStorage('currentUser', user);
        }
        return { success: false, error: error.message };
    }
}

// Get leaderboard from backend
async function getLeaderboard(faculty = null, limit = 10) {
    try {
        let url = `/games/leaderboard?limit=${limit}`;
        if (faculty && faculty !== 'all') {
            url += `&faculty=${faculty}`;
        }
        
        const result = await apiRequest(url, 'GET', null, false);
        
        if (result.success) {
            return result.leaderboard;
        }
        return [];
    } catch (error) {
        console.error('Failed to get leaderboard:', error);
        return [];
    }
}

// Update navbar based on user role
function updateNavbar() {
    const user = getFromLocalStorage('currentUser');
    const adminLink = document.querySelector('.admin-only');
    
    if (user && user.is_admin && adminLink) {
        adminLink.style.display = 'block';
    } else if (adminLink) {
        adminLink.style.display = 'none';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Update navbar
    updateNavbar();
    
    // Check auth on pages that require it
    const currentPage = window.location.pathname;
    const protectedPages = [
        'index.html', 'leaderboard.html', 'my_profile.html', 'admin.html',
        'quiz_game.html', 'memory_game.html', 'sorting_game.html', 'puzzle_game.html'
    ];
    
    if (protectedPages.some(page => currentPage.includes(page))) {
        checkAuth(true);
    }
});