// Quiz Game Logic - UPDATED FOR FLASK BACKEND
class QuizGame {
    constructor() {
        this.currentQuestion = 0;
        this.score = 0;
        this.timer = 60;
        this.timerInterval = null;
        this.questions = this.getQuestions();
        this.selectedOption = null;
        this.startTime = Date.now();
        
        this.initializeGame();
    }

    getQuestions() {
        return [
            {
                question: "Which of these materials takes the longest to decompose in nature?",
                options: ["Paper cup", "Banana peel", "Plastic bottle", "Cotton T-shirt"],
                correct: 2,
                fact: "Plastic bottles can take up to 450 years to decompose in nature!"
            },
            {
                question: "What is the most energy-efficient way to wash clothes?",
                options: ["Hot water cycle", "Warm water cycle", "Cold water cycle", "All use same energy"],
                correct: 2,
                fact: "Washing clothes in cold water saves 90% of the energy used by hot water cycles!"
            },
            {
                question: "Which activity saves the most water?",
                options: ["Turning off tap while brushing teeth", "Taking 5-minute showers", "Fixing a leaky faucet", "Using a dishwasher"],
                correct: 1,
                fact: "A 5-minute shower uses about 40 liters of water, while a 10-minute shower uses 80 liters!"
            },
            {
                question: "What percentage of plastic waste is actually recycled globally?",
                options: ["9%", "25%", "50%", "75%"],
                correct: 0,
                fact: "Only 9% of all plastic ever produced has been recycled. The rest ends up in landfills or oceans."
            },
            {
                question: "Which food has the highest carbon footprint?",
                options: ["Beef", "Chicken", "Tofu", "Local vegetables"],
                correct: 0,
                fact: "Beef production produces 5 times more greenhouse gases than chicken and 20 times more than plant-based proteins!"
            }
        ];
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
        const question = this.questions[this.currentQuestion];
        const questionElement = document.getElementById('questionText');
        const optionsContainer = document.getElementById('optionsContainer');
        
        questionElement.textContent = question.question;
        optionsContainer.innerHTML = '';

        const optionLetters = ['A', 'B', 'C', 'D'];
        
        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.setAttribute('data-correct', index === question.correct);
            optionElement.innerHTML = `
                <span class="option-letter">${optionLetters[index]}</span>
                <span class="option-text">${option}</span>
            `;
            optionsContainer.appendChild(optionElement);
        });

        // Re-attach event listeners
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

    async submitAnswer() {
        if (!this.selectedOption) return;

        const isCorrect = this.selectedOption.getAttribute('data-correct') === 'true';
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
                if (option.getAttribute('data-correct') === 'true') {
                    option.classList.add('correct');
                }
            });
        }

        // Update fun fact
        funFactElement.textContent = this.questions[this.currentQuestion].fact;

        // Show correct answer in feedback
        const correctAnswer = this.questions[this.currentQuestion].options[this.questions[this.currentQuestion].correct];
        incorrectFeedback.querySelector('span').textContent = `Not quite right. The correct answer is ${correctAnswer}.`;

        // Update UI
        document.getElementById('submitButton').style.display = 'none';
        document.getElementById('nextButton').style.display = 'inline-block';

        // Disable all options
        document.querySelectorAll('.option').forEach(option => {
            option.style.pointerEvents = 'none';
        });
    }

    async nextQuestion() {
        this.currentQuestion++;
        
        if (this.currentQuestion >= this.questions.length) {
            await this.endGame();
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
        
        // Calculate final score
        const timeBonus = Math.floor(this.timer / 5);
        this.score += timeBonus;
        
        // Calculate time spent
        const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
        
        // Submit score to backend
        await this.submitScore(timeSpent);
        
        // Show game over modal
        this.showGameOverModal();
    }

    async submitScore(timeSpent) {
        try {
            const result = await submitGameScore(
                'quiz', 
                this.score, 
                timeSpent,
                1,
                {
                    questions_answered: this.currentQuestion + 1,
                    total_questions: this.questions.length,
                    time_remaining: this.timer
                }
            );
            
            if (result.success) {
                console.log('Quiz score submitted to backend:', result);
            }
        } catch (error) {
            console.error('Failed to submit quiz score:', error);
        }
    }

    showGameOverModal() {
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
                <h2 style="color: var(--dark-brown); margin-bottom: 1rem;">Quiz Complete! 🎉</h2>
                <div class="final-stats" style="margin-bottom: 2rem;">
                    <div style="font-size: 3rem; color: var(--primary-brown); font-weight: 700; margin-bottom: 1rem;">
                        ${this.score} Points
                    </div>
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem;">You answered ${this.currentQuestion + 1} questions</p>
                    <p style="color: var(--text-dark);">Time remaining: ${this.timer}s</p>
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
            document.body.removeChild(modal);
            this.restartGame();
        });

        document.getElementById('backToHome').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    restartGame() {
        this.currentQuestion = 0;
        this.score = 0;
        this.timer = 60;
        this.selectedOption = null;
        this.startTime = Date.now();
        
        clearInterval(this.timerInterval);
        this.startTimer();
        this.displayQuestion();
        
        document.getElementById('timer').textContent = '60s';
        document.getElementById('currentScore').textContent = '0';
        document.getElementById('submitButton').disabled = true;
        document.getElementById('submitButton').style.display = 'inline-block';
        document.getElementById('nextButton').style.display = 'none';
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
    
    new QuizGame();
});