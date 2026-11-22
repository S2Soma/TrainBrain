import { $, $$, h, icon, icons, fmtDuration, fmtClock } from './dom.js';
import { Settings, History } from './store.js';
import { sound } from './sound.js';
import { generateQuestion, OP_NAMES } from './math.js';
import { WORDS } from './words.js';
import { startMathBackground } from './background.js';
import { renderCharts } from './charts.js';

const gsap = window.gsap;
const MEMORY_WORDS = 20;
const MEMORY_SECONDS = 120;
const DAILY_GOAL = 30;

/* ==========================================================================
   Hiệu ứng GSAP
   ========================================================================== */
const fx = {
    reveal(parent) {
        gsap.fromTo(parent.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' });
    },
    pop(el) {
        gsap.fromTo(el, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(2.2)', clearProps: 'transform' });
    },
    shake(el) {
        gsap.fromTo(el, { x: -10 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.25)', clearProps: 'transform' });
    },
    pulse(el) {
        gsap.fromTo(el, { scale: 1 }, { scale: 1.06, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.out', clearProps: 'transform' });
    },
    countUp(el, to, format = (v) => String(Math.round(v))) {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 0.9, ease: 'power2.out', onUpdate: () => (el.textContent = format(o.v)) });
    },
    fill(el, pct) {
        gsap.to(el, { width: `${pct}%`, duration: 0.5, ease: 'power2.out' });
    },
    /** Pháo hoa chữ số khi đạt kết quả tốt */
    burst() {
        const symbols = ['+', '−', '×', '÷', '=', 'π', '7', '9', '∞'];
        for (let i = 0; i < 28; i++) {
            const el = h('span', { class: 'burst', text: symbols[i % symbols.length] });
            document.body.append(el);
            const angle = Math.random() * Math.PI * 2;
            const dist = gsap.utils.random(90, 240);
            gsap.fromTo(el, { x: window.innerWidth / 2, y: window.innerHeight / 2.4, opacity: 1, scale: 0.6 },
                { x: `+=${Math.cos(angle) * dist}`, y: `+=${Math.sin(angle) * dist}`, rotation: gsap.utils.random(-180, 180), scale: gsap.utils.random(0.8, 1.6), opacity: 0, duration: gsap.utils.random(0.9, 1.5), ease: 'power3.out', onComplete: () => el.remove() });
        }
    },
};

/* ==========================================================================
   Ứng dụng
   ========================================================================== */
class App {
    constructor() {
        this.settings = Settings.get();
        this.config = { mode: 'math', opType: this.settings.defaultOp, count: this.settings.defaultQCount };
        this.quiz = null;
        this.memory = null;
        this.screen = 'home';
        this.confirmResolve = null;

        sound.setMuted(!this.settings.soundEnabled);
        this.bind();
        this.syncSettingsUI();
        this.syncSoundIcon();
        this.renderHomeStats();
        icons();
        fx.reveal($('screen-home'));
    }

    /* ---------- Điều hướng ---------- */
    show(name) {
        this.screen = name;
        $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
        const nav = name === 'memory' ? 'home' : name;
        $$('.bnav').forEach((b) => b.classList.toggle('active', b.dataset.nav === nav));
        $('app').classList.toggle('in-session', name === 'quiz' || name === 'memory');
        window.scrollTo(0, 0);
        fx.reveal($(`screen-${name}`));
    }

    get inSession() {
        return Boolean(this.quiz?.active || this.memory?.active);
    }

    async goHome() {
        if (this.inSession) {
            if (!(await this.confirm('Dừng bài tập hiện tại và quay về trang chủ?'))) return;
            this.stopSession();
        }
        this.renderHomeStats();
        this.show('home');
    }

    stopSession() {
        if (this.quiz) { this.quiz.active = false; clearInterval(this.quiz.timer); }
        if (this.memory) { this.memory.active = false; clearInterval(this.memory.timer); }
    }

    /* ---------- Hộp thoại ---------- */
    openModal(id) {
        const modal = $(id);
        modal.classList.remove('hidden');
        gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.fromTo(modal.firstElementChild, { y: 24, scale: 0.96 }, { y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.6)', clearProps: 'transform' });
    }

    closeModal(id) {
        const modal = $(id);
        gsap.to(modal, { opacity: 0, duration: 0.15, onComplete: () => { modal.classList.add('hidden'); gsap.set(modal, { clearProps: 'opacity' }); } });
    }

    confirm(text) {
        $('confirm-text').textContent = text;
        this.openModal('confirm-modal');
        return new Promise((resolve) => { this.confirmResolve = resolve; });
    }

    answerConfirm(value) {
        this.closeModal('confirm-modal');
        this.confirmResolve?.(value);
        this.confirmResolve = null;
    }

    toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.remove('hidden');
        gsap.fromTo(t, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 });
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
    }

    /* ---------- Gắn sự kiện ---------- */
    bind() {
        const on = (id, fn) => $(id).addEventListener('click', () => { sound.click(); fn(); });

        on('brand-btn', () => this.goHome());
        on('settings-btn', () => this.show('settings'));
        on('stats-btn', () => this.openStats());
        on('view-stats-btn', () => this.openStats());
        on('sound-btn', () => this.toggleSound());

        $$('.bnav').forEach((b) => b.addEventListener('click', () => {
            sound.click();
            if (b.dataset.nav === 'stats') this.openStats();
            else if (b.dataset.nav === 'home') this.goHome();
            else this.show('settings');
        }));
        $$('[data-back]').forEach((b) => b.addEventListener('click', () => { sound.click(); this.goHome(); }));

        // Chọn chế độ & cấu hình
        $$('.mode-card').forEach((card) => card.addEventListener('click', () => {
            sound.click();
            this.config.mode = card.dataset.mode;
            $$('.mode-card').forEach((c) => c.classList.toggle('active', c === card));
            const memory = this.config.mode === 'memory';
            $('math-config').classList.toggle('hidden', memory);
            $('memory-config').classList.toggle('hidden', !memory);
            $('start-btn-text').textContent = memory ? 'Bắt đầu kiểm tra trí nhớ' : 'Bắt đầu luyện toán';
            fx.pulse(card);
        }));
        this.segment('qcount-segment', 'count', (v) => (this.config.count = v));
        this.segment('set-count-segment', 'count');
        this.segment('set-op-grid', 'op');

        on('start-btn', () => (this.config.mode === 'memory' ? this.startMemory() : this.openModal('ready-modal')));
        on('ready-start-btn', () => { this.closeModal('ready-modal'); this.startQuiz(); });
        on('ready-cancel-btn', () => this.closeModal('ready-modal'));
        $('confirm-ok').addEventListener('click', () => this.answerConfirm(true));
        $('confirm-cancel').addEventListener('click', () => this.answerConfirm(false));

        // Làm bài toán
        on('mode-numpad-btn', () => this.setInputMode('numpad'));
        on('mode-mcq-btn', () => this.setInputMode('mcq'));
        $$('.key[data-val]').forEach((k) => k.addEventListener('click', () => { sound.click(); this.typeDigit(k.dataset.val); }));
        on('key-clear', () => this.setInput(''));
        on('key-back', () => this.setInput(this.quiz.input.slice(0, -1)));
        $('submit-btn').addEventListener('click', () => this.submit());
        on('skip-btn', () => this.skip());
        on('retry-btn', () => this.startQuiz());
        on('result-home-btn', () => this.goHome());
        document.addEventListener('keydown', (e) => this.onKey(e));

        // Nhớ từ
        on('wm-early-btn', () => this.memoryRecall());
        on('wm-finish-btn', () => this.memoryScore());
        on('wm-retry-btn', () => this.startMemory());
        on('wm-home-btn', () => this.goHome());

        // Cài đặt & thống kê
        on('save-settings-btn', () => this.saveSettings());
        on('reset-settings-btn', async () => {
            if (!(await this.confirm('Khôi phục cài đặt về mặc định?'))) return;
            this.settings = Settings.defaults();
            Settings.save(this.settings);
            this.applySettings();
            this.toast('Đã khôi phục cài đặt mặc định');
        });
        on('stats-close', () => this.closeModal('stats-modal'));
        on('stats-close-2', () => this.closeModal('stats-modal'));
        on('clear-history-btn', async () => {
            if (!(await this.confirm('Xóa toàn bộ lịch sử luyện tập?'))) return;
            History.clear();
            this.renderHomeStats();
            this.renderHistory();
            renderCharts();
        });
    }

    /** Nhóm nút chọn một giá trị (data-<key>); callback tùy chọn */
    segment(containerId, key, onChange) {
        const box = $(containerId);
        box.addEventListener('click', (e) => {
            const btn = e.target.closest('.segment-btn');
            if (!btn || !box.contains(btn)) return;
            sound.click();
            $$('.segment-btn', box).forEach((b) => b.classList.toggle('active', b === btn));
            const raw = btn.dataset[key];
            onChange?.(Number.isNaN(Number(raw)) ? raw : Number(raw));
        });
    }

    markSegment(containerId, key, value) {
        $$('.segment-btn', $(containerId)).forEach((b) => b.classList.toggle('active', b.dataset[key] === String(value)));
    }

    /* ---------- Cài đặt ---------- */
    syncSettingsUI() {
        const s = this.settings;
        this.markSegment('qcount-segment', 'count', this.config.count);
        this.markSegment('set-count-segment', 'count', s.defaultQCount);
        this.markSegment('set-op-grid', 'op', s.defaultOp);
        $('set-sound').checked = s.soundEnabled;
    }

    applySettings() {
        this.config.opType = this.settings.defaultOp;
        this.config.count = this.settings.defaultQCount;
        sound.setMuted(!this.settings.soundEnabled);
        this.syncSettingsUI();
        this.syncSoundIcon();
    }

    saveSettings() {
        this.settings = {
            defaultOp: $('set-op-grid').querySelector('.active')?.dataset.op ?? 'mix',
            defaultQCount: Number($('set-count-segment').querySelector('.active')?.dataset.count ?? 10),
            soundEnabled: $('set-sound').checked,
        };
        Settings.save(this.settings);
        this.applySettings();
        this.toast('Đã lưu cài đặt');
    }

    toggleSound() {
        this.settings.soundEnabled = sound.muted;
        Settings.save(this.settings);
        this.applySettings();
    }

    syncSoundIcon() {
        $('sound-btn').replaceChildren(icon(sound.muted ? 'volume-x' : 'volume-2'));
        icons();
    }

    /* ---------- Trang chủ ---------- */
    renderHomeStats() {
        const s = History.summary();
        $('st-streak').textContent = s.bestStreak;
        $('st-xp').textContent = s.xp;
        $('st-best').textContent = s.bestScore;
        $('qs-games').textContent = s.games;
        $('qs-acc').textContent = `${s.accuracy}%`;
        $('qs-speed').textContent = `${s.speed}s`;
        $('goal-text').textContent = `${Math.min(s.questions, DAILY_GOAL)}/${DAILY_GOAL} câu`;
        fx.fill($('goal-fill'), Math.min(100, (s.questions / DAILY_GOAL) * 100));
    }

    /* ---------- Tính nhanh ---------- */
    startQuiz() {
        const total = this.config.count;
        this.quiz = {
            active: true, total, index: 0, input: '', busy: false,
            questions: Array.from({ length: total }, () => generateQuestion(this.config.opType)),
            attempts: [], correct: 0, wrong: 0, streak: 0, maxStreak: 0,
            startedAt: Date.now(), questionStart: Date.now(), timer: null,
        };
        this.show('quiz');
        const tick = () => ($('quiz-timer').textContent = fmtClock(Math.floor((Date.now() - this.quiz.startedAt) / 1000)));
        tick();
        this.quiz.timer = setInterval(tick, 1000);
        this.loadQuestion(0);
    }

    loadQuestion(i) {
        const q = this.quiz;
        if (i >= q.total) return this.finishQuiz();
        const question = q.questions[i];
        Object.assign(q, { index: i, busy: false, questionStart: Date.now() });
        this.setInput('');
        $('quiz-progress-text').textContent = `${i + 1}/${q.total}`;
        fx.fill($('quiz-progress-fill'), ((i + 1) / q.total) * 100);
        $('op-tag').textContent = question.opName;
        $('math-expr').textContent = question.text;
        $('quiz-feedback').classList.add('hidden');
        $('streak-badge').classList.toggle('hidden', q.streak < 2);
        $('streak-count').textContent = q.streak;
        this.clearMarks();

        $$('.mcq-btn').forEach((btn, idx) => {
            btn.textContent = question.choices[idx];
            btn.onclick = () => {
                if (q.busy) return;
                sound.click();
                this.setInput(String(question.choices[idx]));
                this.evaluate(String(question.choices[idx]), btn);
            };
        });
        fx.pop($('math-expr'));
    }

    clearMarks() {
        $('answer-preview').classList.remove('correct', 'incorrect');
        $$('.mcq-btn').forEach((b) => b.classList.remove('correct', 'incorrect'));
    }

    setInput(val) {
        if (!this.quiz) return;
        this.quiz.input = val;
        const preview = $('answer-preview');
        preview.textContent = val === '' ? 'Nhập câu trả lời' : val;
        preview.classList.toggle('placeholder', val === '');
    }

    typeDigit(d) {
        if (this.quiz?.active && !this.quiz.busy && this.quiz.input.length < 4) this.setInput(this.quiz.input + d);
    }

    setInputMode(mode) {
        $('mode-numpad-btn').classList.toggle('active', mode === 'numpad');
        $('mode-mcq-btn').classList.toggle('active', mode === 'mcq');
        $('numpad-view').classList.toggle('hidden', mode !== 'numpad');
        $('mcq-view').classList.toggle('hidden', mode !== 'mcq');
    }

    submit() {
        if (!this.quiz?.active || this.quiz.busy || this.quiz.input === '') return;
        sound.click();
        this.evaluate(this.quiz.input);
    }

    skip() {
        const q = this.quiz;
        if (!q?.active || q.busy) return;
        q.busy = true;
        this.record('Bỏ qua', false);
        q.wrong++;
        q.streak = 0;
        setTimeout(() => this.loadQuestion(q.index + 1), 250);
    }

    record(userAnswer, isCorrect) {
        const q = this.quiz;
        const question = q.questions[q.index];
        q.attempts.push({
            question: question.text, userAnswer, correctAnswer: question.answer, isCorrect,
            timeSpentSec: Number(((Date.now() - q.questionStart) / 1000).toFixed(1)),
        });
    }

    evaluate(value, mcqBtn = null) {
        const q = this.quiz;
        q.busy = true;
        const isCorrect = Number(value) === q.questions[q.index].answer;
        const preview = $('answer-preview');
        this.record(value, isCorrect);
        preview.classList.add(isCorrect ? 'correct' : 'incorrect');
        mcqBtn?.classList.add(isCorrect ? 'correct' : 'incorrect');

        if (isCorrect) {
            sound.correct();
            q.correct++;
            q.streak++;
            q.maxStreak = Math.max(q.maxStreak, q.streak);
            fx.pulse($('question-card'));
            setTimeout(() => this.loadQuestion(q.index + 1), 600);
            return;
        }

        sound.wrong();
        q.wrong++;
        q.streak = 0;
        $('streak-badge').classList.add('hidden');
        $$('.mcq-btn').forEach((b) => b.classList.toggle('correct', Number(b.textContent) === q.questions[q.index].answer));
        const fb = $('quiz-feedback');
        fb.textContent = 'Gần đúng rồi, thử lại nhé!';
        fb.classList.remove('hidden');
        fx.shake($('question-card'));
        setTimeout(() => {
            q.busy = false;
            this.setInput('');
            fb.classList.add('hidden');
            this.clearMarks();
        }, 900);
    }

    onKey(e) {
        if (this.screen !== 'quiz' || !this.quiz?.active || e.target.tagName === 'INPUT') return;
        if (document.querySelector('.modal:not(.hidden)')) return;
        if (/^[0-9]$/.test(e.key)) this.typeDigit(e.key);
        else if (e.key === 'Backspace') this.setInput(this.quiz.input.slice(0, -1));
        else if (e.key === 'Escape' || e.key.toLowerCase() === 'c') this.setInput('');
        else if (e.key === 'Enter') return this.submit(), e.preventDefault();
        else return;
        e.preventDefault();
        sound.click();
    }

    finishQuiz() {
        const q = this.quiz;
        q.active = false;
        clearInterval(q.timer);
        const seconds = Math.round((Date.now() - q.startedAt) / 1000);
        const accuracy = Math.round((q.correct / q.total) * 100);
        const record = {
            id: Date.now(),
            dateStr: new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
            opType: this.config.opType,
            opName: OP_NAMES[this.config.opType] ?? 'Bài tập',
            totalQuestions: q.total, correctCount: q.correct, wrongCount: q.wrong, accuracy,
            totalTimeSeconds: seconds, avgSpeed: (seconds / q.total).toFixed(1), maxStreak: q.maxStreak,
        };
        History.add(record);

        this.show('result');
        $('result-eval').textContent = accuracy >= 90 ? 'Xuất sắc! Phản xạ tính toán rất ấn tượng.' : accuracy >= 60 ? 'Tốt lắm! Luyện thêm để nhanh hơn nhé.' : 'Cố gắng lên, luyện tập mỗi ngày sẽ tiến bộ!';
        $('res-correct').textContent = `${q.correct}/${q.total}`;
        $('res-acc').textContent = `${accuracy}% chính xác`;
        $('res-time').textContent = fmtDuration(seconds);
        $('res-speed').textContent = `${record.avgSpeed}s`;
        fx.countUp($('res-streak'), q.maxStreak);
        $('res-list').replaceChildren(...q.attempts.map((a, i) => this.attemptRow(a, i)));
        icons();
        this.celebrate(accuracy);
    }

    attemptRow(a, i) {
        return h('div', { class: `row ${a.isCorrect ? 'ok' : 'bad'}` },
            h('div', { class: 'r-main' }, h('span', { text: `Câu ${i + 1}: ${a.question}` }),
                h('span', { class: 'r-sub', text: a.isCorrect ? `${a.timeSpentSec}s` : `Đáp án đúng: ${a.correctAnswer}  •  ${a.timeSpentSec}s` })),
            h('div', { class: 'r-end' }, a.userAnswer, icon(a.isCorrect ? 'circle-check' : 'circle-x')));
    }

    celebrate(accuracy) {
        gsap.fromTo('.trophy', { scale: 0, rotation: -25 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)', clearProps: 'transform' });
        if (accuracy >= 80) { fx.burst(); sound.fanfare(); } else sound.correct();
    }

    /* ---------- Nhớ từ ---------- */
    startMemory() {
        clearInterval(this.memory?.timer);
        const words = [...WORDS].sort(() => Math.random() - 0.5).slice(0, MEMORY_WORDS);
        this.memory = { active: true, words, remaining: MEMORY_SECONDS, startedAt: Date.now(), timer: null };
        this.memoryPhase('memorize');
        $('wm-words').replaceChildren(...words.map((w, i) => h('div', { class: 'word-chip' }, h('span', { class: 'word-num', text: i + 1 }), h('span', { text: w }))));
        this.show('memory');

        const tick = () => {
            const r = this.memory.remaining;
            $('wm-timer').textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`;
        };
        tick();
        this.memory.timer = setInterval(() => {
            this.memory.remaining--;
            tick();
            if (this.memory.remaining <= 0) { sound.wrong(); this.memoryRecall(); }
        }, 1000);
    }

    memoryPhase(phase) {
        $('wm-memorize').classList.toggle('hidden', phase !== 'memorize');
        $('wm-recall').classList.toggle('hidden', phase !== 'recall');
        $('wm-result').classList.toggle('hidden', phase !== 'result');
        $('wm-timer-chip').classList.toggle('hidden', phase !== 'memorize');
        $('wm-status').textContent = { memorize: 'Ghi nhớ 20 từ', recall: 'Gõ lại các từ', result: 'Kết quả' }[phase];
    }

    memoryRecall() {
        if (!this.memory?.active) return;
        clearInterval(this.memory.timer);
        this.memory.memorizeSeconds = Math.round((Date.now() - this.memory.startedAt) / 1000);
        this.memoryPhase('recall');
        const inputs = Array.from({ length: MEMORY_WORDS }, (_, i) => {
            const input = h('input', { type: 'text', class: 'recall-input', placeholder: `Từ số ${i + 1}`, autocomplete: 'off', autocapitalize: 'none', maxlength: 40 });
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); (input.parentElement.nextElementSibling?.querySelector('input') ?? input).focus(); } });
            return h('div', { class: 'recall-item' }, h('span', { class: 'recall-num', text: `${i + 1}.` }), input);
        });
        $('wm-recall-grid').replaceChildren(...inputs);
        fx.reveal($('wm-recall'));
    }

    memoryScore() {
        const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        const targets = this.memory.words.map(norm);
        const matched = new Set();
        $$('.recall-input').forEach((input) => {
            const v = norm(input.value);
            const idx = v ? targets.findIndex((t, i) => t === v && !matched.has(i)) : -1;
            if (idx !== -1) matched.add(idx);
        });

        const correct = matched.size;
        const accuracy = Math.round((correct / MEMORY_WORDS) * 100);
        const seconds = Math.round((Date.now() - this.memory.startedAt) / 1000);
        this.memory.active = false;
        History.add({
            id: Date.now(),
            dateStr: new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
            opType: 'word-memory', opName: 'Nhớ Từ',
            totalQuestions: MEMORY_WORDS, correctCount: correct, wrongCount: MEMORY_WORDS - correct, accuracy,
            totalTimeSeconds: seconds, avgSpeed: (seconds / MEMORY_WORDS).toFixed(1), maxStreak: correct,
        });

        this.memoryPhase('result');
        $('wm-res-count').textContent = `${correct}/${MEMORY_WORDS}`;
        $('wm-res-acc').textContent = `${accuracy}% chính xác`;
        $('wm-res-time').textContent = fmtDuration(seconds);
        $('wm-compare').replaceChildren(...this.memory.words.map((w, i) => {
            const ok = matched.has(i);
            return h('div', { class: `row ${ok ? 'ok' : 'bad'}` }, h('span', { text: `${i + 1}. ${w}` }), h('div', { class: 'r-end' }, ok ? 'Đã nhớ' : 'Chưa nhớ', icon(ok ? 'circle-check' : 'circle-x')));
        }));
        icons();
        fx.reveal($('wm-result'));
        this.celebrate(accuracy);
    }

    /* ---------- Thống kê ---------- */
    openStats() {
        this.openModal('stats-modal');
        this.renderHistory();
        renderCharts();
    }

    renderHistory() {
        const records = History.all().slice(0, 20);
        $('history-list').replaceChildren(...(records.length
            ? records.map((r) => h('div', { class: 'row' },
                h('div', { class: 'r-main' }, h('span', { text: `${r.opName} (${r.totalQuestions})` }), h('span', { class: 'r-sub', text: r.dateStr })),
                h('div', { class: 'r-end' }, `${r.correctCount}/${r.totalQuestions}  ${r.accuracy}%`)))
            : [h('div', { class: 'empty', text: 'Chưa có lịch sử. Hãy hoàn thành bài luyện tập đầu tiên!' })]));
    }
}

startMathBackground($('math-bg'));
new App();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
