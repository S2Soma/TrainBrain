/* Lưu trữ cục bộ: cài đặt và lịch sử (giữ khóa cũ để không mất dữ liệu). */
const SETTINGS_KEY = 'math_brain_app_settings';
const HISTORY_KEY = 'math_brain_stats_history';
const MAX_HISTORY = 300;

const DEFAULTS = { defaultOp: 'mix', defaultQCount: 10, defaultLevel: 'easy', defaultQType: 'result', defaultTerms: 2, defaultPic: 0, soundEnabled: false };
const OPS = ['mix', 'add', 'sub', 'mul'];
const COUNTS = [10, 20, 90];
const LEVELS = ['easy', 'medium', 'hard'];
const QTYPES = ['result', 'missing', 'mix'];
const TERMS = [2, 3, 4, 0];

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
        /* bộ nhớ đầy hoặc bị chặn */
    }
}

export const Settings = {
    get() {
        const s = { ...DEFAULTS, ...read(SETTINGS_KEY, {}) };
        if (!OPS.includes(s.defaultOp)) s.defaultOp = DEFAULTS.defaultOp;
        if (!COUNTS.includes(Number(s.defaultQCount))) s.defaultQCount = DEFAULTS.defaultQCount;
        if (!LEVELS.includes(s.defaultLevel)) s.defaultLevel = DEFAULTS.defaultLevel;
        if (!QTYPES.includes(s.defaultQType)) s.defaultQType = DEFAULTS.defaultQType;
        if (!TERMS.includes(Number(s.defaultTerms))) s.defaultTerms = DEFAULTS.defaultTerms;
        s.defaultTerms = Number(s.defaultTerms);
        s.defaultPic = Number(s.defaultPic) === 1 ? 1 : 0;
        s.soundEnabled = s.soundEnabled === true;
        return s;
    },
    save: (s) => write(SETTINGS_KEY, s),
};

const dayKey = (t) => new Date(t).toDateString();
const isRecord = (r) => r && typeof r === 'object' && typeof r.id === 'number';
const levelOf = (r) => r.level ?? 'easy';
/** Cùng "loại bài" để so kỷ lục: hình/số, độ khó (bài số), dạng bài, số hạng */
const sameKind = (r, { level, qtype = 'result', terms = 2, pic = 0 }) =>
    (r.pic ? 1 : 0) === pic && (pic || levelOf(r) === level) && (r.qtype ?? 'result') === qtype && (r.terms ?? 2) === terms;

export const History = {
    all() {
        const data = read(HISTORY_KEY, []);
        return Array.isArray(data) ? data.filter(isRecord) : [];
    },
    add(record) {
        write(HISTORY_KEY, [record, ...this.all()].slice(0, MAX_HISTORY));
    },
    clear: () => localStorage.removeItem(HISTORY_KEY),

    /** Thống kê hôm nay */
    summary() {
        const start = new Date().setHours(0, 0, 0, 0);
        const today = this.all().filter((r) => r.id >= start);
        const sum = (key) => today.reduce((n, r) => n + (Number(r[key]) || 0), 0);
        const questions = sum('totalQuestions');
        return {
            questions,
            accuracy: questions ? Math.round((sum('correctCount') / questions) * 100) : 0,
            speed: questions ? (sum('totalTimeSeconds') / questions).toFixed(1) : '0',
        };
    },

    /** Số ngày luyện tập liên tiếp (tính đến hôm nay hoặc hôm qua) và 7 ngày gần nhất */
    streak() {
        const days = new Set(this.all().map((r) => dayKey(r.id)));
        const d = new Date();
        if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
        let count = 0;
        while (days.has(d.toDateString())) {
            count++;
            d.setDate(d.getDate() - 1);
        }
        const week = Array.from({ length: 7 }, (_, i) => {
            const x = new Date();
            x.setDate(x.getDate() - (6 - i));
            return { label: 'CN T2 T3 T4 T5 T6 T7'.split(' ')[x.getDay()], done: days.has(x.toDateString()), today: i === 6 };
        });
        return { count, week };
    },

    /** Kỷ lục trước đó (không tính bản ghi vừa thêm nếu truyền exceptId) */
    best(kind, { level, qtype, terms, pic, count, exceptId } = {}) {
        const list = this.all().filter((r) => r.id !== exceptId);
        if (kind === 'time-attack') {
            return list.filter((r) => r.opType === 'time-attack' && sameKind(r, { level, qtype, terms, pic })).reduce((m, r) => Math.max(m, r.correctCount), 0);
        }
        if (kind === 'memory') {
            return list.filter((r) => r.opType === 'word-memory').reduce((m, r) => Math.max(m, r.correctCount), 0);
        }
        // Tính nhẩm: thời gian ngắn nhất với bài đúng 100%, cùng số câu và cùng loại bài
        const times = list
            .filter((r) => !['word-memory', 'time-attack'].includes(r.opType) && !r.review && sameKind(r, { level, qtype, terms, pic }) && r.totalQuestions === count && r.accuracy === 100)
            .map((r) => r.totalTimeSeconds);
        return times.length ? Math.min(...times) : null;
    },
};
