import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const ProfileThemes = ({ token, onEloUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const [profileThemes, setProfileThemes] = useState([]);
  const [profileEquipped, setProfileEquipped] = useState(null);
  const [profileOwned, setProfileOwned] = useState([]);

  const [boardThemes, setBoardThemes] = useState([]);
  const [boardEquipped, setBoardEquipped] = useState(null);
  const [boardOwned, setBoardOwned] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [buying, setBuying] = useState(null);
  const [equipping, setEquipping] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchProfileThemes();
    fetchBoardThemes();
  }, [token]);

  const fetchProfileThemes = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile-themes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setProfileThemes(data.themes || []);
        setProfileEquipped(data.equipped?.theme_id || null);
        setProfileOwned(
          (data.themes || [])
            .filter(t => t.cost_elo === 0 || data.equipped?.theme_id === t.id)
            .map(t => t.id)
        );
      }
    } catch (e) {}
    setLoadingProfile(false);
  };

  const fetchBoardThemes = async () => {
    try {
      const res = await fetch(`${API_BASE}/board-themes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setBoardThemes(data.themes || []);
        setBoardEquipped(data.equipped?.board_theme_id || null);
        setBoardOwned(
          (data.themes || [])
            .filter(t => t.cost_elo === 0 || data.equipped?.board_theme_id === t.id)
            .map(t => t.id)
        );
      }
    } catch (e) {}
    setLoadingBoard(false);
  };

  const handleBuyProfile = async (theme) => {
    if (buying) return;
    setBuying(theme.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/profile-themes/buy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: theme.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfileOwned(prev => [...prev, theme.id]);
        setFeedback({ type: 'success', msg: `Bought ${theme.name}!` });
        if (onEloUpdate && typeof data.newElo === 'number') onEloUpdate(data.newElo);
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Purchase failed' });
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: 'Network error' });
    }
    setBuying(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEquipProfile = async (theme) => {
    if (equipping) return;
    setEquipping(theme.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/profile-themes/equip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: theme.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfileEquipped(theme.id);
        setFeedback({ type: 'success', msg: `Equipped ${theme.name}!` });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Equip failed' });
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: 'Network error' });
    }
    setEquipping(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleBuyBoard = async (theme) => {
    if (buying) return;
    setBuying(theme.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/board-themes/buy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: theme.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setBoardOwned(prev => [...prev, theme.id]);
        setFeedback({ type: 'success', msg: `Bought ${theme.name}!` });
        if (onEloUpdate && typeof data.newElo === 'number') onEloUpdate(data.newElo);
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Purchase failed' });
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: 'Network error' });
    }
    setBuying(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleEquipBoard = async (theme) => {
    if (equipping) return;
    setEquipping(theme.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/board-themes/equip`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ themeId: theme.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setBoardEquipped(theme.id);
        setFeedback({ type: 'success', msg: `Equipped ${theme.name}!` });
      } else {
        setFeedback({ type: 'error', msg: data.error || 'Equip failed' });
      }
    } catch (e) {
      setFeedback({ type: 'error', msg: 'Network error' });
    }
    setEquipping(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="pth-container">
      <div className="pth-tabs">
        <button
          type="button"
          className={`pth-tab ${activeTab === 'profile' ? 'pth-tab-active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile Themes
        </button>
        <button
          type="button"
          className={`pth-tab ${activeTab === 'board' ? 'pth-tab-active' : ''}`}
          onClick={() => setActiveTab('board')}
        >
          Board Themes
        </button>
      </div>

      {feedback && (
        <div className={`pth-feedback pth-feedback-${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="pth-themes-panel">
          {loadingProfile ? (
            <div className="pth-loading">Loading profile themes...</div>
          ) : (
            <div className="pth-grid">
              {profileThemes.map((theme) => {
                const owned = profileOwned.includes(theme.id);
                const equipped = profileEquipped === theme.id;
                return (
                  <div key={theme.id} className={`pth-card ${equipped ? 'pth-card-equipped' : ''}`}>
                    <div
                      className="pth-card-preview"
                      style={{ background: theme.gradient || 'linear-gradient(135deg, #1a1a2e, #16213e)' }}
                    />
                    <div className="pth-card-name">{theme.name}</div>
                    <div className="pth-card-cost">
                      {equipped ? 'Equipped' : owned ? 'Owned' : theme.cost_elo === 0 ? 'Free' : `${theme.cost_elo} ELO`}
                    </div>
                    <div className="pth-card-actions">
                      {!owned ? (
                        <button
                          type="button"
                          className="pth-buy-btn"
                          onClick={() => handleBuyProfile(theme)}
                          disabled={buying === theme.id}
                        >
                          {buying === theme.id ? 'Buying...' : 'Buy'}
                        </button>
                      ) : !equipped ? (
                        <button
                          type="button"
                          className="pth-equip-btn"
                          onClick={() => handleEquipProfile(theme)}
                          disabled={equipping === theme.id}
                        >
                          {equipping === theme.id ? 'Equipping...' : 'Equip'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'board' && (
        <div className="pth-themes-panel">
          {loadingBoard ? (
            <div className="pth-loading">Loading board themes...</div>
          ) : (
            <div className="pth-grid">
              {boardThemes.map((theme) => {
                const owned = boardOwned.includes(theme.id);
                const equipped = boardEquipped === theme.id;
                return (
                  <div key={theme.id} className={`pth-card ${equipped ? 'pth-card-equipped' : ''}`}>
                    <div className="pth-board-preview">
                      <div className="pth-board-preview-row">
                        <div className="pth-board-sq" style={{ backgroundColor: theme.light_sq || '#f0d9b5' }} />
                        <div className="pth-board-sq" style={{ backgroundColor: theme.dark_sq || '#b58863' }} />
                      </div>
                      <div className="pth-board-preview-row">
                        <div className="pth-board-sq" style={{ backgroundColor: theme.dark_sq || '#b58863' }} />
                        <div className="pth-board-sq" style={{ backgroundColor: theme.light_sq || '#f0d9b5' }} />
                      </div>
                    </div>
                    <div className="pth-card-name">{theme.name}</div>
                    <div className="pth-card-cost">
                      {equipped ? 'Equipped' : owned ? 'Owned' : theme.cost_elo === 0 ? 'Free' : `${theme.cost_elo} ELO`}
                    </div>
                    <div className="pth-card-actions">
                      {!owned ? (
                        <button
                          type="button"
                          className="pth-buy-btn"
                          onClick={() => handleBuyBoard(theme)}
                          disabled={buying === theme.id}
                        >
                          {buying === theme.id ? 'Buying...' : 'Buy'}
                        </button>
                      ) : !equipped ? (
                        <button
                          type="button"
                          className="pth-equip-btn"
                          onClick={() => handleEquipBoard(theme)}
                          disabled={equipping === theme.id}
                        >
                          {equipping === theme.id ? 'Equipping...' : 'Equip'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileThemes;
