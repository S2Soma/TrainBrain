import { $, $$, h, icon, fmtDuration, fmtClock } from './dom.js';
import { Settings, History } from './store.js';
import { sound } from './sound.js';
import { generateQuestion, generatePictureQuestion, OP_NAMES, LEVEL_NAMES, QTYPE_NAMES, BLANK } from './math.js';
import { Tour } from './tour.js';
import { WORDS } from './words.js';
import { startMathBackground } from './background.js';
import { renderCharts } from './charts.js';

const gsap = window.gsap;
const MEMORY_WORDS = 20;
const MEMORY_SECONDS = 120;
const ATTACK_SECONDS = 60;
const DAILY_GOAL = 30;

const grade = (pct) => (pct >= 90 ? 'Xuất sắc' : pct >= 70 ? 'Giỏi' : pct >= 50 ? 'Khá' : 'Cố lên');
const stamp = () => new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
const buzz = (ms) => navigator.vibrate?.(ms);
const termsLabel = (t) => (t ? `${t} số` : '2–4 số');
const picTermsLabel = (t) => (t === 2 ? '2 nhóm' : t === 0 ? '2–3 nhóm' : '3 nhóm');

/** Lời Cú Tí ở màn kết quả */
function owlSays(accuracy, isRecord) {
    if (isRecord) return 'Kỷ lục mới! Mình tự hào về bạn quá!';
    if (accuracy >= 90) return 'Tuyệt vời! Bạn nhanh như chớp luôn!';
    if (accuracy >= 70) return 'Giỏi lắm! Thêm chút nữa là hoàn hảo.';
    if (accuracy >= 50) return 'Khá rồi đó! Luyện lại câu sai nhé.';
    return 'Không sao đâu, mỗi ngày một chút là tiến bộ!';
}
/** Phép tính đã điền đáp án, ví dụ "3 + 5 = 8" */
const solved = (q) => q.tokens.map((t) => (t === BLANK ? q.answer : t)).join(' ');

