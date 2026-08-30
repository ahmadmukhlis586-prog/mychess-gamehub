import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const EMOJI_CATALOG = [
  { id: 'thumbs up',  emoji: '👍', name: 'Thumbs Up',   cost_elo: 0 },
  { id: 'clap',       emoji: '👏', name: 'Clap',        cost_elo: 0 },
  { id: 'laugh',      emoji: '😂', name: 'Laugh',       cost_elo: 0 },
  { id: 'shocked',    emoji: '😱', name: 'Shocked',     cost_elo: 0 },
  { id: 'fire',       emoji: '🔥', name: 'Fire',        cost_elo: 10 },
  { id: 'skull',      emoji: '💀', name: 'Skull',       cost_elo: 10 },
  { id: 'bullseye',   emoji: '🎯', name: 'Bullseye',    cost_elo: 10 },
  { id: 'crown',      emoji: '👑', name: 'Crown',       cost_elo: 20 },
  { id: 'devil',      emoji: '😈', name: 'Devil',       cost_elo: 20 },
  { id: 'big brain',  emoji: '🧠', name: 'Big Brain',   cost_elo: 30 },
  { id: 'trophy',     emoji: '🏆', name: 'Trophy',      cost_elo: 50 },
  { id: 'diamond',    emoji: '💎', name: 'Diamond',     cost_elo: 100 },
];

const EmojiShop = ({ token, onEloUpdate }) => {
  const [owned, setOwned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/emojis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setOwned(d.owned || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleBuy = async (emojiItem) => {
    if (buying) return;
    setBuying(emojiItem.id);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/emojis/buy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emojiId: emojiItem.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setOwned(prev => [...prev, emojiItem.id]);
        setFeedback({ type: 'success', msg: `Bought ${emojiItem.emoji} ${emojiItem.name}!` });
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

  const isOwned = (id) => owned.includes(id.toLowerCase());

  return (
    <div className="ej-shop">
      <div className="ej-section-label">REACTIONS SHOP</div>

      {feedback && (
        <div className={`ej-feedback ej-feedback-${feedback.type}`}>
          {feedback.msg}
        </div>
      )}

      {loading ? (
        <div className="ej-loading">Loading emojis...</div>
      ) : (
        <div className="ej-grid">
          {EMOJI_CATALOG.map((item) => {
            const ownedStatus = isOwned(item.id);
            return (
              <div key={item.id} className={`ej-card ${ownedStatus ? 'ej-card-owned' : ''}`}>
                <div className="ej-card-emoji">{item.emoji}</div>
                <div className="ej-card-name">{item.name}</div>
                <div className="ej-card-cost">
                  {item.cost_elo === 0 ? 'Free' : `${item.cost_elo} ELO`}
                </div>
                {ownedStatus ? (
                  <div className="ej-owned-badge">Owned ✓</div>
                ) : (
                  <button
                    type="button"
                    className="ej-buy-btn"
                    onClick={() => handleBuy(item)}
                    disabled={buying === item.id}
                  >
                    {buying === item.id ? 'Buying...' : `Buy${item.cost_elo > 0 ? ` (${item.cost_elo})` : ''}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmojiShop;
