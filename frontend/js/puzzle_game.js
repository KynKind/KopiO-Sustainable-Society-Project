// Puzzle Game Logic - UPDATED FOR FLASK BACKEND
class PuzzleGame {
    constructor() {
        this.currentLevel = 1;
        this.moves = 0;
        this.startTime = null;
        this.timerInterval = null;
        this.puzzleSize = 3;
        this.board = [];
        this.emptyPos = { row: 2, col: 2 };
        this.images = this.getPuzzleImages();
        
        this.initializeGame();
    }

    getPuzzleImages() {
        return {
            1: { title: "Solar Energy Farm", description: "Solar panels convert sunlight into electricity without producing greenhouse gases.", fact: "The energy from 1 hour of sunlight could power the entire world for 1 year!" },
            2: { title: "Wind Turbines", description: "Wind energy is a clean, renewable source that helps reduce our carbon footprint.", fact: "A single wind turbine can power up to 1,500 homes for a year!" },
            3: { title: "Rainforest", description: "Rainforests are vital for biodiversity and absorbing carbon dioxide from the atmosphere.", fact: "Rainforests cover only 6% of Earth's surface but contain 50% of all plant and animal species!" },
            4: { title: "Coral Reef", description: "Coral reefs protect coastlines and support incredible marine biodiversity.", fact: "Coral reefs support 25% of all marine species despite covering less than 1% of the ocean floor!" },
            5: { title: "Organic Farm", description: "Organic farming practices protect soil health and reduce chemical pollution.", fact: "Organic farms have 30% more biodiversity than conventional farms!" }
        };
    }

    initializeGame() {
        this.generatePuzzle();
        this.setupEventListeners();
        this.updateLevelInfo();
        this.startTimer();
    }

    generatePuzzle() {
        this.board = [];
        let numbers = Array.from({ length: this.puzzleSize * this.puzzleSize - 1 }, (_, i) => i + 1);
        numbers.push(0); // 0 represents the empty space
        
        // Fisher-Yates shuffle
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }

        // Convert to 2D array
        for (let i = 0; i < this.puzzleSize; i++) {
            this.board.push(numbers.slice(i * this.puzzleSize, (i + 1) * this.puzzleSize));
        }

        // Find empty position
        for (let i = 0; i < this.puzzleSize; i++) {
            for (let j = 0; j < this.puzzleSize; j++) {
                if (this.board[i][j] === 0) {
                    this.emptyPos = { row: i, col: j };
                    break;
                }
            }
        }

