import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import FloatingBackground from '../components/FloatingBackground';

const MatchTimelinePage = ({ account, onBack }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) return;
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/match-history/${account.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) setMatches(d.matches); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [account]);

  const getResult = (match) => {
    if (match.result === 'draw') return { label: 'DRAW', cls: 'mt-draw' };
    const isWhite = match.white_player_id === account?.id;
    const won = (isWhite && match.result === 'white') || (!isWhite && match.result === 'black');
    return won ? { label: 'WIN', cls: 'mt-win' } : { label: 'LOSS', cls: 'mt-loss' };
  };

  const getOpponent = (match) => {
    return match.white_player_id === account?.id ? match.black_username : match.white_username;
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diffH = Math.floor((now - dt) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return dt.toLocaleDateString();
  };

  return (
    <div className="mt-page">
      <FloatingBackground />
      <header className="mt-header">
        <button type="button" className="mychess-home-logout" onClick={onBack}>← Back</button>
        <div className="mt-brand">
          <div className="mychess-logo-mark">📜</div>
          <div>
            <div className="mychess-brand">MATCH HISTORY</div>
            <div className="mychess-brand-subtitle">{matches.length} MATCHES PLAYED</div>
          </div>
        </div>
      </header>

      <main className="mt-main">
        {loading ? (
          <div className="mt-loading">Loading match history...</div>
        ) : matches.length === 0 ? (
          <div className="mt-empty">
            <div className="mt-empty-icon">♟️</div>
            <p>No matches yet. Play your first game!</p>
          </div>
        ) : (
          <div className="mt-timeline">
            {matches.map((match, i) => {
              const result = getResult(match);
              const moveCount = Array.isArray(match.moves) ? match.moves.length : 0;
              return (
                <div key={match.id || i} className="mt-event">
                  <div className="mt-dot-container">
                    <div className={`mt-dot ${result.cls}`} />
                    {i < matches.length - 1 && <div className="mt-line" />}
                  </div>
                  <div className={`mt-card ${result.cls}`}>
                    <div className="mt-card-top">
                      <span className={`mt-result-badge ${result.cls}`}>{result.label}</span>
                      <span className="mt-time">{formatDate(match.finished_at)}</span>
                    </div>
                    <div className="mt-card-body">
                      <span className="mt-vs">vs</span>
                      <span className="mt-opponent">{getOpponent(match)}</span>
                    </div>
                    <div className="mt-card-footer">
                      <span>{moveCount} moves</span>
                      <span>{match.result_type || 'standard'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchTimelinePage;
