// Memory Game Logic with Icons Mode & Words Mode - BIG CARDS VERSION

class MemoryGame {
    constructor(initialDifficulty = 'medium', initialMode = 'icons') {
        // Difficulty configuration
        this.DIFFICULTIES = {
            easy: { pairs: 6, hints: 5 },     // 12 cards (smaller for words mode)
            medium: { pairs: 8, hints: 3 },   // 16 cards
            hard: { pairs: 10, hints: 1 }     // 20 cards
        };

        // Game mode: 'icons' or 'words'
        this.gameMode = initialMode;
        
        // Sustainability icons pool
        this.sustainabilityIcons = [
            '♻️', '🌱', '💧', '🌞', '🌍', '🍃', '🚲', '🏠', '🌊', '🌸',
            '🌳', '🚶', '💨', '🌻', '🔄', '⚡', '💡', '🌿', '☀️', '🌧️',
            '🔋', '🚆', '🌲', '🐝', '🐟', '🦋', '🍎', '🥕', '🏡', '🌎'
        ];
        
        // Sustainability words pool - FULL WORDS (no shortening needed)
        this.sustainabilityWords = [
            {word: "RECYCLE", meaning: "Convert waste into reusable material"},
            {word: "COMPOST", meaning: "Organic waste turned into fertilizer"},
            {word: "RENEWABLE ENERGY", meaning: "Energy from sources that never run out"},
            {word: "BIODEGRADABLE", meaning: "Can break down naturally by bacteria"},
            {word: "SUSTAINABLE", meaning: "Meeting needs without harming future generations"},
            {word: "CONSERVATION", meaning: "Protection of natural resources from harm"},
            {word: "ECOSYSTEM", meaning: "Community of living organisms and environment"},
            {word: "CARBON FOOTPRINT", meaning: "Total greenhouse gases produced"},
            {word: "GREENHOUSE EFFECT", meaning: "Trapping of sun's warmth in atmosphere"},
            {word: "DEFORESTATION", meaning: "Clearing of forest areas for other uses"},
            {word: "BIODIVERSITY", meaning: "Variety of life in an ecosystem"},
            {word: "UP CYCLE", meaning: "Reuse discarded objects in creative ways"},
            {word: "ZERO WASTE", meaning: "No trash sent to landfills or incinerators"},
            {word: "CARBON NEUTRAL", meaning: "Net zero carbon emissions"},
            {word: "FAIR TRADE", meaning: "Fair prices and conditions for producers"},
            {word: "ORGANIC FARMING", meaning: "Grown without synthetic chemicals"},
            {word: "SOLAR POWER", meaning: "Energy from sunlight conversion"},
            {word: "WIND ENERGY", meaning: "Power generated from wind turbines"},
            {word: "HYDROPOWER", meaning: "Electricity from flowing water"},
            {word: "GEOTHERMAL", meaning: "Energy from Earth's internal heat"},
            {word: "CLIMATE CHANGE", meaning: "Long-term shifts in temperatures"},
            {word: "GLOBAL WARMING", meaning: "Earth's rising average temperature"},
            {word: "POLLUTION", meaning: "Harmful substances in environment"},
            {word: "OCEAN ACIDIFICATION", meaning: "Decrease in ocean pH from CO2"},
            {word: "CORAL BLEACHING", meaning: "Coral losing color due to stress"},
            {word: "ENDANGERED SPECIES", meaning: "Species at risk of extinction"},
            {word: "HABITAT LOSS", meaning: "Destruction of natural homes"},
            {word: "MICROPLASTICS", meaning: "Tiny plastic particles in environment"},
            {word: "OVERFISHING", meaning: "Catching fish faster than reproduction"},
            {word: "PERMAFROST", meaning: "Permanently frozen ground layer"},
            {word: "PHOTOSYNTHESIS", meaning: "Plants converting light to energy"},
            {word: "RAINFOREST", meaning: "Dense forest in rainy tropics"},
            {word: "SEA LEVEL RISE", meaning: "Increasing ocean water levels"},
            {word: "WASTE MANAGEMENT", meaning: "Handling of waste materials"},
            {word: "WATER CONSERVATION", meaning: "Saving fresh water resources"}
        ];

        this.setDifficulty(initialDifficulty);
        this.initializeState();
        this.initializeGame();
    }

    setDifficulty(level) {
        this.difficulty = this.DIFFICULTIES[level] ? level : 'medium';
        this.config = this.DIFFICULTIES[this.difficulty];
        this.currentLevel = {easy: 1, medium: 2, hard: 3}[this.difficulty];
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
        this.totalTime = 0;
    }

