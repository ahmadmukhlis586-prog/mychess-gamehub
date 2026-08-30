import React, { useState, useEffect, useRef } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

function AnimatedNumber({ value = 0, duration = 1200 }) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    startRef.current = display;
    const start = startRef.current;
    const diff = safeValue - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [safeValue]);

  return <span className="gsb-number">{display.toLocaleString()}</span>;
}

export default function GameStatsBar() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/game-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setStats(data.stats);
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="gsb-container">
        <div className="gsb-loading">Loading stats...</div>
      </div>
    );
  }

  const items = [
    { label: 'Games Today', value: stats.todayGames, icon: '⚡' },
    { label: 'Total Games', value: stats.totalGames, icon: '♟' },
    { label: 'Players', value: stats.totalPlayers, icon: '♦' },
    { label: 'Avg ELO', value: stats.avgElo, icon: '◆' },
  ];

  return (
    <div className="gsb-container">
      {items.map((item, i) => (
        <div key={item.label} className="gsb-item" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="gsb-icon">{item.icon}</div>
          <div className="gsb-content">
            <AnimatedNumber value={item.value} />
            <div className="gsb-label">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
