import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const DailyStreak = ({ onStreakClaimed }) => {
  const [streak, setStreak] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [reward, setReward] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetch(`${API_BASE}/streak`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) { setStreak(d.streak); setClaimedToday(d.claimedToday); } })
      .catch(() => {});
  }, []);

  const claimStreak = async () => {
    if (claimedToday || loading) return;
    setLoading(true);
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/streak/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok && data.claimed) {
        setStreak(data.streak);
        setReward(data.reward);
        setShowReward(true);
        setClaimedToday(true);
        if (onStreakClaimed) onStreakClaimed(data.reward);
        setTimeout(() => setShowReward(false), 3000);
      }
    } catch (e) {}
    setLoading(false);
  };

  return (
    <div className="ds-card">
      <div className="ds-header">
        <span className="ds-icon">🔥</span>
        <span className="ds-title">Daily Streak</span>
        <span className="ds-badge">Day {streak}</span>
      </div>
      <div className="ds-days">
        {[1,2,3,4,5,6,7].map(day => (
          <div key={day} className={`ds-day ${day <= streak % 7 || (streak > 0 && streak % 7 === 0) ? 'ds-day-active' : ''} ${day === (streak % 7 || 7) ? 'ds-day-current' : ''}`}>
            <span className="ds-day-num">{day}</span>
            <span className="ds-day-gems">{day * 5}💎</span>
          </div>
        ))}
      </div>
      {!claimedToday ? (
        <button type="button" className="ds-claim-btn" onClick={claimStreak} disabled={loading}>
          {loading ? 'Claiming...' : '🎁 Claim Daily Reward'}
        </button>
      ) : (
        <div className="ds-claimed">✅ Claimed today! Come back tomorrow.</div>
      )}
      {showReward && (
        <div className="ds-reward-toast">
          +{reward} 💎 Gems earned!
        </div>
      )}
    </div>
  );
};

export default DailyStreak;
