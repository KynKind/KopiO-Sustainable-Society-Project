// Memory Game Logic - UPDATED FOR FLASK BACKEND
class MemoryGame {
    constructor() {
        this.cards = this.generateCards();
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.hintsRemaining = 3;
        this.gameStarted = false;
        
        this.initializeGame();
    }

    generateCards() {
        const symbols = [
            '♻️', '🌱', '💧', '🌞', '🌍', '🍃', '🚲', '🏠',
            '♻️', '🌱', '💧', '🌞', '🌍', '🍃', '🚲', '🏠'
        ];
        
        // Shuffle symbols
        for (let i = symbols.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
        }

        return symbols.map((symbol, index) => ({
            id: index,
            symbol: symbol,
            flipped: false,
            matched: false
        }));
    }

    initializeGame() {
        this.renderCards();
        this.setupEventListeners();
        this.startTimer();
    }

    renderCards() {
        const grid = document.getElementById('memoryGrid');
        grid.innerHTML = '';

        this.cards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'memory-card';
            cardElement.setAttribute('data-card-id', card.id);
            
            cardElement.innerHTML = `
                <div class="front">?</div>
                <div class="back">${card.symbol}</div>
            `;

            grid.appendChild(cardElement);
        });
    }

    setupEventListeners() {
        // Card clicks
        document.getElementById('memoryGrid').addEventListener('click', (e) => {
            const cardElement = e.target.closest('.memory-card');
            if (cardElement && !this.gameStarted) {
                this.startTimer();
                this.gameStarted = true;
            }
            if (cardElement) {
                this.handleCardClick(cardElement);
            }
        });

        // Reset game
        document.getElementById('resetGame').addEventListener('click', () => {
            this.resetGame();
        });

        // Hint button
        document.getElementById('hintButton').addEventListener('click', () => {
            this.useHint();
        });
    }

    startTimer() {
        if (this.timerInterval) return;
        
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('memoryTimer').textContent = `${elapsed}s`;
        }, 1000);
    }

    handleCardClick(cardElement) {
        const cardId = parseInt(cardElement.getAttribute('data-card-id'));
        const card = this.cards.find(c => c.id === cardId);

        // Ignore if card is already flipped or matched
        if (card.flipped || card.matched || this.flippedCards.length >= 2) {
            return;
        }

        // Flip the card
        this.flipCard(cardElement, card);

        // Add to flipped cards
        this.flippedCards.push({ element: cardElement, card: card });

        // Check for match if two cards are flipped
        if (this.flippedCards.length === 2) {
            this.moves++;
            document.getElementById('moveCount').textContent = this.moves;
            this.checkMatch();
        }
    }

    flipCard(cardElement, card) {
        cardElement.classList.add('flipped');
        card.flipped = true;
    }

    checkMatch() {
        const [card1, card2] = this.flippedCards;
        
        if (card1.card.symbol === card2.card.symbol) {
            // Match found
            this.handleMatch(card1, card2);
        } else {
            // No match - flip back after delay
            setTimeout(() => {
                this.flipCardBack(card1);
                this.flipCardBack(card2);
                this.flippedCards = [];
            }, 1000);
        }
    }

    handleMatch(card1, card2) {
        card1.card.matched = true;
        card2.card.matched = true;
        
        card1.element.classList.add('matched');
        card2.element.classList.add('matched');
        
        this.matchedPairs++;
        document.getElementById('matchCount').textContent = `${this.matchedPairs}/8`;
        
        // Show match info
        this.showMatchInfo(card1.card.symbol);
        
        this.flippedCards = [];

        // Check for game completion
        if (this.matchedPairs === 8) {
            this.endGame();
        }
    }

    flipCardBack(card) {
        card.element.classList.remove('flipped');
        card.card.flipped = false;
    }

    showMatchInfo(symbol) {
        const matchInfo = document.getElementById('matchInfo');
        const matchTitle = document.getElementById('matchTitle');
        const matchDescription = document.getElementById('matchDescription');
        
        const matchData = {
            '♻️': {
                title: 'Great Match!',
                description: 'You matched recycling symbols! Recycling helps reduce waste and conserve natural resources.'
            },
            '🌱': {
                title: 'Eco Match!',
                description: 'You matched plant symbols! Plants help clean our air and provide oxygen for our planet.'
            },
            '💧': {
                title: 'Water Wisdom!',
                description: 'You matched water symbols! Conserving water helps protect this precious resource for future generations.'
            },
            '🌞': {
                title: 'Solar Power!',
                description: 'You matched sun symbols! Solar energy is a clean, renewable source of power.'
            },
            '🌍': {
                title: 'Earth Lover!',
                description: 'You matched Earth symbols! Protecting our planet starts with small daily actions.'
            },
            '🍃': {
                title: 'Nature Match!',
                description: 'You matched leaf symbols! Leaves represent the importance of preserving natural ecosystems.'
            },
            '🚲': {
                title: 'Green Transport!',
                description: 'You matched bicycle symbols! Cycling reduces carbon emissions and promotes healthy living.'
            },
            '🏠': {
                title: 'Sustainable Living!',
                description: 'You matched home symbols! Eco-friendly homes use less energy and produce less waste.'
            }
        };

        const data = matchData[symbol] || {
            title: 'Good Match!',
            description: 'You found a matching pair! Every match brings us closer to a sustainable future.'
        };

        matchTitle.textContent = data.title;
        matchDescription.textContent = data.description;
        matchInfo.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            matchInfo.style.display = 'none';
        }, 3000);
    }

    useHint() {
        if (this.hintsRemaining <= 0) return;

        // Find two unmatched cards that are the same
        const unmatchedCards = this.cards.filter(card => !card.matched && !card.flipped);
        const cardMap = new Map();

        for (const card of unmatchedCards) {
            if (cardMap.has(card.symbol)) {
                // Found a pair - highlight them
                const firstCard = cardMap.get(card.symbol);
                this.highlightCards([firstCard, card]);
                break;
            } else {
                cardMap.set(card.symbol, card);
            }
        }

        this.hintsRemaining--;
        document.getElementById('hintButton').textContent = `Get Hint (${this.hintsRemaining} left)`;
        
        if (this.hintsRemaining <= 0) {
            document.getElementById('hintButton').disabled = true;
        }
    }

    highlightCards(cards) {
        const cardElements = cards.map(card => 
            document.querySelector(`[data-card-id="${card.id}"]`)
        );

        cardElements.forEach(element => {
            element.style.boxShadow = '0 0 20px var(--accent-gold)';
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 2000);
        });
    }

    async endGame() {
        clearInterval(this.timerInterval);
        
        const finalTime = Math.floor((Date.now() - this.startTime) / 1000);
        const points = this.calculatePoints(finalTime, this.moves);

        await this.submitScore(finalTime, points);
        this.showGameOverModal(finalTime, points);
    }

    calculatePoints(time, moves) {
        let points = 100; // Base points
        
        // Time bonus (faster = more points)
        if (time < 60) points += 50;
        else if (time < 90) points += 30;
        else if (time < 120) points += 15;

        // Moves bonus (fewer moves = more points)
        if (moves < 20) points += 50;
        else if (moves < 30) points += 30;
        else if (moves < 40) points += 15;

        // Perfect game bonus
        if (moves === 16) points += 100;

        return points;
    }

    async submitScore(timeSpent, points) {
        try {
            const result = await submitGameScore(
                'memory', 
                points, 
                timeSpent,
                1,
                {
                    moves: this.moves,
                    matched_pairs: this.matchedPairs,
                    hints_used: 3 - this.hintsRemaining
                }
            );
            
            if (result.success) {
                console.log('Memory game score submitted:', result);
            }
        } catch (error) {
            console.error('Failed to submit memory score:', error);
        }
    }

    showGameOverModal(time, points) {
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

        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--light-cream);
                padding: 3rem;
                border-radius: var(--radius-large);
                text-align: center;
                max-width: 500px;
                width: 90%;
            ">
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Memory Master! 🧠</h2>
                <div class="final-stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 1rem;">
                        ${points} Points
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Time: ${time} seconds</p>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Moves: ${this.moves}</p>
                    <p style="color: var(--text-dark);">Pairs: 8/8</p>
                </div>
                <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="playAgain" class="btn">Play Again</button>
                    <button id="backToHome" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('playAgain').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.resetGame();
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    resetGame() {
        clearInterval(this.timerInterval);
        
        this.cards = this.generateCards();
        this.flippedCards = [];
        this.matchedPairs = 0;
        this.moves = 0;
        this.hintsRemaining = 3;
        this.gameStarted = false;
        
        this.renderCards();
        this.startTimer();
        
        document.getElementById('moveCount').textContent = '0';
        document.getElementById('matchCount').textContent = '0/8';
        document.getElementById('memoryTimer').textContent = '0s';
        document.getElementById('hintButton').textContent = `Get Hint (${this.hintsRemaining} left)`;
        document.getElementById('hintButton').disabled = false;
        document.getElementById('matchInfo').style.display = 'none';
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    new MemoryGame();
});