        this.renderPuzzle();
    }

    renderPuzzle() {
        const board = document.getElementById('puzzleBoard');
        board.innerHTML = '';
        board.style.gridTemplateColumns = `repeat(${this.puzzleSize}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${this.puzzleSize}, 1fr)`;

        for (let i = 0; i < this.puzzleSize; i++) {
            for (let j = 0; j < this.puzzleSize; j++) {
                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.setAttribute('data-row', i);
                piece.setAttribute('data-col', j);

                if (this.board[i][j] === 0) {
                    piece.classList.add('empty');
                    piece.innerHTML = '';
                } else {
                    piece.innerHTML = this.board[i][j];
                    piece.style.background = `linear-gradient(135deg, var(--primary-brown), var(--light-brown))`;
                    piece.style.color = 'white';
                    piece.style.fontSize = '2rem';
                    piece.style.fontWeight = '700';
                }

                board.appendChild(piece);
            }
        }
    }

    setupEventListeners() {
        // Puzzle piece clicks
        document.getElementById('puzzleBoard').addEventListener('click', (e) => {
            const piece = e.target.closest('.puzzle-piece:not(.empty)');
            if (piece) {
                this.handlePieceClick(piece);
            }
        });

        // Control buttons
        document.getElementById('shufflePuzzle').addEventListener('click', () => {
            this.shufflePuzzle();
        });

        document.getElementById('showOriginal').addEventListener('click', () => {
            this.showOriginalImage();
        });

        document.getElementById('solvePuzzle').addEventListener('click', () => {
            this.solvePuzzle();
        });

        // Level selection
        document.querySelectorAll('.level-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.selectLevel(e.currentTarget);
            });
        });
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            document.getElementById('puzzleTimer').textContent = `${elapsed}s`;
        }, 1000);
    }

    handlePieceClick(piece) {
        const row = parseInt(piece.getAttribute('data-row'));
        const col = parseInt(piece.getAttribute('data-col'));

        // Check if piece is adjacent to empty space
        if (this.isAdjacent(row, col, this.emptyPos.row, this.emptyPos.col)) {
            this.movePiece(row, col);
            this.moves++;
            document.getElementById('puzzleMoves').textContent = this.moves;
            
            if (this.isSolved()) {
                this.completeLevel();
            }
        }
    }

    isAdjacent(row1, col1, row2, col2) {
        return (Math.abs(row1 - row2) === 1 && col1 === col2) || 
               (Math.abs(col1 - col2) === 1 && row1 === row2);
    }

    movePiece(row, col) {
        // Swap piece with empty space
        this.board[this.emptyPos.row][this.emptyPos.col] = this.board[row][col];
        this.board[row][col] = 0;
        
        // Update empty position
        this.emptyPos = { row, col };
        
        this.renderPuzzle();
    }

    isSolved() {
        let expected = 1;
        for (let i = 0; i < this.puzzleSize; i++) {
            for (let j = 0; j < this.puzzleSize; j++) {
                if (i === this.puzzleSize - 1 && j === this.puzzleSize - 1) {
                    if (this.board[i][j] !== 0) return false;
                } else {
                    if (this.board[i][j] !== expected) return false;
                    expected++;
                }
            }
        }
        return true;
    }

    shufflePuzzle() {
        // Perform many random moves to shuffle
        for (let i = 0; i < 1000; i++) {
            const directions = [
                { row: -1, col: 0 }, // up
                { row: 1, col: 0 },  // down
                { row: 0, col: -1 }, // left
                { row: 0, col: 1 }   // right
            ];
            
            const validMoves = directions.filter(dir => {
                const newRow = this.emptyPos.row + dir.row;
                const newCol = this.emptyPos.col + dir.col;
                return newRow >= 0 && newRow < this.puzzleSize && 
                       newCol >= 0 && newCol < this.puzzleSize;
            });

            if (validMoves.length > 0) {
                const move = validMoves[Math.floor(Math.random() * validMoves.length)];
                const newRow = this.emptyPos.row + move.row;
                const newCol = this.emptyPos.col + move.col;
                this.movePiece(newRow, newCol);
            }
        }
        
        this.moves = 0;
        document.getElementById('puzzleMoves').textContent = '0';
        this.startTime = Date.now();
    }

    showOriginalImage() {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
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
            cursor: pointer;
        `;

        const imageInfo = this.images[this.currentLevel];
        modal.innerHTML = `
            <div style="text-align: center; color: white; max-width: 600px; padding: 2rem;">
                <div style="
                    width: 300px;
                    height: 300px;
                    background: linear-gradient(135deg, var(--primary-brown), var(--light-brown));
                    margin: 0 auto 2rem;
                    border-radius: var(--radius-medium);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 4rem;
                ">
                    ${this.getLevelEmoji()}
                </div>
                <h2 style="margin-bottom: 1rem;">${imageInfo.title}</h2>
                <p style="margin-bottom: 1rem; opacity: 0.9;">${imageInfo.description}</p>
                <p style="font-style: italic; opacity: 0.7;">${imageInfo.fact}</p>
                <p style="margin-top: 2rem; opacity: 0.6;">Click anywhere to close</p>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    getLevelEmoji() {
        const emojis = {
            1: "☀️",
            2: "🌬️",
            3: "🌳",
            4: "🐠",
            5: "🌾"
        };
        return emojis[this.currentLevel] || "🌍";
    }

    solvePuzzle() {
        // Simple auto-solver that shows the solution step by step
        alert("Solution feature coming soon! Try to solve it yourself for more points! 🧩");
    }

    selectLevel(levelCard) {
        const level = parseInt(levelCard.getAttribute('data-level'));
        this.currentLevel = level;
        
        // Update active level
        document.querySelectorAll('.level-card').forEach(card => {
            card.classList.remove('active');
        });
        levelCard.classList.add('active');
        
        this.resetLevel();
        this.updateLevelInfo();
    }

    updateLevelInfo() {
        const imageInfo = this.images[this.currentLevel];
        document.getElementById('puzzleTitle').textContent = imageInfo.title;
        document.getElementById('puzzleDescription').textContent = imageInfo.description;
        document.getElementById('puzzleLevel').textContent = `${this.currentLevel}/5`;
        
        const funFact = document.querySelector('.puzzle-fun-fact');
        funFact.innerHTML = `
            <i class="fas fa-seedling"></i>
            <strong>Fun Fact:</strong> ${imageInfo.fact}
        `;
    }

    async completeLevel() {
        clearInterval(this.timerInterval);
        
        const completionTime = Math.floor((Date.now() - this.startTime) / 1000);
        const points = this.calculatePoints(completionTime, this.moves);

        await this.submitScore(completionTime, points);
        this.showLevelCompleteModal(completionTime, points);

        // Enable next level if available
        if (this.currentLevel < 5) {
            setTimeout(() => {
                this.currentLevel++;
                this.resetLevel();
                this.updateLevelInfo();
            }, 3000);
        }
    }

    calculatePoints(time, moves) {
        let points = this.currentLevel * 50; // Base points by level
        
        // Time bonus
        if (time < 60) points += 100;
        else if (time < 120) points += 60;
        else if (time < 180) points += 30;

        // Moves bonus (fewer moves = more points)
        const optimalMoves = this.puzzleSize * this.puzzleSize * 10; // Approximate
        if (moves < optimalMoves * 1.2) points += 50;
        else if (moves < optimalMoves * 1.5) points += 30;
        else if (moves < optimalMoves * 2) points += 15;

        return points;
    }

    async submitScore(timeSpent, points) {
        try {
            const result = await submitGameScore(
                'puzzle', 
                points, 
                timeSpent,
                this.currentLevel,
                {
                    puzzle_size: this.puzzleSize,
                    moves: this.moves,
                    level_completed: this.currentLevel
                }
            );
            
            if (result.success) {
                console.log('Puzzle game score submitted:', result);
            }
        } catch (error) {
            console.error('Failed to submit puzzle score:', error);
        }
    }

    showLevelCompleteModal(time, points) {
        const modal = document.createElement('div');
        modal.className = 'level-complete-modal';
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
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Level ${this.currentLevel} Complete! 🎉</h2>
                <div class="final-stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 1rem;">
                        +${points} Points
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Time: ${time} seconds</p>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Moves: ${this.moves}</p>
                    <p style="color: var(--text-dark);">Level: ${this.currentLevel}/5</p>
                </div>
                <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                    ${this.currentLevel < 5 ? 
                        '<button id="nextLevel" class="btn">Next Level</button>' : 
                        '<button id="playAgain" class="btn">Play Again</button>'
                    }
                    <button id="backToHome" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        if (this.currentLevel < 5) {
            document.getElementById('nextLevel').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        } else {
            document.getElementById('playAgain').addEventListener('click', () => {
                document.body.removeChild(modal);
                this.resetGame();
            });
        }

        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    resetLevel() {
        clearInterval(this.timerInterval);
        
        this.moves = 0;
        this.startTime = Date.now();
        
        this.generatePuzzle();
        this.startTimer();
        
        document.getElementById('puzzleMoves').textContent = '0';
        document.getElementById('puzzleTimer').textContent = '0s';
    }

    resetGame() {
        this.currentLevel = 1;
        this.resetLevel();
        
        // Reset level selection
        document.querySelectorAll('.level-card').forEach(card => {
            card.classList.remove('active');
        });
        document.querySelector('[data-level="1"]').classList.add('active');
        
        this.updateLevelInfo();
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
    
    new PuzzleGame();
});