import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const EntranceThemes = ({ token, players, socket }) => {
  const [entrances, setEntrances] = useState([]);
  const timerRef = useRef(null);
  const lastPlayRef = useRef(0);

  useEffect(() => {
    if (!socket) return undefined;

    const handleStart = async () => {
      const now = Date.now();
      if (now - lastPlayRef.current < 3000) return;
      lastPlayRef.current = now;
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

      setEntrances(fetched);
      timerRef.current = setTimeout(() => setEntrances([]), 5400);
    };

    socket.on('gameStart', handleStart);
    return () => {
      socket.off('gameStart', handleStart);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [socket, players, token]);

  if (entrances.length === 0) return null;

  return (
    <div className="ent-layer">
      {entrances.map((t) => (
        <div className="ent-card" key={t.playerName} style={{ '--ent-glow': t.glow_hex || '#a855f7' }}>
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