// Sorting Game Logic with API Integration
class SortingGame {
    constructor() {
        this.currentRound = 1;
        this.score = 0;

        // ✅ per round timer (reset every round)
        this.timer = 120;
        this.startTime = Date.now();
        this.timerInterval = null;

        // ✅ Pool = 50 items
        this.poolItems = this.generateItemsPool();

        // ✅ This round items (12 random from pool)
        this.items = this.getRandomRoundItems();

        this.draggedItem = null;
        this.totalItemsSorted = 0;
        this.totalCorrectSorts = 0;

        this.initializeGame();
    }

    // ✅ 50 items pool
    generateItemsPool() {
        return [
            // --- Plastic (13) ---
            { name: "Plastic Bottle", type: "plastic", image: "🥤" },
            { name: "Plastic Container", type: "plastic", image: "🍶" },
            { name: "Plastic Bag", type: "plastic", image: "🛍️" },
            { name: "Plastic Cup", type: "plastic", image: "🥛" },
            { name: "Shampoo Bottle", type: "plastic", image: "🧴" },
            { name: "Food Tray", type: "plastic", image: "🍱" },
            { name: "Plastic Straw", type: "plastic", image: "🧃" },
            { name: "Plastic Spoon/Fork", type: "plastic", image: "🥄" },
            { name: "Bubble Wrap", type: "plastic", image: "🫧" },
            { name: "Water Jug", type: "plastic", image: "🚰" },
            { name: "Plastic Packaging", type: "plastic", image: "📦" },
            { name: "Detergent Bottle", type: "plastic", image: "🧼" },
            { name: "Plastic Lid", type: "plastic", image: "🫙" },

            // --- Paper (13) ---
            { name: "Newspaper", type: "paper", image: "📰" },
            { name: "Cardboard Box", type: "paper", image: "📦" },
            { name: "Office Paper", type: "paper", image: "📄" },
            { name: "Magazine", type: "paper", image: "📚" },
            { name: "Paper Bag", type: "paper", image: "🛍️" },
            { name: "Envelope", type: "paper", image: "✉️" },
            { name: "Notebook", type: "paper", image: "📓" },
            { name: "Tissue Box", type: "paper", image: "🧻" },
            { name: "Paper Cup Sleeve", type: "paper", image: "☕" },
            { name: "Receipt", type: "paper", image: "🧾" },
            { name: "Paper Plate", type: "paper", image: "🍽️" },
            { name: "Paper Carton", type: "paper", image: "🧃" },
            { name: "Wrapping Paper", type: "paper", image: "🎁" },

            // --- Glass (12) ---
            { name: "Glass Bottle", type: "glass", image: "🍾" },
            { name: "Glass Jar", type: "glass", image: "🫙" },
            { name: "Broken Glass", type: "glass", image: "⚗️" },
            { name: "Perfume Bottle", type: "glass", image: "🧴" },
            { name: "Sauce Bottle", type: "glass", image: "🥫" },
            { name: "Wine Glass", type: "glass", image: "🍷" },
            { name: "Drinking Glass", type: "glass", image: "🥃" },
            { name: "Glass Cup", type: "glass", image: "☕" },
            { name: "Jam Jar", type: "glass", image: "🍓" },
            { name: "Pickle Jar", type: "glass", image: "🥒" },
            { name: "Olive Oil Bottle", type: "glass", image: "🫒" },
            { name: "Glass Vase", type: "glass", image: "🏺" },

            // --- Organic (12) ---
            { name: "Apple Core", type: "organic", image: "🍎" },
            { name: "Banana Peel", type: "organic", image: "🍌" },
            { name: "Egg Shells", type: "organic", image: "🥚" },
            { name: "Vegetable Scraps", type: "organic", image: "🥬" },
            { name: "Coffee Grounds", type: "organic", image: "☕" },
            { name: "Tea Leaves", type: "organic", image: "🍵" },
            { name: "Fruit Peels", type: "organic", image: "🍊" },
            { name: "Bread Crumbs", type: "organic", image: "🍞" },
            { name: "Fish Bones", type: "organic", image: "🐟" },
            { name: "Chicken Bones", type: "organic", image: "🍗" },
            { name: "Leaves", type: "organic", image: "🍂" },
            { name: "Leftover Rice", type: "organic", image: "🍚" }
        ].map((item, idx) => ({
            id: idx + 1,
            ...item
        }));
    }

    // ✅ Pick 12 random items from pool for each round
    getRandomRoundItems() {
        const shuffled = [...this.poolItems].sort(() => Math.random() - 0.5);
        const chosen = shuffled.slice(0, 12);
        return chosen.map(it => ({ ...it, currentBin: undefined }));
    }

    initializeGame() {
        this.renderItems();
        this.setupEventListeners();
        this.startTimer();

        document.getElementById('itemCount').textContent = `0/${this.items.length}`;
        document.getElementById('sortScore').textContent = this.score;
        document.getElementById('sortTimer').textContent = `${this.timer}s`;

        // 默认 nextRound 不显示（等 check 后才显示）
        document.getElementById('nextRound').style.display = 'none';
    }

