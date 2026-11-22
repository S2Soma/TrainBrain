/* Nền chữ số và ký hiệu toán học trôi nổi, điều khiển bằng GSAP. */
const SYMBOLS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '−', '×', '÷', '=', 'π', '√', 'Σ', '∞', '%'];

export function startMathBackground(container) {
    const gsap = window.gsap;
    if (!gsap || !container) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = window.innerWidth < 500 ? 26 : 40;
    const tweens = [];

    for (let i = 0; i < count; i++) {
        const el = document.createElement('span');
        el.className = 'glyph';
        el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        const size = gsap.utils.random(18, 64);
        el.style.fontSize = `${size}px`;
        container.appendChild(el);

        const x = gsap.utils.random(0, window.innerWidth);
        const peak = gsap.utils.random(0.07, 0.2);

        if (reduce) {
            gsap.set(el, { x, y: gsap.utils.random(0, window.innerHeight), opacity: peak * 0.6 });
            continue;
        }

        const dur = gsap.utils.random(16, 34);
        const rise = gsap.fromTo(
            el,
            { x, y: window.innerHeight + 80, rotation: gsap.utils.random(-30, 30), opacity: 0 },
            {
                y: -120,
                rotation: `+=${gsap.utils.random(-90, 90)}`,
                duration: dur,
                ease: 'none',
                repeat: -1,
                // Bắt đầu ở vị trí ngẫu nhiên để màn hình có chữ ngay từ đầu
                onRepeat: () => gsap.set(el, { x: gsap.utils.random(0, window.innerWidth) }),
            },
        );
        rise.progress(Math.random());

        const fade = gsap.to(el, {
            keyframes: [{ opacity: peak, duration: 0.2 }, { opacity: peak, duration: 0.6 }, { opacity: 0, duration: 0.2 }],
            duration: dur,
            ease: 'none',
            repeat: -1,
        });
        fade.progress(rise.progress());

        const sway = gsap.to(el, {
            xPercent: gsap.utils.random(-120, 120),
            duration: gsap.utils.random(3, 7),
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
        tweens.push(rise, fade, sway);
    }

    // Dừng khi tab bị ẩn để tiết kiệm pin
    document.addEventListener('visibilitychange', () => {
        tweens.forEach((t) => (document.hidden ? t.pause() : t.resume()));
    });
}
