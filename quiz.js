/**
 * Spring Boot Dev Suite - TTĐT Quiz Sub-function (v3.0)
 * Handles 502 questions, 12 sheets P01-P39, 10 tests, Level practice,
 * Dual wrong-question queues, detailed review breakdown, and Basic Auth Gatekeeper.
 */
(() => {
    'use strict';

    const KEY = 'ttdt-quiz-v3';
    const L = 'ABCD';
    const MODES = {
        test: 'Đề thi',
        wrong: 'Ôn lại câu sai',
        ever: 'Các câu đã từng sai',
        level: 'Ôn theo cấp độ'
    };

    // Ensure data exists
    const DATA = window.QUIZ_DATA || { tests: [], questions: [], categories: {} };
    DATA.categories = DATA.categories || {};
    const byId = new Map((DATA.questions || []).map(q => [q.id, q]));

    // Element selector helper
    const $ = id => document.getElementById(id);

    // Persistence Store
    let store = { results: {}, wrong: {}, everWrong: {} };
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            store = Object.assign({ results: {}, wrong: {}, everWrong: {} }, JSON.parse(raw));
        } else {
            // Optional migration from v2
            const v2Raw = localStorage.getItem('ttdt-quiz-v2');
            if (v2Raw) {
                const v2 = JSON.parse(v2Raw);
                store.results = v2.results || {};
                store.wrong = v2.wrong || {};
                store.everWrong = Object.assign({}, v2.wrong || {});
            }
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

    const valid = o => Object.keys(o || {}).filter(id => byId.has(id));

    // -------------------------------------------------------------------------
    // Basic Authentication Gatekeeper
    // -------------------------------------------------------------------------
    const AUTH_KEY = 'ttdt_quiz_auth';
    const AUTH_USER = 'ttdt';
    const AUTH_PASS = 'ttdt@123';

    const isAuthenticated = () => {
        return sessionStorage.getItem(AUTH_KEY) === '1';
    };

    function updateAuthStateUI() {
        const authGate = $('quiz-auth-gate');
        const content = $('quiz-authenticated-content');
        const headerActions = $('quiz-header-actions');
        const isAuth = isAuthenticated();

        if (authGate) authGate.style.display = isAuth ? 'none' : 'flex';
        if (content) content.style.display = isAuth ? 'block' : 'none';
        if (headerActions) headerActions.style.display = isAuth ? 'block' : 'none';

        if (isAuth) {
            renderHome();
        } else {
            const errorEl = $('quiz-auth-error');
            if (errorEl) {
                errorEl.style.display = 'none';
                errorEl.textContent = '';
            }
            const userEl = $('quiz-auth-user');
            const passEl = $('quiz-auth-pass');
            if (userEl) userEl.value = '';
            if (passEl) passEl.value = '';
        }
    }

    function handleAuthSubmit() {
        const userEl = $('quiz-auth-user');
        const passEl = $('quiz-auth-pass');
        const errorEl = $('quiz-auth-error');

        const username = (userEl ? userEl.value : '').trim();
        const password = (passEl ? passEl.value : '');

        if (username === AUTH_USER && password === AUTH_PASS) {
            sessionStorage.setItem(AUTH_KEY, '1');
            if (errorEl) {
                errorEl.style.display = 'none';
                errorEl.textContent = '';
            }
            updateAuthStateUI();
        } else {
            if (errorEl) {
                errorEl.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Tên đăng nhập hoặc mật khẩu không chính xác!</span>
                `;
                errorEl.style.display = 'flex';
            }
            if (passEl) {
                passEl.value = '';
                passEl.focus();
            }
        }
    }

    function logout() {
        if (!confirm('Bạn có chắc chắn muốn khóa và đăng xuất khỏi phần ôn luyện TTĐT không?')) {
            return;
        }
        sessionStorage.removeItem(AUTH_KEY);
        updateAuthStateUI();
    }

    // -------------------------------------------------------------------------
    // Quiz State & Helper Functions
    // -------------------------------------------------------------------------
    let state = null;

    const shuffle = arr => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const escapeHtml = str => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    // -------------------------------------------------------------------------
    // View Rendering
    // -------------------------------------------------------------------------
    function renderHome() {
        const homeView = $('quiz-home-view');
        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');
        if (!homeView) return;

        state = null;

        const w = valid(store.wrong);
        const e = valid(store.everWrong);

        // 1. Overview metrics
        if ($('quiz-stat-tests')) $('quiz-stat-tests').textContent = DATA.tests.length;
        if ($('quiz-stat-total')) $('quiz-stat-total').textContent = DATA.questions.length;
        if ($('quiz-wrong-count')) $('quiz-wrong-count').textContent = w.length;
        if ($('quiz-ever-count')) $('quiz-ever-count').textContent = e.length;

        // 2. Wrong questions practice buttons
        if ($('quiz-btn-wrong-num')) $('quiz-btn-wrong-num').textContent = w.length;
        if ($('quiz-btn-ever-num')) $('quiz-btn-ever-num').textContent = e.length;
        if ($('quiz-btn-wrong-start')) {
            $('quiz-btn-wrong-start').disabled = !w.length;
            $('quiz-btn-wrong-start').onclick = () => start(w, 'wrong', 'Câu sai đang chờ');
        }
        if ($('quiz-btn-ever-start')) {
            $('quiz-btn-ever-start').disabled = !e.length;
            $('quiz-btn-ever-start').onclick = () => start(e, 'ever', 'Đã từng sai');
        }

        // 3. Render Levels 1..4
        const levelsBox = $('quiz-levels-grid');
        if (levelsBox) {
            levelsBox.replaceChildren();
            ['1', '2', '3', '4'].forEach(lvl => {
                const ids = DATA.questions.filter(q => String(q.level) === lvl).map(q => q.id);
                const card = document.createElement('div');
                card.className = 'quiz-level-card';
                card.innerHTML = `
                    <span class="quiz-level-label">Cấp độ ${lvl}</span>
                    <strong>${ids.length} câu</strong>
                    <button class="btn btn-secondary btn-sm" style="margin-top: 4px;" ${!ids.length ? 'disabled' : ''}>
                        Ôn cấp độ ${lvl}
                    </button>
                `;
                const btn = card.querySelector('button');
                if (btn && ids.length) {
                    btn.onclick = () => start(ids, 'level', 'Cấp độ ' + lvl);
                }
                levelsBox.appendChild(card);
            });
        }

        // 4. Render 10 Tests cards
        const testsGrid = $('quiz-tests-grid');
        if (testsGrid) {
            testsGrid.replaceChildren();
            DATA.tests.forEach(test => {
                const res = store.results[test.id];
                const card = document.createElement('div');
                card.className = 'quiz-test-card';

                const isCompleted = !!res;
                const scorePct = isCompleted ? Math.round((res.score / (res.total || 50)) * 100) : 0;
                const statusBadge = isCompleted
                    ? `<span class="quiz-badge quiz-badge-success">Đã làm: ${res.score}/${res.total} (${scorePct}%)</span>`
                    : `<span class="quiz-badge quiz-badge-neutral">Chưa làm</span>`;

                const dateStr = isCompleted && res.completedAt
                    ? new Date(res.completedAt).toLocaleString('vi-VN')
                    : `${test.questionIds.length} câu hỏi trắc nghiệm`;

                card.innerHTML = `
                    <div class="quiz-test-header">
                        <div class="quiz-test-info">
                            <h3>
                                <span class="quiz-badge-id">${test.id}</span>
                                ${test.name}
                            </h3>
                            <p>${test.questionIds.length} câu hỏi chuẩn · Đảo ngẫu nhiên câu & đáp án</p>
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
                    btn.onclick = () => start(test.questionIds, 'test', test.name, test.id);
                }

                testsGrid.appendChild(card);
            });
        }

        // 5. Reset buttons
        const resetBtn = $('quiz-btn-reset');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('Xoá kết quả các đề và danh sách câu sai đang chờ ôn?\n(Danh sách "Các câu đã từng sai" vẫn được giữ nguyên.)')) {
                    store.results = {};
                    store.wrong = {};
                    saveStore();
                    renderHome();
                }
            };
        }

        const resetAllBtn = $('quiz-btn-reset-all');
        if (resetAllBtn) {
            resetAllBtn.onclick = () => {
                if (confirm('Xoá TOÀN BỘ dữ liệu: kết quả các đề, câu sai đang chờ ôn VÀ danh sách "Các câu đã từng sai"?\nThao tác này không thể hoàn tác.')) {
                    store.results = {};
                    store.wrong = {};
                    store.everWrong = {};
                    saveStore();
                    renderHome();
                }
            };
        }

        // Switch to home view
        homeView.classList.remove('quiz-hidden');
        if (playView) playView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.add('quiz-hidden');
    }

    function start(ids, mode, label, testId) {
        if (!ids || ids.length === 0) {
            alert('Không có câu hỏi nào để ôn luyện!');
            return;
        }

        state = {
            ids: shuffle(ids),
            i: 0,
            score: 0,
            history: [],
            mode: mode || 'test',
            label: label || '',
            testId: testId || null,
            answered: false,
            view: []
        };

        const homeView = $('quiz-home-view');
        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');

        if (homeView) homeView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.add('quiz-hidden');
        if (playView) playView.classList.remove('quiz-hidden');

        // Scroll to quiz container
        const quizTab = $('quiz-tab');
        if (quizTab) quizTab.scrollIntoView({ behavior: 'smooth', block: 'start' });

        renderQuestion();
    }

    function renderQuestion() {
        if (!state) return;
        state.answered = false;

        const q = byId.get(state.ids[state.i]);
        if (!q) {
            console.error('Question not found:', state.ids[state.i]);
            return;
        }

        // Shuffled view of answers with orig index preserved
        state.view = shuffle(q.answers.map((text, orig) => ({ text, orig })));

        // 1. Top Bar / Breadcrumb
        const modeTitle = MODES[state.mode] || 'Ôn tập';
        const titleText = `${modeTitle} · ${state.label}`;
        if ($('quiz-player-title')) $('quiz-player-title').textContent = titleText;
        if ($('quiz-player-current')) $('quiz-player-current').textContent = state.i + 1;
        if ($('quiz-player-total')) $('quiz-player-total').textContent = state.ids.length;
        if ($('quiz-player-score')) $('quiz-player-score').textContent = state.score;

        // Progress track
        const progressPct = ((state.i) / state.ids.length) * 100;
        if ($('quiz-progress-fill')) $('quiz-progress-fill').style.width = `${progressPct}%`;

        // 2. Question Meta
        const catName = DATA.categories[q.code] || q.category || 'Nghiệp vụ thanh toán';
        if ($('quiz-question-code')) $('quiz-question-code').textContent = q.code ? q.code : 'Q';
        if ($('quiz-question-level')) $('quiz-question-level').textContent = q.level ? `Cấp độ ${q.level}` : '';
        if ($('quiz-question-cat')) $('quiz-question-cat').textContent = catName;

        // 3. Question Text
        if ($('quiz-question-text')) $('quiz-question-text').textContent = q.question;

        // 4. Answer options
        const answersBox = $('quiz-answers-box');
        if (answersBox) {
            answersBox.replaceChildren();
            state.view.forEach((ans, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'quiz-answer-btn';
                const letter = L[idx] || String.fromCharCode(65 + idx);
                btn.innerHTML = `
                    <span class="quiz-answer-letter">${letter}</span>
                    <span class="quiz-answer-text">${escapeHtml(ans.text)}</span>
                    <span class="mark" style="margin-left:auto; font-weight:700;"></span>
                `;
                btn.onclick = () => handleAnswer(idx);
                answersBox.appendChild(btn);
            });
        }

        // 5. Feedback Box
        const feedback = $('quiz-feedback');
        if (feedback) {
            feedback.className = 'quiz-feedback-box quiz-hidden';
            feedback.textContent = '';
        }

        // 6. Next Button
        const nextBtn = $('quiz-btn-next');
        if (nextBtn) {
            nextBtn.disabled = true;
            nextBtn.innerHTML = state.i === state.ids.length - 1
                ? 'Xem kết quả bài thi <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>'
                : 'Câu tiếp theo <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
        }
    }

    function handleAnswer(selectedIndex) {
        if (!state || state.answered) return;
        state.answered = true;

        const q = byId.get(state.ids[state.i]);
        const chosen = state.view[selectedIndex];
        const ci = state.view.findIndex(x => x.orig === 0);
        const ok = chosen.orig === 0;

        const answersBox = $('quiz-answers-box');
        const buttons = answersBox ? [...answersBox.children] : [];

        // Disable all buttons and show marks
        buttons.forEach(btn => {
            btn.disabled = true;
        });

        if (buttons[ci]) {
            buttons[ci].classList.add('correct');
            const mark = buttons[ci].querySelector('.mark');
            if (mark) mark.textContent = '✓';
        }
        if (!ok && buttons[selectedIndex]) {
            buttons[selectedIndex].classList.add('wrong');
            const mark = buttons[selectedIndex].querySelector('.mark');
            if (mark) mark.textContent = '✗';
        }

        // Update score & stores
        const feedback = $('quiz-feedback');
        if (ok) {
            state.score++;
            const was = !!store.wrong[q.id];
            delete store.wrong[q.id];

            if (feedback) {
                feedback.className = 'quiz-feedback-box correct';
                const note = was && state.mode !== 'test'
                    ? ' Câu này đã được gỡ khỏi danh sách câu sai.'
                    : was ? ' (Đã gỡ khỏi danh sách câu sai.)' : '';
                feedback.innerHTML = `
                    <svg viewBox="0 0 24 24" class="quiz-feedback-icon" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <div><strong>Chính xác!</strong> ${note}</div>
                `;
            }
        } else {
            store.wrong[q.id] = true;
            store.everWrong[q.id] = (store.everWrong[q.id] || 0) + 1;

            if (feedback) {
                feedback.className = 'quiz-feedback-box wrong';
                feedback.innerHTML = `
                    <svg viewBox="0 0 24 24" class="quiz-feedback-icon" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <div><strong>Chưa chính xác!</strong> Đáp án đúng là <b>${L[ci]}:</b> ${escapeHtml(q.answers[0])}</div>
                `;
            }
        }

        saveStore();

        state.history.push({
            id: q.id,
            ok,
            selected: chosen.text,
            correct: q.answers[0]
        });

        if ($('quiz-player-score')) $('quiz-player-score').textContent = state.score;

        if (feedback) feedback.classList.remove('quiz-hidden');

        const nextBtn = $('quiz-btn-next');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.focus();
        }
    }

    function nextQuestion() {
        if (!state || !state.answered) return;
        if (state.i < state.ids.length - 1) {
            state.i++;
            renderQuestion();
        } else {
            finishQuiz();
        }
    }

    function finishQuiz() {
        if (!state) return;
        const total = state.ids.length;
        const score = state.score;
        const wrong = total - score;
        const pct = Math.round((score / total) * 100);

        if (state.mode === 'test' && state.testId) {
            store.results[state.testId] = {
                score,
                total,
                completedAt: new Date().toISOString()
            };
            saveStore();
        }

        const playView = $('quiz-play-view');
        const resultView = $('quiz-result-view');
        if (playView) playView.classList.add('quiz-hidden');
        if (resultView) resultView.classList.remove('quiz-hidden');

        const quizTab = $('quiz-tab');
        if (quizTab) quizTab.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Update score numbers
        if ($('quiz-res-score')) $('quiz-res-score').textContent = score;
        if ($('quiz-res-total')) $('quiz-res-total').textContent = total;
        if ($('quiz-res-pct')) $('quiz-res-pct').textContent = `${pct}%`;
        if ($('quiz-res-correct')) $('quiz-res-correct').textContent = score;
        if ($('quiz-res-wrong')) $('quiz-res-wrong').textContent = wrong;

        const wCount = valid(store.wrong).length;
        const eCount = valid(store.everWrong).length;
        if ($('quiz-res-remaining-wrong')) $('quiz-res-remaining-wrong').textContent = wCount;
        if ($('quiz-res-remaining-ever')) $('quiz-res-remaining-ever').textContent = eCount;

        const titleEl = $('quiz-res-title');
        if (titleEl) {
            titleEl.textContent = `Kết quả — ${state.label}`;
        }

        // Retake and Back actions
        const retakeBtn = $('quiz-res-btn-retake');
        if (retakeBtn) {
            const currentIds = [...state.ids];
            const currentMode = state.mode;
            const currentLabel = state.label;
            const currentTestId = state.testId;
            retakeBtn.onclick = () => start(currentIds, currentMode, currentLabel, currentTestId);
        }

        const backBtn = $('quiz-res-btn-back');
        if (backBtn) {
            backBtn.onclick = renderHome;
        }

        const wrongBtn = $('quiz-res-btn-wrong');
        if (wrongBtn) {
            wrongBtn.style.display = wCount > 0 ? 'inline-flex' : 'none';
            wrongBtn.onclick = () => start(valid(store.wrong), 'wrong', 'Câu sai đang chờ');
        }

        // Render Detailed Review Breakdown
        const reviewBox = $('quiz-review');
        if (reviewBox) {
            reviewBox.replaceChildren();
            const wrongHistory = state.history.filter(h => !h.ok);
            if (wrongHistory.length > 0) {
                const header = document.createElement('div');
                header.className = 'quiz-review-header';
                header.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f87171" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Chi tiết các câu làm sai (${wrongHistory.length} câu)</span>
                `;
                reviewBox.appendChild(header);

                wrongHistory.forEach((h, idx) => {
                    const q = byId.get(h.id);
                    if (!q) return;
                    const cat = DATA.categories[q.code] || q.category || '';
                    const item = document.createElement('div');
                    item.className = 'quiz-review-item';
                    item.innerHTML = `
                        <div class="quiz-review-question">
                            <strong>${idx + 1}. [${q.code} · ${cat} · Cấp độ ${q.level}]</strong><br>
                            ${escapeHtml(q.question)}
                        </div>
                        <div class="quiz-review-choice wrong">
                            <b>✗ Bạn đã chọn:</b> ${escapeHtml(h.selected)}
                        </div>
                        <div class="quiz-review-choice correct">
                            <b>✓ Đáp án đúng:</b> ${escapeHtml(h.correct)}
                        </div>
                    `;
                    reviewBox.appendChild(item);
                });
            } else {
                const item = document.createElement('div');
                item.className = 'quiz-review-header';
                item.style.color = '#34d399';
                item.innerHTML = `
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Xuất sắc! Bạn trả lời đúng tất cả các câu trong bài ôn luyện này.</span>
                `;
                reviewBox.appendChild(item);
            }
        }
    }

    function confirmExit() {
        if (!state) {
            renderHome();
            return;
        }
        if (state.answered || state.i > 0) {
            if (confirm('Bạn có chắc muốn thoát về danh sách đề? Tiến độ làm bài hiện tại sẽ không được lưu.')) {
                renderHome();
            }
        } else {
            renderHome();
        }
    }

    // Keyboard support (1, 2, 3, 4, A, B, C, D to answer; Enter to next)
    document.addEventListener('keydown', e => {
        if (!isAuthenticated()) return;

        const playView = $('quiz-play-view');
        if (!playView || playView.classList.contains('quiz-hidden') || !state) return;

        const key = e.key.toUpperCase();
        let selectedIdx = -1;
        if (key === '1' || key === 'A') selectedIdx = 0;
        else if (key === '2' || key === 'B') selectedIdx = 1;
        else if (key === '3' || key === 'C') selectedIdx = 2;
        else if (key === '4' || key === 'D') selectedIdx = 3;

        if (!state.answered) {
            if (selectedIdx >= 0 && selectedIdx < state.view.length) {
                e.preventDefault();
                handleAnswer(selectedIdx);
            }
        } else {
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
        init: updateAuthStateUI,
        renderHome,
        start,
        nextQuestion,
        confirmExit,
        handleAuthSubmit,
        logout,
        isAuthenticated
    };

    // Auto init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateAuthStateUI);
    } else {
        updateAuthStateUI();
    }
})();
