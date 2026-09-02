// client/src/components/MemeSoundsCarousel.jsx
// Self-contained single-row meme sound carousel. Additive: no existing functions touched.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './meme_sounds_carousel.css';

const MAX_EQUIP = 5;
const STEP = 158;
const MAX_FAN = 4;

const circularDist = (i, sel, n) => {
  let d = i - sel;
  while (d > n / 2) d -= n;
  while (d < -n / 2) d += n;
  return d;
};

const MemeSoundsCarousel = ({
  sounds = [],
  equippedIds = new Set(),
  playingId = null,
  ring = null,
  onPreview,
  onToggleEquip,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popTick, setPopTick] = useState(0);
  const [newIds, setNewIds] = useState(new Set());
  const initRef = useRef(false);
  const lastMaxIdRef = useRef(0);

  const n = sounds.length;

  useEffect(() => {
    if (n === 0) return;
    setSelectedIndex((s) => Math.min(s, n - 1));
    if (!initRef.current) {
      initRef.current = true;
      lastMaxIdRef.current = Math.max(0, ...sounds.map((s) => Number(s.id) || 0));
      return;
    }
    let recentMax = lastMaxIdRef.current;
    const fresh = [];
    for (const s of sounds) {
      const id = Number(s.id) || 0;
      if (id > lastMaxIdRef.current) {
        fresh.push(s.id);
        if (id > recentMax) recentMax = id;
      }
    }
    if (fresh.length > 0) {
      lastMaxIdRef.current = recentMax;
      const idx = sounds.findIndex((s) => fresh.includes(s.id));
      if (idx >= 0) {
        setSelectedIndex(idx);
        setPopTick((t) => t + 1);
      }
      setNewIds(new Set(fresh));
    } else if (newIds.size > 0) {
      const remaining = new Set(newIds);
      for (const s of sounds) {
        if (!remaining.has(s.id)) remaining.delete(s.id);
      }
      setNewIds(remaining);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds]);

  const move = useCallback((dir) => {
    if (!n) return;
    setNewIds(new Set());
    setSelectedIndex((prev) => (prev + dir + n) % n);
    setPopTick((t) => t + 1);
  }, [n]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  }, [move]);

  return (
    <div className="msc">
      <button type="button" className="msc-nav msc-prev" onClick={() => move(-1)} disabled={!n} title="Previous sound" aria-label="Previous sound">‹</button>

      <div className="msc-stage" tabIndex={0} onKeyDown={handleKey} role="listbox" aria-label="Meme sounds carousel">
        {sounds.map((sound, i) => {
          const d = circularDist(i, selectedIndex, n);
          const ad = Math.min(Math.abs(d), MAX_FAN);
          const visible = Math.abs(d) <= MAX_FAN;
          const isFront = d === 0;
          const isEquipped = equippedIds.has(sound.id);
          const atCap = !isEquipped && equippedIds.size >= MAX_EQUIP;
          const style = visible
            ? {
                transform: `translateX(${d * STEP}px) translateZ(${-ad * 70}px) scale(${1 - ad * 0.115})`,
                opacity: Math.max(0.28, 1 - ad * 0.2),
                zIndex: 100 - ad,
              }
            : { opacity: 0, zIndex: 1, pointerEvents: 'none' };
          const isNew = newIds.has(sound.id);
          return (
            <div
              key={sound.id}
              className={`msc-card ${isFront ? 'front' : ''} ${isEquipped ? 'equipped' : ''} ${playingId === sound.id ? 'playing' : ''}`}
              style={style}
              role="option"
              aria-selected={isFront}
            >
              <div className="msc-face" key={`face-${sound.id}-${isFront ? popTick : 0}`}>
                {ring && ring.soundId === sound.id && <span className="msc-ring" key={ring.id} />}
                {isNew && <span className="msc-new">NEW</span>}
                <span className="msc-emoji">{sound.emoji || '🔊'}</span>
                <div className="msc-name">{sound.name}</div>
                <div className="msc-actions">
                  <button type="button" className="msc-play" onClick={() => onPreview && onPreview(sound)} title="Preview sound">▶</button>
                  <button
                    type="button"
                    className={`msc-eq ${isEquipped ? 'on' : ''} ${atCap ? 'disabled' : ''}`}
                    onClick={(e) => onToggleEquip && onToggleEquip(sound, e)}
                    disabled={atCap}
                    title={isEquipped ? 'Unequip' : atCap ? `Max ${MAX_EQUIP} reached` : 'Equip for matches'}
                  >
                    {isEquipped ? '✓ EQUIPPED' : '⚡ EQUIP'}
                  </button>
                </div>
                {isEquipped && <span className="msc-badge">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="msc-nav msc-next" onClick={() => move(1)} disabled={!n} title="Next sound" aria-label="Next sound">›</button>
    </div>
  );
};

export default MemeSoundsCarousel;