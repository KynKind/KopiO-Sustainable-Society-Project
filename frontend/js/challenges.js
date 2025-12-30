// Daily Challenges JavaScript
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
        alert('Please login to view challenges.');
        window.location.href = 'login.html';
        return;
    }

    // Load challenges
    await loadChallenges();
    
    // Set up event listeners
    setupEventListeners();
});

async function loadChallenges() {
    try {
        const data = await apiRequest('/challenges/daily');
        
        updateDailyLoginChallenge(data.dailyLogin);
        updateGamePlayChallenge(data.playAnyGame);
        updateWeeklyStreakChallenge(data.weeklyStreak);
        
    } catch (error) {
        console.error('Error loading challenges:', error);
        showMessage('Failed to load challenges', 'error');
    }
}

function updateDailyLoginChallenge(challenge) {
    const progressFill = document.getElementById('loginProgressFill');
    const claimBtn = document.getElementById('claimLoginBtn');
    
    if (challenge.claimed) {
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#4CAF50';
        claimBtn.textContent = '✓ Claimed';
        claimBtn.disabled = true;
        claimBtn.classList.add('btn-success');
    } else if (challenge.completed) {
        progressFill.style.width = '100%';
        claimBtn.disabled = false;
        claimBtn.textContent = 'Claim Reward';
    }
}

function updateGamePlayChallenge(challenge) {
    const progressFill = document.getElementById('gameProgressFill');
    const progressText = document.getElementById('gameProgressText');
    const statusBadge = document.getElementById('gameStatusBadge');
    
    const progress = (challenge.progress / challenge.target) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `${challenge.progress}/${challenge.target} game`;
    
    if (challenge.completed) {
        progressFill.style.backgroundColor = '#4CAF50';
        statusBadge.textContent = '✓ Completed';
        statusBadge.classList.add('active');
        statusBadge.style.backgroundColor = '#4CAF50';
    } else {
        statusBadge.textContent = 'Pending';
    }
}

function updateWeeklyStreakChallenge(challenge) {
    const progressFill = document.getElementById('streakProgressFill');
    const progressText = document.getElementById('streakProgressText');
    const claimBtn = document.getElementById('claimStreakBtn');
    const rewardText = document.getElementById('streakReward');
    
    const progress = (challenge.progress / challenge.target) * 100;
    progressFill.style.width = progress + '%';
    progressText.textContent = `${challenge.progress}/${challenge.target} days`;
    
    if (challenge.progress >= challenge.target) {
        progressFill.style.backgroundColor = '#FFA500';
        rewardText.textContent = `${challenge.progress}/7 days - +${challenge.bonusPoints} points bonus!`;
        
        if (challenge.canClaim) {
            claimBtn.disabled = false;
            claimBtn.textContent = 'Claim Bonus';
        } else {
            claimBtn.textContent = '✓ Claimed';
            claimBtn.disabled = true;
            claimBtn.classList.add('btn-success');
        }
    } else {
        rewardText.textContent = `${challenge.progress}/7 days - +${challenge.bonusPoints} points bonus!`;
    }
}

function setupEventListeners() {
    // Claim daily login button
    document.getElementById('claimLoginBtn').addEventListener('click', claimDailyLogin);
    
    // Claim weekly streak button
    document.getElementById('claimStreakBtn').addEventListener('click', claimWeeklyStreak);
}

async function claimDailyLogin() {
    try {
        const result = await apiRequest('/challenges/claim-daily-login', {
            method: 'POST'
        });
        
        showMessage(result.message + ` You earned ${result.pointsEarned} points!`, 'success');
        
        // Reload challenges to update UI
        await loadChallenges();
        
    } catch (error) {
        console.error('Error claiming daily login:', error);
        showMessage(error.message || 'Failed to claim daily login bonus', 'error');
    }
}

async function claimWeeklyStreak() {
    try {
        const result = await apiRequest('/challenges/claim-weekly-streak', {
            method: 'POST'
        });
        
        showMessage(result.message + ` You earned ${result.pointsEarned} points!`, 'success');
        
        // Reload challenges to update UI
        await loadChallenges();
        
    } catch (error) {
        console.error('Error claiming weekly streak:', error);
        showMessage(error.message || 'Failed to claim weekly streak bonus', 'error');
    }
}

function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => messageDiv.remove(), 300);
    }, 4000);
}
