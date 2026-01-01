// Memory Game Logic with Difficulty Levels (FINAL)

class MemoryGame {
    constructor(initialDifficulty = 'medium') {
        // Difficulty configuration
        this.DIFFICULTIES = {
            easy: { pairs: 6, hints: 5 },     // 12 cards
            medium: { pairs: 8, hints: 3 },   // 16 cards
            hard: { pairs: 10, hints: 1 }     // 20 cards
        };

        this.setDifficulty(initialDifficulty);
        this.initializeState();
        this.initializeGame();
    }

    setDifficulty(level) {
        this.difficulty = this.DIFFICULTIES[level] ? level : 'medium';
        this.config = this.DIFFICULTIES[this.difficulty];

        // Backend level mapping
        const levelMap = {
            easy: 1,
            medium: 2,
            hard: 3
        };
        this.currentLevel = levelMap[this.difficulty];
    }

    initializeState() {
        this.cards = this.generateCards();
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.hintsRemaining = this.config.hints;
        this.gameStarted = false;
    }

    generateCards() {
        const allSymbols = [
            '♻️', '🌱', '💧', '🌞', '🌍',
            '🍃', '🚲', '🏠', '🌊', '🌸'
        ];

        const symbols = [];
        allSymbols.slice(0, this.config.pairs).forEach(sym => {
            symbols.push(sym, sym);
        });

        // Shuffle
        for (let i = symbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }

        return symbols.map((symbol, index) => ({
            id: index,
            symbol,
            flipped: false,
            matched: false
        }));
    }

    initializeGame() {
        this.renderCards();
        this.setupEventListeners();
        this.updateStatsUI();
    }

    updateStatsUI() {
        document.getElementById('moveCount').textContent = this.moves;
        document.getElementById('matchCount').textContent = `${this.matchedPairs}/${this.config.pairs}`;
        document.getElementById('memoryTimer').textContent = '0s';

        const hintBtn = document.getElementById('hintButton');
        hintBtn.textContent = `Get Hint (${this.hintsRemaining} left)`;
        hintBtn.disabled = this.hintsRemaining <= 0;
    }

    renderCards() {
        const grid = document.getElementById('memoryGrid');
        grid.innerHTML = '';

        this.cards.forEach(card => {
            const el = document.createElement('div');
            el.className = 'memory-card';
            el.dataset.cardId = card.id;
            el.innerHTML = `
                <div class="front">?</div>
                <div class="back">${card.symbol}</div>
            `;
            grid.appendChild(el);
        });
    }

