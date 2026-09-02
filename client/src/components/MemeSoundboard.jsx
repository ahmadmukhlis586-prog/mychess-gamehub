import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../config';
import './meme_sounds.css';

const resolveAudio = (file) => {
  if (!file) return '';
  return file.startsWith('http') ? file : `${window.location.origin}${file}`;
};

const MemeSoundboard = ({ token, roomId, receiverId, socket, account, aiMode }) => {
  const [sounds, setSounds] = useState([]);
  const [equipped, setEquipped] = useState([]);
  const [open, setOpen] = useState(aiMode);
  const [playingId, setPlayingId] = useState(null);
  const [wave, setWave] = useState(null);
  const [floats, setFloats] = useState([]);
  const audioRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [listRes, eqRes] = await Promise.all([
          fetch(`${API_BASE}/meme-sounds`),
          token ? fetch(`${API_BASE}/meme-sounds/equipped`, { headers: { Authorization: `Bearer ${token}` } }) : Promise.resolve(null),
        ]);
        const list = await listRes.json();
        const eq = eqRes ? await eqRes.json() : null;
        if (!mounted) return;
        if (list.ok) setSounds(list.sounds || []);
        if (eq && eq.ok) {
          const byId = Object.fromEntries((list.sounds || []).map(s => [s.id, s]));
          setEquipped((eq.soundIds || []).map(id => byId[id]).filter(Boolean));
        }
      } catch (e) { /* ignore */ }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    if (audioRef.current) { try { audioRef.current.pause(); } catch (e) {} }
  }, [playingId]);

  const playSound = useCallback((sound, sourceName) => {
    if (!sound?.audio_file) return;
    try { if (audioRef.current) audioRef.current.pause(); } catch (e) {}
    const a = new Audio(resolveAudio(sound.audio_file));
    a.volume = 0.95;
    audioRef.current = a;
    a.play().catch(() => {});
    setPlayingId(sound.id);
    const waveId = Date.now() + Math.random();
    setWave({ id: waveId, emoji: sound.emoji || '🔊' });
    setTimeout(() => setPlayingId(null), 1400);
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

  if (equipped.length === 0 && !aiMode) return null;

  const rowVisible = open && equipped.length > 0;

  return (
    <div className="msb-root">
      <button
        type="button"
        className={`msb-toggle ${rowVisible ? 'msb-on' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Meme sounds"
      >
        {rowVisible ? '✕' : '🔊'}
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

      {wave && <span className="msb-wave" key={wave.id} />}
      {floats.map((f) => (
        <span className="msb-float" key={f.id}>{f.emoji}</span>
      ))}
    </div>
  );
};

export default MemeSoundboard;