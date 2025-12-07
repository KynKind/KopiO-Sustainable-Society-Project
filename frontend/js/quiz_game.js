// Quiz Game Logic with API Integration
class QuizGame {
    constructor() {
        this.currentQuestion = 0;
        this.score = 0;
        this.timer = 60;
        this.startTime = Date.now();
        this.timerInterval = null;
        this.questions = [];
        this.selectedOption = null;
        this.answers = [];
        
        this.loadQuestions();
    }

    async loadQuestions() {
        try {
            const data = await apiRequest('/games/quiz/questions');
            this.questions = data.questions;
            this.timer = data.timeLimit || 60;
            
            // Initialize the game after questions are loaded
            this.initializeGame();
            
        } catch (error) {
            console.error('Error loading questions:', error);
            showMessage('Failed to load quiz questions. Please try again.', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    initializeGame() {
        this.setupEventListeners();
        this.startTimer();
        this.displayQuestion();
        this.updateProgress();
    }

    setupEventListeners() {
        // Option selection
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectOption(e.currentTarget);
            });
        });

        // Submit button
        document.getElementById('submitButton').addEventListener('click', () => {
            this.submitAnswer();
        });

        // Next button
        document.getElementById('nextButton').addEventListener('click', () => {
            this.nextQuestion();
        });
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer--;
            document.getElementById('timer').textContent = `${this.timer}s`;
            
            if (this.timer <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    displayQuestion() {
        if (!this.questions || this.questions.length === 0) {
            console.error('No questions available');
            return;
        }

        const question = this.questions[this.currentQuestion];
        const questionElement = document.getElementById('questionText');
        const optionsContainer = document.getElementById('optionsContainer');
        
        questionElement.textContent = question.question;
        optionsContainer.innerHTML = '';

        const optionLetters = ['A', 'B', 'C', 'D'];
        
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.setAttribute('data-correct', index); // Store index instead of boolean
            optionElement.innerHTML = `
                <span class="option-letter">${optionLetters[index]}</span>
                <span class="option-text">${option}</span>
            `;
            optionsContainer.appendChild(optionElement);
        });

        // Re-attach event listeners to new options
        document.querySelectorAll('.option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectOption(e.currentTarget);
            });
        });

        this.updateProgress();
    }

    selectOption(optionElement) {
        // Remove selection from all options
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected');
        });

        // Add selection to clicked option
        optionElement.classList.add('selected');
        this.selectedOption = optionElement;

        // Enable submit button
        document.getElementById('submitButton').disabled = false;
    }

    submitAnswer() {
        if (!this.selectedOption) return;

        const selectedIndex = Array.from(document.querySelectorAll('.option')).indexOf(this.selectedOption);
        const question = this.questions[this.currentQuestion];
        
        // Store answer
        this.answers.push({
            questionId: question.id,
            answer: selectedIndex
        });

        const isCorrect = selectedIndex === parseInt(this.selectedOption.getAttribute('data-correct'));
        const feedbackContainer = document.getElementById('feedbackContainer');
        const correctFeedback = feedbackContainer.querySelector('.correct');
        const incorrectFeedback = feedbackContainer.querySelector('.incorrect');
        const funFactElement = document.getElementById('funFact');

        // Show feedback
        feedbackContainer.style.display = 'block';
        
        if (isCorrect) {
            correctFeedback.style.display = 'flex';
            incorrectFeedback.style.display = 'none';
            this.score += 10;
            
            // Bonus points for speed
            if (this.timer > 45) this.score += 5;
            else if (this.timer > 30) this.score += 3;
            
            this.animatePoints();
        } else {
            correctFeedback.style.display = 'none';
            incorrectFeedback.style.display = 'flex';
            
            // Show correct answer
            document.querySelectorAll('.option').forEach(option => {
                if (parseInt(option.getAttribute('data-correct')) === selectedIndex) {
                    option.classList.add('correct');
                }
            });
        }

        // Update fun fact (if available from previous API call)
        if (question.fact) {
            funFactElement.textContent = question.fact;
        }

        // Show correct answer in feedback
        const correctAnswer = question.options[selectedIndex];
        incorrectFeedback.querySelector('span').textContent = `Not quite right. The correct answer is ${correctAnswer}.`;

        // Update UI
        document.getElementById('submitButton').style.display = 'none';
        document.getElementById('nextButton').style.display = 'inline-block';

        // Disable all options
        document.querySelectorAll('.option').forEach(option => {
            option.style.pointerEvents = 'none';
        });
    }

    nextQuestion() {
        this.currentQuestion++;
        
        if (this.currentQuestion >= this.questions.length) {
            this.endGame();
            return;
        }

        // Reset for next question
        this.selectedOption = null;
        document.getElementById('submitButton').style.display = 'inline-block';
        document.getElementById('nextButton').style.display = 'none';
        document.getElementById('feedbackContainer').style.display = 'none';
        document.getElementById('submitButton').disabled = true;

        this.displayQuestion();
    }

    updateProgress() {
        const progress = ((this.currentQuestion + 1) / this.questions.length) * 100;
        document.getElementById('quizProgress').style.width = `${progress}%`;
        document.getElementById('questionCount').textContent = `${this.currentQuestion + 1}/${this.questions.length}`;
        document.getElementById('currentScore').textContent = this.score;
    }

    animatePoints() {
        const scoreElement = document.getElementById('currentScore');
        scoreElement.style.transform = 'scale(1.2)';
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
        }, 300);
    }

    async endGame() {
        clearInterval(this.timerInterval);
        
        // Calculate time taken
        const timeTaken = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Submit score to backend
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

        const pointsEarned = result ? result.points : this.score;
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
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Quiz Complete! 🎉</h2>
                <div class="final-stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 1rem;">
                        ${pointsEarned} Points
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">Correct Answers: ${result ? result.score : 0}/${result ? result.totalQuestions : this.questions.length}</p>
                    ${timeBonus > 0 ? `<p style="color: var(--primary-brown);">Time Bonus: +${timeBonus} pts!</p>` : ''}
                </div>
                <div class="modal-actions" style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="playAgain" class="btn">Play Again</button>
                    <button id="backToHome" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners for modal buttons
        document.getElementById('playAgain').addEventListener('click', () => {
            window.location.reload();
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    async saveScore(timeTaken) {
        try {
            const result = await apiRequest('/games/quiz/submit', {
                method: 'POST',
                body: JSON.stringify({
                    answers: this.answers,
                    timeTaken: timeTaken
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
            // Still show game over modal with local score
            this.showGameOverModal(null);
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    new QuizGame();
});