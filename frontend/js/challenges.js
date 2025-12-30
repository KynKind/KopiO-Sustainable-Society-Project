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
        console.log('=== LOADING CHALLENGES ===');
        console.log('Making API request to /challenges/daily');
        const data = await apiRequest('/challenges/daily');
        console.log('=== API RESPONSE RECEIVED ===');
        console.log('Full data:', JSON.stringify(data, null, 2));
        
        if (!data) {
            console.error('No data received from API!');
            showMessage('No data received from server', 'error');
            return;
        }
        
        console.log('Updating daily login challenge...');
        updateDailyLoginChallenge(data.dailyLogin);
        
        console.log('Updating game play challenge...');
        updateGamePlayChallenge(data.playAnyGame);
        
        console.log('Updating weekly streak challenge...');
        updateWeeklyStreakChallenge(data.weeklyStreak);
        
        console.log('=== ALL CHALLENGES UPDATED ===');
        
    } catch (error) {
        console.error('=== ERROR LOADING CHALLENGES ===');
        console.error('Error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        showMessage('Failed to load challenges: ' + error.message, 'error');
    }
}

function updateDailyLoginChallenge(challenge) {
    console.log('Updating daily login challenge:', challenge);
    const card = document.getElementById('dailyLoginCard');
    const progressFill = document.getElementById('loginProgressFill');
    const claimBtn = document.getElementById('claimLoginBtn');
    const pointsReward = card.querySelector('.points-reward');
    
    console.log('Button element:', claimBtn);
    console.log('Button disabled before update:', claimBtn.disabled);
    
    if (challenge.claimed) {
        console.log('Challenge already claimed');
        card.classList.remove('ready-to-claim');
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#4CAF50';
        claimBtn.textContent = '✓ Claimed';
        claimBtn.disabled = true;
        claimBtn.classList.add('btn-success');
        claimBtn.style.cursor = 'not-allowed';
        pointsReward.classList.remove('ready');
        pointsReward.textContent = '✓ Claimed today';
    } else if (challenge.completed) {
        console.log('Challenge ready to claim - enabling button');
        card.classList.add('ready-to-claim');
        progressFill.style.width = '100%';
        progressFill.style.backgroundColor = '#FFA500';
        claimBtn.disabled = false;
        claimBtn.classList.remove('btn-success');
        claimBtn.textContent = '🎁 Claim Reward';
        claimBtn.style.background = '#FFA500';
        claimBtn.style.cursor = 'pointer';
        claimBtn.style.pointerEvents = 'auto';
        claimBtn.style.opacity = '1';
        pointsReward.classList.add('ready');
        pointsReward.textContent = 'Ready to claim +10 points!';
        console.log('Button disabled after update:', claimBtn.disabled);
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
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    const claimBtn = document.getElementById('claimLoginBtn');
    console.log('Claim button element:', claimBtn);
    
    // Claim daily login button
    claimBtn.addEventListener('click', function(e) {
        console.log('Button clicked!', e);
        claimDailyLogin();
    });
    
    // Claim weekly streak button
    document.getElementById('claimStreakBtn').addEventListener('click', claimWeeklyStreak);
    
    console.log('Event listeners set up successfully');
}

async function claimDailyLogin() {
    console.log('claimDailyLogin function called');
    try {
        console.log('Sending claim request...');
        const result = await apiRequest('/challenges/claim-daily-login', {
            method: 'POST'
        });
        
        console.log('Claim result:', result);
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
