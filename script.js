let currentQuestions = [];
let currentIndex = 0;
let selectedAnswers = {};
let bookmarkedQuestions = [];
let progress = loadProgress();
let timerInterval = null;
let timeLimit = 0;
let timeRemaining = 0;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadProgress();
    updateStats();
});

function setupEventListeners() {
    // 네비게이션
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pageName = e.target.dataset.page;
            switchPage(pageName);
        });
    });

    // 단원 카드 클릭
    document.querySelectorAll('.unit-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const unit = e.currentTarget.dataset.unit;
            selectSingleUnit(unit);
        });
    });
}

function switchPage(pageName) {
    // 모든 페이지 숨기기
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // 선택한 페이지 보이기
    document.getElementById(pageName).classList.add('active');

    // 네비게이션 버튼 활성화 표시
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

    // 각 페이지에 맞는 초기화
    if (pageName === 'review') {
        displayBookmarkedQuestions();
    } else if (pageName === 'stats') {
        updateStats();
    }
}

function selectSingleUnit(unit) {
    // 모든 체크박스 해제
    document.querySelectorAll('.unit-checkbox').forEach(cb => {
        cb.checked = false;
    });
    
    // 선택한 단원만 체크
    document.querySelector(`.unit-checkbox[value="${unit}"]`).checked = true;
    
    // 퀴즈 페이지로 이동
    switchPage('quiz');
}

function startQuiz() {
    // 선택된 단원 확인
    const selectedUnits = Array.from(document.querySelectorAll('.unit-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedUnits.length === 0) {
        alert('최소 하나의 단원을 선택해주세요!');
        return;
    }

    // 선택된 단원의 문제만 필터링
    currentQuestions = quizData
        .filter(q => selectedUnits.includes(q.unit))
        .sort(() => Math.random() - 0.5); // 셔플

    if (currentQuestions.length === 0) {
        alert('선택한 단원에 문제가 없습니다.');
        return;
    }

    currentIndex = 0;
    selectedAnswers = {};
    
    // 시간 제한 설정 (문제당 2분)
    timeLimit = currentQuestions.length * 2 * 60;
    timeRemaining = timeLimit;

    // UI 전환
    document.querySelector('.quiz-setup').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    document.getElementById('total-questions').textContent = currentQuestions.length;

    // 첫 번째 문제 표시
    displayQuestion();
    startTimer();
}

function displayQuestion() {
    if (currentIndex >= currentQuestions.length) {
        finishQuiz();
        return;
    }

    const question = currentQuestions[currentIndex];
    
    // 진행도 업데이트
    document.getElementById('current-question').textContent = currentIndex + 1;
    
    // 문제 표시
    document.getElementById('question-text').textContent = question.question;
    
    // 선택지 표시
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
        
        // 이전에 선택한 답변이 있으면 표시
        if (selectedAnswers[currentIndex] === index) {
            optionDiv.classList.add('selected');
        }
        
        optionDiv.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionDiv);
    });

    // 북마크 버튼 업데이트
    updateBookmarkButton();
}

function selectOption(index) {
    selectedAnswers[currentIndex] = index;
    
    // UI 업데이트
    document.querySelectorAll('.option').forEach((opt, i) => {
        opt.classList.remove('selected');
        if (i === index) {
            opt.classList.add('selected');
        }
    });
}

function nextQuestion() {
    if (selectedAnswers[currentIndex] === undefined) {
        alert('답변을 선택해주세요!');
        return;
    }
    
    currentIndex++;
    displayQuestion();
}

function toggleBookmark() {
    const questionIndex = currentIndex;
    const isBookmarked = bookmarkedQuestions.includes(questionIndex);
    
    if (isBookmarked) {
        bookmarkedQuestions = bookmarkedQuestions.filter(i => i !== questionIndex);
    } else {
        bookmarkedQuestions.push(questionIndex);
    }
    
    updateBookmarkButton();
}

