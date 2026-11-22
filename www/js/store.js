/* Lưu trữ cục bộ: cài đặt và lịch sử luyện tập (giữ nguyên khóa cũ để không mất dữ liệu). */
const SETTINGS_KEY = 'math_brain_app_settings';
const HISTORY_KEY = 'math_brain_stats_history';
const MAX_HISTORY = 100;

const DEFAULTS = { defaultOp: 'mix', defaultQCount: 10, soundEnabled: false };
const OPS = ['mix', 'add', 'sub', 'mul'];
const COUNTS = [10, 20, 90];

function read(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* bộ nhớ đầy hoặc bị chặn: bỏ qua */
    }
}

export const Settings = {
    defaults: () => ({ ...DEFAULTS }),
    get() {
        const s = { ...DEFAULTS, ...read(SETTINGS_KEY, {}) };
        if (!OPS.includes(s.defaultOp)) s.defaultOp = DEFAULTS.defaultOp;
        if (!COUNTS.includes(Number(s.defaultQCount))) s.defaultQCount = DEFAULTS.defaultQCount;
        s.soundEnabled = s.soundEnabled === true;
        return s;
    },
    save: (s) => write(SETTINGS_KEY, s),
};

function isRecord(r) {
    return r && typeof r === 'object' && typeof r.id === 'number';
}

export const History = {
    all() {
        const data = read(HISTORY_KEY, []);
        return Array.isArray(data) ? data.filter(isRecord) : [];
    },
    add(record) {
        write(HISTORY_KEY, [record, ...this.all()].slice(0, MAX_HISTORY));
    },
    clear: () => localStorage.removeItem(HISTORY_KEY),

    today() {
        const start = new Date().setHours(0, 0, 0, 0);
        return this.all().filter((r) => r.id >= start);
    },

    /** Thống kê tổng hợp cho trang chủ */
    summary() {
        const today = this.today();
        const questions = today.reduce((n, r) => n + (r.totalQuestions || 0), 0);
        const correct = today.reduce((n, r) => n + (r.correctCount || 0), 0);
        const seconds = today.reduce((n, r) => n + (r.totalTimeSeconds || 0), 0);
        const all = this.all();
        const best = all.reduce((b, r) => (r.accuracy > (b?.accuracy ?? -1) ? r : b), null);
        return {
            games: today.length,
            questions,
            accuracy: questions ? Math.round((correct / questions) * 100) : 0,
            speed: questions ? (seconds / questions).toFixed(1) : '0.0',
            bestStreak: all.reduce((m, r) => Math.max(m, r.maxStreak || 0), 0),
            bestScore: best ? `${best.correctCount}/${best.totalQuestions}` : '--',
            xp: questions * 12,
        };
    },
};