/* ---------- Hiệu ứng GSAP ---------- */
const fx = {
    enter(screen) {
        gsap.fromTo(screen.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power3.out', clearProps: 'transform,opacity' });
    },
    pop(el) {
        gsap.fromTo(el, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(2.5)', clearProps: 'transform,opacity' });
    },
    shake(el) {
        gsap.fromTo(el, { x: -14 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.25)', clearProps: 'transform' });
    },
    bump(el) {
        gsap.fromTo(el, { y: 0 }, { y: -8, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.out', clearProps: 'transform' });
    },
    fill(el, pct, duration = 0.5) {
        gsap.to(el, { width: `${pct}%`, duration, ease: duration ? 'power2.out' : 'none' });
    },
    stamp(el, text) {
        el.textContent = text;
        gsap.fromTo(el, { scale: 2.6, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 8, duration: 0.45, delay: 0.25, ease: 'power4.in' });
    },
    badge(el, show) {
        el.classList.toggle('hidden', !show);
        if (show) gsap.fromTo(el, { y: 30, opacity: 0, rotation: -8 }, { y: 0, opacity: 1, rotation: -3, duration: 0.6, delay: 0.7, ease: 'back.out(3)' });
    },
    countUp(el, to, suffix = '') {
        const o = { v: 0 };
        gsap.to(o, { v: to, duration: 0.8, ease: 'power2.out', onUpdate: () => (el.textContent = `${Math.round(o.v)}${suffix}`) });
    },
    burst() {
        const tiles = ['k1', 'k2', 'k3', 'k5', 'k7', 'k9', 'plus', 'minus', 'multiply', 'equals'];
        for (let i = 0; i < 24; i++) {
            const el = h('img', { class: 'burst', src: `img/bg/${tiles[i % tiles.length]}.png`, alt: '' });
            document.body.append(el);
            const a = Math.random() * Math.PI * 2;
            const d = gsap.utils.random(100, 260);
            gsap.fromTo(el, { x: window.innerWidth / 2 - 20, y: window.innerHeight / 3, scale: 0.4, opacity: 1 }, {
                x: `+=${Math.cos(a) * d}`, y: `+=${Math.sin(a) * d + 140}`, rotation: gsap.utils.random(-220, 220),
                scale: gsap.utils.random(0.8, 1.3), opacity: 0, duration: gsap.utils.random(1, 1.6), ease: 'power2.out',
                onComplete: () => el.remove(),
            });
        }
    },
    countdown() {
        const box = $('countdown');
        box.classList.remove('hidden');
        const tl = gsap.timeline();
        ['3', '2', '1'].forEach((n) => {
            tl.call(() => { box.replaceChildren(h('img', { src: `img/bg/k${n}.png`, alt: n })); sound.click(); })
                .fromTo(box, { scale: 1.8, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.3, ease: 'back.out(2)' })
                .to(box, { opacity: 0, duration: 0.2, delay: 0.38 });
        });
        return tl.then(() => { box.classList.add('hidden'); gsap.set(box, { clearProps: 'all' }); });
    },
};

/* ---------- Ứng dụng ---------- */
class App {
    constructor() {
        this.settings = Settings.get();
        this.mode = 'math';
        this.quiz = null;
        this.memory = null;
        this.screen = 'home';

        sound.setMuted(!this.settings.soundEnabled);
        this.bind();
        this.syncSettingsUI();
        this.setMode('math');
        this.renderHome();
        fx.enter($('screen-home'));
        if (Tour.shouldAutoStart()) setTimeout(() => Tour.start(), 700);
    }

    /* Điều hướng */
    show(name) {
        this.screen = name;
        $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
        const tab = ['quiz', 'memory', 'result'].includes(name) ? 'home' : name;
        $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.nav === tab));
        $('app').classList.toggle('in-session', name === 'quiz' || name === 'memory');
        window.scrollTo(0, 0);
        fx.enter($(`screen-${name}`));
    }

    get inSession() {
        return Boolean(this.quiz?.active || this.memory?.active);
    }

    async leave(target = 'home') {
        if (this.inSession) {
            if (!(await this.confirm('Dừng bài đang làm?'))) return;
            this.stopSession();
        }
        if (target === 'home') this.renderHome();
        this.show(target);
        if (target === 'stats') this.renderStats();
    }

    stopSession() {
        if (this.quiz) { this.quiz.active = false; clearInterval(this.quiz.timer); }
        if (this.memory) { this.memory.active = false; clearInterval(this.memory.timer); }
    }

    /* Hộp thoại */
    openModal(id) {
        const m = $(id);
        m.classList.remove('hidden');
        gsap.fromTo(m, { opacity: 0 }, { opacity: 1, duration: 0.18 });
        gsap.fromTo(m.firstElementChild, { y: 90, rotation: 2 }, { y: 0, rotation: 0, duration: 0.4, ease: 'back.out(1.5)', clearProps: 'transform' });
    }

    closeModal(id) {
        const m = $(id);
        return gsap.to(m, { opacity: 0, duration: 0.15 }).then(() => { m.classList.add('hidden'); gsap.set(m, { clearProps: 'opacity' }); });
    }

    confirm(text) {
        $('confirm-text').textContent = text;
        this.openModal('confirm-modal');
        return new Promise((resolve) => (this.confirmResolve = resolve));
    }

    answerConfirm(ok) {
        this.closeModal('confirm-modal');
        this.confirmResolve?.(ok);
        this.confirmResolve = null;
    }

    toast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.remove('hidden');
        gsap.fromTo(t, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2 });
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => t.classList.add('hidden'), 1500);
    }

    /* Sự kiện */
    bind() {
        const on = (id, fn) => $(id).addEventListener('click', () => { sound.click(); fn(); });

        on('brand-btn', () => this.leave('home'));
        on('sound-btn', () => this.setSound(sound.muted));
        on('help-btn', async () => {
            if (this.screen !== 'home') await this.leave('home');
            if (this.screen === 'home') Tour.start();
        });
        $$('.tab').forEach((t) => t.addEventListener('click', () => { sound.click(); this.leave(t.dataset.nav); }));
        $$('[data-back]').forEach((b) => b.addEventListener('click', () => { sound.click(); this.leave('home'); }));

        // Trang chủ
        $$('.mode').forEach((m) => m.addEventListener('click', () => {
            sound.click();
            this.setMode(m.dataset.mode);
            fx.bump(m);
        }));
        this.segment('level-segment', 'level', (v) => { this.updateSettings({ defaultLevel: v }, true); this.renderHome(); });
        this.segment('pic-segment', 'pic', (v) => { this.updateSettings({ defaultPic: v }, true); this.setMode(this.mode); this.renderHome(); });
        this.segment('qtype-segment', 'qtype', (v) => { this.updateSettings({ defaultQType: v }, true); this.renderHome(); });
        this.segment('terms-segment', 'terms', (v) => { this.updateSettings({ defaultTerms: v }, true); this.renderHome(); });
        this.segment('qcount-segment', 'count', (v) => this.updateSettings({ defaultQCount: v }, true));
        on('start-btn', () => this.start());
        on('ready-start-btn', async () => {
            await this.closeModal('ready-modal');
            this.startQuiz({ kind: this.mode === 'attack' ? 'attack' : 'math' });
        });
        on('ready-cancel-btn', () => this.closeModal('ready-modal'));
        $('confirm-ok').addEventListener('click', () => this.answerConfirm(true));
        $('confirm-cancel').addEventListener('click', () => this.answerConfirm(false));

        // Làm toán
        on('mode-numpad-btn', () => this.setInputMode('numpad'));
        on('mode-mcq-btn', () => this.setInputMode('mcq'));
        $$('.key[data-val]').forEach((k) => k.addEventListener('click', () => { sound.click(); this.typeDigit(k.dataset.val); }));
        on('key-clear', () => this.setInput(''));
        on('key-back', () => this.setInput(this.quiz.input.slice(0, -1)));
        $('submit-btn').addEventListener('click', () => this.submit());
        on('skip-btn', () => this.skip());
        on('retry-btn', () => this.startQuiz(this.lastRun));
        on('review-btn', () => this.startQuiz({ kind: 'review', questions: this.reviewQuestions }));
        on('result-home-btn', () => this.leave('home'));
        document.addEventListener('keydown', (e) => this.onKey(e));

        // Nhớ từ
        on('wm-early-btn', () => this.memoryRecall());
        on('wm-finish-btn', () => this.memoryScore());
        on('wm-retry-btn', () => this.startMemory());
        on('wm-home-btn', () => this.leave('home'));

        // Cài đặt (tự lưu)
        this.segment('set-op-grid', 'op', (v) => this.updateSettings({ defaultOp: v }));
        $('set-sound').addEventListener('change', (e) => this.setSound(e.target.checked));

        // Tiến độ
        on('clear-history-btn', async () => {
            if (!(await this.confirm('Xóa toàn bộ lịch sử?'))) return;
            History.clear();
            this.renderStats();
        });
    }

    segment(id, key, onChange) {
        const box = $(id);
        box.addEventListener('click', (e) => {
            const btn = e.target.closest('.seg');
            if (!btn) return;
            sound.click();
            $$('.seg', box).forEach((b) => b.classList.toggle('active', b === btn));
            const raw = btn.dataset[key];
            onChange(Number.isNaN(Number(raw)) ? raw : Number(raw));
        });
    }

    mark(id, key, value) {
        $$('.seg', $(id)).forEach((b) => b.classList.toggle('active', b.dataset[key] === String(value)));
    }

    /* Cài đặt */
    updateSettings(patch, silent = false) {
        this.settings = { ...this.settings, ...patch };
        Settings.save(this.settings);
        sound.setMuted(!this.settings.soundEnabled);
        this.syncSettingsUI();
        if (!silent) this.toast('Đã lưu');
    }

    setSound(enabled) {
        this.updateSettings({ soundEnabled: enabled });
        if (enabled) sound.click();
    }

    syncSettingsUI() {
        const s = this.settings;
        this.mark('level-segment', 'level', s.defaultLevel);
        this.mark('qcount-segment', 'count', s.defaultQCount);
        this.mark('qtype-segment', 'qtype', s.defaultQType);
        this.mark('terms-segment', 'terms', s.defaultTerms);
        this.mark('pic-segment', 'pic', s.defaultPic);
        this.mark('set-op-grid', 'op', s.defaultOp);
        $('set-sound').checked = s.soundEnabled;
        $('sound-btn').replaceChildren(icon(sound.muted ? 'mute' : 'speaker'));
    }

    /* Trang chủ */
    setMode(mode) {
        this.mode = mode;
        $$('.mode').forEach((x) => x.classList.toggle('active', x.dataset.mode === mode));
        $('level-config').classList.toggle('hidden', mode === 'memory');
        $('display-row').classList.toggle('hidden', mode === 'memory');
        $('level-row').classList.toggle('hidden', this.settings.defaultPic === 1);
        $('qtype-label').classList.toggle('mt', this.settings.defaultPic !== 1);
        $('count-config').classList.toggle('hidden', mode !== 'math');
        $('attack-best').classList.toggle('hidden', mode !== 'attack');
        $('memory-config').classList.toggle('hidden', mode !== 'memory');
    }

    renderHome() {
        const s = History.summary();
        $('goal-text').textContent = `${Math.min(s.questions, DAILY_GOAL)}/${DAILY_GOAL} câu`;
        fx.fill($('goal-fill'), Math.min(100, (s.questions / DAILY_GOAL) * 100));
        $('qs-acc').textContent = `${s.accuracy}%`;
        $('qs-speed').textContent = `${s.speed}s`;

        const streak = History.streak();
        $('streak-days').textContent = streak.count;
        $('streak-week').replaceChildren(...streak.week.map((d) =>
            h('span', { class: `day${d.done ? ' done' : ''}${d.today ? ' today' : ''}` }, d.done ? icon('fire', 'day-dot') : h('i', { class: 'day-dot' }), d.label)));

        const { defaultLevel: level, defaultQType: qtype, defaultTerms: terms, defaultPic: pic } = this.settings;
        $('attack-best-val').textContent = History.best('time-attack', { level, qtype, terms, pic });
        $('memory-best').textContent = History.best('memory');
    }

    start() {
        if (this.mode === 'memory') return this.startMemory();
        const s = this.settings;
        const parts = s.defaultPic
            ? ['Hình ảnh', QTYPE_NAMES[s.defaultQType], picTermsLabel(s.defaultTerms)]
            : [LEVEL_NAMES[s.defaultLevel], QTYPE_NAMES[s.defaultQType], termsLabel(s.defaultTerms), OP_NAMES[s.defaultOp]];
        $('ready-sub').textContent = [this.mode === 'attack' ? `${ATTACK_SECONDS} giây` : `${s.defaultQCount} câu`, ...parts].join(' · ');
        this.openModal('ready-modal');
    }

    /* Tính nhẩm: kind = 'math' | 'attack' | 'review' */
    async startQuiz({ kind, questions } = { kind: 'math' }) {
        const { defaultOp: op, defaultLevel: level, defaultQCount: count, defaultQType: qtype, defaultTerms: terms, defaultPic: pic } = this.settings;
        const make = pic ? () => generatePictureQuestion({ op, qtype, terms }) : () => generateQuestion({ op, level, qtype, terms });
        const list = questions ? [...questions] : kind === 'attack' ? [make()] : Array.from({ length: count }, make);
        this.lastRun = { kind, questions };
        this.quiz = {
            kind, op, level, qtype, terms, pic, make, active: true, busy: true, index: 0, input: '',
            questions: list, total: kind === 'attack' ? Infinity : list.length,
            attempts: [], correct: 0, streak: 0, maxStreak: 0, timer: null,
        };

        $('timer-pill').classList.remove('urgent');
        $('quiz-timer').textContent = kind === 'attack' ? fmtClock(ATTACK_SECONDS) : '00:00';
        this.show('quiz');
        this.loadQuestion(0);
        this.quiz.busy = true;
        await fx.countdown();
        if (!this.quiz.active) return;

        const q = this.quiz;
        q.startedAt = Date.now();
        q.questionStart = Date.now();
        q.busy = false;
        const tick = () => {
            const elapsed = Math.floor((Date.now() - q.startedAt) / 1000);
            if (q.kind !== 'attack') return ($('quiz-timer').textContent = fmtClock(elapsed));
            const left = Math.max(0, ATTACK_SECONDS - elapsed);
            $('quiz-timer').textContent = fmtClock(left);
            $('timer-pill').classList.toggle('urgent', left <= 10);
            if (left <= 10 && left > 0) sound.click();
            if (left === 0) this.finishQuiz();
        };
        tick();
        q.timer = setInterval(tick, 250);
        if (kind === 'attack') {
            gsap.fromTo($('quiz-progress-fill'), { width: '100%' }, { width: '0%', duration: ATTACK_SECONDS, ease: 'none' });
        }
    }

    loadQuestion(i) {
        const q = this.quiz;
        if (!q.active) return;
        if (i >= q.total) return this.finishQuiz();
        if (q.kind === 'attack' && i >= q.questions.length) q.questions.push(q.make());
        const question = q.questions[i];
        Object.assign(q, { index: i, busy: false, questionStart: Date.now(), input: '' });
        if (q.kind === 'attack') {
            $('quiz-progress-text').textContent = `${q.correct} đúng`;
        } else {
            $('quiz-progress-text').textContent = `${i + 1}/${q.total}`;
            fx.fill($('quiz-progress-fill'), (i / q.total) * 100);
        }
        this.renderExpression(question);
        $('quiz-feedback').classList.add('hidden');
        $('streak-badge').classList.toggle('hidden', q.streak < 2);
        $('streak-count').textContent = q.streak;
        this.clearMarks();
        $$('.choice').forEach((btn, idx) => {
            const v = String(question.choices[idx]);
            btn.textContent = v;
            btn.onclick = () => {
                if (q.busy) return;
                sound.click();
                this.setInput(v);
                this.evaluate(v, btn);
            };
        });
        fx.pop($('math-expr'));
    }

    /** Vẽ phép tính, ô "?" chính là chỗ hiện số đang gõ */
    renderExpression(question) {
        const expr = $('math-expr');
        const board = $('question-card');
        board.classList.toggle('board-pic', Boolean(question.picture));
        if (question.picture) return this.renderPictures(expr, question);
        expr.replaceChildren(...question.tokens.map((t) => (t === BLANK
            ? h('span', { class: 'blank empty', id: 'answer-preview', text: BLANK })
            : h('span', { class: /^\d+$/.test(t) ? 'num' : 'sym', text: t }))));
        // Co chữ đến khi phép tính nằm gọn một dòng (4 số hạng vẫn vừa)
        let size = 64;
        expr.style.fontSize = `${size}px`;
        while (expr.offsetHeight > size * 1.5 && size > 22) {
            size -= 2;
            expr.style.fontSize = `${size}px`;
        }
    }

    /** Bài toán bằng hình: mỗi số là một nhóm đồ vật, ô trống là ô "?" */
    renderPictures(expr, question) {
        expr.style.fontSize = '';
        // Ít đồ vật thì hình to hơn cho bé dễ đếm
        const total = question.tokens.filter((t) => /^\d+$/.test(t)).reduce((n, t) => n + Number(t), 0);
        expr.style.setProperty('--pic', `${total <= 6 ? 46 : total <= 10 ? 38 : total <= 16 ? 32 : 26}px`);
        expr.replaceChildren(...question.tokens.map((t) => {
            if (t === BLANK) return h('span', { class: 'blank empty', id: 'answer-preview', text: BLANK });
            if (!/^\d+$/.test(t)) return h('span', { class: 'sym', text: t });
            const n = Number(t);
            const group = h('span', { class: 'pic-group', 'aria-label': t, role: 'img' },
                ...Array.from({ length: n }, () => h('img', { src: `img/obj/${question.picture}.png`, alt: '' })));
            group.style.gridTemplateColumns = `repeat(${Math.min(n, 5)}, auto)`;
            return group;
        }));
        gsap.fromTo(expr.querySelectorAll('.pic-group img'), { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: 0.35, stagger: 0.03, ease: 'back.out(2.5)', clearProps: 'transform' });
    }

    clearMarks() {
        $('answer-preview').classList.remove('correct', 'incorrect');
        $$('.choice').forEach((b) => b.classList.remove('correct', 'incorrect'));
    }

    setInput(val) {
        if (!this.quiz) return;
        this.quiz.input = val;
        const blank = $('answer-preview');
        if (!blank) return;
        blank.textContent = val || BLANK;
        blank.classList.toggle('empty', val === '');
    }

    typeDigit(d) {
        const q = this.quiz;
        if (q?.active && !q.busy && q.input.length < 4) {
            this.setInput(q.input + d);
            fx.pop($('answer-preview'));
        }
    }

    setInputMode(mode) {
        $('mode-numpad-btn').classList.toggle('active', mode === 'numpad');
        $('mode-mcq-btn').classList.toggle('active', mode === 'mcq');
        $('numpad-view').classList.toggle('hidden', mode !== 'numpad');
        $('mcq-view').classList.toggle('hidden', mode !== 'mcq');
        $('submit-btn').classList.toggle('hidden', mode === 'mcq');
    }

    submit() {
        const q = this.quiz;
        if (!q?.active || q.busy || q.input === '') return;
        sound.click();
        this.evaluate(q.input);
    }

    skip() {
        const q = this.quiz;
        if (!q?.active || q.busy) return;
        q.busy = true;
        this.record('—', false);
        q.streak = 0;
        setTimeout(() => this.loadQuestion(q.index + 1), 150);
    }

    record(userAnswer, isCorrect) {
        const q = this.quiz;
        const question = q.questions[q.index];
        q.attempts.push({
            index: q.index, question: solved(question), userAnswer, correctAnswer: question.answer, isCorrect,
            timeSpentSec: Number(((Date.now() - q.questionStart) / 1000).toFixed(1)),
        });
    }

    evaluate(value, choiceBtn = null) {
        const q = this.quiz;
        q.busy = true;
        const answer = q.questions[q.index].answer;
        const ok = Number(value) === answer;
        this.record(value, ok);
        $('answer-preview').classList.add(ok ? 'correct' : 'incorrect');
        choiceBtn?.classList.add(ok ? 'correct' : 'incorrect');

        if (ok) {
            sound.correct();
            q.correct++;
            q.streak++;
            q.maxStreak = Math.max(q.maxStreak, q.streak);
            fx.bump($('question-card'));
            setTimeout(() => this.loadQuestion(q.index + 1), q.kind === 'attack' ? 280 : 550);
            return;
        }

        sound.wrong();
        buzz(80);
        q.streak = 0;
        $('streak-badge').classList.add('hidden');
        $$('.choice').forEach((b) => b.classList.toggle('correct', Number(b.textContent) === answer));
        fx.shake($('question-card'));

        // Chế độ 60 giây: hiện đáp án đúng rồi qua câu mới. Chế độ thường: cho làm lại.
        if (q.kind === 'attack') {
            $('answer-preview').textContent = answer;
            $('answer-preview').classList.remove('empty');
            setTimeout(() => this.loadQuestion(q.index + 1), 650);
            return;
        }
        $('quiz-feedback').classList.remove('hidden');
        setTimeout(() => {
            if (!q.active) return;
            q.busy = false;
            this.setInput('');
            $('quiz-feedback').classList.add('hidden');
            this.clearMarks();
        }, 900);
    }

    onKey(e) {
        if (this.screen !== 'quiz' || !this.quiz?.active || document.querySelector('.modal:not(.hidden)')) return;
        if (/^[0-9]$/.test(e.key)) this.typeDigit(e.key);
        else if (e.key === 'Backspace') this.setInput(this.quiz.input.slice(0, -1));
        else if (e.key === 'Escape') this.setInput('');
        else if (e.key === 'Enter') this.submit();
        else return;
        e.preventDefault();
    }

    finishQuiz() {
        const q = this.quiz;
        if (!q.active) return;
        q.active = false;
        clearInterval(q.timer);
        gsap.killTweensOf($('quiz-progress-fill'));
        const attack = q.kind === 'attack';
        const seconds = attack ? ATTACK_SECONDS : Math.round((Date.now() - q.startedAt) / 1000);
        const answered = attack ? new Set(q.attempts.map((a) => a.index)).size : q.total;
        const accuracy = answered ? Math.round((q.correct / answered) * 100) : 0;
        const id = Date.now();

        History.add({
            id, dateStr: stamp(), opType: attack ? 'time-attack' : q.op, level: q.level, qtype: q.qtype, terms: q.terms, pic: q.pic || undefined, review: q.kind === 'review' || undefined,
            totalQuestions: answered, correctCount: q.correct, wrongCount: answered - q.correct, accuracy,
            totalTimeSeconds: seconds, avgSpeed: answered ? (seconds / answered).toFixed(1) : '0', maxStreak: q.maxStreak,
        });

        // Kỷ lục cá nhân
        let isRecord = false;
        if (attack) {
            isRecord = q.correct > 0 && q.correct > History.best('time-attack', { level: q.level, qtype: q.qtype, terms: q.terms, pic: q.pic, exceptId: id });
        } else if (q.kind === 'math' && accuracy === 100) {
            const prev = History.best('math', { level: q.level, qtype: q.qtype, terms: q.terms, pic: q.pic, count: q.total, exceptId: id });
            isRecord = prev === null || seconds < prev;
        }

        this.show('result');
        $('res-correct').textContent = attack ? `${q.correct}` : `${q.correct}/${q.total}`;
        $('res-time').textContent = fmtDuration(seconds);
        $('res-speed').textContent = `${answered ? (seconds / answered).toFixed(1) : 0}s`;
        fx.countUp($('res-streak'), q.maxStreak);
        fx.stamp($('res-stamp'), attack ? `${q.correct} câu` : grade(accuracy));
        fx.badge($('res-record'), isRecord);
        $('res-owl').textContent = attack ? `${q.correct} câu trong 60 giây! ${owlSays(accuracy, isRecord)}` : owlSays(accuracy, isRecord);

        // Câu từng làm sai (kể cả đã làm lại đúng) để luyện thêm
        const wrongIdx = [...new Set(q.attempts.filter((a) => !a.isCorrect).map((a) => a.index))];
        this.reviewQuestions = wrongIdx.map((i) => q.questions[i]);
        $('review-btn').classList.toggle('hidden', wrongIdx.length === 0);
        $('review-text').textContent = `Luyện lại ${wrongIdx.length} câu sai`;

        $('res-list').replaceChildren(...q.attempts.map((a) => h('div', { class: `item ${a.isCorrect ? 'ok' : 'bad'}` },
            h('div', {}, a.question, h('small', { text: `${a.timeSpentSec}s` })),
            h('span', { class: 'end' }, a.userAnswer, icon(a.isCorrect ? 'check' : 'cross')))));
        this.celebrate(isRecord || accuracy >= 80);
    }

    celebrate(big) {
        if (big) { fx.burst(); sound.fanfare(); } else sound.correct();
    }

    /* Nhớ từ */
    startMemory() {
        clearInterval(this.memory?.timer);
        const words = [...WORDS].sort(() => Math.random() - 0.5).slice(0, MEMORY_WORDS);
        this.memory = { active: true, words, remaining: MEMORY_SECONDS, startedAt: Date.now(), timer: null };
        this.memoryPhase('memorize');
        $('wm-words').replaceChildren(...words.map((w, i) => h('div', { class: 'word' }, h('i', { text: i + 1 }), w)));
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
        ['memorize', 'recall', 'result'].forEach((p) => $(`wm-${p}`).classList.toggle('hidden', p !== phase));
        $('wm-timer-chip').classList.toggle('hidden', phase !== 'memorize');
        $('wm-status').textContent = { memorize: 'Ghi nhớ', recall: 'Viết lại', result: 'Kết quả' }[phase];
    }

    memoryRecall() {
        if (!this.memory?.active) return;
        clearInterval(this.memory.timer);
        this.memoryPhase('recall');
        const inputs = Array.from({ length: MEMORY_WORDS }, (_, i) =>
            h('input', { type: 'text', placeholder: `${i + 1}.`, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', maxlength: 40 }));
        inputs.forEach((input, i) => input.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            (inputs[i + 1] ?? input).focus();
        }));
        $('wm-recall-grid').replaceChildren(...inputs);
        fx.enter($('wm-recall-grid'));
        inputs[0].focus({ preventScroll: true });
    }

    memoryScore() {
        const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
        const targets = this.memory.words.map(norm);
        const matched = new Set();
        $$('#wm-recall-grid input').forEach((input) => {
            const v = norm(input.value);
            const idx = v ? targets.findIndex((t, i) => t === v && !matched.has(i)) : -1;
            if (idx !== -1) matched.add(idx);
        });

        const correct = matched.size;
        const accuracy = Math.round((correct / MEMORY_WORDS) * 100);
        const seconds = Math.round((Date.now() - this.memory.startedAt) / 1000);
        const prevBest = History.best('memory');
        this.memory.active = false;
        History.add({
            id: Date.now(), dateStr: stamp(), opType: 'word-memory',
            totalQuestions: MEMORY_WORDS, correctCount: correct, wrongCount: MEMORY_WORDS - correct, accuracy,
            totalTimeSeconds: seconds, avgSpeed: (seconds / MEMORY_WORDS).toFixed(1), maxStreak: correct,
        });

        const isRecord = correct > 0 && correct > prevBest;
        this.memoryPhase('result');
        $('wm-res-count').textContent = `${correct}/${MEMORY_WORDS}`;
        fx.countUp($('wm-res-acc'), accuracy, '%');
        $('wm-res-time').textContent = fmtDuration(seconds);
        fx.stamp($('wm-stamp'), grade(accuracy));
        fx.badge($('wm-record'), isRecord);
        $('wm-owl').textContent = owlSays(accuracy, isRecord);
        $('wm-compare').replaceChildren(...this.memory.words.map((w, i) => {
            const ok = matched.has(i);
            return h('div', { class: `item ${ok ? 'ok' : 'bad'}` }, w, h('span', { class: 'end' }, icon(ok ? 'check' : 'cross')));
        }));
        fx.enter($('wm-result'));
        this.celebrate(isRecord || accuracy >= 80);
    }

    /* Tiến độ */
    renderStats() {
        renderCharts();
        const records = History.all().slice(0, 20);
        const name = (r) => {
            if (r.opType === 'word-memory') return 'Nhớ từ';
            const detail = [r.pic ? 'Hình ảnh' : LEVEL_NAMES[r.level ?? 'easy'], r.qtype === 'missing' ? 'số thiếu' : r.qtype === 'mix' ? 'trộn dạng' : null, termsLabel(r.terms ?? 2)].filter(Boolean).join(' · ');
            if (r.opType === 'time-attack') return `60 giây · ${detail}`;
            return `${r.review ? 'Luyện câu sai' : 'Tính nhẩm'} · ${detail}`;
        };
        const score = (r) => (r.opType === 'time-attack' ? `${r.correctCount} câu` : `${r.correctCount}/${r.totalQuestions}`);
        $('history-list').replaceChildren(...(records.length
            ? records.map((r) => h('div', { class: 'item' }, h('div', {}, name(r), h('small', { text: r.dateStr })), h('span', { class: 'end' }, score(r))))
            : [h('div', { class: 'empty', text: 'Chưa có bài nào.' })]));
    }
}

startMathBackground($('math-bg'));
new App();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
