import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playClickSound } from '../helpers';
import { API_BASE, TOKEN_KEY } from '../config';
import './meme_sounds.css';

const MAX_SOUNDS = 12;

const resolveAudio = (file) => {
  if (!file) return '';
  return file.startsWith('http') ? file : `${window.location.origin}${file}`;
};

const MemeSoundsPanel = ({ token }) => {
  const [sounds, setSounds] = useState([]);
  const [equippedIds, setEquippedIds] = useState(new Set());
  const [playingId, setPlayingId] = useState(null);
  const [ring, setRing] = useState(null);
  const audioRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [listRes, eqRes] = await Promise.all([
        fetch(`${API_BASE}/meme-sounds`, { cache: 'no-store' }),
        fetch(`${API_BASE}/meme-sounds/equipped`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const list = await listRes.json().catch(() => null);
      const eq = await eqRes.json().catch(() => null);
      if (list && list.ok) setSounds(list.sounds || []);
      if (eq && eq.ok) setEquippedIds(new Set(eq.soundIds || []));
    } catch (e) {
      console.error('Meme sounds panel load error:', e);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => { if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} } };
  }, []);

  const preview = async (sound) => {
    playClickSound();
    try { if (audioRef.current) audioRef.current.pause(); } catch (e) {}
    const a = new Audio(resolveAudio(sound.audio_file));
    a.volume = 0.95;
    audioRef.current = a;
    a.onended = () => setPlayingId((p) => (p === sound.id ? null : p));
    a.play().catch(() => {});
    setPlayingId(sound.id);
    const ringId = Date.now() + Math.random();
    setRing({ id: ringId, soundId: sound.id });
    setTimeout(() => setPlayingId((p) => (p === sound.id ? null : p)), 1600);
    setTimeout(() => setRing((r) => (r && r.id === ringId ? null : r)), 800);
  };

  const toggleEquip = async (sound, e) => {
    e.stopPropagation();
    const willEquip = !equippedIds.has(sound.id);
    if (willEquip && equippedIds.size >= MAX_SOUNDS) {
      alert(`You can equip up to ${MAX_SOUNDS} meme sounds. Unequip one first!`);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/meme-sounds/${willEquip ? 'equip' : 'unequip'}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ memeSoundId: sound.id }),
      });
      const result = await res.json().catch(() => null);
      if (res.ok && result && result.ok && Array.isArray(result.equipped)) {
        setEquippedIds(new Set(result.equipped));
      } else {
        if (result && result.message) alert(result.message);
        else alert('Could not update your equipped sounds. Please try again.');
        load();
      }
    } catch (err) {
      alert('Network error updating your equipped sounds.');
      load();
    }
  };

  return (
    <section className="msp-panel">
      <div className="msp-head">
        <div className="msp-head-icon">🔊</div>
        <div className="msp-head-text">
          <h2>Meme Sounds</h2>
          <p>Click a sound to hear it · tap ⚡ to equip for matches (up to {MAX_SOUNDS}). Your equipped sounds appear in-match and in the AI Arena.</p>
        </div>
        <div className="msp-eq" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="msp-count">{equippedIds.size}/{MAX_SOUNDS} EQUIPPED</div>
      </div>

      {sounds.length === 0 ? (
        <div className="msp-empty">No meme sounds available yet. Ask an admin to add some!</div>
      ) : (
        <div className="msp-grid">
          {sounds.map((sound) => {
            const isEquipped = equippedIds.has(sound.id);
            const atCap = !isEquipped && equippedIds.size >= MAX_SOUNDS;
            return (
              <div
                key={sound.id}
                className={`msp-tile ${isEquipped ? 'equipped' : ''} ${playingId === sound.id ? 'playing' : ''}`}
                onClick={() => preview(sound)}
                title={sound.name}
              >
                {ring && ring.soundId === sound.id && <span className="msp-ring" key={ring.id} />}
                <span className="msp-tile-emoji">{sound.emoji || '🔊'}</span>
                <div className="msp-tile-name">{sound.name}</div>
                <div className="msp-tile-actions">
                  <button
                    type="button"
                    className={`msp-tile-btn ${isEquipped ? 'eq-on' : ''} ${atCap ? 'disabled' : ''}`}
                    onClick={(e) => toggleEquip(sound, e)}
                    disabled={atCap}
                    title={isEquipped ? 'Unequip' : atCap ? `Max ${MAX_SOUNDS} reached` : 'Equip'}
                  >
                    {isEquipped ? '✓ EQUIPPED' : '⚡ EQUIP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default MemeSoundsPanel;