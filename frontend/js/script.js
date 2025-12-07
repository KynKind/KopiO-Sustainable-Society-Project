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

// Check if user is logged in
async function checkAuth() {
    // Skip auth check on public pages
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html') ||
        window.location.pathname.includes('forgot_password.html')) {
        return null;
    }
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    
    // Verify token is still valid
    try {
        const user = await getCurrentUser();
        if (!user) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
            return null;
        }
        
        // Update local storage with latest user data
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return null;
    }
}

// Logout function
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Initialize the page
document.addEventListener('DOMContentLoaded', async function() {
    const user = await checkAuth();
    if (user && user.role === 'admin') {
        document.body.classList.add('user-admin');
    }
});