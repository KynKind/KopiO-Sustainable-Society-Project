// API Configuration
// For PythonAnywhere deployment:
// 1. Add this to your HTML file before loading api-config.js:
//    <script>window.PYTHONANYWHERE_USERNAME = 'YOUR_PYTHONANYWHERE_USERNAME';</script>
// 2. Replace 'YOUR_PYTHONANYWHERE_USERNAME' with your actual PythonAnywhere username
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : (window.PYTHONANYWHERE_USERNAME 
        ? `https://${window.PYTHONANYWHERE_USERNAME}.pythonanywhere.com/api`
        : '/api');  // Fallback to relative URL if same domain

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('authToken');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token && !options.skipAuth) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            const error = new Error(data.error || 'Request failed');
            // Pass through additional error properties
            if (data.requiresVerification) error.requiresVerification = true;
            if (data.email) error.email = data.email;
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}

// Get current user from token
async function getCurrentUser() {
    try {
        const data = await apiRequest('/auth/me');
        return data.user;
    } catch (error) {
        return null;
    }
}

// Verify token is still valid
async function verifyToken() {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
        await apiRequest('/auth/me');
        return true;
    } catch (error) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        return false;
    }
}
