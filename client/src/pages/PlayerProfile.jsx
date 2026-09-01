import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE, TOKEN_KEY } from '../config';
import FloatingBackground from '../components/FloatingBackground';

const PlayerProfile = ({ onBack }) => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [totalAch, setTotalAch] = useState(0);
  const [unlockedAch, setUnlockedAch] = useState(0);
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/profile/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setProfile(d.profile);
          setRecentMatches(d.recentMatches);
          setTotalAch(d.totalAchievements);
          setUnlockedAch(d.unlockedAchievements);
        }
      })
      .catch(() => {});
    fetch(`${API_BASE}/avatar/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok && d.avatar) setAvatar(d.avatar); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="pp-page"><FloatingBackground /><div className="pp-loading">Loading profile...</div></div>;
  if (!profile) return <div className="pp-page"><FloatingBackground /><div className="pp-loading">Player not found</div></div>;

  const winRate = profile.games > 0 ? Math.round((profile.wins / profile.games) * 100) : 0;
  const memberSince = new Date(profile.created_at).toLocaleDateString();

  return (
    <div className="pp-page">
      <FloatingBackground />
      <header className="pp-header">
        <button type="button" className="mychess-home-logout" onClick={onBack}>← Back</button>
      </header>

      <main className="pp-main">
        <div className="pp-card">
          <div className="pp-avatar">{avatar ? <img src={avatar} alt={profile.username} className="pp-avatar-img" /> : profile.username?.charAt(0).toUpperCase()}</div>
          <h1 className="pp-name">{profile.username}</h1>
          <div className="pp-since">Member since {memberSince}</div>

          <div className="pp-elo-section">
            <div className="pp-elo-number">{profile.elo}</div>
            <div className="pp-elo-label">ELO RATING</div>
          </div>

          <div className="pp-stats-grid">
            <div className="pp-stat"><span className="pp-stat-val">{profile.games}</span><span className="pp-stat-lbl">Games</span></div>
            <div className="pp-stat"><span className="pp-stat-val">{profile.wins}</span><span className="pp-stat-lbl">Wins</span></div>
            <div className="pp-stat"><span className="pp-stat-val">{profile.draws}</span><span className="pp-stat-lbl">Draws</span></div>
            <div className="pp-stat"><span className="pp-stat-val">{profile.losses}</span><span className="pp-stat-lbl">Losses</span></div>
            <div className="pp-stat"><span className="pp-stat-val">{winRate}%</span><span className="pp-stat-lbl">Win Rate</span></div>
            <div className="pp-stat"><span className="pp-stat-val">{unlockedAch}/{totalAch}</span><span className="pp-stat-lbl">Trophies</span></div>
          </div>
        </div>

        {recentMatches.length > 0 && (
          <div className="pp-recent">
            <h2>Recent Matches</h2>
            {recentMatches.slice(0, 5).map((m, i) => {
              const isWhite = m.white_player_id === profile.id;
              const opponent = isWhite ? m.black_username : m.white_username;
              const won = (isWhite && m.result === 'white') || (!isWhite && m.result === 'black');
              const draw = m.result === 'draw';
              return (
                <div key={i} className={`pp-match ${draw ? 'pp-draw' : won ? 'pp-win' : 'pp-loss'}`}>
                  <span className="pp-match-result">{draw ? 'DRAW' : won ? 'WIN' : 'LOSS'}</span>
                  <span className="pp-match-vs">vs</span>
                  <span className="pp-match-opponent">{opponent}</span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PlayerProfile;