    renderItems() {
        const container = document.getElementById('itemsContainer');
        container.innerHTML = '';

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
        document.querySelectorAll('.sort-item').forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        document.querySelectorAll('.bin').forEach(bin => {
            bin.addEventListener('dragover', this.handleDragOver.bind(this));
            bin.addEventListener('drop', this.handleDrop.bind(this));
        });

        document.getElementById('checkSorting').addEventListener('click', () => {
            this.checkAnswers();
        });

        document.getElementById('nextRound').addEventListener('click', () => {
            this.nextRound();
        });
    }

    // ✅ FIX: 每次 startTimer 先 clear，避免 timer 不走 / 重复 interval
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);

        this.timerInterval = setInterval(() => {
            this.timer--;
            document.getElementById('sortTimer').textContent = `${this.timer}s`;

            if (this.timer <= 0) {
                this.endRoundDueToTime();
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

            const item = this.items.find(i => i.id == itemId);
            if (item) item.currentBin = binType;
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

                    const correctBin = document.querySelector(`[data-type="${item.type}"]`);
                    if (correctBin) correctBin.classList.add('correct');
                }
            }
        });

        this.totalCorrectSorts += correct;
        this.totalItemsSorted += total;

        const roundScore = Math.floor((correct / total) * 100);
        this.score += roundScore;

        document.getElementById('sortScore').textContent = this.score;
        document.getElementById('itemCount').textContent = `${correct}/${total}`;

        this.showResults(correct, total, roundScore);

        document.querySelectorAll('.sort-item').forEach(item => {
            item.setAttribute('draggable', 'false');
        });

        document.getElementById('checkSorting').disabled = true;
        document.getElementById('nextRound').style.display = 'inline-block';
    }

    // ✅ Continue always works
    showResults(correct, total, roundScore) {
        document.querySelectorAll('.results-message').forEach(el => el.remove());

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
            <button class="btn" style="margin-top: 1.5rem;" type="button">Continue</button>
        `;

        document.body.appendChild(message);

        const btn = message.querySelector('button');
        btn.addEventListener('click', () => message.remove());
    }

    // ✅ NEW: 当时间到（这不是 endGame，允许继续 next round 无限玩）
    endRoundDueToTime() {
        clearInterval(this.timerInterval);

        // 禁止继续拖
        document.querySelectorAll('.sort-item').forEach(item => item.setAttribute('draggable', 'false'));
        document.getElementById('checkSorting').disabled = true;
        document.getElementById('nextRound').style.display = 'inline-block';

        // 直接弹一个提示（不改你原 UI，只用 showResults 的风格）
        document.querySelectorAll('.results-message').forEach(el => el.remove());

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
        message.innerHTML = `
            <h3 style="color: var(--dark-brown); margin-bottom: 1rem;">Time's Up! ⏰</h3>
            <p style="color: var(--text-dark); margin-bottom: 0.5rem;">You can go to the next round.</p>
            <button class="btn" style="margin-top: 1.5rem;" type="button">Continue</button>
        `;
        document.body.appendChild(message);

        message.querySelector('button').addEventListener('click', () => message.remove());
    }

    // ✅ Unlimited rounds + timer reset & restart
    nextRound() {
        // ✅ 无限玩：不再限制 currentRound >= 3
        this.currentRound++;

        // ✅ new 12 items each round
        this.items = this.getRandomRoundItems();

        // Reset bins
        document.querySelectorAll('.bin').forEach(bin => {
            bin.classList.remove('correct', 'incorrect', 'active');
            bin.querySelector('.bin-content').innerHTML = '';
        });

        // Reset items container
        this.renderItems();

        // Reset UI
        document.getElementById('checkSorting').disabled = false;
        document.getElementById('nextRound').style.display = 'none';
        document.getElementById('itemCount').textContent = `0/${this.items.length}`;
        document.getElementById('sortScore').textContent = this.score;

        // ✅ FIX: 每次 next round 重置 timer + 重新开始走
        this.timer = 120;
        this.startTime = Date.now();
        document.getElementById('sortTimer').textContent = `${this.timer}s`;
        this.startTimer();

        // Rebind listeners for new items
        this.setupEventListeners();
    }

    // 你原本 endGame 是用来 submit API 的
    // 如果你要“无限 round 也能手动结束并 submit”，你可以之后加一个 End Game 按钮再调用 endGame()
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
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Rounds Completed: ${this.currentRound}</p>
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

            const user = await getCurrentUser();
            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            }

            this.showGameOverModal(result);

        } catch (error) {
            console.error('Error saving score:', error);
            showMessage('Failed to save score. Please try again.', 'error');
            this.showGameOverModal(null);
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function () {
    new SortingGame();
});
