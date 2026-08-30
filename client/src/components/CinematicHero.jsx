import React, { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../config';

const LiveBadge = ({ socket }) => {
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef(socket);
  socketRef.current = socket;

  useEffect(() => {
    fetch(`${API_BASE}/online-count`).then(r => r.json()).then(d => { if (d.ok) setOnlineCount(d.count); }).catch(() => {});
    const poll = setInterval(() => {
      fetch(`${API_BASE}/online-count`).then(r => r.json()).then(d => { if (d.ok) setOnlineCount(d.count); }).catch(() => {});
    }, 10000);
    if (!socketRef.current) return () => clearInterval(poll);
    const handler = (count) => setOnlineCount(count);
    socketRef.current.on('onlineCount', handler);
    return () => { clearInterval(poll); socketRef.current.off('onlineCount', handler); };
  }, [socket]);

  return (
    <div className="ch-live-badge-wrap">
      <div className="ch-live-badge">
        <span className="ch-live-dot" />
        <span className="ch-live-text">LIVE NOW</span>
        <span className="ch-live-count">{onlineCount} PLAYER{onlineCount !== 1 ? 'S' : ''} ONLINE</span>
      </div>
    </div>
  );
};

export default LiveBadge;
