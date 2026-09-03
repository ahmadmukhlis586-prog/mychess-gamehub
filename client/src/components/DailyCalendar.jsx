import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getLocalDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getRewardForDay(day, serverRewards) {
  if (serverRewards && serverRewards.length > 0) {
    const found = serverRewards.find(r => r.day_number === day);
    if (found) return found;
  }
  return null;
}

const DailyCalendar = ({ token, onEloUpdate }) => {
  const [rewards, setRewards] = useState([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [lastReward, setLastReward] = useState(null);

  const fetchCalendar = useCallback(async () => {
    if (!token) return;
    try {
      const localDate = getLocalDate();
      const res = await fetch(`${API_BASE}/daily-calendar?localDate=${localDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setRewards(data.rewards || []);
        setCurrentDay(data.currentDay || 0);
        setTodayClaimed(data.todayClaimed || false);
      }
    } catch (e) {
      console.error('Daily calendar fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  useEffect(() => {
    const interval = setInterval(fetchCalendar, 60000);
    return () => clearInterval(interval);
  }, [fetchCalendar]);

  const claimToday = async () => {
    if (todayClaimed || claiming) return;
    setClaiming(true);
    try {
      const localDate = getLocalDate();
      const res = await fetch(`${API_BASE}/daily-calendar/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ localDate }),
      });
      const data = await res.json();
      if (data.ok) {
        setLastReward(data.reward);
        setTodayClaimed(true);
        setCurrentDay(prev => Math.min(prev + 1, 31));
        setShowReward(true);
        if (data.newElo && onEloUpdate) onEloUpdate(data.newElo);
        setTimeout(() => setShowReward(false), 2500);
      }
    } catch (e) {
      console.error('Daily calendar claim error:', e);
    }
    setClaiming(false);
  };

  const isDayClaimed = (day) => {
    if (day < currentDay) return true;
    if (day === currentDay && todayClaimed) return true;
    return false;
  };

  const isToday = (day) => day === currentDay && !todayClaimed;
  const isFuture = (day) => day > currentDay;

  if (loading) {
    return (
      <div className="dc-card">
        <div className="dc-loading">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="dc-card">
      <div className="dc-header">
        <span className="dc-header-icon">📅</span>
        <span className="dc-header-title">31-Day Reward Calendar</span>
        <span className="dc-streak">
          🔥 Day {Math.min(currentDay, 31)} of 31
        </span>
      </div>

      <div className="dc-day-names">
        {DAY_NAMES.map(name => (
          <div key={name} className="dc-day-name">{name}</div>
        ))}
      </div>

      <div className="dc-grid">
        {Array.from({ length: 31 }, (_, i) => {
          const day = i + 1;
          const reward = getRewardForDay(day, rewards);
          const claimed = isDayClaimed(day);
          const isCurrent = isToday(day);
          const future = isFuture(day) && !claimed;

          return (
            <div
              key={day}
              className={[
                'dc-cell',
                claimed ? 'dc-cell-claimed' : '',
                isCurrent ? 'dc-cell-current' : '',
                future ? 'dc-cell-locked' : '',
                showReward && isCurrent && claimed ? 'dc-cell-flash' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="dc-cell-day">{day}</div>
              {claimed ? (
                <div className="dc-cell-check">✓</div>
              ) : reward ? (
                <>
                  <div className="dc-cell-icon">
                    {reward.reward_type === 'loot_box' ? '📦' : '⚡'}
                  </div>
                  <div className="dc-cell-reward">
                    {reward.reward_type === 'loot_box' ? 'Loot' : `+${reward.reward_amount} ELO`}
                  </div>
                </>
              ) : (
                <>
                  <div className="dc-cell-icon">⚡</div>
                  <div className="dc-cell-reward">+10 ELO</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!todayClaimed ? (
        <button
          type="button"
          className="dc-claim-btn"
          onClick={claimToday}
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : '🎁 Claim Today\'s Reward'}
        </button>
      ) : (
        <div className="dc-claimed-text">✅ Come back tomorrow for your next reward!</div>
      )}

      {showReward && lastReward && (
        <div className="dc-reward-popup">
          <div className="dc-reward-popup-inner">
            <span className="dc-reward-popup-icon">
              {lastReward.reward_type === 'loot_box' ? '📦' : '⚡'}
            </span>
            <span className="dc-reward-popup-text">
              {lastReward.reward_type === 'loot_box' ? 'Loot Box!' : `+${lastReward.reward_amount} ELO`}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .dc-card {
          background: rgba(15, 10, 28, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 16px;
          padding: 20px;
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          box-sizing: border-box;
        }

        .dc-loading {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          padding: 40px 0;
          font-family: 'Inter', sans-serif;
        }

        .dc-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .dc-header-icon {
          font-size: 24px;
        }

        .dc-header-title {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          font-family: 'Inter', sans-serif;
          flex: 1;
        }

        .dc-streak {
          font-size: 13px;
          font-weight: 600;
          color: #f97316;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }

        .dc-day-names {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
        }

        .dc-day-name {
          text-align: center;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.4);
          text-transform: uppercase;
          font-family: 'Inter', sans-serif;
          padding: 2px 0;
        }

        .dc-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 20px;
        }

        .dc-cell {
          position: relative;
          aspect-ratio: 1;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(139, 92, 246, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          transition: all 0.3s ease;
        }

        .dc-cell-claimed {
          background: rgba(34, 197, 94, 0.12);
          border-color: rgba(34, 197, 94, 0.35);
        }

        .dc-cell-current {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
          animation: dc-pulse 2s ease-in-out infinite;
        }

        .dc-cell-locked {
          opacity: 0.35;
          filter: grayscale(0.5);
        }

        .dc-cell-flash {
          animation: dc-flash-scale 0.5s ease-out;
        }

        .dc-cell-day {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.7);
          font-family: 'Inter', sans-serif;
          line-height: 1;
        }

        .dc-cell-claimed .dc-cell-day {
          color: rgba(255, 255, 255, 0.5);
        }

        .dc-cell-check {
          font-size: 16px;
          color: #22c55e;
          font-weight: 700;
        }

        .dc-cell-icon {
          font-size: 14px;
          line-height: 1;
        }

        .dc-cell-reward {
          font-size: 9px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Inter', sans-serif;
          line-height: 1;
        }

        .dc-claim-btn {
          width: 100%;
          padding: 14px 20px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.35);
        }

        .dc-claim-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 28px rgba(139, 92, 246, 0.5);
          background: linear-gradient(135deg, #7c3aed, #9333ea);
        }

        .dc-claim-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .dc-claim-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dc-claimed-text {
          text-align: center;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          padding: 12px 0;
        }

        .dc-reward-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 9999;
          pointer-events: none;
          animation: dc-popup-in 2.5s ease-out forwards;
        }

        .dc-reward-popup-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(15, 10, 28, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid rgba(139, 92, 246, 0.6);
          border-radius: 16px;
          padding: 20px 36px;
          box-shadow: 0 0 60px rgba(139, 92, 246, 0.4);
        }

        .dc-reward-popup-icon {
          font-size: 36px;
        }

        .dc-reward-popup-text {
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          font-family: 'Inter', sans-serif;
          text-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
        }

        @keyframes dc-pulse {
          0%, 100% {
            box-shadow: 0 0 16px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 28px rgba(139, 92, 246, 0.55);
          }
        }

        @keyframes dc-flash-scale {
          0% {
            transform: scale(1);
            background: rgba(34, 197, 94, 0.3);
          }
          30% {
            transform: scale(1.15);
            background: rgba(34, 197, 94, 0.5);
          }
          100% {
            transform: scale(1);
            background: rgba(34, 197, 94, 0.12);
          }
        }

        @keyframes dc-popup-in {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.1);
          }
          30% {
            transform: translate(-50%, -50%) scale(1);
          }
          75% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9) translateY(-20px);
          }
        }

        @media (max-width: 480px) {
          .dc-card {
            padding: 14px;
            border-radius: 12px;
            margin: 0 4px;
          }
          .dc-header {
            gap: 6px;
            margin-bottom: 12px;
          }
          .dc-header-icon {
            font-size: 20px;
          }
          .dc-header-title {
            font-size: 14px;
          }
          .dc-streak {
            font-size: 11px;
          }
          .dc-day-names {
            gap: 2px;
            margin-bottom: 4px;
          }
          .dc-day-name {
            font-size: 9px;
            padding: 1px 0;
          }
          .dc-grid {
            gap: 4px;
            margin-bottom: 14px;
          }
          .dc-cell {
            border-radius: 8px;
            gap: 1px;
          }
          .dc-cell-day {
            font-size: 9px;
          }
          .dc-cell-check {
            font-size: 13px;
          }
          .dc-cell-icon {
            font-size: 12px;
          }
          .dc-cell-reward {
            font-size: 8px;
          }
          .dc-claim-btn {
            padding: 12px 16px;
            font-size: 13px;
            border-radius: 10px;
          }
          .dc-claimed-text {
            font-size: 12px;
            padding: 8px 0;
          }
          .dc-reward-popup-inner {
            padding: 16px 24px;
            border-radius: 12px;
          }
          .dc-reward-popup-icon {
            font-size: 28px;
          }
          .dc-reward-popup-text {
            font-size: 18px;
          }
        }

        @media (max-width: 360px) {
          .dc-card {
            padding: 10px;
          }
          .dc-grid {
            gap: 3px;
          }
          .dc-cell {
            border-radius: 6px;
          }
          .dc-cell-day {
            font-size: 8px;
          }
          .dc-cell-icon {
            font-size: 11px;
          }
          .dc-cell-reward {
            font-size: 7px;
          }
          .dc-cell-check {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
};

export default DailyCalendar;
