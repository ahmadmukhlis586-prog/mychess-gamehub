import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

// Simple in-memory avatar cache to avoid duplicate requests for the same user.
const avatarCache = {};

export default function Avatar({ userId, name, size = 38 }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    if (!userId) return;
    if (avatarCache[userId] !== undefined) {
      setUrl(avatarCache[userId]);
      return;
    }
    let active = true;
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/avatar/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const val = d && d.ok && d.avatar ? d.avatar : null;
        avatarCache[userId] = val;
        if (active) setUrl(val);
      })
      .catch(() => { if (active) { avatarCache[userId] = null; setUrl(null); } });
    return () => { active = false; };
  }, [userId]);

  const letter = (name || '?').charAt(0).toUpperCase();

  if (url) {
    return <img src={url} alt={name || 'avatar'} className="avatar-img" style={{ width: size, height: size }} />;
  }
  return <span className="avatar-letter" style={{ width: size, height: size, fontSize: size * 0.4 }}>{letter}</span>;
}
