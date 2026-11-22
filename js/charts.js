/* Biểu đồ 7 ngày bằng Chart.js (dữ liệu thật, không có số liệu mẫu). */
import { History } from './store.js';

const charts = {};
const TICK = { color: '#9aa4cf', font: { size: 10 } };
const GRID = { color: 'rgba(255,255,255,0.06)' };

function last7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ key: d.toDateString(), label: `${d.getDate()}/${d.getMonth() + 1}` });
    }
    return days;
}

function dataset(label, data, color, extra = {}) {
    return { label, data, borderColor: color, backgroundColor: `${color}22`, pointBackgroundColor: color, borderWidth: 3, pointRadius: 4, tension: 0.35, spanGaps: true, ...extra };
}

function draw(id, labels, datasets, yOptions) {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;
    charts[id]?.destroy();
    charts[id] = new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#cbd5f5', boxWidth: 12, font: { size: 10 } } } },
            scales: { x: { grid: GRID, ticks: TICK }, y: { grid: GRID, ticks: TICK, ...yOptions } },
        },
    });
}

/** Tốt nhất mỗi ngày: min hoặc max tùy loại */
function bestPerDay(records, days, pick, better) {
    const best = {};
    for (const r of records) {
        const key = new Date(r.id).toDateString();
        const v = pick(r);
        if (v > 0 && (best[key] === undefined || better(v, best[key]))) best[key] = v;
    }
    return days.map((d) => best[d.key] ?? null);
}

export function renderCharts() {
    const days = last7Days();
    const labels = days.map((d) => d.label);
    const all = History.all();
    const math = all.filter((r) => r.opType !== 'word-memory');
    const memory = all.filter((r) => r.opType === 'word-memory');

    const times = bestPerDay(math, days, (r) => r.totalTimeSeconds || 0, (a, b) => a < b);
    const line = (label, value, color) => dataset(label, Array(7).fill(value), color, { borderDash: [6, 6], pointRadius: 0, borderWidth: 2, backgroundColor: 'transparent' });
    draw('math-chart', labels, [
        dataset('Tốt nhất (giây)', times, '#22d3ee', { fill: true }),
        line('9s cần cải thiện', 9, '#fb7185'),
        line('8s tốt', 8, '#fbbf24'),
        line('7s xuất sắc', 7, '#34d399'),
    ], {});

    const scores = bestPerDay(memory, days, (r) => r.correctCount || 0, (a, b) => a > b);
    draw('memory-chart', labels, [dataset('Từ nhớ đúng', scores, '#a78bfa', { fill: true })], { min: 0, max: 20 });
}
