import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const DEFAULT_TRAIL = { color_hex: '#c084fc', glow_hex: '#7c3aed', name: 'Comet', trail_key: 'comet' };

function squareToGrid(sq, playerRole) {
  if (!sq || sq.length < 2) return null;
  const f = sq.charCodeAt(0) - 97;
  const n = parseInt(sq[1], 10);
  if (Number.isNaN(f) || Number.isNaN(n) || f < 0 || f > 7 || n < 1 || n > 8) return null;
  if (playerRole === 'b') return { col: 7 - f, row: n - 1 };
  return { col: f, row: 8 - n };
}

function findBoardWrap() {
  const layout = document.querySelector('.match-layout');
  if (!layout || !layout.firstElementChild) return null;
  const panel = layout.firstElementChild;
  for (const d of panel.querySelectorAll('div')) {
    if (d.style && d.style.aspectRatio === '1 / 1' && d.style.position === 'relative' && d.style.borderRadius === '10px') {
      return d;
    }
  }
  return null;
}

const MoveTrails = ({ gameState, playerRole }) => {
  const [equipped, setEquipped] = useState(DEFAULT_TRAIL);
  const [trail, setTrail] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetch(`${API_BASE}/trails/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.trail) setEquipped(d.trail); })
      .catch(() => {});
  }, []);

  const lastMove = gameState?.lastMove;

  useEffect(() => {
    if (!lastMove?.from || !lastMove?.to) { setTrail(null); return undefined; }
    const wrap = findBoardWrap();
    if (!wrap) { setTrail(null); return undefined; }
    const rect = wrap.getBoundingClientRect();
    if (!rect || rect.width < 10) { setTrail(null); return undefined; }
    const from = squareToGrid(lastMove.from, playerRole);
    const to = squareToGrid(lastMove.to, playerRole);
    if (!from || !to) { setTrail(null); return undefined; }
    const key = `${lastMove.from}>${lastMove.to}:${Date.now()}`;
    setTrail({ key, from, to, rect });
    const timer = setTimeout(() => setTrail(null), 1500);
    return () => clearTimeout(timer);
  }, [lastMove?.from, lastMove?.to, playerRole]);

  if (!trail) return null;

  const cell = trail.rect.width / 8;
  const x1 = trail.rect.left + (trail.from.col + 0.5) * cell;
  const y1 = trail.rect.top + (trail.from.row + 0.5) * cell;
  const x2 = trail.rect.left + (trail.to.col + 0.5) * cell;
  const y2 = trail.rect.top + (trail.to.row + 0.5) * cell;
  const lx1 = x1 - trail.rect.left;
  const ly1 = y1 - trail.rect.top;
  const lx2 = x2 - trail.rect.left;
  const ly2 = y2 - trail.rect.top;
  const color = equipped.color_hex || DEFAULT_TRAIL.color_hex;
  const glow = equipped.glow_hex || DEFAULT_TRAIL.glow_hex;
  const strokeWidth = Math.max(3, cell * 0.09);
  const headR = Math.max(5, cell * 0.12);

  return (
    <div
      className="mt-layer"
      style={{ left: trail.rect.left, top: trail.rect.top, width: trail.rect.width, height: trail.rect.height, ['--mt-glow' ]: glow }}
    >
      <svg
        className="mt-svg"
        viewBox={`0 0 ${trail.rect.width} ${trail.rect.height}`}
        preserveAspectRatio="none"
      >
        <line
          className="mt-line"
          key={`line-${trail.key}`}
          x1={lx1}
          y1={ly1}
          x2={lx2}
          y2={ly2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
        />
        <circle
          className="mt-head"
          key={`head-${trail.key}`}
          cx={lx2}
          cy={ly2}
          r={headR}
          fill={color}
        />
        <circle cx={lx2} cy={ly2} r={headR * 0.45} fill="#ffffff" opacity="0.9" />
      </svg>
    </div>
  );
};

export default MoveTrails;