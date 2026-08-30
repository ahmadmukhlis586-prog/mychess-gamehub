import React from 'react';
import { Chess } from 'chess.js';

const PIECE_UNICODE = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const PIECE_NAME = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen' };

export function getCapturedPieces(moveHistory) {
  const chess = new Chess();
  const captured = { w: [], b: [] };
  const chronological = [];
  for (const san of moveHistory) {
    try {
      const move = chess.move(san, { sloppy: true });
      if (move && move.captured) {
        const capturedColor = move.color === 'w' ? 'b' : 'w';
        captured[capturedColor].push(move.captured);
        chronological.push({ color: capturedColor, type: move.captured, san: move.san });
      }
    } catch (e) {}
  }
  const material = { w: 0, b: 0 };
  captured.w.forEach(() => { material.w += 1; });
  captured.b.forEach(() => { material.b += 1; });
  return { captured, material, chronological };
}

const ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 8px',
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.01em',
};

export default function CapturedPieces({ captured, material, isMobile }) {
  const list = captured || [];
  if (list.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>
        No pieces captured yet.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {list.map((item, i) => {
        const isWhite = item.color === 'w';
        const colorLabel = isWhite ? 'WHITE' : 'BLACK';
        const sym = PIECE_UNICODE[item.type] || '?';
        const name = PIECE_NAME[item.type] || item.type;
        return (
          <div
            key={`${i}-${item.type}-${item.color}`}
            style={{
              ...ROW_STYLE,
              background: isWhite ? 'rgba(232,227,238,0.06)' : 'rgba(42,26,62,0.25)',
              border: isWhite ? '1px solid rgba(232,227,238,0.1)' : '1px solid rgba(139,92,246,0.12)',
            }}
          >
            <span style={{
              fontSize: isMobile ? 14 : 16,
              lineHeight: 1,
              filter: isWhite ? 'drop-shadow(0 0 2px rgba(255,255,255,0.4))' : 'none',
            }}>
              {sym}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 800, fontSize: 10 }}>-1</span>
            <span style={{
              fontWeight: 800,
              fontSize: isMobile ? 10 : 11,
              color: isWhite ? '#e8e3ee' : '#a78bfa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {colorLabel}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 10 : 11 }}>
              {name}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              has been captured!
            </span>
          </div>
        );
      })}
      {list.length > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginTop: 4,
          padding: '6px 0',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
            Total Pieces Lost:
            <span style={{ color: '#e8e3ee', fontWeight: 800, marginLeft: 4 }}>
              White (-{material.w})
            </span>
            <span style={{ margin: '0 4px', opacity: 0.4 }}>|</span>
            <span style={{ color: '#a78bfa', fontWeight: 800 }}>
              Black (-{material.b})
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
