import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import FloatingBackground from '../components/FloatingBackground';

const CATEGORY_ICONS = { games: '🎮', streak: '🔥', elo: '⭐', social: '💬' };
const CATEGORY_LABELS = { games: 'Game', streak: 'Streak', elo: 'Rating', social: 'Social' };

const AchievementsPage = ({ onBack, onAccountUpdate }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);

  const fetchAchievements = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/achievements`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) setAchievements(d.achievements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAchievements(); }, []);

  const claimReward = async (id) => {
    if (claimingId) return;
    setClaimingId(id);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/achievements/${id}/claim`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        fetchAchievements();
        if (onAccountUpdate) onAccountUpdate();
      }
    } catch (e) {}
    setClaimingId(null);
  };

  const unlocked = achievements.filter(a => a.unlocked_at).length;
  const total = achievements.length;
  const categories = [...new Set(achievements.map(a => a.category))];

  return (
    <div className="ach-page">
      <FloatingBackground />
      <header className="ach-header">
        <button type="button" className="mychess-home-logout" onClick={onBack}>← Back</button>
        <div className="ach-brand">
          <div className="mychess-logo-mark">🏆</div>
          <div>
            <div className="mychess-brand">ACHIEVEMENTS</div>
            <div className="mychess-brand-subtitle">{unlocked}/{total} UNLOCKED</div>
          </div>
        </div>
        <div className="ach-progress-bar">
          <div className="ach-progress-fill" style={{ width: total > 0 ? `${(unlocked / total) * 100}%` : '0%' }} />
        </div>
      </header>

      <main className="ach-main">
        {loading ? (
          <div className="ach-loading">Loading achievements...</div>
        ) : categories.map(cat => (
          <div key={cat} className="ach-category">
            <h2 className="ach-cat-title">{CATEGORY_ICONS[cat] || '🏅'} {CATEGORY_LABELS[cat] || cat}</h2>
            <div className="ach-grid">
              {achievements.filter(a => a.category === cat).map(ach => {
                const isUnlocked = !!ach.unlocked_at;
                return (
                  <div key={ach.id} className={`ach-card ${isUnlocked ? 'ach-unlocked' : 'ach-locked'}`}>
                    <div className="ach-card-icon">{isUnlocked ? '🏆' : '🔒'}</div>
                    <div className="ach-card-info">
                      <div className="ach-card-name">{ach.name}</div>
                      <div className="ach-card-desc">{ach.description}</div>
                      <div className="ach-card-reward">+{ach.elo_reward || 0} ELO</div>
                    </div>
                    {isUnlocked && !ach.claimed && (
                      <button type="button" className="ach-claim-btn" onClick={() => claimReward(ach.id)} disabled={claimingId === ach.id}>
                        {claimingId === ach.id ? '...' : 'Claim'}
                      </button>
                    )}
                    {isUnlocked && ach.claimed && (
                      <span className="ach-claimed-badge">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default AchievementsPage;
