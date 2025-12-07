// Sorting Game Logic with API Integration
class SortingGame {
    constructor() {
        this.currentRound = 1;
        this.score = 0;
        this.timer = 120;
        this.startTime = Date.now();
        this.timerInterval = null;
        this.items = this.generateItems();
        this.draggedItem = null;
        this.totalItemsSorted = 0;
        this.totalCorrectSorts = 0;
        
        this.initializeGame();
    }

    generateItems() {
        return [
            // Plastic items
            { id: 1, name: "Plastic Bottle", type: "plastic", image: "🥤" },
            { id: 2, name: "Plastic Container", type: "plastic", image: "🍶" },
            { id: 3, name: "Plastic Bag", type: "plastic", image: "🛍️" },
            
            // Paper items
            { id: 4, name: "Newspaper", type: "paper", image: "📰" },
            { id: 5, name: "Cardboard Box", type: "paper", image: "📦" },
            { id: 6, name: "Office Paper", type: "paper", image: "📄" },
            
            // Glass items
            { id: 7, name: "Glass Bottle", type: "glass", image: "🍾" },
            { id: 8, name: "Glass Jar", type: "glass", image: "🫙" },
            { id: 9, name: "Broken Glass", type: "glass", image: "⚗️" },
            
            // Organic items
            { id: 10, name: "Apple Core", type: "organic", image: "🍎" },
            { id: 11, name: "Banana Peel", type: "organic", image: "🍌" },
            { id: 12, name: "Egg Shells", type: "organic", image: "🥚" }
        ];
    }

    initializeGame() {
        this.renderItems();
        this.setupEventListeners();
        this.startTimer();
    }

