import React, { useEffect, useState, useRef } from 'react';

export default function EloRing({ elo = 0, maxElo = 3000, size = 180 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const rafRef = useRef(null);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const responsiveSize = typeof window !== 'undefined' ? Math.min(size, Math.max(140, window.innerWidth * 0.4)) : size;
  const strokeWidth = 10;
  const radius = (responsiveSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedElo = Math.min(elo, maxElo);
  const progress = clampedElo / maxElo;
  const targetOffset = circumference * (1 - progress);

  useEffect(() => {
    if (prefersReduced) {
      setDisplayValue(clampedElo);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayValue(Math.round(eased * clampedElo));
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [clampedElo, prefersReduced]);

  return (
    <div style={{ position: 'relative', width: responsiveSize, height: responsiveSize, margin: '0 auto' }}>
      <svg width={responsiveSize} height={responsiveSize} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={responsiveSize / 2}
          cy={responsiveSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(139,92,246,0.12)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={responsiveSize / 2}
          cy={responsiveSize / 2}
          r={radius}
          fill="none"
          stroke="url(#eloGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={prefersReduced ? targetOffset : circumference}
          strokeLinecap="round"
          style={{
            transition: prefersReduced ? 'none' : 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)',
            ...(prefersReduced ? { strokeDashoffset: targetOffset } : {}),
            filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.5))',
          }}
        />
        <defs>
          <linearGradient id="eloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: Math.round(responsiveSize * 0.28),
          fontWeight: 900, color: '#c4b5fd',
          lineHeight: 1, letterSpacing: '-0.04em',
        }}>{displayValue}</span>
        <span style={{
          fontSize: 9, fontWeight: 800,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.35)',
          marginTop: 4,
        }}>ELO</span>
      </div>
    </div>
  );
}
