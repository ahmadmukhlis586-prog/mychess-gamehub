import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../config';
import { duckBackgroundMusic, restoreBackgroundMusic } from '../helpers';
import './meme_sounds.css';

const CACHE_KEY = 'mychess_equipped_memes';

const readEquipCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const { ids, at } = JSON.parse(raw);
    if (!Array.isArray(ids)) return [];
    if (Date.now() - (at || 0) > 24 * 60 * 60 * 1000) return [];
    return ids;
  } catch (e) {
    return [];
  }
};

const writeEquipCache = (ids) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ids, at: Date.now() }));
  } catch (e) { /* ignore */ }
};

const resolveAudio = (file) => {
  if (!file) return '';
  return file.startsWith('http') ? file : `${window.location.origin}${file}`;
};

const MemeSoundboard = ({ token, roomId, receiverId, socket, account, aiMode }) => {
  const [sounds, setSounds] = useState([]);
  const [equippedIds, setEquippedIds] = useState(() => readEquipCache());
  const [open, setOpen] = useState(aiMode);
  const [playingId, setPlayingId] = useState(null);
  const [wave, setWave] = useState(null);
  const [floats, setFloats] = useState([]);
  const audioRef = useRef(null);

  const equipped = sounds.filter((s) => equippedIds.includes(s.id));

  const applyEquippedIds = useCallback((ids) => {
    setEquippedIds(ids);
    writeEquipCache(ids);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [listRes, eqRes] = await Promise.all([
          fetch(`${API_BASE}/meme-sounds`, { cache: 'no-store' }),
          token ? fetch(`${API_BASE}/meme-sounds/equipped`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        ]);
        const list = await listRes.json().catch(() => null);
        const eq = eqRes ? await eqRes.json().catch(() => null) : null;
        if (!mounted) return;
        if (list && list.ok) setSounds(list.sounds || []);
        const cached = readEquipCache();
        if (eq && eq.ok) {
          const serverIds = eq.soundIds || [];
          if (serverIds.length > 0) {
            applyEquippedIds(serverIds);
          } else if (cached.length > 0) {
            setEquippedIds(cached);
          } else {
            setEquippedIds([]);
          }
        } else if (cached.length > 0) {
          setEquippedIds(cached);
        }
      } catch (e) { /* ignore */ }
    };
    load();
    return () => { mounted = false; };
  }, [token, applyEquippedIds]);

  const playSound = useCallback((sound, sourceName) => {
    if (!sound?.audio_file) return;
    try { if (audioRef.current) audioRef.current.pause(); } catch (e) {}
    const a = new Audio(resolveAudio(sound.audio_file));
    a.volume = 0.95;
    audioRef.current = a;
    const startedId = sound.id;
    const finish = () => {
      setPlayingId((p) => (p === startedId ? null : p));
      restoreBackgroundMusic();
    };
    duckBackgroundMusic();
    a.onended = finish;
    a.onerror = finish;
    a.play().catch(() => {});
    setPlayingId(startedId);
    const waveId = Date.now() + Math.random();
    setWave({ id: waveId, emoji: sound.emoji || '🔊' });
    setTimeout(() => setPlayingId((p) => (p === startedId ? null : p)), 1400);
    setTimeout(() => setWave((w) => (w && w.id === waveId ? null : w)), 700);
    const floatId = Date.now() + Math.random();
    setFloats((prev) => [...prev, { id: floatId, emoji: sound.emoji || '🔊' }]);
    setTimeout(() => setFloats((prev) => prev.filter(f => f.id !== floatId)), 1400);
  }, []);

  const sendSound = useCallback(async (sound) => {
    playSound(sound);
    if (aiMode || !socket || !roomId || !token) return;
    try {
      await fetch(`${API_BASE}/meme-sounds/play`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          receiverId,
          memeSoundId: sound.id,
          name: sound.name,
          emoji: sound.emoji,
          audioFile: sound.audio_file,
        }),
      });
    } catch (e) { /* ignore */ }
  }, [aiMode, socket, roomId, token, receiverId, playSound]);

  const toggleOpen = useCallback(async () => {
    if (!open) {
      try {
        const eqRes = await fetch(`${API_BASE}/meme-sounds/equipped`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
        const eq = await eqRes.json().catch(() => null);
        if (eq && eq.ok) {
          const serverIds = eq.soundIds || [];
          if (serverIds.length > 0) {
            applyEquippedIds(serverIds);
          } else if (equippedIds.length > 0) {
            setEquippedIds(equippedIds);
          }
        }
      } catch (e) { /* ignore */ }
    }
    setOpen((o) => !o);
  }, [open, token, equippedIds, applyEquippedIds]);

  useEffect(() => {
    if (!socket || aiMode) return undefined;
    const handler = (data) => {
      if (!data) return;
      if (data.senderId && account && String(data.senderId) === String(account.id)) return;
      const match = sounds.find(s => s.id === data.memeSoundId) || (data.audioFile ? { id: data.memeSoundId, name: data.name || '', emoji: data.emoji || '🔊', audio_file: data.audioFile } : null);
      if (match) playSound(match, data.senderName);
    };
    socket.on('memeSoundPlay', handler);
    return () => { socket.off('memeSoundPlay', handler); };
  }, [socket, aiMode, account, sounds, playSound]);

  const rowVisible = open && equipped.length > 0;

  return (
    <div className="msb-root">
      <button
        type="button"
        className={`msb-toggle ${rowVisible ? 'msb-on' : ''}`}
        onClick={toggleOpen}
        title="Meme sounds"
      >
        {open ? '✕' : '🔊'}
      </button>

      {rowVisible && (
        <div className="msb-row">
          {equipped.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`msb-chip ${playingId === s.id ? 'playing' : ''}`}
              onClick={() => sendSound(s)}
              title={s.name}
            >
              <span className="msb-chip-emoji">{s.emoji || '🔊'}</span>
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {open && equipped.length === 0 && !aiMode && (
        <div className="msb-empty">
          No meme sounds equipped yet. Equip up to 5 from the Meme Sounds tab on the home page, then reopen this panel.
        </div>
      )}

      {wave && <span className="msb-wave" key={wave.id} />}
      {floats.map((f) => (
        <span className="msb-float" key={f.id}>{f.emoji}</span>
      ))}
    </div>
  );
};

export default MemeSoundboard;