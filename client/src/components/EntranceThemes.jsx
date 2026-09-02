import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const EntranceThemes = ({ token, players, socket }) => {
  const [entrances, setEntrances] = useState([]);
  const audioRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!socket) return undefined;

    const playRolling = (theme, playerName) => {
      const audio = new Audio();
      audio.loop = false;
      audio.volume = 0.6;
      audio.src = theme.audio_file && theme.audio_file.startsWith('http')
        ? theme.audio_file
        : `${window.location.origin}${theme.audio_file || '/assets/audio/my-intro-sound.mp3'}`;
      audio.play().catch(() => {});
      audioRefs.current.push(audio);
    };

    const handleStart = async () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const names = {
        [players?.white?.id]: players?.white?.name || 'White',
        [players?.black?.id]: players?.black?.name || 'Black',
      };
      const ids = Object.keys(names).filter(Boolean);
      if (ids.length === 0) return;

      const fetched = [];
      for (const id of ids) {
        try {
          const res = await fetch(`${API_BASE}/entrance/theme/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.ok && data.theme) {
            fetched.push({ ...data.theme, playerName: names[id] });
          }
        } catch (e) { /* ignore network errors */ }
      }
      if (fetched.length === 0) return;

      audioRefs.current.forEach((a) => { try { a.pause(); } catch (e) {} });
      audioRefs.current = [];
      fetched.forEach((t) => playRolling(t, t.playerName));

      setEntrances(fetched);
      timerRef.current = setTimeout(() => setEntrances([]), 5400);
    };

    socket.on('gameStart', handleStart);
    return () => {
      socket.off('gameStart', handleStart);
      audioRefs.current.forEach((a) => { try { a.pause(); } catch (e) {} });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket, players, token]);

  if (entrances.length === 0) return null;

  return (
    <div className="ent-layer">
      {entrances.map((t) => (
        <div className="ent-card" key={t.playerName}>
          <div className="ent-emoji">{t.emoji || '⚡'}</div>
          <div className="ent-text">
            <div className="ent-name">{t.playerName}</div>
            <div className="ent-sub">ENTERS THE MATCH</div>
            <div className="ent-tagline">{t.tagline || ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EntranceThemes;