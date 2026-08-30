import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const EmojiReactions = ({ token, roomId, receiverId, socket, account }) => {
  const [ownedEmojis, setOwnedEmojis] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/emojis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.owned) {
          const catalog = [
            { id: 'thumbs up', emoji: '👍', name: 'Thumbs Up', cost_elo: 0 },
            { id: 'clap', emoji: '👏', name: 'Clap', cost_elo: 0 },
            { id: 'laugh', emoji: '😂', name: 'Laugh', cost_elo: 0 },
            { id: 'shocked', emoji: '😱', name: 'Shocked', cost_elo: 0 },
            { id: 'fire', emoji: '🔥', name: 'Fire', cost_elo: 10 },
            { id: 'skull', emoji: '💀', name: 'Skull', cost_elo: 10 },
            { id: 'bullseye', emoji: '🎯', name: 'Bullseye', cost_elo: 10 },
            { id: 'crown', emoji: '👑', name: 'Crown', cost_elo: 20 },
            { id: 'devil', emoji: '😈', name: 'Devil', cost_elo: 20 },
            { id: 'big brain', emoji: '🧠', name: 'Big Brain', cost_elo: 30 },
            { id: 'trophy', emoji: '🏆', name: 'Trophy', cost_elo: 50 },
            { id: 'diamond', emoji: '💎', name: 'Diamond', cost_elo: 100 },
          ];
          const owned = catalog.filter(e => d.owned.includes(e.id.toLowerCase()));
          setOwnedEmojis(owned);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!socket) return;
    const handleReaction = (data) => {
      if (data && data.emoji) {
        const id = Date.now() + Math.random();
        setFloatingEmojis(prev => [...prev, { id, emoji: data.emoji }]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(f => f.id !== id));
        }, 2200);
      }
    };
    socket.on('emojiReaction', handleReaction);
    return () => {
      socket.off('emojiReaction', handleReaction);
    };
  }, [socket]);

  const sendEmoji = useCallback(async (emojiItem) => {
    if (!token || !roomId || !receiverId) return;
    try {
      const res = await fetch(`${API_BASE}/emojis/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          receiverId,
          emoji: emojiItem.emoji,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const id = Date.now() + Math.random();
        setFloatingEmojis(prev => [...prev, { id, emoji: emojiItem.emoji }]);
        setTimeout(() => {
          setFloatingEmojis(prev => prev.filter(f => f.id !== id));
        }, 2200);
      }
    } catch (e) {}
  }, [token, roomId, receiverId]);

  return (
    <div className="ej-reactions-container">
      <button
        type="button"
        className="ej-reactions-toggle"
        onClick={() => setIsOpen(prev => !prev)}
        title="Reactions"
      >
        {isOpen ? '✕' : '😀'}
      </button>

      {isOpen && ownedEmojis.length > 0 && (
        <div className="ej-reactions-bar">
          {ownedEmojis.map((item) => (
            <button
              key={item.id}
              type="button"
              className="ej-reactions-emoji-btn"
              onClick={() => sendEmoji(item)}
              title={item.name}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      )}

      {floatingEmojis.map((f) => (
        <div key={f.id} className="ej-floating-emoji">
          {f.emoji}
        </div>
      ))}
    </div>
  );
};

export default EmojiReactions;
