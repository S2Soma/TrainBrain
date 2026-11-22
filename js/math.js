/* Sinh câu hỏi tính nhẩm: 2–4 số hạng, tìm kết quả hoặc tìm số còn thiếu. */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randInt(0, arr.length - 1)];

export const OP_NAMES = { mix: 'Trộn', add: 'Cộng', sub: 'Trừ', mul: 'Nhân' };
export const LEVEL_NAMES = { easy: 'Dễ', medium: 'Vừa', hard: 'Khó' };
export const QTYPE_NAMES = { result: 'Tìm kết quả', missing: 'Tìm số thiếu', mix: 'Trộn dạng' };
export const BLANK = '?';

const SYMBOL = { add: '+', sub: '−', mul: '×' };

/* Khoảng số theo độ khó: số đầu / số cộng trừ phía sau / thừa số đầu / thừa số sau */
const RANGES = {
    easy: { first: [0, 9], term: [0, 9], fa: [0, 9], fb: [0, 9] },
    medium: { first: [10, 99], term: [1, 9], fa: [2, 12], fb: [2, 9] },
    hard: { first: [10, 99], term: [10, 99], fa: [11, 25], fb: [2, 9] },
};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** 3 đáp án nhiễu "gần đúng" + đáp án đúng */
function makeChoices(answer, max = Infinity) {
    const near = shuffle([1, -1, 2, -2, 10, -10, 3, -3].map((d) => answer + d).filter((v) => v >= 0 && v <= max));
    const set = new Set([answer]);
    for (const v of near) if (set.size < 4) set.add(v);
    while (set.size < 4) set.add(randInt(0, Math.min(max, answer + 10)));
    return shuffle([...set]);
}

/** Chọn dãy phép tính, không để hai phép nhân liền nhau (trừ khi chỉ luyện phép nhân) */
function pickOps(opType, count) {
    const allowed = opType === 'mix' ? ['add', 'sub', 'mul'] : [opType];
    const ops = [];
    for (let i = 0; i < count; i++) {
        let op = pick(allowed);
        if (op === 'mul' && ops[i - 1] === 'mul' && allowed.length > 1) op = pick(['add', 'sub']);
        ops.push(op);
    }
    return ops;
}

/**
 * Tính giá trị theo thứ tự nhân trước, cộng trừ sau.
 * Trả về null nếu tổng tạm thời bị âm (tránh số âm với trẻ nhỏ) hoặc quá lớn.
 */
function evaluate(nums, ops) {
    const terms = [{ sign: 1, value: nums[0] }];
    ops.forEach((op, i) => {
        if (op === 'mul') terms[terms.length - 1].value *= nums[i + 1];
        else terms.push({ sign: op === 'add' ? 1 : -1, value: nums[i + 1] });
    });
    let total = 0;
    for (const t of terms) {
        total += t.sign * t.value;
        if (total < 0) return null;
    }
    return total <= 9999 ? total : null;
}

function buildNumbers(ops, range) {
    return Array.from({ length: ops.length + 1 }, (_, i) => {
        const isFactor = ops[i] === 'mul' || ops[i - 1] === 'mul';
        if (isFactor) return randInt(...(ops[i - 1] === 'mul' ? range.fb : range.fa));
        return randInt(...(i === 0 ? range.first : range.term));
    });
}

/** Ô trống có duy nhất một đáp án? (thừa số đi cùng số 0 thì không) */
function hasUniqueBlank(nums, ops, k) {
    const left = ops[k - 1] === 'mul' ? nums[k - 1] : 1;
    const right = ops[k] === 'mul' ? nums[k + 1] : 1;
    return left !== 0 && right !== 0;
}

/**
 * @param {object} o
 * @param {'mix'|'add'|'sub'|'mul'} o.op
 * @param {'easy'|'medium'|'hard'} o.level
 * @param {'result'|'missing'|'mix'} o.qtype
 * @param {number} o.terms 2, 3, 4 hoặc 0 (ngẫu nhiên 2–4)
 */
