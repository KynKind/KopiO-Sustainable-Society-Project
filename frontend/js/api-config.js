// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

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
