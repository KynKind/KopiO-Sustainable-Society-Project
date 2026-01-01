// Puzzle Game Logic with API Integration (Themes x Sublevels)
// ✅ Only changes requested:
// 1) Every generatePuzzle() -> timer resets to 0s and STOPs
//    Timer starts ONLY when user first clicks puzzle OR clicks Solve
// 2) Eco Tips modal shows ONLY when finishing each theme Level 5
//    (i.e., after sublevel 5 completion + after theme saved, before next/end choice)
// Everything else kept the same.

class PuzzleGame {
    constructor() {
        // ====== Structure ======
        this.totalThemes = 5;
        this.subLevelsPerTheme = 5;

        // Theme index: 1..5 (match your images keys)
        this.currentTheme = 1;     // 1..5
        this.currentSubLevel = 1;  // 1..5

        // ====== Stats ======
        this.moves = 0;            // moves in current sublevel
        this.totalMoves = 0;       // total moves across finished themes (and finished sublevels)

        // Timer state (✅ NEW: do not auto start)
        this.startTime = null;     // when timer started
        this.timerInterval = null;
        this.timerStarted = false; // ✅ NEW

        this.gameStartTime = Date.now();

        // theme accumulators (only saved at sublevel 5)
        this.themeMoves = 0;       // sum of 5 sublevels moves
        this.themeTime = 0;        // sum of 5 sublevels time (seconds)

        // points from backend (saved only when theme completes)
        this.totalPoints = 0;

        // ====== Puzzle ======
        this.puzzleSize = 3;
        this.board = [];
        this.emptyPos = { row: 2, col: 2 };

        // Theme cards info
        this.images = this.getPuzzleImages();

        // solver state
        this.isSolving = false;
        this.solveInterval = null;

        // ✅ storage key
        this.storageKey = 'ecoPuzzleProgress_v2_theme5x5';

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
        const restored = this.loadProgress();
        this.setupEventListeners();

        if (!restored) {
            this.resetToNewGame();
        }

        this.updateLevelInfo();
        this.updateStageProgressUI();
        this.updateLevelCardsProgressUI();

        // ✅ Do NOT auto start timer. Ensure UI shows 0s unless already running.
        if (!this.timerStarted) {
            this.resetTimer();
        } else {
            // If restored while timer started, keep running from now (best-effort)
            this.startTimer(true);
        }
    }

    resetToNewGame() {
        this.currentTheme = 1;
        this.currentSubLevel = 1;

        this.moves = 0;
        this.totalMoves = 0;

        this.themeMoves = 0;
        this.themeTime = 0;

        this.totalPoints = 0;

        this.gameStartTime = Date.now();

        // ✅ Reset timer state
        this.resetTimer();

        this.generatePuzzle();
        this.saveProgress();
    }

    /***********************
     * ✅ Timer helpers (NEW)
     ***********************/
    resetTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.startTime = null;
        this.timerStarted = false;

