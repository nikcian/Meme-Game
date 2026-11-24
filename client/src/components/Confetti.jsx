import { useEffect, useRef } from 'react';

const COLORS = ['#ffd23f', '#ff5c8a', '#7b5cff', '#2ed3c6', '#18b26b', '#ff8a3d'];
const DURATION = 3400;

/** Cannoni di coriandoli su canvas (nessuna libreria). Disattivati con "riduci movimento". */
export function Confetti({ burst = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = window.innerWidth * ratio;
      canvas.height = window.innerHeight * ratio;
    };
    resize();

    const width = window.innerWidth;
    const height = window.innerHeight;
    const particles = Array.from({ length: Math.round(170 * burst) }, (_, index) => {
      const fromLeft = index % 2 === 0;
      return {
        x: fromLeft ? -10 : width + 10,
        y: height * (0.75 + Math.random() * 0.2),
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 11),
        vy: -(12 + Math.random() * 13),
        size: 6 + Math.random() * 7,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        wobble: Math.random() * Math.PI * 2,
        color: COLORS[index % COLORS.length],
        round: Math.random() < 0.35,
      };
    });

    let frame;
    const start = performance.now();
    const draw = () => {
      const elapsed = performance.now() - start;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION * 0.6) / (DURATION * 0.4));
      for (const p of particles) {
        p.vy += 0.38;
        p.vx *= 0.985;
        p.vy *= 0.99;
        p.wobble += 0.12;
        p.x += p.vx + Math.sin(p.wobble) * 0.6;
        p.y += p.vy;
        p.rotation += p.spin;
        context.save();
        context.translate(p.x, p.y);
        context.rotate(p.rotation);
        context.fillStyle = p.color;
        if (p.round) {
          context.beginPath();
          context.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.wobble)) + 1);
        }
        context.restore();
      }
      if (elapsed < DURATION) frame = requestAnimationFrame(draw);
      else context.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [burst]);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}
