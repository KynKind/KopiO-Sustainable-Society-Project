// Profile JavaScript - UPDATED FOR FLASK BACKEND
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        // Show auth section, hide profile
        document.getElementById('authSection').style.display = 'block';
        document.querySelectorAll('.profile-header, .profile-section').forEach(el => {
            el.style.display = 'none';
        });
        return;
    }
    
    // User is logged in, show profile
    document.getElementById('authSection').style.display = 'none';
    updateProfileData(user);
    setupEventListeners();
    
    // Load user stats (you can implement API call later)
    loadUserStats(user.id);
});

function updateProfileData(user) {
    // Update header
    const nameElement = document.querySelector('.profile-info h1');
    if (nameElement) {
        nameElement.textContent = `${user.first_name} ${user.last_name}`;
    }
    
    const facultyElement = document.querySelector('.profile-faculty');
    if (facultyElement) {
        facultyElement.textContent = user.faculty || 'Unknown Faculty';
    }
    
    const emailElement = document.querySelector('.profile-email');
    if (emailElement) {
        emailElement.textContent = user.email;
    }
    
    const idElement = document.querySelector('.profile-id');
    if (idElement) {
        idElement.textContent = `Student ID: ${user.student_id || 'N/A'}`;
    }
    
    // Update stats
    updateProfileStats(user);
}

function updateProfileStats(user) {
    const stats = [
        { element: '.profile-stat:nth-child(1) strong', value: user.points || 0 },
        { element: '.profile-stat:nth-child(2) strong', value: '15' }, // Global rank - would need API
        { element: '.profile-stat:nth-child(3) strong', value: '87' }, // Games played - would need API
        { element: '.profile-stat:nth-child(4) strong', value: '7' }   // Day streak - would need API
    ];
    
    stats.forEach(stat => {
        const element = document.querySelector(stat.element);
        if (element) {
            element.textContent = stat.value.toLocaleString();
        }
    });
}

async function loadUserStats(userId) {
    try {
        // This would call your backend API to get user statistics
        // For now, using mock data
        const stats = {
            quizAccuracy: 75,
            memoryMatches: 82,
            sortingAccuracy: 90,
            puzzleCompletion: 68,
            quizPoints: 650,
            memoryPoints: 280,
            sortingPoints: 220,
            loginPoints: 100
        };
        
        // Update progress circles
        updateProgressCircles(stats);
        
        // Update points breakdown
        updatePointsBreakdown(stats);
        
        // Load recent activity
        loadRecentActivity(userId);
        
    } catch (error) {
        console.error('Failed to load user stats:', error);
    }
}

function updateProgressCircles(stats) {
    const progressItems = [
        { selector: '.stat-item:nth-child(1) .progress-value', value: stats.quizAccuracy },
        { selector: '.stat-item:nth-child(2) .progress-value', value: stats.memoryMatches },
        { selector: '.stat-item:nth-child(3) .progress-value', value: stats.sortingAccuracy },
        { selector: '.stat-item:nth-child(4) .progress-value', value: stats.puzzleCompletion }
    ];
    
    progressItems.forEach(item => {
        const element = document.querySelector(item.selector);
        if (element) {
            element.textContent = `${item.value}%`;
            
            // Update circular progress visual
            const progressCircle = element.closest('.circular-progress');
            if (progressCircle) {
                progressCircle.style.setProperty('--progress', `${item.value}%`);
            }
        }
    });
}

function updatePointsBreakdown(stats) {
    const pointsItems = [
        { selector: '.points-card:nth-child(1) .points-amount', value: stats.quizPoints },
        { selector: '.points-card:nth-child(2) .points-amount', value: stats.memoryPoints },
        { selector: '.points-card:nth-child(3) .points-amount', value: stats.sortingPoints },
        { selector: '.points-card:nth-child(4) .points-amount', value: stats.loginPoints }
    ];
    
    pointsItems.forEach(item => {
        const element = document.querySelector(item.selector);
        if (element) {
            element.textContent = `${item.value} pts`;
        }
    });
}

async function loadRecentActivity(userId) {
    try {
        // This would call your backend API
        // For now, using static data
        const activities = [
            {
                type: 'quiz',
                icon: 'fa-question-circle',
                title: 'Completed Sustainability Quiz',
                points: 50,
                time: '2 hours ago'
            },
            {
                type: 'login',
                icon: 'fa-fire',
                title: 'Daily Login Bonus',
                points: 10,
                time: '1 day ago'
            },
            {
                type: 'memory',
                icon: 'fa-lightbulb',
                title: 'Memory Game Completed',
                points: 25,
                time: '2 days ago'
            }
        ];
        
        const activityList = document.querySelector('.activity-list');
        if (activityList) {
            activityList.innerHTML = '';
            
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon success">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <strong>${activity.title}</strong>
                        <span>Earned ${activity.points} points • ${activity.time}</span>
                    </div>
                `;
                activityList.appendChild(item);
            });
        }
        
    } catch (error) {
        console.error('Failed to load recent activity:', error);
    }
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });
    }
    
    // Deactivate account button
    const deactivateBtn = document.getElementById('deactivateBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to deactivate your account? This action cannot be undone.')) {
                // Call backend API to deactivate account
                alert('Account deactivation requested. Please check your email for verification.');
            }
        });
    }
}