/**
 * Spring Boot Dev Suite - TTĐT Quiz Sub-function
 * Handles 500 questions, 10 tests, localStorage tracking, wrong-question practice & review.
 */
(() => {
    'use strict';

    const KEY = 'ttdt-quiz-v2';
    
    // Ensure data exists
    const DATA = window.QUIZ_DATA || { tests: [], questions: [] };
    const byId = new Map(DATA.questions.map(q => [q.id, q]));
    
    // Element selector helper
    const $ = id => document.getElementById(id);

    // Persistence Store
    let store = { results: {}, wrong: {} };
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            store = {
                results: parsed.results || {},
                wrong: parsed.wrong || {}
            };
        }
    } catch (e) {
        console.warn('Error reading quiz store from localStorage', e);
    }

    const saveStore = () => {
        try {
            localStorage.setItem(KEY, JSON.stringify(store));
        } catch (e) {
            console.error('Error saving quiz store', e);
        }
    };

    // State
    let state = {
        ids: [],
        i: 0,
        score: 0,
        history: [],
        mode: 'test', // 'test' | 'wrong'
        testId: null,
        answered: false
    };

    // Utilities
    const shuffle = arr => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const getTestName = testId => {
        if (!testId) return '';
        const found = DATA.tests.find(t => t.id === testId);
        return found ? found.name : testId;
    };

    // -------------------------------------------------------------------------
    // View Rendering
    // -------------------------------------------------------------------------
    function renderHome() {
        const homeView = $('quiz-home-view');
        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');
        if (!homeView) return;

        // Reset state
        state.answered = false;

        // 1. Update stats overview
        const totalTests = DATA.tests.length;
        const totalQuestions = DATA.questionCount || DATA.questions.length;
        const completedTests = Object.keys(store.results).length;
        const wrongKeys = Object.keys(store.wrong);
        const wrongCount = wrongKeys.length;

        if ($('quiz-stat-tests')) $('quiz-stat-tests').textContent = totalTests;
        if ($('quiz-stat-total')) $('quiz-stat-total').textContent = totalQuestions;
        if ($('quiz-stat-completed')) $('quiz-stat-completed').textContent = `${completedTests}/${totalTests}`;
        
        if ($('quiz-stat-avg-score')) {
            if (completedTests > 0) {
                let totalScorePct = 0;
                Object.values(store.results).forEach(r => {
                    totalScorePct += (r.score / (r.total || 50)) * 100;
                });
                const avg = Math.round(totalScorePct / completedTests);
                $('quiz-stat-avg-score').textContent = `Điểm TB: ${avg}%`;
            } else {
                $('quiz-stat-avg-score').textContent = 'Chưa có điểm';
            }
        }

        if ($('quiz-wrong-count')) $('quiz-wrong-count').textContent = wrongCount;
        if ($('quiz-btn-wrong-num')) $('quiz-btn-wrong-num').textContent = wrongCount;

        // 2. Toolbar controls
        const wrongBtn = $('quiz-btn-wrong-start');
        if (wrongBtn) {
            wrongBtn.disabled = wrongCount === 0;
            wrongBtn.onclick = () => {
                if (wrongCount > 0) {
                    start(wrongKeys, 'wrong', 'WRONG');
                }
            };
        }

        const resetBtn = $('quiz-btn-reset');
        if (resetBtn) {
            resetBtn.onclick = resetAllData;
        }

        // 3. Render 10 tests cards
        const grid = $('quiz-tests-grid');
        if (grid) {
            grid.replaceChildren();
            DATA.tests.forEach(test => {
                const res = store.results[test.id];
                const card = document.createElement('div');
                card.className = 'quiz-test-card';

                const isCompleted = !!res;
                const scorePct = isCompleted ? Math.round((res.score / res.total) * 100) : 0;
                const statusBadge = isCompleted
                    ? `<span class="quiz-badge quiz-badge-success">Đã làm: ${res.score}/${res.total} (${scorePct}%)</span>`
                    : `<span class="quiz-badge quiz-badge-neutral">Chưa làm</span>`;

                const dateStr = isCompleted && res.completedAt
                    ? new Date(res.completedAt).toLocaleString('vi-VN')
                    : '50 câu hỏi trắc nghiệm';

                card.innerHTML = `
                    <div class="quiz-test-header">
                        <div class="quiz-test-info">
                            <h3>
                                <span class="quiz-badge-id">${test.id}</span>
                                ${test.name}
                            </h3>
                            <p>${test.questionIds ? test.questionIds.length : 50} câu hỏi tuyển chọn · Ngẫu nhiên thứ tự</p>
                        </div>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="quiz-test-footer">
                        <span class="quiz-test-meta-date">${isCompleted ? `Lần cuối: ${dateStr}` : 'Thời gian: ~30-45 phút'}</span>
                        <button class="btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} btn-sm quiz-start-btn">
                            ${isCompleted ? 'Làm lại đề' : 'Bắt đầu thi'}
                        </button>
                    </div>
                `;

                const btn = card.querySelector('.quiz-start-btn');
                if (btn) {
                    btn.onclick = () => start(test.questionIds, 'test', test.id);
                }

                grid.appendChild(card);
            });
        }

        // Switch to home view
        homeView.classList.remove('quiz-hidden');
        if (playView) playView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.add('quiz-hidden');
    }

    function start(ids, mode, testId) {
        if (!ids || ids.length === 0) {
            alert('Không có câu hỏi nào để bắt đầu!');
            return;
        }

        state = {
            ids: shuffle(ids),
            i: 0,
            score: 0,
            history: [],
            mode,
            testId,
            answered: false
        };

        const homeView = $('quiz-home-view');
        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');

        if (homeView) homeView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.add('quiz-hidden');
        if (playView) playView.classList.remove('quiz-hidden');

        // Scroll smoothly to player container
        const quizTab = $('quiz-tab');
        if (quizTab) quizTab.scrollIntoView({ behavior: 'smooth', block: 'start' });

        renderQuestion();
    }

    function renderQuestion() {
        state.answered = false;
        const q = byId.get(state.ids[state.i]);
        if (!q) {
            console.error('Question not found:', state.ids[state.i]);
            return;
        }

        // Shuffled copy of answers with originalIndex preserved
        q.view = shuffle(q.answers.map((text, originalIndex) => ({ text, originalIndex })));

        // 1. Top Bar / Breadcrumb
        const titleText = state.mode === 'wrong' ? 'Ôn tập câu sai' : (getTestName(state.testId) || state.testId);
        if ($('quiz-player-title')) $('quiz-player-title').textContent = titleText;
        if ($('quiz-player-current')) $('quiz-player-current').textContent = state.i + 1;
        if ($('quiz-player-total')) $('quiz-player-total').textContent = state.ids.length;
        if ($('quiz-player-score')) $('quiz-player-score').textContent = state.score;

        // Progress bar
        const progressPct = ((state.i) / state.ids.length) * 100;
        if ($('quiz-progress-fill')) $('quiz-progress-fill').style.width = `${progressPct}%`;

        // 2. Question Meta
        if ($('quiz-question-code')) $('quiz-question-code').textContent = q.code ? `Mã: ${q.code}` : '';
        if ($('quiz-question-level')) $('quiz-question-level').textContent = q.level ? `Cấp độ ${q.level}` : '';
        if ($('quiz-question-cat')) $('quiz-question-cat').textContent = q.category || '';

        // 3. Question Text
        if ($('quiz-question-text')) $('quiz-question-text').textContent = q.question;

        // 4. Answers List
        const answersBox = $('quiz-answers-box');
        if (answersBox) {
            answersBox.replaceChildren();
            q.view.forEach((ans, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quiz-answer-btn';
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                btn.innerHTML = `
                    <span class="quiz-answer-letter">${letter}</span>
                    <span class="quiz-answer-text">${ans.text}</span>
                `;
                btn.onclick = () => handleAnswer(idx);
                answersBox.appendChild(btn);
            });
        }

        // 5. Hide feedback & disable next
        const feedback = $('quiz-feedback');
        if (feedback) {
            feedback.classList.add('quiz-hidden');
            feedback.className = 'quiz-feedback-box quiz-hidden';
        }

        const nextBtn = $('quiz-btn-next');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = state.i === state.ids.length - 1
                ? 'Xem kết quả bài thi <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
                : 'Câu tiếp theo <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        }
    }

    function handleAnswer(selectedIndex) {
        if (state.answered) return;
        state.answered = true;

        const q = byId.get(state.ids[state.i]);
        const chosen = q.view[selectedIndex];
        const correctViewIndex = q.view.findIndex(x => x.originalIndex === 0);
        const isCorrect = chosen.originalIndex === 0;

        const answersBox = $('quiz-answers-box');
        const buttons = answersBox ? [...answersBox.children] : [];

        // Highlight correct and wrong answers
        if (buttons[correctViewIndex]) {
            buttons[correctViewIndex].classList.add('correct');
        }
        if (!isCorrect && buttons[selectedIndex]) {
            buttons[selectedIndex].classList.add('wrong');
        }

        // Disable all answer buttons
        buttons.forEach(btn => {
            btn.disabled = true;
        });

        // Update score & wrong store
        if (isCorrect) {
            state.score++;
            if (store.wrong[q.id]) {
                delete store.wrong[q.id];
            }
        } else {
            store.wrong[q.id] = true;
        }
        saveStore();

        // Save history
        state.history.push({
            id: q.id,
            ok: isCorrect,
            selected: chosen.text,
            correct: q.answers[0]
        });

        // Update score display
        if ($('quiz-player-score')) $('quiz-player-score').textContent = state.score;

        // Feedback banner
        const feedback = $('quiz-feedback');
        if (feedback) {
            feedback.classList.remove('quiz-hidden');
            if (isCorrect) {
                feedback.className = 'quiz-feedback-box correct';
                feedback.innerHTML = `
                    <svg viewBox="0 0 24 24" class="quiz-feedback-icon" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <div><strong>Chính xác!</strong> Đáp án của bạn hoàn toàn đúng.</div>
                `;
            } else {
                feedback.className = 'quiz-feedback-box wrong';
                feedback.innerHTML = `
                    <svg viewBox="0 0 24 24" class="quiz-feedback-icon" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <div><strong>Chưa chính xác!</strong> Đáp án đúng là: <u>${q.answers[0]}</u></div>
                `;
            }
        }

        // Enable next button
        const nextBtn = $('quiz-btn-next');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.focus();
        }
    }

    function nextQuestion() {
        if (state.i < state.ids.length - 1) {
            state.i++;
            renderQuestion();
        } else {
            finishQuiz();
        }
    }

    function finishQuiz() {
        if (state.mode === 'test') {
            store.results[state.testId] = {
                score: state.score,
                total: state.ids.length,
                completedAt: new Date().toISOString(),
                answers: state.history
            };
            saveStore();
        }

        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');
        if (playView) playView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.remove('quiz-hidden');

        // Scroll to top
        const quizTab = $('quiz-tab');
        if (quizTab) quizTab.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const total = state.ids.length;
        const score = state.score;
        const wrong = total - score;
        const pct = Math.round((score / total) * 100);

        if ($('quiz-res-score')) $('quiz-res-score').textContent = score;
        if ($('quiz-res-total')) $('quiz-res-total').textContent = total;
        if ($('quiz-res-pct')) $('quiz-res-pct').textContent = `${pct}%`;
        if ($('quiz-res-correct')) $('quiz-res-correct').textContent = score;
        if ($('quiz-res-wrong')) $('quiz-res-wrong').textContent = wrong;
        if ($('quiz-res-remaining-wrong')) $('quiz-res-remaining-wrong').textContent = Object.keys(store.wrong).length;

        // Result title based on score
        const titleEl = $('quiz-res-title');
        if (titleEl) {
            if (pct >= 90) titleEl.textContent = '🎉 Xuất sắc! Kết quả rất ấn tượng';
            else if (pct >= 70) titleEl.textContent = '👍 Tốt lắm! Đạt mức yêu cầu';
            else if (pct >= 50) titleEl.textContent = '⚡ Khá tốt, cần ôn luyện thêm các câu sai';
            else titleEl.textContent = '📚 Cần cố gắng ôn luyện thêm để nắm chắc kiến thức';
        }

        // Configure actions
        const retakeBtn = $('quiz-res-btn-retake');
        if (retakeBtn) {
            retakeBtn.onclick = () => {
                if (state.mode === 'test') {
                    const test = DATA.tests.find(t => t.id === state.testId);
                    if (test) start(test.questionIds, 'test', test.id);
                } else {
                    const wrongKeys = Object.keys(store.wrong);
                    if (wrongKeys.length > 0) start(wrongKeys, 'wrong', 'WRONG');
                    else renderHome();
                }
            };
        }

        const backBtn = $('quiz-res-btn-back');
        if (backBtn) {
            backBtn.onclick = renderHome;
        }

        const reviewWrongBtn = $('quiz-res-btn-wrong');
        if (reviewWrongBtn) {
            const wrongCount = Object.keys(store.wrong).length;
            reviewWrongBtn.style.display = wrongCount > 0 ? 'inline-flex' : 'none';
            reviewWrongBtn.onclick = () => {
                const wrongKeys = Object.keys(store.wrong);
                if (wrongKeys.length > 0) start(wrongKeys, 'wrong', 'WRONG');
            };
        }
    }

    function confirmExit() {
        if (state.answered || state.i > 0) {
            if (confirm('Bạn có chắc muốn thoát về danh sách đề? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
                renderHome();
            }
        } else {
            renderHome();
        }
    }

    function resetAllData() {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ kết quả đã làm và danh sách câu sai đã lưu không?')) {
            store = { results: {}, wrong: {} };
            saveStore();
            renderHome();
        }
    }

    // Keyboard support (1, 2, 3, 4, A, B, C, D to answer; Enter to next)
    document.addEventListener('keydown', e => {
        const playView = $('quiz-play-view');
        if (!playView || playView.classList.contains('quiz-hidden')) return;

        // If not answered yet, allow selecting A, B, C, D or 1, 2, 3, 4
        if (!state.answered) {
            const key = e.key.toUpperCase();
            let selectedIdx = -1;
            if (key === 'A' || key === '1') selectedIdx = 0;
            else if (key === 'B' || key === '2') selectedIdx = 1;
            else if (key === 'C' || key === '3') selectedIdx = 2;
            else if (key === 'D' || key === '4') selectedIdx = 3;

            if (selectedIdx !== -1) {
                const answersBox = $('quiz-answers-box');
                if (answersBox && answersBox.children[selectedIdx]) {
                    e.preventDefault();
                    handleAnswer(selectedIdx);
                }
            }
        } else {
            // Already answered, Enter or Space triggers Next
            if (e.key === 'Enter') {
                const nextBtn = $('quiz-btn-next');
                if (nextBtn && !nextBtn.disabled) {
                    e.preventDefault();
                    nextQuestion();
                }
            }
        }
    });

    // Expose public API
    window.QuizApp = {
        init: renderHome,
        renderHome,
        start,
        nextQuestion,
        confirmExit,
        resetAllData
    };

    // Auto init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderHome);
    } else {
        renderHome();
    }
})();
