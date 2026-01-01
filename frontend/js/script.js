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

// Show toast message function
function showMessage(message, type) {
    // Inject CSS animations if not already present
    if (!document.getElementById('toast-animations')) {
        const style = document.createElement('style');
        style.id = 'toast-animations';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove existing messages
    const existingMessage = document.querySelector('.message-toast');
    if (existingMessage) {
        existingMessage.remove();
    }

    const toast = document.createElement('div');
    toast.className = `message-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#00C851' : '#ff4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius-small);
        box-shadow: var(--shadow);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 6000);
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Initialize the page - consolidated DOMContentLoaded
document.addEventListener('DOMContentLoaded', async function() {
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
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('fade-in');
    });
    
    // Check authentication
    await checkAuth();
});