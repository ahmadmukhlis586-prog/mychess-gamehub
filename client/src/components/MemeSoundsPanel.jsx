import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playClickSound, duckBackgroundMusic, restoreBackgroundMusic } from '../helpers';
import { API_BASE, TOKEN_KEY } from '../config';
import './meme_sounds.css';
import MemeSoundsCarousel from './MemeSoundsCarousel';

const MAX_SOUNDS = 5;

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

  const cacheEquipped = useCallback((ids) => {
    try {
      localStorage.setItem('mychess_equipped_memes', JSON.stringify({ ids, at: Date.now() }));
    } catch (e) {}
  }, []);

  const readEquipCache = useCallback(() => {
    try {
      const raw = localStorage.getItem('mychess_equipped_memes');
      if (!raw) return [];
      const { ids, at } = JSON.parse(raw);
      if (!Array.isArray(ids)) return [];
      if (Date.now() - (at || 0) > 24 * 60 * 60 * 1000) return [];
      return ids;
    } catch (e) {
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const [listRes, eqRes] = await Promise.all([
        fetch(`${API_BASE}/meme-sounds`, { cache: 'no-store' }),
        fetch(`${API_BASE}/meme-sounds/equipped`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const list = await listRes.json().catch(() => null);
      const eq = await eqRes.json().catch(() => null);
      if (list && list.ok) setSounds(list.sounds || []);
      if (eq && eq.ok) {
        const ids = eq.soundIds || [];
        if (ids.length > 0) {
          setEquippedIds(new Set(ids));
          cacheEquipped(ids);
        } else {
          const cached = readEquipCache();
          if (cached.length > 0) setEquippedIds(new Set(cached));
        }
      }
    } catch (e) {
      console.error('Meme sounds panel load error:', e);
    }
  }, [token, cacheEquipped]);

  useEffect(() => { load(); }, [load]);

  // Auto-detect new/changed meme sounds (admin adds) without any page refresh.
  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    window.addEventListener('focus', load);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, [load]);

  useEffect(() => {
    return () => { if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} } };
  }, []);

  const preview = async (sound) => {
    playClickSound();
    try { if (audioRef.current) audioRef.current.pause(); } catch (e) {}
    duckBackgroundMusic();
    const a = new Audio(resolveAudio(sound.audio_file));
    a.volume = 0.95;
    audioRef.current = a;
    const finish = () => {
      setPlayingId((p) => (p === sound.id ? null : p));
      restoreBackgroundMusic();
    };
    a.onended = finish;
    a.onerror = finish;
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
        cacheEquipped(result.equipped);
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
          <p>Browse with the ‹ › arrows · tap ▶ to hear it · tap ⚡ to equip (up to {MAX_SOUNDS}). Your equipped sounds appear in-match and in the AI Arena.</p>
        </div>
        <div className="msp-eq" aria-hidden="true">
          <span /><span /><span /><span /><span />
        </div>
        <div className="msp-count">{equippedIds.size}/{MAX_SOUNDS} EQUIPPED</div>
      </div>

      {sounds.length === 0 ? (
        <div className="msp-empty">No meme sounds available yet. Ask an admin to add some!</div>
      ) : (
        <MemeSoundsCarousel
          sounds={sounds}
          equippedIds={equippedIds}
          playingId={playingId}
          ring={ring}
          onPreview={preview}
          onToggleEquip={toggleEquip}
        />
      )}
    </section>
  );
};

export default MemeSoundsPanel;