/* Âm thanh tổng hợp bằng Web Audio, không cần file âm thanh. */
let ctx = null;
let muted = true;

function audio() {
    if (!ctx) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (Ctor) ctx = new Ctor();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
}

/** Phát một nốt: dạng sóng, tần số (số hoặc [tần số, thời điểm]), độ dài, âm lượng */
function tone({ type = 'sine', freqs, start = 0, dur = 0.2, vol = 0.2, endFreq }) {
    if (muted) return;
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqs, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
}

export const sound = {
    get muted() { return muted; },
    setMuted(v) { muted = v; },
    click: () => tone({ freqs: 500, endFreq: 200, dur: 0.05, vol: 0.12 }),
    correct() {
        [523.25, 659.25, 783.99].forEach((f, i) => tone({ type: 'triangle', freqs: f, start: i * 0.08, dur: 0.25 }));
    },
    wrong: () => tone({ type: 'sawtooth', freqs: 160, endFreq: 100, dur: 0.25, vol: 0.2 }),
    fanfare() {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ type: 'triangle', freqs: f, start: i * 0.1, dur: 0.3 }));
    },
};
