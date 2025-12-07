// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    const toggleRegPassword = document.getElementById('toggleRegPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const password = document.getElementById('password');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (toggleRegPassword) {
        toggleRegPassword.addEventListener('click', function() {
            const password = document.getElementById('regPassword');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const password = document.getElementById('confirmPassword');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Password strength indicator
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }

    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (validateForm('loginForm')) {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    // Show loading state
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
                    
                    // Call API
                    const response = await apiRequest('/auth/login', {
                        method: 'POST',
                        skipAuth: true,
                        body: JSON.stringify({ email, password })
                    });
                    
                    // Store token and user data
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    
                    showMessage('Login successful! Redirecting...', 'success');
                    
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1000);
                    
                } catch (error) {
                    showMessage(error.message || 'Login failed. Please try again.', 'error');
                    
                    // Reset button
                    const submitBtn = loginForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Sign In';
                }
            }
        });
    }

    // Register form handling
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
                
                // Validate MMU email
                const email = document.getElementById('regEmail').value;
                if (!email.toLowerCase().endsWith('@mmu.edu.my')) {
                    showMessage('Only MMU email addresses (@mmu.edu.my) are allowed', 'error');
                    return;
                }
                
                try {
                    // Show loading state
                    const submitBtn = registerForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.innerHTML;
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
                    
                    // Call API
                    const response = await apiRequest('/auth/register', {
                        method: 'POST',
                        skipAuth: true,
                        body: JSON.stringify({
                            email: email,
                            password: password,
                            firstName: document.getElementById('firstName').value,
                            lastName: document.getElementById('lastName').value,
                            studentId: document.getElementById('studentId').value,
                            faculty: document.getElementById('faculty').value
                        })
                    });
                    
                    // Store token and user data
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('currentUser', JSON.stringify(response.user));
                    
                    showMessage('Account created successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                    
                } catch (error) {
                    showMessage(error.message || 'Registration failed. Please try again.', 'error');
                    
                    // Reset button
                    const submitBtn = registerForm.querySelector('button[type="submit"]');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
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
    }, 4000);
}

// Add these styles to CSS
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

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);