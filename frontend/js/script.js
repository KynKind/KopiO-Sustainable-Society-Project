// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-link').forEach(n => n.addEventListener('click', () => {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
}));

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

// Update navbar based on auth state
function updateNavbar(user) {
    const authBtn = document.getElementById('authBtn');
    const userGreeting = document.getElementById('userGreeting');
    
    if (user) {
        document.body.classList.add('logged-in');
        if (authBtn) {
            authBtn.textContent = 'Logout';
            authBtn.href = '#';
            authBtn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
        if (userGreeting) {
            const displayName = user.firstName || (user.email && user.email.includes('@') ? user.email.split('@')[0] : 'User');
            userGreeting.textContent = `Hi, ${displayName}!`;
        }
        if (user.role === 'admin') {
            document.body.classList.add('user-admin');
        }
    } else {
        document.body.classList.remove('logged-in');
        document.body.classList.remove('user-admin');
        if (authBtn) {
            authBtn.textContent = 'Login';
            authBtn.href = 'login.html';
            authBtn.onclick = null;
        }
        if (userGreeting) {
            userGreeting.textContent = '';
        }
    }
}

// Check if user is logged in
async function checkAuth() {
    const token = localStorage.getItem('authToken');
    
    // If on public pages, just update navbar state without redirecting
    const isPublicPage = window.location.pathname.includes('login.html') || 
                        window.location.pathname.includes('register.html') ||
                        window.location.pathname.includes('forgot_password.html') ||
                        window.location.pathname.includes('index.html') ||
                        window.location.pathname.includes('leaderboard.html') ||
                        window.location.pathname.includes('about.html') ||
                        window.location.pathname.includes('contact.html') ||
                        window.location.pathname.includes('how_to_play.html') ||
                        window.location.pathname.includes('sponsorship.html');
    
    if (!token) {
        if (!isPublicPage) {
            window.location.href = 'login.html';
        }
        return null;
    }
    
    // Verify token is still valid
    try {
        const user = await getCurrentUser();
        if (!user) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            updateNavbar(null);
            if (!isPublicPage) {
                window.location.href = 'login.html';
            }
            return null;
        }
        
        // Update local storage with latest user data
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    } catch (error) {
        console.error('Auth check error:', error);
        // Don't clear auth on network errors for public pages
        if (isPublicPage) {
            // Keep the cached user data on public pages if it's just a network issue
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    return JSON.parse(storedUser);
                } catch (e) {
                    // If parse fails, clear everything
                }
            }
        }
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        updateNavbar(null);
        if (!isPublicPage) {
            window.location.href = 'login.html';
        }
        return null;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Show message to user (for notifications and errors)
function showMessage(message, type = 'info') {
    // Create message element if it doesn't exist
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; max-width: 400px;';
        document.body.appendChild(messageContainer);
    }
    
    // Create message box
    const messageBox = document.createElement('div');
    messageBox.className = `message-box message-${type}`;
    messageBox.style.cssText = `
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        background: ${type === 'error' ? '#fee' : type === 'success' ? '#efe' : '#eef'};
        border: 1px solid ${type === 'error' ? '#c33' : type === 'success' ? '#3c3' : '#33c'};
        color: ${type === 'error' ? '#c33' : type === 'success' ? '#363' : '#336'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    messageBox.textContent = message;
    
    // Add to container
    messageContainer.appendChild(messageBox);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageBox.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            messageBox.remove();
        }, 300);
    }, 5000);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    // Update navbar state immediately from localStorage to prevent flicker
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('currentUser');
    
    if (token && storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user && user.id) {
                updateNavbar(user);
            }
        } catch (e) {
            console.error('Error parsing stored user:', e);
        }
    }
    
    // Then verify with server (but don't let it override the immediate update)
    const verifiedUser = await checkAuth();
    
    // If verification succeeded with different data, update again
    if (verifiedUser && verifiedUser.id) {
        updateNavbar(verifiedUser);
    }
});