    renderItems() {
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';

        // Shuffle items
        const shuffledItems = [...this.items].sort(() => Math.random() - 0.5);

        shuffledItems.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'sort-item';
            itemElement.setAttribute('data-item-id', item.id);
            itemElement.setAttribute('draggable', 'true');
            itemElement.innerHTML = `
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">${item.image}</div>
                <div style="font-size: 0.8rem;">${item.name}</div>
            `;

            container.appendChild(itemElement);
        });
    }

    setupEventListeners() {
        // Drag and drop events
        document.querySelectorAll('.sort-item').forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        document.querySelectorAll('.bin').forEach(bin => {
            bin.addEventListener('dragover', this.handleDragOver.bind(this));
            bin.addEventListener('drop', this.handleDrop.bind(this));
        });

        // Check answers button
        document.getElementById('checkSorting').addEventListener('click', () => {
            this.checkAnswers();
        });

        // Next round button
        document.getElementById('nextRound').addEventListener('click', () => {
            this.nextRound();
        });
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer--;
            document.getElementById('sortTimer').textContent = `${this.timer}s`;
            
            if (this.timer <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    handleDragStart(e) {
        this.draggedItem = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-item-id'));
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('active');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('active');
        
        const itemId = e.dataTransfer.getData('text/plain');
        const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
        const binType = e.currentTarget.getAttribute('data-type');
        
        if (itemElement) {
            const binContent = e.currentTarget.querySelector('.bin-content');
            binContent.appendChild(itemElement);
            
            // Update item position in data
            const item = this.items.find(i => i.id == itemId);
            if (item) {
                item.currentBin = binType;
            }
        }
    }

    checkAnswers() {
        let correct = 0;
        let total = this.items.length;

        this.items.forEach(item => {
            const isCorrect = item.currentBin === item.type;
            const binElement = document.querySelector(`[data-type="${item.currentBin}"]`);
            const itemElement = document.querySelector(`[data-item-id="${item.id}"]`);

            if (binElement && itemElement) {
                if (isCorrect) {
                    binElement.classList.add('correct');
                    itemElement.style.background = 'linear-gradient(135deg, #00C851, #007E33)';
                    correct++;
                } else {
                    binElement.classList.add('incorrect');
                    itemElement.style.background = 'linear-gradient(135deg, #ff4444, #cc0000)';
                    
                    // Show correct bin
                    const correctBin = document.querySelector(`[data-type="${item.type}"]`);
                    if (correctBin) {
                        correctBin.classList.add('correct');
                    }
                }
            }
        });

        // Track totals for API
        this.totalCorrectSorts += correct;
        this.totalItemsSorted += total;

        // Calculate score
        const roundScore = Math.floor((correct / total) * 100);
        this.score += roundScore;
        
        // Update UI
        document.getElementById('sortScore').textContent = this.score;
        document.getElementById('itemCount').textContent = `${correct}/${total}`;

        // Show results
        this.showResults(correct, total, roundScore);

        // Disable further sorting
        document.querySelectorAll('.sort-item').forEach(item => {
            item.setAttribute('draggable', 'false');
        });

        document.getElementById('checkSorting').disabled = true;
        document.getElementById('nextRound').style.display = 'inline-block';
    }

    showResults(correct, total, roundScore) {
        const message = document.createElement('div');
        message.className = 'results-message';
        message.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--light-cream);
            padding: 2rem;
            border-radius: var(--radius-large);
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            border: 3px solid var(--accent-gold);
        `;

        const accuracy = Math.round((correct / total) * 100);
        message.innerHTML = `
            <h3 style="color: var(--dark-brown); margin-bottom: 1rem;">Round ${this.currentRound} Complete!</h3>
            <div style="font-size: 4rem; margin-bottom: 1rem;">${accuracy}%</div>
            <p style="color: var(--text-dark); margin-bottom: 0.5rem;">${correct} out of ${total} items sorted correctly</p>
            <p style="color: var(--primary-brown); font-weight: 700; font-size: 1.2rem;">+${roundScore} points</p>
            <button id="closeResults" class="btn" style="margin-top: 1.5rem;">Continue</button>
        `;

        document.body.appendChild(message);

        document.getElementById('closeResults').addEventListener('click', () => {
            document.body.removeChild(message);
        });
    }

    nextRound() {
        if (this.currentRound >= 3) {
            this.endGame();
            return;
        }

        this.currentRound++;
        
        // Generate new items for next round
        this.items = this.generateItems();
        
        // Reset bins
        document.querySelectorAll('.bin').forEach(bin => {
            bin.classList.remove('correct', 'incorrect', 'active');
            bin.querySelector('.bin-content').innerHTML = '';
        });

        // Reset items container
        this.renderItems();
        this.setupEventListeners();

        // Update UI
        document.getElementById('checkSorting').disabled = false;
        document.getElementById('nextRound').style.display = 'none';
        document.getElementById('itemCount').textContent = `0/${this.items.length}`;

        // Add event listeners to new items
        this.setupEventListeners();
    }

    async endGame() {
        clearInterval(this.timerInterval);
        
        const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);
        
        await this.saveScore(timeTaken);
    }

    async showGameOverModal(result) {
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        const points = result ? result.points : this.score;
        const accuracy = result ? result.accuracy : 0;
        const accuracyBonus = result ? result.accuracyBonus : 0;
        const timeBonus = result ? result.timeBonus : 0;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--light-cream);
                padding: 3rem;
                border-radius: var(--radius-large);
                text-align: center;
                max-width: 500px;
                width: 90%;
            ">
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Sorting Champion! 🗑️</h2>
                <div class="final-stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 1rem;">
                        ${points} Points
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Rounds Completed: ${this.currentRound}/3</p>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Accuracy: ${Math.round(accuracy)}%</p>
                    ${accuracyBonus > 0 ? `<p style="color: var(--primary-brown);">Accuracy Bonus: +${accuracyBonus} pts!</p>` : ''}
                    ${timeBonus > 0 ? `<p style="color: var(--primary-brown);">Time Bonus: +${timeBonus} pts!</p>` : ''}
                </div>
                <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="playAgain" class="btn">Play Again</button>
                    <button id="backToHome" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('playAgain').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    async saveScore(timeTaken) {
        try {
            const result = await apiRequest('/games/sorting/submit', {
                method: 'POST',
                body: JSON.stringify({
                    correctSorts: this.totalCorrectSorts,
                    totalItems: this.totalItemsSorted,
                    timeTaken: timeTaken,
                    level: 1
                })
            });
            
            // Update local user data
            const user = await getCurrentUser();
            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
            this.showGameOverModal(result);
            
        } catch (error) {
            console.error('Error saving score:', error);
            showMessage('Failed to save score. Please try again.', 'error');
            // Still show game over modal with default data
            this.showGameOverModal(null);
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    new SortingGame();
});