export function generateQuestion({ op = 'mix', level = 'easy', qtype = 'result', terms = 2 } = {}) {
    const range = RANGES[level] ?? RANGES.easy;
    const count = (terms || randInt(2, 4)) - 1;
    const type = qtype === 'mix' ? pick(['result', 'missing']) : qtype;

    for (let attempt = 0; attempt < 200; attempt++) {
        const ops = pickOps(op, count);
        const nums = buildNumbers(ops, range);
        // Chuỗi trừ dài (vd. Khó, 4 số hạng) hiếm khi không âm: nâng số đầu lên sau nhiều lần thử
        if (attempt > 60 && ops[0] !== 'mul') nums[0] += randInt(50, 150);
        const result = evaluate(nums, ops);
        if (result === null) continue;

        let blank = nums.length; // vị trí ô trống: nums.length nghĩa là ô kết quả
        if (type === 'missing') {
            const options = nums.map((_, k) => k).filter((k) => hasUniqueBlank(nums, ops, k));
            if (!options.length) continue;
            blank = pick(options);
        }

        const tokens = [];
        nums.forEach((n, i) => {
            tokens.push(i === blank ? BLANK : String(n));
            if (i < ops.length) tokens.push(SYMBOL[ops[i]]);
        });
        tokens.push('=', blank === nums.length ? BLANK : String(result));

        const answer = blank === nums.length ? result : nums[blank];
        return { tokens, text: tokens.join(' '), answer, choices: makeChoices(answer) };
    }

    // Phòng hờ: luôn có câu hợp lệ
    const a = randInt(0, 9);
    const b = randInt(0, 9);
    const tokens = [String(a), '+', String(b), '=', BLANK];
    return { tokens, text: tokens.join(' '), answer: a + b, choices: makeChoices(a + b) };
}

/* ---------- Bài toán bằng hình cho bé mới học ---------- */
export const PICTURES = ['apple', 'strawberry', 'banana', 'carrot', 'star', 'balloon', 'ball', 'chick', 'fish', 'cupcake', 'orange', 'ladybug', 'butterfly', 'duck'];

/**
 * Đếm hình: mỗi nhóm 1–5 đồ vật, chỉ cộng/trừ, kết quả 1–10, tối đa 3 nhóm.
 * Ô trống có thể là kết quả hoặc một nhóm (dạng tìm số thiếu).
 */
export function generatePictureQuestion({ op = 'mix', qtype = 'result', terms = 2 } = {}) {
    const allowed = op === 'add' || op === 'sub' ? [op] : ['add', 'sub'];
    const n = Math.min(3, terms || randInt(2, 3));
    const type = qtype === 'mix' ? pick(['result', 'missing']) : qtype;
    const picture = pick(PICTURES);

    for (let attempt = 0; attempt < 300; attempt++) {
        const ops = Array.from({ length: n - 1 }, () => pick(allowed));
        const nums = Array.from({ length: n }, (_, i) => randInt(i === 0 && ops.includes('sub') ? 3 : 1, 5));
        const result = evaluate(nums, ops);
        if (result === null || result < 1 || result > 10) continue;

        const blank = type === 'missing' ? randInt(0, nums.length - 1) : nums.length;
        const tokens = [];
        nums.forEach((v, i) => {
            tokens.push(i === blank ? BLANK : String(v));
            if (i < ops.length) tokens.push(SYMBOL[ops[i]]);
        });
        tokens.push('=', blank === nums.length ? BLANK : String(result));
        const answer = blank === nums.length ? result : nums[blank];
        return { tokens, text: tokens.join(' '), answer, choices: makeChoices(answer, 10), picture };
    }
    const tokens = ['2', '+', '1', '=', BLANK];
    return { tokens, text: tokens.join(' '), answer: 3, choices: makeChoices(3, 10), picture };
}
