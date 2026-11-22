/* Nền: gradient pastel + mảng màu mờ trôi chậm + khối số 3D (Fluent Emoji) lơ lửng ở mép màn hình. */
const TILES = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k0', 'plus', 'minus', 'multiply', 'divide', 'equals'];

export function startMathBackground(container) {
    const gsap = window.gsap;
    if (!gsap || !container) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tweens = [];
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    // Mảng màu mờ
    ['blob-a', 'blob-b', 'blob-c'].forEach((cls) => {
        const blob = document.createElement('div');
        blob.className = `blob ${cls}`;
        container.appendChild(blob);
        if (!reduce) {
            tweens.push(gsap.to(blob, {
                x: () => gsap.utils.random(-80, 80), y: () => gsap.utils.random(-60, 60), scale: () => gsap.utils.random(0.9, 1.2),
                duration: () => gsap.utils.random(12, 18), ease: 'sine.inOut', repeat: -1, yoyo: true, repeatRefresh: true,
            }));
        }
    });

    // Khối số 3D: đặt dọc hai mép trái/phải để không che nội dung chính
    const count = W() < 600 ? 8 : 12;
    const picks = gsap.utils.shuffle([...TILES]).slice(0, count);
    picks.forEach((name, i) => {
        const img = document.createElement('img');
        img.src = `img/bg/${name}.png`;
        img.alt = '';
        img.className = 'floaty';
        img.decoding = 'async';
        const size = gsap.utils.random(38, 64);
        img.style.width = `${size}px`;
        container.appendChild(img);

        const leftSide = i % 2 === 0;
        const x = leftSide ? gsap.utils.random(-size * 0.35, W() * 0.16) : gsap.utils.random(W() * 0.84 - size, W() - size * 0.65);
        const y = (H() / count) * i + gsap.utils.random(0, H() / count - size);
        gsap.set(img, { x, y, rotation: gsap.utils.random(-25, 25), opacity: 0 });
        gsap.to(img, { opacity: 0.55, duration: 1.2, delay: 0.1 * i });

        if (reduce) return;
        tweens.push(
            gsap.to(img, { y: `+=${gsap.utils.random(-36, 36)}`, rotation: `+=${gsap.utils.random(-18, 18)}`, duration: gsap.utils.random(4, 7), ease: 'sine.inOut', repeat: -1, yoyo: true }),
            gsap.to(img, { x: `+=${gsap.utils.random(-14, 14)}`, duration: gsap.utils.random(5, 9), ease: 'sine.inOut', repeat: -1, yoyo: true }),
        );
    });

    document.addEventListener('visibilitychange', () => {
        tweens.forEach((t) => (document.hidden ? t.pause() : t.resume()));
    });
}