    setupEventListeners() {
        document.getElementById('memoryGrid').addEventListener('click', e => {
            const cardEl = e.target.closest('.memory-card');
            if (!cardEl) return;

            if (!this.gameStarted) {
                this.startTimer();
                this.gameStarted = true;
            }
            this.handleCardClick(cardEl);
        });

        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });

        document.getElementById('hintButton').addEventListener('click', () => {
            this.useHint();
        });

        document.querySelectorAll('[data-difficulty]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-difficulty]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.resetGame(btn.dataset.difficulty);
            });
        });
    }

    startTimer() {
        if (this.timerInterval) return;
        this.startTime = Date.now();

        this.timerInterval = setInterval(() => {
            const t = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('memoryTimer').textContent = `${t}s`;
        }, 1000);
    }

    resetGame(newDifficulty) {
        if (newDifficulty) this.setDifficulty(newDifficulty);

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.gameStarted = false;

        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) matchInfo.style.display = 'none';

        this.initializeState();
        this.renderCards();
        this.updateStatsUI();
    }

    handleCardClick(cardElement) {
        const card = this.cards.find(c => c.id === +cardElement.dataset.cardId);
        if (card.flipped || card.matched || this.flippedCards.length === 2) return;

        card.flipped = true;
        cardElement.classList.add('flipped');
        this.flippedCards.push({ card, element: cardElement });

        if (this.flippedCards.length === 2) {
            this.moves++;
            document.getElementById('moveCount').textContent = this.moves;
            this.checkMatch();
        }
    }

    checkMatch() {
        const [a, b] = this.flippedCards;
        if (a.card.symbol === b.card.symbol) {
            this.handleMatch(a, b);
        } else {
            setTimeout(() => {
                this.flipBack(a);
                this.flipBack(b);
                this.flippedCards = [];
            }, 1000);
        }
    }

    handleMatch(a, b) {
        a.card.matched = b.card.matched = true;
        a.element.classList.add('matched');
        b.element.classList.add('matched');

        this.matchedPairs++;
        document.getElementById('matchCount').textContent = `${this.matchedPairs}/${this.config.pairs}`;
        this.showMatchInfo(a.card.symbol);
        this.flippedCards = [];

        if (this.matchedPairs === this.config.pairs) this.endGame();
    }

    flipBack(item) {
        item.card.flipped = false;
        item.element.classList.remove('flipped');
    }

    showMatchInfo(symbol) {
        const info = document.getElementById('matchInfo');
        const title = document.getElementById('matchTitle');
        const desc = document.getElementById('matchDescription');

        const data = {
            '♻️': ['Great Match!', 'Recycling helps reduce waste.'],
            '🌱': ['Eco Match!', 'Plants clean our air.'],
            '💧': ['Water Wisdom!', 'Save water for the future.'],
            '🌞': ['Solar Power!', 'Clean renewable energy.'],
            '🌍': ['Earth Lover!', 'Protect our planet.'],
            '🍃': ['Nature Match!', 'Preserve ecosystems.'],
            '🚲': ['Green Transport!', 'Reduce carbon emissions.'],
            '🏠': ['Sustainable Living!', 'Eco-friendly homes.'],
            '🌊': ['Ocean Care!', 'Protect marine life.'],
            '🌸': ['Blooming Planet!', 'Small actions matter.']
        };

        title.textContent = data[symbol]?.[0] || 'Nice!';
        desc.textContent = data[symbol]?.[1] || 'Good match!';
        info.style.display = 'block';

        setTimeout(() => info.style.display = 'none', 3000);
    }

    useHint() {
        if (this.hintsRemaining <= 0) return;

        const map = new Map();
        for (const c of this.cards.filter(c => !c.matched && !c.flipped)) {
            if (map.has(c.symbol)) {
                this.highlightCards([map.get(c.symbol), c]);
                break;
            }
            map.set(c.symbol, c);
        }

        this.hintsRemaining--;
        const btn = document.getElementById('hintButton');
        btn.textContent = `Get Hint (${this.hintsRemaining} left)`;
        btn.disabled = this.hintsRemaining <= 0;
    }

    highlightCards(cards) {
        cards.forEach(c => {
            const el = document.querySelector(`[data-card-id="${c.id}"]`);
            el.style.boxShadow = '0 0 20px var(--accent-gold)';
            setTimeout(() => el.style.boxShadow = '', 2000);
        });
    }

    async endGame() {
        clearInterval(this.timerInterval);
        const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);
        await this.saveScore(timeTaken);
    }

    async saveScore(timeTaken) {
        try {
            const result = await apiRequest('/games/memory/submit', {
                method: 'POST',
                body: JSON.stringify({
                    moves: this.moves,
                    timeTaken,
                    level: this.currentLevel
                })
            });
            this.showGameOverModal(result, timeTaken);
        } catch {
            this.showGameOverModal(null, timeTaken);
        }
    }

    showGameOverModal(result, time) {
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Memory Master 🧠</h2>
                <p>Time: ${time}s</p>
                <p>Moves: ${this.moves}</p>
                <p>Pairs: ${this.matchedPairs}/${this.config.pairs}</p>
                <button onclick="location.reload()">Play Again</button>
                <button onclick="location.href='../html/index.html'">Home</button>
            </div>`;
        document.body.appendChild(modal);
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    new MemoryGame('medium');
});
