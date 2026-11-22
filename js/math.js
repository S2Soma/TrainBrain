/* Sinh câu hỏi tính nhẩm 1 chữ số. */
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const OP_NAMES = {
    mix: 'Hỗn hợp',
    add: 'Phép Cộng',
    sub: 'Phép Trừ',
    mul: 'Phép Nhân',
};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function makeChoices(answer) {
    const set = new Set([answer]);
    const max = Math.max(18, answer + 10);
    while (set.size < 4) set.add(randInt(Math.max(0, answer - 5), Math.min(max, answer + 5)));
    return shuffle([...set]);
}

export function generateQuestion(opType) {
    const op = opType === 'mix' ? ['add', 'sub', 'mul'][randInt(0, 2)] : opType;
    const a = randInt(0, 9);
    let b, answer, symbol;

    if (op === 'add') { b = randInt(0, 9); answer = a + b; symbol = '+'; }
    else if (op === 'sub') { b = randInt(0, a); answer = a - b; symbol = '−'; }
    else { b = randInt(0, 9); answer = a * b; symbol = '×'; }

    return {
        text: `${a} ${symbol} ${b} = ?`,
        opName: OP_NAMES[op],
        answer,
        choices: makeChoices(answer),
    };
}
