/* NPC "Cú Tí" hướng dẫn sử dụng: làm nổi bật từng vùng và giải thích bằng bong bóng thoại. */
import { $ } from './dom.js';

const DONE_KEY = 'tn_tour_done_v1';

const STEPS = [
    { text: 'Chào bạn! Mình là Cú Tí. Mình sẽ chỉ bạn cách chơi trong chưa tới một phút nhé!' },
    { target: '.modes', text: 'Đầu tiên chọn trò chơi: Tính nhẩm theo số câu, Tốc độ trong 60 giây, hoặc Nhớ từ.' },
    { target: '#display-row', text: 'Bé mới học thì chọn Hình ảnh: đếm táo, đếm gà con thay vì nhìn số khô khan.' },
    { target: '#level-config', text: 'Chỉnh độ khó, dạng bài (tìm kết quả hay tìm số thiếu) và số hạng từ 2 đến 4.' },
    { target: '#start-btn', text: 'Xong thì bấm Bắt đầu. Đếm 3, 2, 1 là vào bài. Gõ số rồi bấm Xong, hoặc chọn đáp án.' },
    { target: '.streak', text: 'Ngày nào cũng luyện một chút để ngọn lửa chuỗi ngày không tắt nhé!' },
    { target: '.tabbar', text: 'Xem tiến độ, kỷ lục và cài đặt ở thanh dưới. Muốn nghe mình giải thích lại thì bấm nút dấu hỏi ở góc trên.' },
    { text: 'Hết rồi! Chúc bạn học thật vui. Cố lên nào!' },
];

export const Tour = {
    shouldAutoStart: () => !localStorage.getItem(DONE_KEY),

    start() {
        const gsap = window.gsap;
        const root = $('tour');
        const spot = $('tour-spot');
        const npc = $('tour-npc');
        const owl = $('tour-owl');
        let i = 0;

        // 4 tấm phủ tối quanh vùng sáng + viền vàng; GSAP tween một hình chữ nhật ảo
        const panes = ['t', 'r', 'b', 'l'].map((k) => {
            let el = root.querySelector(`.tour-pane.${k}`);
            if (!el) { el = document.createElement('div'); el.className = `tour-pane ${k}`; root.prepend(el); }
            return el;
        });
        const rect = { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 0, h: 0 };
        const layout = () => {
            const { x, y, w, h } = rect;
            const W = window.innerWidth;
            const H = window.innerHeight;
            Object.assign(panes[0].style, { left: '0px', top: '0px', width: `${W}px`, height: `${Math.max(0, y)}px` });
            Object.assign(panes[1].style, { left: `${x + w}px`, top: `${y}px`, width: `${Math.max(0, W - x - w)}px`, height: `${h}px` });
            Object.assign(panes[2].style, { left: '0px', top: `${y + h}px`, width: `${W}px`, height: `${Math.max(0, H - y - h)}px` });
            Object.assign(panes[3].style, { left: '0px', top: `${y}px`, width: `${Math.max(0, x)}px`, height: `${h}px` });
            Object.assign(spot.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, opacity: w > 2 ? 1 : 0 });
        };
        const moveTo = (x, y, w, h) => gsap.to(rect, { x, y, w, h, duration: 0.45, ease: 'power3.inOut', onUpdate: layout });
        layout();

        root.classList.remove('hidden');
        gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        const bob = gsap.to(owl, { y: -8, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 });

        const finish = () => {
            localStorage.setItem(DONE_KEY, '1');
            bob.kill();
            gsap.to(root, { opacity: 0, duration: 0.2, onComplete: () => root.classList.add('hidden') });
            $('tour-next').onclick = null;
            $('tour-skip').onclick = null;
        };

        const show = () => {
            const step = STEPS[i];
            const el = step.target && document.querySelector(step.target);
            $('tour-text').textContent = step.text;
            $('tour-step').textContent = `${i + 1}/${STEPS.length}`;
            $('tour-next').textContent = i === STEPS.length - 1 ? 'Bắt đầu chơi' : 'Tiếp';
            $('tour-skip').classList.toggle('hidden', i === STEPS.length - 1);

            if (el) {
                el.scrollIntoView({ block: 'center', behavior: 'instant' });
                const r = el.getBoundingClientRect();
                const pad = 8;
                moveTo(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
                // Cú đứng phía đối diện vùng được chỉ
                npc.classList.toggle('top', r.top + r.height / 2 > window.innerHeight / 2);
            } else {
                // Không có vùng cần chỉ: thu vùng sáng về giữa, lớp tối phủ toàn bộ
                moveTo(window.innerWidth / 2, window.innerHeight / 2, 0, 0);
                npc.classList.remove('top');
                npc.classList.add('center');
            }
            if (el) npc.classList.remove('center');

            gsap.fromTo('.tour-bubble', { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' });
            gsap.fromTo(owl, { rotation: -12 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
        };

        $('tour-next').onclick = () => {
            i++;
            if (i >= STEPS.length) finish();
            else show();
        };
        $('tour-skip').onclick = finish;
        show();
    },
};
