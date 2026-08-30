import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getResultBadge(result, winner, white, black) {
  if (result === '1-0') return { text: `${white} won`, cls: 'rmf-result-white' };
  if (result === '0-1') return { text: `${black} won`, cls: 'rmf-result-black' };
  return { text: 'Draw', cls: 'rmf-result-draw' };
}

export default function RecentMatchesFeed() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/recent-matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setMatches(data.matches || []);
    } catch (e) {
      console.error('Recent matches error:', e);
    } finally {
      setLoading(false);
    }
  };

  const safeMatches = Array.isArray(matches) ? matches : [];

  if (loading) {
    return (
      <div className="rmf-container">
        <div className="rmf-loading">Loading recent matches...</div>
      </div>
    );
  }

  if (safeMatches.length === 0) {
    return (
      <div className="rmf-container">
        <div className="rmf-empty">No matches played yet. Be the first!</div>
      </div>
    );
  }

  return (
    <div className="rmf-container">
      <div className="rmf-header">
        <div className="rmf-label">LIVE FEED</div>
        <div className="rmf-pulse-dot" />
      </div>
      <div className="rmf-scroll-track">
        {safeMatches.map((m, i) => {
          const badge = getResultBadge(m.result, m.winner, m.white_username, m.black_username);
          return (
            <div key={m.id || i} className="rmf-card" style={{ animationDelay: `${i * 0.06}s` }}>
              <div className="rmf-card-top">
                <div className="rmf-players">
                  <span className="rmf-player-name">{m.white_username || 'White'}</span>
                  <span className="rmf-vs">vs</span>
                  <span className="rmf-player-name">{m.black_username || 'Black'}</span>
                </div>
                <div className="rmf-time">{timeAgo(m.finished_at)}</div>
              </div>
              <div className="rmf-card-bottom">
                <span className="rmf-result-badge">{m.result || '—'}</span>
                <span className={`rmf-outcome ${badge.cls}`}>{badge.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