function updateBookmarkButton() {
    const btn = document.querySelector('.action-buttons .btn-secondary');
    const isBookmarked = bookmarkedQuestions.includes(currentIndex);
    btn.textContent = isBookmarked ? '⭐ 북마크 해제' : '⭐ 북마크';
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timer').textContent = 
        `⏱️ ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function finishQuiz() {
    clearInterval(timerInterval);
    
    // 결과 계산
    let correctCount = 0;
    currentQuestions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.answer) {
            correctCount++;
        }
    });
    
    const score = Math.round((correctCount / currentQuestions.length) * 100);
    
    // 성적 저장
    progress.completed.push({
        date: new Date().toLocaleString('ko-KR'),
        questions: currentQuestions.length,
        correct: correctCount,
        score: score,
        answers: selectedAnswers
    });
    progress.bookmarked = bookmarkedQuestions;
    saveProgress(progress);
    
    // 결과 모달 표시
    showResultModal(correctCount, currentQuestions.length, score);
}

function showResultModal(correct, total, score) {
    const modal = document.getElementById('answer-modal');
    const body = document.getElementById('modal-body');
    
    body.innerHTML = `
        <div class="answer-info">
            <h4>🎉 풀이 완료!</h4>
            <p><strong>정답: ${correct}/${total}</strong></p>
            <p><strong>정답률: ${score}%</strong></p>
        </div>
        <div style="margin-top: 20px;">
            <button class="btn btn-primary" onclick="reviewAnswers()">답안 검토</button>
            <button class="btn btn-secondary" onclick="returnToHome()">홈으로</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function reviewAnswers() {
    closeModal();
    switchPage('quiz');
    
    document.querySelector('.quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-container').classList.add('hidden');
    
    // 검토 모드 시작
    currentIndex = 0;
    displayReviewQuestion();
}

function displayReviewQuestion() {
    if (currentIndex >= currentQuestions.length) {
        returnToHome();
        return;
    }
    
    const question = currentQuestions[currentIndex];
    const userAnswer = selectedAnswers[currentIndex];
    const isCorrect = userAnswer === question.answer;
    
    const modal = document.getElementById('answer-modal');
    const body = document.getElementById('modal-body');
    
    const answerText = isCorrect ? '✅ 정답' : '❌ 오답';
    const answerClass = isCorrect ? 'correct' : 'incorrect';
    
    body.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>${currentIndex + 1}. ${question.question}</h4>
        </div>
        <div class="answer-info ${answerClass}">
            <p><strong>당신의 답:</strong> ${String.fromCharCode(65 + userAnswer)}. ${question.options[userAnswer]}</p>
            <p><strong>정답:</strong> ${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}</p>
            <p style="margin-top: 10px;"><strong>${answerText}</strong></p>
        </div>
        <div class="explanation">
            <h5>📝 해설</h5>
            <p>${question.explanation}</p>
        </div>
        <div style="margin-top: 20px;">
            <button class="btn btn-secondary" onclick="previousReview()" ${currentIndex === 0 ? 'disabled' : ''}">이전</button>
            <button class="btn btn-primary" onclick="nextReview()" ${currentIndex === currentQuestions.length - 1 ? 'disabled' : ''}">다음</button>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function previousReview() {
    currentIndex--;
    displayReviewQuestion();
}

function nextReview() {
    currentIndex++;
    displayReviewQuestion();
}

function displayBookmarkedQuestions() {
    const container = document.getElementById('bookmarked-questions');
    
    if (bookmarkedQuestions.length === 0) {
        container.innerHTML = '<div class="question-item empty">북마크된 문제가 없습니다. 문제풀이 중에 별(⭐) 버튼을 눌러 북마크해주세요.</div>';
        return;
    }
    
    container.innerHTML = '';
    bookmarkedQuestions.forEach((idx) => {
        if (idx < currentQuestions.length) {
            const q = currentQuestions[idx];
            const item = document.createElement('div');
            item.className = 'question-item';
            item.innerHTML = `
                <h4>${q.question}</h4>
                <p><strong>단원:</strong> ${q.unit}단원</p>
                <button class="btn btn-secondary" onclick="focusQuestion(${idx})">이 문제 풀기</button>
            `;
            container.appendChild(item);
        }
    });
}

function updateStats() {
    // 전체 통계
    let totalCorrect = 0;
    let totalQuestions = 0;
    const unitStats = {};
    
    // 6개 단원 초기화
    for (let i = 1; i <= 6; i++) {
        unitStats[i] = { correct: 0, total: 0 };
    }
    
    progress.completed.forEach(session => {
        totalCorrect += session.correct;
        totalQuestions += session.questions;
    });
    
    // 단원별 통계 계산
    quizData.forEach((q, idx) => {
        if (selectedAnswers[idx] !== undefined) {
            unitStats[q.unit].total++;
            if (selectedAnswers[idx] === q.answer) {
                unitStats[q.unit].correct++;
            }
        }
    });
    
    // 전체 정답률
    const overallRate = totalQuestions === 0 ? 0 : Math.round((totalCorrect / totalQuestions) * 100);
    document.getElementById('overall-rate').textContent = `${overallRate}%`;
    document.getElementById('total-solved').textContent = totalQuestions;
    document.getElementById('correct-count').textContent = totalCorrect;
    
    // 단원별 정답률
    const unitStatsList = document.getElementById('unit-stats-list');
    unitStatsList.innerHTML = '';
    
    for (let i = 1; i <= 6; i++) {
        const stats = unitStats[i];
        const rate = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
        
        const item = document.createElement('div');
        item.className = 'unit-stat-item';
        item.innerHTML = `
            <span class="unit-stat-name">${i}단원</span>
            <div class="unit-stat-bar">
                <div class="unit-stat-fill" style="width: ${rate}%"></div>
            </div>
            <span class="unit-stat-rate">${rate}%</span>
        `;
        unitStatsList.appendChild(item);
    }
}

function closeModal() {
    document.getElementById('answer-modal').classList.add('hidden');
}

function returnToHome() {
    closeModal();
    document.querySelector('.quiz-setup').classList.remove('hidden');
    document.getElementById('quiz-container').classList.add('hidden');
    switchPage('home');
}