        const el = document.getElementById('puzzleTimer');
        if (el) el.textContent = '0s';
    }

    ensureTimerStarted() {
        if (this.timerStarted) return;
        this.timerStarted = true;
        this.startTime = Date.now();
        this.startTimer(true); // will tick from current startTime
        this.saveProgress();
    }

    /***********************
     * ✅ Progress Storage
     ***********************/
    saveProgress() {
        const payload = {
            currentTheme: this.currentTheme,
            currentSubLevel: this.currentSubLevel,
            moves: this.moves,
            totalMoves: this.totalMoves,

            themeMoves: this.themeMoves,
            themeTime: this.themeTime,

            totalPoints: this.totalPoints,

            // ✅ timer persist
            startTime: this.startTime,
            timerStarted: this.timerStarted,

            gameStartTime: this.gameStartTime,

            board: this.board,
            emptyPos: this.emptyPos
        };

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(payload));
        } catch (e) {
            console.warn('saveProgress failed', e);
        }
    }

    loadProgress() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!data || !data.board || !data.emptyPos) return false;

            this.currentTheme = data.currentTheme ?? 1;
            this.currentSubLevel = data.currentSubLevel ?? 1;

            this.moves = data.moves ?? 0;
            this.totalMoves = data.totalMoves ?? 0;

            this.themeMoves = data.themeMoves ?? 0;
            this.themeTime = data.themeTime ?? 0;

            this.totalPoints = data.totalPoints ?? 0;

            // ✅ timer restore
            this.startTime = data.startTime ?? null;
            this.timerStarted = data.timerStarted ?? false;

            this.gameStartTime = data.gameStartTime ?? Date.now();

            this.board = data.board;
            this.emptyPos = data.emptyPos;

            // UI
            this.renderPuzzle();
            document.getElementById('puzzleMoves').textContent = String(this.moves);

            // Theme card active
            document.querySelectorAll('.level-card').forEach(card => card.classList.remove('active'));
            document.querySelector(`.level-card[data-level="${this.currentTheme}"]`)?.classList.add('active');

            // ✅ If timer not started, show 0s
            if (!this.timerStarted) this.resetTimer();

            return true;
        } catch (e) {
            console.warn('loadProgress failed', e);
            return false;
        }
    }

    clearProgress() {
        try { localStorage.removeItem(this.storageKey); } catch (e) { }
    }

    /***********************
     * Puzzle Generation
     ***********************/
    generatePuzzle() {
        this.stopAutoSolve();

        // ✅ CHANGE 1: every generate -> reset timer to 0 and STOP
        this.resetTimer();

        const N = this.puzzleSize;
        const total = N * N;

        let flat;
        do {
            flat = Array.from({ length: total }, (_, i) => i);
            for (let i = flat.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [flat[i], flat[j]] = [flat[j], flat[i]];
            }
        } while (!this.isSolvable(flat) || this.serialize(flat) === this.serialize(this.goalFlat()));

        this.board = [];
        for (let r = 0; r < N; r++) {
            this.board.push(flat.slice(r * N, (r + 1) * N));
        }

        const idx0 = flat.indexOf(0);
        this.emptyPos = { row: Math.floor(idx0 / N), col: idx0 % N };

        this.renderPuzzle();

        this.moves = 0;
        document.getElementById('puzzleMoves').textContent = '0';

        this.saveProgress();
    }

    shufflePuzzle() {
        if (this.isSolving) return;
        this.generatePuzzle();
    }

    /***********************
     * Render
     ***********************/
    renderPuzzle() {
        const board = document.getElementById('puzzleBoard');
        if (!board) return;

        board.innerHTML = '';

        board.style.display = 'grid';
        board.style.gridTemplateColumns = `repeat(${this.puzzleSize}, 1fr)`;
        board.style.gridTemplateRows = `repeat(${this.puzzleSize}, 1fr)`;
        board.style.gap = '6px';
        board.style.padding = '6px';
        board.style.background = 'var(--dark-brown)';
        board.style.borderRadius = '12px';

        for (let r = 0; r < this.puzzleSize; r++) {
            for (let c = 0; c < this.puzzleSize; c++) {
                const v = this.board[r][c];

                const piece = document.createElement('div');
                piece.className = 'puzzle-piece';
                piece.dataset.row = r;
                piece.dataset.col = c;

                piece.style.aspectRatio = '1 / 1';
                piece.style.display = 'flex';
                piece.style.alignItems = 'center';
                piece.style.justifyContent = 'center';
                piece.style.fontSize = 'clamp(1.2rem, 5vw, 2rem)';
                piece.style.fontWeight = '700';
                piece.style.lineHeight = '1';
                piece.style.userSelect = 'none';
                piece.style.borderRadius = '10px';

                if (v === 0) {
                    piece.classList.add('empty');
                    piece.textContent = '';
                    piece.style.background = 'transparent';
                    piece.style.border = '2px dashed rgba(255,255,255,0.25)';
                } else {
                    piece.textContent = String(v);
                    piece.style.background = `linear-gradient(135deg, var(--primary-brown), var(--light-brown))`;
                    piece.style.color = '#fff';
                }

                board.appendChild(piece);
            }
        }
    }

    /***********************
     * Event Listeners
     ***********************/
    setupEventListeners() {
        if (this._listenersBound) return;
        this._listenersBound = true;

        document.getElementById('puzzleBoard')?.addEventListener('click', (e) => {
            if (this.isSolving) return;
            const piece = e.target.closest('.puzzle-piece:not(.empty)');
            if (piece) this.handlePieceClick(piece);
        });

        document.getElementById('shufflePuzzle')?.addEventListener('click', () => {
            if (this.isSolving) return;
            this.shufflePuzzle();
        });

        document.getElementById('showOriginal')?.addEventListener('click', () => {
            this.showOriginalImage();
        });

        document.getElementById('solvePuzzle')?.addEventListener('click', () => {
            this.solvePuzzle();
        });

        // Theme selection cards
        document.querySelectorAll('.level-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (this.isSolving) return;
                this.selectTheme(e.currentTarget);
            });
        });
    }

    /***********************
     * Timer
     ***********************/
    startTimer(useExistingStartTime = false) {
        clearInterval(this.timerInterval);

        if (!useExistingStartTime || !this.startTime) {
            this.startTime = Date.now();
        }

        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const el = document.getElementById('puzzleTimer');
            if (el) el.textContent = `${elapsed}s`;
        }, 1000);

        this.saveProgress();
    }

    /***********************
     * Moves / Rules
     ***********************/
    handlePieceClick(piece) {
        // ✅ CHANGE 1: Start timer only on first user interaction
        this.ensureTimerStarted();

        const row = parseInt(piece.dataset.row);
        const col = parseInt(piece.dataset.col);

        if (this.isAdjacent(row, col, this.emptyPos.row, this.emptyPos.col)) {
            this.movePiece(row, col);

            this.moves++;
            document.getElementById('puzzleMoves').textContent = String(this.moves);

            this.saveProgress();

            if (this.isSolved()) {
                this.completeSubLevel();
            }
        }
    }

    isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) === 1 && c1 === c2) ||
            (Math.abs(c1 - c2) === 1 && r1 === r2);
    }

    movePiece(row, col) {
        this.board[this.emptyPos.row][this.emptyPos.col] = this.board[row][col];
        this.board[row][col] = 0;
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

    /***********************
     * ✅ Theme / Stage UI
     ***********************/
    updateStageProgressUI() {
        // top stats: show theme and sublevel
        const levelEl = document.getElementById('puzzleLevel');
        if (levelEl) levelEl.textContent = `Puzzle ${this.currentTheme}/5  Level ${this.currentSubLevel}/5`;

        // under theme cards: overall theme progress
        const container = document.querySelector('.level-selection');
        if (!container) return;

        let stageEl = document.getElementById('stageProgressText');
        if (!stageEl) {
            stageEl = document.createElement('div');
            stageEl.id = 'stageProgressText';
            stageEl.style.marginTop = '10px';
            stageEl.style.fontWeight = '700';
            stageEl.style.color = 'var(--primary-brown)';
            stageEl.style.textAlign = 'center';
            container.appendChild(stageEl);
        }

        stageEl.textContent = `Current: ${this.getThemeName(this.currentTheme)} — Level ${this.currentSubLevel}/5`;
    }

    updateLevelCardsProgressUI() {
        document.querySelectorAll('.level-card').forEach(card => {
            const theme = parseInt(card.dataset.level);

            let status = card.querySelector('.level-status');
            if (!status) {
                status = document.createElement('div');
                status.className = 'level-status';
                status.style.marginTop = '8px';
                status.style.fontSize = '0.9rem';
                status.style.fontWeight = '700';
                status.style.color = 'var(--primary-brown)';
                status.style.opacity = '0.9';
                status.style.textAlign = 'center';
                card.appendChild(status);
            }

            if (theme < this.currentTheme) {
                status.textContent = `Completed`;
                status.style.opacity = '0.9';
            } else if (theme === this.currentTheme) {
                status.textContent = `Level ${this.currentSubLevel}/5`;
                status.style.opacity = '0.9';
            } else {
                status.textContent = `Locked`;
                status.style.opacity = '0.5';
            }

            if (theme > this.currentTheme) card.classList.add('locked');
            else card.classList.remove('locked');
        });
    }

    getThemeName(theme) {
        const info = this.images[theme];
        if (!info) return `Theme ${theme}`;
        if (theme === 1) return "Solar Farm";
        if (theme === 2) return "Wind Energy";
        if (theme === 3) return "Rainforest";
        if (theme === 4) return "Coral Reef";
        if (theme === 5) return "Organic Farm";
        return info.title;
    }

    /***********************
     * Theme selection
     ***********************/
    selectTheme(levelCard) {
        const theme = parseInt(levelCard.dataset.level);

        if (theme > this.currentTheme) return;

        this.currentTheme = theme;
        this.currentSubLevel = 1;

        this.themeMoves = 0;
        this.themeTime = 0;

        document.querySelectorAll('.level-card').forEach(card => card.classList.remove('active'));
        levelCard.classList.add('active');

        this.resetSubLevel();
        this.updateLevelInfo();
        this.updateStageProgressUI();
        this.updateLevelCardsProgressUI();
        this.saveProgress();
    }

    updateLevelInfo() {
        const info = this.images[this.currentTheme];
        if (!info) return;

        document.getElementById('puzzleTitle').textContent = `${this.getThemeName(this.currentTheme)} (Level ${this.currentSubLevel}/5)`;
        document.getElementById('puzzleDescription').textContent = info.description;

        const funFact = document.querySelector('.puzzle-fun-fact');
        if (funFact) {
            funFact.innerHTML = `
                <i class="fas fa-seedling"></i>
                <strong>Fun Fact:</strong> ${info.fact}
            `;
        }
    }

    resetSubLevel() {
        clearInterval(this.timerInterval);
        this.stopAutoSolve();

        this.moves = 0;

        // ✅ generatePuzzle resets timer to 0 and stops
        this.generatePuzzle();

        document.getElementById('puzzleMoves').textContent = '0';
        document.getElementById('puzzleTimer').textContent = '0s';

        this.saveProgress();
    }

    /***********************
     * ✅ COMPLETE sublevel
     ***********************/
    async completeSubLevel() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;

        const completionTime = (this.timerStarted && this.startTime)
            ? Math.floor((Date.now() - this.startTime) / 1000)
            : 0;

        // accumulate theme + total stats
        this.themeMoves += this.moves;
        this.themeTime += completionTime;

        this.totalMoves += this.moves;

        this.updateStageProgressUI();
        this.updateLevelCardsProgressUI();
        this.saveProgress();

        // 1) show sublevel complete
        await this.showSubLevelCompleteModal(completionTime);

        // 2) if not last sublevel -> go next sublevel in same theme
        if (this.currentSubLevel < this.subLevelsPerTheme) {
            this.currentSubLevel++;
            this.resetSubLevel();
            this.updateLevelInfo();
            this.updateStageProgressUI();
            this.updateLevelCardsProgressUI();
            this.saveProgress();
            return;
        }

        // 3) theme completed (sublevel 5)
        // Save theme score ONLY ONCE here
        const themeSaveResult = await this.saveThemeScore({
            theme: this.currentTheme,
            moves: this.themeMoves,
            timeTaken: this.themeTime
        });

        if (themeSaveResult && typeof themeSaveResult.points === 'number') {
            this.totalPoints += themeSaveResult.points;
        }

        this.saveProgress();

        // ✅ CHANGE 2: Tips ONLY at theme level 5
        await this.showEcoTipsModal(this.currentTheme);

        // ask: next theme or end
        const choice = await this.showThemeEndChoiceModal(this.currentTheme);

        if (choice === 'end') {
            await this.showEndNowSummaryModal();
            return;
        }

        // continue
        if (this.currentTheme < this.totalThemes) {
            this.currentTheme++;
            this.currentSubLevel = 1;

            this.themeMoves = 0;
            this.themeTime = 0;

            document.querySelectorAll('.level-card').forEach(card => card.classList.remove('active'));
            document.querySelector(`.level-card[data-level="${this.currentTheme}"]`)?.classList.add('active');

            this.resetSubLevel();
            this.updateLevelInfo();
            this.updateStageProgressUI();
            this.updateLevelCardsProgressUI();
            this.saveProgress();
            return;
        }

        // All themes finished -> final
        const totalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const finalResult = await this.saveFinalScore(totalTime);

        this.clearProgress();
        this.showGameCompleteModal(finalResult, totalTime);
    }

    /***********************
     * ✅ Save Theme Score (ONLY at sublevel 5)
     ***********************/
    async saveThemeScore({ theme, moves, timeTaken }) {
        try {
            const result = await apiRequest('/games/puzzle/submit', {
                method: 'POST',
                body: JSON.stringify({
                    theme: theme,
                    moves: moves,
                    timeTaken: timeTaken,
                    puzzleNumber: theme,
                    isTheme: true
                })
            });

            const user = await getCurrentUser();
            if (user) localStorage.setItem('currentUser', JSON.stringify(user));

            return result;
        } catch (e) {
            console.error('Error saving theme score:', e);
            return null;
        }
    }

    /***********************
     * ✅ Save Final Score (optional)
     ***********************/
    async saveFinalScore(totalTime) {
        try {
            const result = await apiRequest('/games/puzzle/submit', {
                method: 'POST',
                body: JSON.stringify({
                    moves: this.totalMoves,
                    timeTaken: totalTime,
                    puzzleNumber: this.totalThemes,
                    isFinal: true,
                    totalPointsClient: this.totalPoints
                })
            });

            const user = await getCurrentUser();
            if (user) localStorage.setItem('currentUser', JSON.stringify(user));

            return result;
        } catch (e) {
            console.error('Error saving final score:', e);
            return null;
        }
    }

    /***********************
     * ✅ Modals
     ***********************/
    showSubLevelCompleteModal(time) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'level-complete-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex; align-items: center; justify-content: center;
                z-index: 10000;
            `;

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: var(--light-cream);
                    padding: 2.4rem;
                    border-radius: var(--radius-large);
                    text-align: center;
                    max-width: 520px;
                    width: 92%;
                ">
                    <h2 style="color: var(--dark-brown); margin-bottom: 0.8rem;">
                        ${this.getThemeName(this.currentTheme)} — Level ${this.currentSubLevel}/5 Complete! 🎉
                    </h2>
                    <div style="margin-bottom: 1.5rem;">
                        <p style="margin-bottom: 0.5rem;">Time: ${time}s</p>
                        <p style="margin-bottom: 0.5rem;">Moves: ${this.moves}</p>
                        <p style="opacity:0.85;">Theme Progress: ${this.currentSubLevel}/5</p>
                    </div>
                    <div style="display:flex; justify-content:center; gap: 1rem;">
                        <button id="closeSubLevelModal" class="btn">OK</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            document.getElementById('closeSubLevelModal').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }

    showThemeEndChoiceModal(theme) {
        return new Promise((resolve) => {
            const isLastTheme = theme >= this.totalThemes;

            const modal = document.createElement('div');
            modal.className = 'theme-choice-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.82);
                display: flex; align-items: center; justify-content: center;
                z-index: 10002;
            `;

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: var(--light-cream);
                    padding: 2.6rem;
                    border-radius: var(--radius-large);
                    text-align: center;
                    max-width: 560px;
                    width: 92%;
                ">
                    <h2 style="color: var(--dark-brown); margin-bottom: 0.8rem;">
                        ${this.getThemeName(theme)} Completed! ✅
                    </h2>
                    <p style="opacity:0.85; margin-bottom: 1.2rem;">
                        Your score for this theme has been saved.
                    </p>

                    <div style="margin-bottom: 1.6rem; line-height:1.7;">
                        <div><strong>Theme Moves:</strong> ${this.themeMoves}</div>
                        <div><strong>Theme Time:</strong> ${this.themeTime}s</div>
                        <div style="margin-top:0.6rem;"><strong>Total Points So Far:</strong> ${this.totalPoints}</div>
                    </div>

                    <div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
                        ${isLastTheme
                            ? `<button id="endThemeFinish" class="btn">Finish Game</button>`
                            : `<button id="nextThemeBtn" class="btn">Go to Next Theme</button>`
                        }
                        <button id="endNowBtn" class="btn btn-secondary">End Now</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            if (isLastTheme) {
                document.getElementById('endThemeFinish')?.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve('next');
                });
            } else {
                document.getElementById('nextThemeBtn')?.addEventListener('click', () => {
                    document.body.removeChild(modal);
                    resolve('next');
                });
            }

            document.getElementById('endNowBtn')?.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve('end');
            });
        });
    }

    showEndNowSummaryModal() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'end-now-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex; align-items: center; justify-content: center;
                z-index: 10003;
            `;

            const totalTimeSoFar = Math.floor((Date.now() - this.gameStartTime) / 1000);

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: var(--light-cream);
                    padding: 2.6rem;
                    border-radius: var(--radius-large);
                    text-align: center;
                    max-width: 560px;
                    width: 92%;
                ">
                    <h2 style="color: var(--dark-brown); margin-bottom: 0.8rem;">
                        Game Summary 🌍
                    </h2>

                    <div style="margin-bottom: 1.6rem; line-height:1.8;">
                        <div><strong>Total Points:</strong> ${this.totalPoints}</div>
                        <div><strong>Total Moves:</strong> ${this.totalMoves}</div>
                        <div><strong>Total Time:</strong> ${totalTimeSoFar}s</div>
                        <div style="opacity:0.85; margin-top:0.6rem;">
                            You can continue later (progress is saved) or return to the main page now.
                        </div>
                    </div>

                    <div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
                        <button id="backToMainPageBtn" class="btn btn-secondary">Back to Main Page</button>
                        <button id="continueLaterBtn" class="btn">Continue Later</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('backToMainPageBtn')?.addEventListener('click', () => {
                window.location.href = 'HtmlPage.html';
            });

            document.getElementById('continueLaterBtn')?.addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }

    showGameCompleteModal(result, totalTime) {
        const modal = document.createElement('div');
        modal.className = 'game-complete-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000;
        `;

        const points = (result && typeof result.points === 'number') ? result.points : this.totalPoints;

        modal.innerHTML = `
            <div class="modal-content" style="
                background: var(--light-cream);
                padding: 3rem;
                border-radius: var(--radius-large);
                text-align: center;
                max-width: 560px;
                width: 92%;
            ">
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Eco Puzzle Master! 🧩🌿</h2>
                <div style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 0.8rem;">
                        ${points} Points
                    </div>
                    <p>Themes Completed: ${this.totalThemes}</p>
                    <p>Total Moves: ${this.totalMoves}</p>
                    <p>Total Time: ${totalTime}s</p>
                </div>
                <div style="display:flex; gap:1rem; justify-content:center; flex-wrap:wrap;">
                    <button id="playAgain" class="btn">Play Again</button>
                    <button id="backToHome" class="btn btn-secondary">Back to Main Page</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('playAgain').addEventListener('click', () => window.location.reload());
        document.getElementById('backToHome').addEventListener('click', () => window.location.href = '../html/index.html');
    }

    showOriginalImage() {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; cursor: pointer;
        `;

        const imageInfo = this.images[this.currentTheme];
        modal.innerHTML = `
            <div style="text-align: center; color: white; max-width: 600px; padding: 2rem;">
                <div style="
                    width: 300px; height: 300px;
                    background: linear-gradient(135deg, var(--primary-brown), var(--light-brown));
                    margin: 0 auto 2rem;
                    border-radius: var(--radius-medium);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 4rem;
                ">${this.getThemeEmoji()}</div>

                <h2 style="margin-bottom: 0.6rem;">${this.getThemeName(this.currentTheme)} — Level ${this.currentSubLevel}/5</h2>
                <p style="margin-bottom: 1rem; opacity: 0.9;">${imageInfo.description}</p>
                <p style="font-style: italic; opacity: 0.7;">${imageInfo.fact}</p>
                <p style="margin-top: 2rem; opacity: 0.6;">Click anywhere to close</p>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', () => document.body.removeChild(modal));
    }

    getThemeEmoji() {
        const emojis = { 1: "☀️", 2: "🌬️", 3: "🌳", 4: "🐠", 5: "🌾" };
        return emojis[this.currentTheme] || "🌍";
    }

    /***********************
     * ✅ Eco Tips (English)
     ***********************/
    getEcoTipsByTheme(theme) {
        const tips = {
            1: {
                title: "☀️ Solar Theme: Protect the Environment",
                items: [
                    "Use natural daylight whenever possible to reduce electricity use.",
                    "Set the air-conditioner to around 26°C and use a fan to save energy.",
                    "Unplug chargers and devices when not in use to avoid standby power.",
                    "Choose energy-efficient appliances (look for energy labels).",
                    "Dry clothes under the sun instead of using a dryer."
                ]
            },
            2: {
                title: "🌬️ Wind Theme: Protect the Environment",
                items: [
                    "Walk, cycle, carpool, or use public transport to cut emissions.",
                    "Combine errands into one trip to reduce fuel consumption.",
                    "Support renewable electricity options when available.",
                    "Reduce single-use items to lower overall energy demand.",
                    "Turn off lights and devices when leaving a room."
                ]
            },
            3: {
                title: "🌳 Rainforest Theme: Protect the Environment",
                items: [
                    "Use less paper and reuse whenever possible.",
                    "Buy FSC-certified paper products to support sustainable forestry.",
                    "Reduce food waste and consider eating less red meat.",
                    "Plant a tree or support reforestation projects.",
                    "Choose products with minimal packaging."
                ]
            },
            4: {
                title: "🐠 Coral Reef Theme: Protect the Environment",
                items: [
                    "Cut plastic waste: bring a reusable bottle, bag, and utensils.",
                    "Never touch or step on corals; keep a respectful distance.",
                    "Choose reef-safe sunscreen to reduce harm to marine life.",
                    "Dispose of fishing lines and trash properly.",
                    "Pick up litter near beaches, rivers, or drains."
                ]
            },
            5: {
                title: "🌾 Organic Farm Theme: Protect the Environment",
                items: [
                    "Buy local and seasonal produce to reduce transport emissions.",
                    "Plan meals and store food properly to prevent food waste.",
                    "Compost food scraps if possible to reduce landfill waste.",
                    "Support sustainable farms and eco-friendly brands.",
                    "Use reusable containers instead of disposable ones."
                ]
            }
        };

        return tips[theme] || {
            title: "🌍 Eco Tips",
            items: [
                "Reduce single-use items.",
                "Save energy and electricity.",
                "Recycle properly.",
                "Choose low-carbon transport.",
                "Avoid food waste."
            ]
        };
    }

    showEcoTipsModal(theme) {
        return new Promise((resolve) => {
            const tip = this.getEcoTipsByTheme(theme);

            const modal = document.createElement('div');
            modal.className = 'eco-tips-modal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex; align-items: center; justify-content: center;
                z-index: 10001;
            `;

            const itemsHtml = tip.items
                .map(i => `<li style="margin: 8px 0; text-align:left;">${i}</li>`)
                .join('');

            modal.innerHTML = `
                <div class="modal-content" style="
                    background: var(--light-cream);
                    padding: 2.4rem;
                    border-radius: var(--radius-large);
                    max-width: 580px;
                    width: 92%;
                ">
                    <h2 style="color: var(--dark-brown); margin-bottom: 0.8rem; text-align:center;">
                        ${tip.title}
                    </h2>

                    <p style="text-align:center; opacity: 0.85; margin-bottom: 1.2rem;">
                        Small actions make a big difference 💚
                    </p>

                    <ul style="padding-left: 1.2rem; margin-bottom: 1.6rem;">
                        ${itemsHtml}
                    </ul>

                    <div style="display:flex; justify-content:center;">
                        <button id="closeEcoTips" class="btn btn-secondary">Got it</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('closeEcoTips').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(true);
            });
        });
    }

    /************************************
     * Solver (A*)
     ************************************/
    boardToFlat() {
        const flat = [];
        for (let r = 0; r < this.puzzleSize; r++) {
            for (let c = 0; c < this.puzzleSize; c++) flat.push(this.board[r][c]);
        }
        return flat;
    }

    goalFlat() {
        const g = [];
        for (let i = 1; i <= this.puzzleSize * this.puzzleSize - 1; i++) g.push(i);
        g.push(0);
        return g;
    }

    serialize(flat) { return flat.join(','); }

    manhattan(flat) {
        const N = this.puzzleSize;
        let dist = 0;
        for (let i = 0; i < flat.length; i++) {
            const v = flat[i];
            if (v === 0) continue;
            const goalIndex = v - 1;
            const r1 = Math.floor(i / N), c1 = i % N;
            const r2 = Math.floor(goalIndex / N), c2 = goalIndex % N;
            dist += Math.abs(r1 - r2) + Math.abs(c1 - c2);
        }
        return dist;
    }

    isSolvable(flat) {
        const N = this.puzzleSize;
        const arr = flat.filter(v => v !== 0);
        let inv = 0;
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] > arr[j]) inv++;
            }
        }
        if (N % 2 === 1) return inv % 2 === 0;

        const blankIndex = flat.indexOf(0);
        const blankRowFromBottom = N - Math.floor(blankIndex / N);
        if (blankRowFromBottom % 2 === 0) return inv % 2 === 1;
        return inv % 2 === 0;
    }

    getNeighbors(flat) {
        const N = this.puzzleSize;
        const idx0 = flat.indexOf(0);
        const r = Math.floor(idx0 / N);
        const c = idx0 % N;

        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        const res = [];
        for (const d of dirs) {
            const nr = r + d.dr;
            const nc = c + d.dc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;

            const nidx = nr * N + nc;
            const next = flat.slice();
            next[idx0] = next[nidx];
            next[nidx] = 0;

            res.push({ next, movedTile: flat[nidx] });
        }
        return res;
    }

    aStarSolve(startFlat) {
        const goal = this.goalFlat();
        const goalKey = this.serialize(goal);
        if (!this.isSolvable(startFlat)) return null;

        const startKey = this.serialize(startFlat);

        const open = [];
        const gScore = new Map();
        const fScore = new Map();
        const cameFrom = new Map();

        gScore.set(startKey, 0);
        fScore.set(startKey, this.manhattan(startFlat));
        open.push({ key: startKey, flat: startFlat, f: fScore.get(startKey) });

        const closed = new Set();

        while (open.length) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            const curKey = current.key;

            if (curKey === goalKey) {
                const moves = [];
                let k = curKey;
                while (cameFrom.has(k)) {
                    const step = cameFrom.get(k);
                    moves.push(step.movedTile);
                    k = step.prevKey;
                }
                moves.reverse();
                return moves;
            }

            if (closed.has(curKey)) continue;
            closed.add(curKey);

            for (const nb of this.getNeighbors(current.flat)) {
                const nbKey = this.serialize(nb.next);
                if (closed.has(nbKey)) continue;

                const tentativeG = (gScore.get(curKey) ?? Infinity) + 1;
                if (tentativeG < (gScore.get(nbKey) ?? Infinity)) {
                    cameFrom.set(nbKey, { prevKey: curKey, movedTile: nb.movedTile });
                    gScore.set(nbKey, tentativeG);
                    const f = tentativeG + this.manhattan(nb.next);
                    fScore.set(nbKey, f);
                    open.push({ key: nbKey, flat: nb.next, f });
                }
            }
        }
        return null;
    }

    findTilePosition(tileValue) {
        for (let r = 0; r < this.puzzleSize; r++) {
            for (let c = 0; c < this.puzzleSize; c++) {
                if (this.board[r][c] === tileValue) return { row: r, col: c };
            }
        }
        return null;
    }

    stopAutoSolve() {
        this.isSolving = false;
        if (this.solveInterval) clearInterval(this.solveInterval);
        this.solveInterval = null;

        const solveBtn = document.getElementById('solvePuzzle');
        const shuffleBtn = document.getElementById('shufflePuzzle');
        if (solveBtn) solveBtn.disabled = false;
        if (shuffleBtn) shuffleBtn.disabled = false;
    }

    solvePuzzle() {
        if (this.isSolving) return;

        // ✅ CHANGE 1: Start timer only on first solve click
        this.ensureTimerStarted();

        const startFlat = this.boardToFlat();
        const movesList = this.aStarSolve(startFlat);

        if (!movesList) {
            alert("This puzzle state cannot be solved. Please shuffle again.");
            return;
        }

        this.isSolving = true;
        const solveBtn = document.getElementById('solvePuzzle');
        const shuffleBtn = document.getElementById('shufflePuzzle');
        if (solveBtn) solveBtn.disabled = true;
        if (shuffleBtn) shuffleBtn.disabled = true;

        let i = 0;
        this.solveInterval = setInterval(() => {
            if (!this.isSolving) {
                this.stopAutoSolve();
                return;
            }

            if (i >= movesList.length) {
                this.stopAutoSolve();
                this.saveProgress();
                return;
            }

            const tileVal = movesList[i++];
            const pos = this.findTilePosition(tileVal);
            if (!pos) {
                this.stopAutoSolve();
                return;
            }

            if (this.isAdjacent(pos.row, pos.col, this.emptyPos.row, this.emptyPos.col)) {
                this.movePiece(pos.row, pos.col);

                this.moves++;
                document.getElementById('puzzleMoves').textContent = String(this.moves);

                this.saveProgress();

                if (this.isSolved()) {
                    this.stopAutoSolve();
                    this.completeSubLevel();
                }
            } else {
                this.stopAutoSolve();
            }
        }, 220);
    }

    /***********************
     * Reset Game
     ***********************/
    resetGame() {
        this.clearProgress();

        this.currentTheme = 1;
        this.currentSubLevel = 1;

        this.moves = 0;
        this.totalMoves = 0;

        this.themeMoves = 0;
        this.themeTime = 0;

        this.totalPoints = 0;

        this.gameStartTime = Date.now();

        // ✅ reset timer
        this.resetTimer();

        document.querySelectorAll('.level-card').forEach(card => card.classList.remove('active'));
        document.querySelector('[data-level="1"]')?.classList.add('active');

        this.generatePuzzle(); // generatePuzzle also resets timer
        this.updateLevelInfo();
        this.updateStageProgressUI();
        this.updateLevelCardsProgressUI();
        this.saveProgress();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function () {
    new PuzzleGame();
});
