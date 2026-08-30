import React, { useEffect, useRef } from 'react';

const COLORS = ['#facc15','#f97316','#a855f7','#ec4899','#34d399','#60a5fa','#f43f5e','#7c3aed','#ffffff'];

export default function VictoryParticles({ active, duration = 4000 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const particleCount = w < 768 ? 40 : 80;
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const type = Math.random();
      particles.push({
        x: Math.random() * w,
        y: -20 - Math.random() * 100,
        vy: 1 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 2,
        size: type < 0.3 ? 2 + Math.random() * 3 : 5 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        life: 1,
        decay: 0.002 + Math.random() * 0.004,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        type: type < 0.3 ? 'circle' : type < 0.6 ? 'rect' : 'star',
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.02 + Math.random() * 0.03,
      });
    }
    let raf;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      if (elapsed > duration) { ctx.clearRect(0, 0, w, h); return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.wobble += p.wobbleSpeed;
        p.x += p.vx + Math.sin(p.wobble) * 0.5;
        p.y += p.vy;
        p.vy += 0.02;
        p.life -= p.decay;
        p.rotation += p.rotSpeed;
        if (p.life <= 0 || p.y > h + 20) continue;
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.type === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.type === 'star') {
          drawStar(ctx, 0, 0, 5, p.size / 2, p.size / 4);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); window.removeEventListener('resize', handleResize); };
  }, [active, duration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        zIndex: 99999, pointerEvents: 'none',
      }}
    />
  );
}

function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
}