    generateCards() {
        let items = [];
        
        if (this.gameMode === 'icons') {
            const shuffledIcons = [...this.sustainabilityIcons]
                .sort(() => Math.random() - 0.5)
                .slice(0, this.config.pairs);
            
            shuffledIcons.forEach(icon => items.push(icon, icon));
        } else {
            // For words mode, use fewer pairs since cards are larger
            const adjustedPairs = Math.min(this.config.pairs, 8); // Max 8 pairs for words mode
            const shuffledWords = [...this.sustainabilityWords]
                .sort(() => Math.random() - 0.5)
                .slice(0, adjustedPairs)
                .map(w => w.word);
            
            shuffledWords.forEach(word => items.push(word, word));
        }

        // Shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        return items.map((item, index) => ({
            id: index,
            symbol: item,
            flipped: false,
            matched: false
        }));
    }

    initializeGame() {
        this.createGameContainer();
        this.renderCards();
        this.setupEventListeners();
        this.updateStatsUI();
        this.createModeSwitcher();
    }

    createGameContainer() {
        // Ensure we have the right container structure
        const existingGrid = document.getElementById('memoryGrid');
        if (existingGrid) {
            existingGrid.remove();
        }

        const gameContainer = document.querySelector('.game-container') || 
                             document.querySelector('.memory-game-container') ||
                             document.querySelector('.main-content');

        if (gameContainer) {
            // Create memory grid container
            const gridContainer = document.createElement('div');
            gridContainer.className = 'memory-grid-container';
            gridContainer.style.cssText = `
                display: flex;
                justify-content: center;
                padding: 20px;
                background: var(--light-cream);
                border-radius: var(--radius-medium);
                box-shadow: var(--shadow);
                margin: 20px 0;
                min-height: 500px;
            `;

            const memoryGrid = document.createElement('div');
            memoryGrid.id = 'memoryGrid';
            memoryGrid.style.cssText = `
                display: grid;
                gap: 15px;
                width: 100%;
                max-width: 1000px;
                justify-content: center;
            `;

            gridContainer.appendChild(memoryGrid);
            
            // Insert after mode switcher or at the beginning
            const modeSwitcher = document.querySelector('.game-mode-switcher');
            if (modeSwitcher) {
                gameContainer.insertBefore(gridContainer, modeSwitcher.nextSibling);
            } else {
                gameContainer.insertBefore(gridContainer, gameContainer.firstChild);
            }
        }
    }

    updateGridLayout() {
        const grid = document.getElementById('memoryGrid');
        if (!grid) return;

        const totalCards = this.cards.length;
        let columns, cardSize;
        
        if (this.gameMode === 'icons') {
            // Icons mode - more cards, smaller
            if (this.difficulty === 'easy') {
                columns = 4;
                cardSize = '120px';
            } else if (this.difficulty === 'medium') {
                columns = 5;
                cardSize = '110px';
            } else {
                columns = 6;
                cardSize = '100px';
            }
        } else {
            // Words mode - fewer cards, larger
            if (this.difficulty === 'easy') {
                columns = 3;
                cardSize = '180px';
            } else if (this.difficulty === 'medium') {
                columns = 4;
                cardSize = '160px';
            } else {
                columns = 5;
                cardSize = '140px';
            }
        }

        grid.style.gridTemplateColumns = `repeat(${columns}, ${cardSize})`;
        grid.style.gridTemplateRows = `repeat(auto-fit, ${cardSize})`;
        grid.style.justifyContent = 'center';
    }

    createModeSwitcher() {
        let switcher = document.querySelector('.game-mode-switcher');
        if (!switcher) {
            switcher = document.createElement('div');
            switcher.className = 'game-mode-switcher';
            switcher.style.cssText = `
                display: flex;
                gap: 15px;
                margin: 20px auto;
                justify-content: center;
                max-width: 400px;
                padding: 10px;
                background: var(--light-cream);
                border-radius: var(--radius-medium);
                box-shadow: var(--shadow);
            `;
            
            const container = document.querySelector('.game-container') || 
                             document.querySelector('.game-controls') ||
                             document.querySelector('.main-content');
            
            if (container) {
                container.insertBefore(switcher, container.firstChild);
            }
            
            switcher.innerHTML = `
                <button id="modeIcons" class="mode-btn ${this.gameMode === 'icons' ? 'active' : ''}" 
                        style="flex: 1; padding: 12px 24px; border-radius: 25px; border: 3px solid var(--primary-brown);
                               background: ${this.gameMode === 'icons' ? 'var(--primary-brown)' : 'var(--light-cream)'};
                               color: ${this.gameMode === 'icons' ? 'white' : 'var(--primary-brown)'};
                               cursor: pointer; font-weight: bold; font-size: 1rem;
                               transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-icons"></i> Icons Mode
                </button>
                <button id="modeWords" class="mode-btn ${this.gameMode === 'words' ? 'active' : ''}"
                        style="flex: 1; padding: 12px 24px; border-radius: 25px; border: 3px solid var(--primary-brown);
                               background: ${this.gameMode === 'words' ? 'var(--primary-brown)' : 'var(--light-cream)'};
                               color: ${this.gameMode === 'words' ? 'white' : 'var(--primary-brown)'};
                               cursor: pointer; font-weight: bold; font-size: 1rem;
                               transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fas fa-font"></i> Words Mode
                </button>
            `;
            
            document.getElementById('modeIcons').addEventListener('click', () => {
                if (this.gameMode !== 'icons') {
                    this.gameMode = 'icons';
                    document.getElementById('modeIcons').classList.add('active');
                    document.getElementById('modeWords').classList.remove('active');
                    this.resetGame();
                }
            });
            
            document.getElementById('modeWords').addEventListener('click', () => {
                if (this.gameMode !== 'words') {
                    this.gameMode = 'words';
                    document.getElementById('modeWords').classList.add('active');
                    document.getElementById('modeIcons').classList.remove('active');
                    this.resetGame();
                }
            });
        }
    }

    updateStatsUI() {
        const moveCount = document.getElementById('moveCount');
        const matchCount = document.getElementById('matchCount');
        const memoryTimer = document.getElementById('memoryTimer');
        const hintBtn = document.getElementById('hintButton');
        
        if (moveCount) moveCount.textContent = this.moves;
        if (matchCount) matchCount.textContent = `${this.matchedPairs}/${this.config.pairs}`;
        if (memoryTimer) memoryTimer.textContent = `${this.totalTime}s`;
        if (hintBtn) {
            hintBtn.textContent = `Hint (${this.hintsRemaining})`;
            hintBtn.disabled = this.hintsRemaining <= 0;
        }
    }

    renderCards() {
        const grid = document.getElementById('memoryGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        this.updateGridLayout();
        
        this.cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'memory-card';
            cardElement.dataset.cardId = card.id;
            
            if (this.gameMode === 'icons') {
                cardElement.innerHTML = `
                    <div class="card-front">
                        <div class="card-content">?</div>
                    </div>
                    <div class="card-back">
                        <div class="card-content icon-mode">${card.symbol}</div>
                    </div>
                `;
            } else {
                cardElement.innerHTML = `
                    <div class="card-front">
                        <div class="card-content">?</div>
                    </div>
                    <div class="card-back">
                        <div class="card-content word-mode">${card.symbol}</div>
                    </div>
                `;
            }
            
            // Card container styles
            cardElement.style.cssText = `
                aspect-ratio: 1 / 1;
                perspective: 1000px;
                cursor: pointer;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.6s;
                border-radius: 15px;
                background: transparent;
            `;
            
            const frontBackStyle = `
                position: absolute;
                width: 100%;
                height: 100%;
                backface-visibility: hidden;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 6px 15px rgba(0,0,0,0.1);
                overflow: hidden;
            `;
            
            const front = cardElement.querySelector('.card-front');
            const back = cardElement.querySelector('.card-back');
            
            front.style.cssText = frontBackStyle + `
                background: linear-gradient(135deg, var(--primary-brown), var(--light-brown));
                color: white;
                font-size: ${this.gameMode === 'icons' ? '3rem' : '2rem'};
                font-weight: bold;
            `;
            
            back.style.cssText = frontBackStyle + `
                background: linear-gradient(135deg, var(--secondary-green), #4CAF50);
                color: white;
                transform: rotateY(180deg);
                padding: 15px;
            `;
            
            // Word mode specific styling - LARGER TEXT, BETTER WRAPPING
            if (this.gameMode === 'words') {
                const wordContent = cardElement.querySelector('.word-mode');
                wordContent.style.cssText = `
                    font-size: ${this.getWordFontSize(card.symbol)};
                    font-weight: bold;
                    text-align: center;
                    padding: 10px;
                    line-height: 1.3;
                    word-break: break-word;
                    overflow-wrap: break-word;
                    hyphens: auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    color: black !important;
                `;
            } else {
                const iconContent = cardElement.querySelector('.icon-mode');
                iconContent.style.cssText = `
                    font-size: 4rem;
                `;
            }
            
            grid.appendChild(cardElement);
        });
    }

    getWordFontSize(word) {
        const length = word.length;
        if (length <= 10) return '1.6rem';
        if (length <= 15) return '1.4rem';
        if (length <= 20) return '1.2rem';
        return '1rem';
    }

    setupEventListeners() {
        // Card clicks
        document.getElementById('memoryGrid').addEventListener('click', e => {
            const cardEl = e.target.closest('.memory-card');
            if (!cardEl) return;

            if (!this.gameStarted) {
                this.startTimer();
                this.gameStarted = true;
            }
            this.handleCardClick(cardEl);
        });

        // Game controls
        document.getElementById('resetGame')?.addEventListener('click', () => this.resetGame());
        document.getElementById('hintButton')?.addEventListener('click', () => this.useHint());

        // Difficulty buttons
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
            this.totalTime = Math.floor((Date.now() - this.startTime) / 1000);
            const timerEl = document.getElementById('memoryTimer');
            if (timerEl) timerEl.textContent = `${this.totalTime}s`;
        }, 1000);
    }

    resetGame(newDifficulty = null) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        if (newDifficulty) this.setDifficulty(newDifficulty);

        this.gameStarted = false;
        this.initializeState();
        this.renderCards();
        this.updateStatsUI();
        
        const matchInfo = document.getElementById('matchInfo');
        if (matchInfo) matchInfo.style.display = 'none';
    }

    handleCardClick(cardElement) {
        const cardId = parseInt(cardElement.dataset.cardId);
        const card = this.cards.find(c => c.id === cardId);
        
        if (!card || card.flipped || card.matched || this.flippedCards.length === 2) {
            return;
        }

        card.flipped = true;
        cardElement.style.transform = 'rotateY(180deg)';
        this.flippedCards.push({ card, element: cardElement });

        if (this.flippedCards.length === 2) {
            this.moves++;
            document.getElementById('moveCount').textContent = this.moves;
            setTimeout(() => this.checkMatch(), 300);
        }
    }

    checkMatch() {
        if (this.flippedCards.length !== 2) return;
        
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
        
        // Add matched styling
        a.element.style.boxShadow = '0 0 25px var(--accent-gold)';
        b.element.style.boxShadow = '0 0 25px var(--accent-gold)';
        a.element.style.transform = 'rotateY(180deg) scale(0.95)';
        b.element.style.transform = 'rotateY(180deg) scale(0.95)';
        
        this.matchedPairs++;
        document.getElementById('matchCount').textContent = `${this.matchedPairs}/${this.config.pairs}`;
        
        this.showMatchInfo(a.card.symbol);
        this.flippedCards = [];

        if (this.matchedPairs === this.config.pairs) {
            setTimeout(() => this.endGame(), 500);
        }
    }

    flipBack(item) {
        item.card.flipped = false;
        item.element.style.transform = 'rotateY(0deg)';
        item.element.style.boxShadow = '';
    }

    showMatchInfo(symbol) {
        const info = document.getElementById('matchInfo');
        const title = document.getElementById('matchTitle');
        const desc = document.getElementById('matchDescription');
        
        if (!info || !title || !desc) return;

        let matchTitle = '';
        let matchDesc = '';

        if (this.gameMode === 'icons') {
            const iconData = {
                '♻️': ['Recycling!', 'Reduces landfill waste and conserves resources.'],
                '🌱': ['Plants!', 'Produce oxygen and absorb CO2.'],
                '💧': ['Water!', 'Only 3% of Earth\'s water is freshwater.'],
                '🌞': ['Solar!', 'Clean energy from sunlight.'],
                '🌍': ['Earth!', 'Our only home - protect it!']
            };
            
            matchTitle = iconData[symbol]?.[0] || 'Eco Match!';
            matchDesc = iconData[symbol]?.[1] || 'Good for our planet!';
        } else {
            const wordData = this.sustainabilityWords.find(w => w.word === symbol);
            if (wordData) {
                matchTitle = symbol;
                matchDesc = wordData.meaning;
            } else {
                matchTitle = 'Sustainability!';
                matchDesc = 'Every action counts!';
            }
        }
        
        title.textContent = matchTitle;
        desc.textContent = matchDesc;
        info.style.display = 'block';

        setTimeout(() => {
            if (info) info.style.display = 'none';
        }, 3000);
    }

    useHint() {
        if (this.hintsRemaining <= 0 || this.flippedCards.length > 0) return;

        const unmatchedCards = this.cards.filter(c => !c.matched && !c.flipped);
        const cardMap = new Map();
        
        for (const card of unmatchedCards) {
            if (cardMap.has(card.symbol)) {
                this.highlightCards([cardMap.get(card.symbol), card]);
                this.hintsRemaining--;
                this.updateStatsUI();
                return;
            }
            cardMap.set(card.symbol, card);
        }
        
        if (this.hintsRemaining > 0) {
            this.hintsRemaining--;
            this.updateStatsUI();
        }
    }

    highlightCards(cards) {
        cards.forEach(card => {
            const el = document.querySelector(`[data-card-id="${card.id}"]`);
            if (el) {
                el.style.boxShadow = '0 0 30px gold';
                el.style.transform = 'scale(1.1)';
                
                setTimeout(() => {
                    el.style.boxShadow = '';
                    el.style.transform = '';
                }, 1500);
            }
        });
    }

    async endGame() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.totalTime = Math.floor((Date.now() - this.startTime) / 1000);
        
        await this.saveScore();
    }

    async saveScore() {
        try {
            const result = await apiRequest('/games/memory/submit', {
                method: 'POST',
                body: JSON.stringify({
                    moves: this.moves,
                    timeTaken: this.totalTime,
                    level: this.currentLevel
                })
            });
            
            const user = await getCurrentUser();
            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            }
            
            this.showGameOverModal(result);
            
        } catch (error) {
            console.error('Error saving score:', error);
            this.showGameOverModal(null);
        }
    }

    showGameOverModal(result) {
        // Remove any existing modal
        document.querySelectorAll('.game-over-modal').forEach(m => m.remove());
        
        const modal = document.createElement('div');
        modal.className = 'game-over-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            padding: 20px;
        `;

        const pointsEarned = result ? result.points : Math.floor(100 * (this.config.pairs / (this.moves || 1)));
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--light-cream);
                padding: 30px;
                border-radius: 20px;
                text-align: center;
                max-width: 500px;
                width: 100%;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                border: 3px solid var(--accent-gold);
            ">
                <h2 style="color: var(--dark-brown); margin-bottom: 15px; font-size: 1.8rem;">
                    ${this.gameMode === 'icons' ? '🌿 Memory Champion! 🌿' : '📚 Eco Scholar! 📚'}
                </h2>
                
                <div style="margin: 20px 0;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: bold; margin-bottom: 10px;">
                        ${pointsEarned} Points
                    </div>
                    
                    <div style="background: rgba(139, 69, 19, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0;">
                        <p style="margin: 8px 0;"><strong>Mode:</strong> ${this.gameMode === 'icons' ? 'Icons' : 'Words'}</p>
                        <p style="margin: 8px 0;"><strong>Difficulty:</strong> ${this.difficulty.toUpperCase()}</p>
                        <p style="margin: 8px 0;"><strong>Pairs Matched:</strong> ${this.matchedPairs}/${this.config.pairs}</p>
                        <p style="margin: 8px 0;"><strong>Total Moves:</strong> ${this.moves}</p>
                        <p style="margin: 8px 0;"><strong>Time:</strong> ${this.totalTime}s</p>
                        <p style="margin: 8px 0;"><strong>Accuracy:</strong> ${Math.round((this.matchedPairs / this.config.pairs) * 100)}%</p>
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
                    <button id="playAgainBtn" class="btn" style="padding: 12px; font-size: 1rem;">
                        <i class="fas fa-redo"></i> Play Again
                    </button>
                    <button id="changeModeBtn" class="btn" style="padding: 12px; font-size: 1rem; background: var(--secondary-green);">
                        <i class="fas fa-exchange-alt"></i> Switch to ${this.gameMode === 'icons' ? 'Words' : 'Icons'} Mode
                    </button>
                    <button id="backToHomeBtn" class="btn btn-secondary" style="padding: 12px; font-size: 1rem;">
                        <i class="fas fa-home"></i> Back to Home
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.resetGame();
        });

        document.getElementById('changeModeBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.gameMode = this.gameMode === 'icons' ? 'words' : 'icons';
            this.resetGame();
        });

        document.getElementById('backToHomeBtn').addEventListener('click', () => {
            window.location.href = '../html/index.html';
        });
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    new MemoryGame('medium', 'icons');
});