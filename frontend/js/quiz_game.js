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
        
        this.correctAnswersCount = 0;
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

    async submitAnswer() {
        if (!this.selectedOption) return;
        const selectedOptionElement = this.selectedOption;
        const selectedIndex = Array.from(document.querySelectorAll('.option')).indexOf(selectedOptionElement);
        const question = this.questions[this.currentQuestion];

        // Store answer locally with question data - ADD DEBUG LOG
        const answerData = {
            questionId: question.id,
            answer: selectedIndex,
            isCorrect: false // Initialize as false by default
        };
        
        console.log('Submitting answer for question:', this.currentQuestion, 'selected index:', selectedIndex);

        // Disable submission and options
        document.getElementById('submitButton').disabled = true;
        document.querySelectorAll('.option').forEach(option => {
            option.style.pointerEvents = 'none';
        });

        try {
            const result = await apiRequest('/games/quiz/check_answer', {
                method: 'POST',
                body: JSON.stringify({
                    questionId: question.id,
                    userAnswer: selectedIndex
                })
            });
            
            console.log('Backend response:', result);

            // Mark if the answer was correct and store it
            if (result && result.isCorrect) {
                const pointsAwarded = result.pointsAwarded || 100;
                this.score += pointsAwarded;
                document.getElementById('currentScore').textContent = this.score;
                this.animatePoints();
                
                // Mark as correct
                selectedOptionElement.classList.add('correct');
                
                // Store that this answer was correct
                answerData.isCorrect = true;
                this.correctAnswersCount++;
                console.log('Answer marked as CORRECT');
            } else {
                selectedOptionElement.classList.add('incorrect');
                
                // Store that this answer was incorrect
                // answerData.isCorrect is already false by default, but we can explicitly set it
                answerData.isCorrect = false; // EXPLICITLY SET TO FALSE
                console.log('Answer marked as INCORRECT');
                
                // If backend returns correct answer index, highlight it
                if (result && result.correctAnswerIndex !== undefined) {
                    const options = document.querySelectorAll('.option');
                    if (options[result.correctAnswerIndex]) {
                        options[result.correctAnswerIndex].classList.add('correct-answer');
                    }
                }
            }

            // Add the answer to our answers array
            this.answers.push(answerData);
            console.log('Current answers array:', this.answers);
            console.log('Correct answers so far:', this.answers.filter(a => a.isCorrect).length);

        } catch (error) {
            console.error('Error submitting answer:', error);
            showMessage('Failed to check answer.', 'error');
            document.getElementById('submitButton').disabled = false;
            document.querySelectorAll('.option').forEach(option => {
                option.style.pointerEvents = 'auto';
            });
            return;
        }

        // Update UI to show Next button
        document.getElementById('submitButton').style.display = 'none';
        document.getElementById('nextButton').style.display = 'inline-block';
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

    // FIX: Re-enable clicking on options
    document.querySelectorAll('.option').forEach(option => {
        option.style.pointerEvents = 'auto';
        option.classList.remove('selected', 'correct', 'incorrect');
    });

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
            
            // Submit final results using the answers array
            await this.finalSubmit(timeTaken); // Renamed function
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
                    <p style="color: var(--text-dark); margin-bottom: 0.5rem; font-size: 1.2rem;">
                        Correct Answers: ${result ? (result.correctCount || result.score || 0) : 0}/${result ? result.totalQuestions : this.questions.length}
                    </p>
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

    async finalSubmit(timeTaken) { 
        try {
            console.log('Final submit - answers array:', this.answers);
            console.log('Correct answers count from tracking:', this.correctAnswersCount);
            
            // Use the tracked count
            const correctCount = this.correctAnswersCount;
            
            const result = await apiRequest('/games/quiz/final_submit', {
                method: 'POST',
                body: JSON.stringify({
                    answers: this.answers,
                    timeTaken: timeTaken
                })
            });
            
            this.showGameOverModal({
                ...result,
                correctCount: correctCount,
                totalQuestions: this.questions.length
            });
            
        } catch (error) {
            console.error('Error submitting final results:', error);
            this.showGameOverModal({
                correctCount: this.correctAnswersCount,
                totalQuestions: this.questions.length,
                points: this.score,
                timeBonus: Math.max(0, 60 - timeTaken) * 10
            });
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    new QuizGame();
});