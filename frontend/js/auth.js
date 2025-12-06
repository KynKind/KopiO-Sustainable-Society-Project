// Authentication JavaScript for Flask Backend
const API_BASE_URL = 'http://127.0.0.1:5000/api';

document.addEventListener('DOMContentLoaded', function() {
    // // Password toggle functionality
    // const togglePassword = document.getElementById('togglePassword');
    // const toggleRegPassword = document.getElementById('toggleRegPassword');
    // const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    // if (togglePassword) {
    //     togglePassword.addEventListener('click', function() {
    //         const password = document.getElementById('password');
    //         const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    //         password.setAttribute('type', type);
    //         this.classList.toggle('fa-eye-slash');
    //     });
    // }

    // if (toggleRegPassword) {
    //     toggleRegPassword.addEventListener('click', function() {
    //         const password = document.getElementById('regPassword');
    //         const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    //         password.setAttribute('type', type);
    //         this.classList.toggle('fa-eye-slash');
    //     });
    // }

    // if (toggleConfirmPassword) {
    //     toggleConfirmPassword.addEventListener('click', function() {
    //         const password = document.getElementById('confirmPassword');
    //         const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
    //         password.setAttribute('type', type);
    //         this.classList.toggle('fa-eye-slash');
    //     });
    // }
    // redundant code
    // refactored it to be shorter
    function addPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);

        if (toggle && input) {
            toggle.addEventListener('click', function() {
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                this.classList.toggle('fa-eye-slash');
            });
        }
    }

    // Apply to all password fields
    addPasswordToggle('togglePassword', 'password');
    addPasswordToggle('toggleRegPassword', 'regPassword');
    addPasswordToggle('toggleConfirmPassword', 'confirmPassword');

    // Password strength indicator
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }

    // Login form handling - FLASK VERSION
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Store user data
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    
                    // Redirect based on role
                    if (data.user.is_admin) {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                } else {
                    showMessage(data.error || 'Login failed', 'error');
                }
            } catch (error) {
                console.error('Login error:', error);
                showMessage('Connection error. Make sure Python backend is running (python app.py)', 'error');
            }
        });
    }

    // Register form handling - FLASK VERSION
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (validateRegisterForm()) {
                const password = document.getElementById('regPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                
                if (password !== confirmPassword) {
                    showMessage('Passwords do not match!', 'error');
                    return;
                }

                const userData = {
                    student_id: document.getElementById('studentId').value,
                    email: document.getElementById('regEmail').value,
                    password: password,
                    first_name: document.getElementById('firstName').value,
                    last_name: document.getElementById('lastName').value,
                    faculty: document.getElementById('faculty').value
                };

                try {
                    const response = await fetch(`${API_BASE_URL}/auth/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(userData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessage('Account created successfully! Redirecting...', 'success');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                    } else {
                        showMessage(data.error || 'Registration failed', 'error');
                    }
                } catch (error) {
                    console.error('Registration error:', error);
                    showMessage('Server connection error', 'error');
                }
            }
        });
    }

    // Forgot password form
    const forgotForm = document.getElementById('forgotPasswordForm');
    if (forgotForm) {
        forgotForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm('forgotPasswordForm')) {
                showMessage('Password reset link sent to your email!', 'success');
            }
        });
    }
});

// Submit game score to Flask backend
async function submitGameScore(gameType, score, timeSpent = 0, level = 1, details = {}) {
    try {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!token || !user) {
            console.log('User not logged in, saving to localStorage only');
            // Fallback to localStorage
            user.points = (user?.points || 0) + score;
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: false, message: 'Not logged in' };
        }

        const response = await fetch(`${API_BASE_URL}/games/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                game_type: gameType,
                score: score,
                time_spent: timeSpent,
                level: level,
                details: details
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Update local user data
            user.points = data.total_points;
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log(`✅ ${gameType} score submitted: +${score} points`);
            return data;
        } else {
            throw new Error(data.error || 'Submission failed');
        }
    } catch (error) {
        console.error('Failed to submit score:', error);
        // Fallback to localStorage
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        user.points = (user.points || 0) + score;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { success: false, error: error.message };
    }
}

// Get leaderboard from backend
async function getLeaderboard(faculty = null, limit = 10) {
    try {
        let url = `${API_BASE_URL}/games/leaderboard?limit=${limit}`;
        if (faculty) url += `&faculty=${faculty}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            return data.leaderboard;
        }
        return [];
    } catch (error) {
        console.error('Failed to get leaderboard:', error);
        return [];
    }
}

// Check if user is logged in
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        // If not on login/register page, redirect to login
        if (!window.location.pathname.includes('login.html') && 
            !window.location.pathname.includes('register.html') &&
            !window.location.pathname.includes('forgot_password.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
    return user;
}

// Original helper functions (keep these)
function checkPasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthBar || !strengthText) return;

    let strength = 0;
    let feedback = '';

    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
    if (password.match(/\d/)) strength += 25;
    if (password.match(/[^a-zA-Z\d]/)) strength += 25;

    strengthBar.style.width = strength + '%';

    if (strength < 50) {
        strengthBar.style.background = '#ff4444';
        feedback = 'Weak';
    } else if (strength < 75) {
        strengthBar.style.background = '#ffaa00';
        feedback = 'Medium';
    } else {
        strengthBar.style.background = '#00C851';
        feedback = 'Strong';
    }

    strengthText.textContent = feedback;
}

function validateRegisterForm() {
    const form = document.getElementById('registerForm');
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#ff4444';
            isValid = false;
        } else {
            input.style.borderColor = '#E0D3B8';
        }
    });

    // Check password match
    const password = document.getElementById('regPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
        confirmPassword.style.borderColor = '#ff4444';
        isValid = false;
    }

    // Check terms agreement
    const agreeTerms = document.getElementById('agreeTerms');
    if (agreeTerms && !agreeTerms.checked) {
        showMessage('Please agree to the terms and conditions', 'error');
        isValid = false;
    }

    return isValid;
}

function showMessage(message, type) {
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
    }, 4000);
}

// Inject additional styles
const additionalStyles = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

.message-toast {
    font-weight: 500;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);