import React, { useEffect, useRef, useState } from 'react';

const RARITY_COLORS = {
  common: '#6b7280', uncommon: '#34d399', rare: '#60a5fa',
  epic: '#a855f7', legendary: '#f59e0b',
};

export default function PurchaseCelebration({ item, visible, onComplete }) {
  const canvasRef = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible || !item) { setShow(false); return; }
    setShow(true);
    const timer = setTimeout(() => { setShow(false); if (onComplete) onComplete(); }, 2600);
    return () => clearTimeout(timer);
  }, [visible, item, onComplete]);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;
    const particles = [];
    for (let i = 0; i < 35; i++) {
      const angle = (Math.PI * 2 * i) / 35;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: w / 2, y: h / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1,
        size: 2 + Math.random() * 4,
        color: RARITY_COLORS[item?.rarity] || '#a855f7',
        life: 1, decay: 0.01 + Math.random() * 0.015,
      });
    }
    let raf;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      if (elapsed > 1500) { ctx.clearRect(0, 0, w, h); return; }
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= p.decay;
        if (p.life <= 0) continue;
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, w, h); };
  }, [show, item]);

  if (!show || !item) return null;

  const rarityColor = RARITY_COLORS[item.rarity] || '#a855f7';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2147483646,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5,3,10,0.88)', backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      animation: 'fadeInBackdrop 0.3s ease',
    }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(15,10,28,0.95)',
        border: `2px solid ${rarityColor}`,
        borderRadius: 20, padding: '40px 48px',
        textAlign: 'center',
        boxShadow: `0 0 60px ${rarityColor}40, 0 20px 60px rgba(0,0,0,0.6)`,
        animation: 'purchaseScale 0.5s cubic-bezier(0.175,0.885,0.32,1.275)',
        overflow: 'hidden',
        maxWidth: 'min(340px, 90vw)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, transparent 30%, ${rarityColor}15 50%, transparent 70%)`,
          animation: 'purchaseShimmer 1.5s ease-in-out infinite',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.15em',
            color: rarityColor, textTransform: 'uppercase', marginBottom: 12,
          }}>{item.rarity || 'item'} acquired</div>
          <div style={{
            fontSize: 64, lineHeight: 1, marginBottom: 12,
            filter: `drop-shadow(0 0 20px ${rarityColor}80)`,
          }}>{item.icon || item.name?.charAt(0) || '?'}</div>
          <div style={{
            fontSize: 18, fontWeight: 800, color: '#ffffff',
            marginBottom: 6,
          }}>{item.name || 'Unknown Item'}</div>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.4)',
          }}>Added to your inventory!</div>
        </div>
      </div>
    </div>
  );
}
