import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const EmoteWheel = ({ token, roomId, receiverId, socket, gameState, playerRole, account }) => {
  const [emotes, setEmotes] = useState([]);
  const [owned, setOwned] = useState(new Set());
  const [open, setOpen] = useState(false);
  const [bubbles, setBubbles] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const prevRef = useRef({ from: null, to: null, over: false });

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/emotes`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setEmotes(d.emotes || []);
          setOwned(new Set(d.owned || []));
        }
      })
      .catch(() => {});
  }, [token]);

  const addBubble = useCallback((emoji, label, name) => {
    const id = Date.now() + Math.random();
    setBubbles((prev) => [...prev, { id, emoji, label, name }].slice(-6));
    setTimeout(() => setBubbles((prev) => prev.filter((b) => b.id !== id)), 3200);
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const handler = (data) => {
      if (!data) return;
      if (data.senderId && account && String(data.senderId) === String(account.id)) return;
      if (data.emoji || data.label) addBubble(data.emoji, data.label, data.senderName || 'Opponent');
    };
    socket.on('chatZoom', handler);
    return () => { socket.off('chatZoom', handler); };
  }, [socket, account, addBubble]);

  const pushSuggestion = useCallback((tag, text) => {
    const id = Date.now() + Math.random();
    setSuggestions((prev) => [...prev, { id, tag, text }].slice(-3));
    setTimeout(() => setSuggestions((prev) => prev.filter((s) => s.id !== id)), 7000);
  }, []);

  useEffect(() => {
    const gs = gameState || {};
    const lastMove = gs.lastMove || {};
    const prev = prevRef.current;

    if (gs.isGameOver && !prev.over) {
      const won = (playerRole === 'w' && gs.turn === 'b') || (playerRole === 'b' && gs.turn === 'w');
      pushSuggestion('win', won ? '🏆 Match won! Send a victory zoom' : '🤝 Match ended. Send a zoom');
    }
    if (gs.isCheck && !prev.check && !gs.isGameOver) {
      pushSuggestion('check', '⚠️ King is in check! React to it');
    }
    if (lastMove?.captured && (lastMove.from !== prev.from || lastMove.to !== prev.to)) {
      pushSuggestion('generic', '💥 A piece was captured! React');
    }

    prevRef.current = {
      from: lastMove.from,
      to: lastMove.to,
      over: Boolean(gs.isGameOver),
      check: Boolean(gs.isCheck),
    };
  }, [gameState, playerRole, pushSuggestion]);

  const usable = emotes.filter((e) => e.cost_elo === 0 || owned.has(e.id));

  const quickSend = async (tag) => {
    const match = usable.find((e) => e.tag === tag && e.cost_elo === 0) || usable.find((e) => e.tag === tag);
    if (match) await send(match);
  };

  const send = async (emote) => {
    if (!token || !roomId || !receiverId) return;
    if (emote.cost_elo > 0 && !owned.has(emote.id)) return;
    try {
      const res = await fetch(`${API_BASE}/emotes/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, receiverId, emoji: emote.emoji, label: emote.label, tag: emote.tag }),
      });
      const data = await res.json();
      if (data.ok) {
        addBubble(emote.emoji, emote.label, account?.username || 'You');
        setOpen(false);
        const tag = emote.tag;
        setSuggestions((prev) => prev.filter((s) => s.tag !== tag));
      }
    } catch (e) { /* ignore */ }
  };

  return (
    <>
      {bubbles.length > 0 && (
        <div className="ew-bubble-layer">
          {bubbles.map((b) => (
            <div className="ew-bubble" key={b.id}>
              <span>{b.emoji || ''}</span>
              <div>
                <div className="ew-bubble-label">{b.label || ''}</div>
                <div className="ew-bubble-name">{b.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="ew-suggest">
          {suggestions.map((s) => (
            <button type="button" className="ew-suggest-pill" key={s.id} onClick={() => quickSend(s.tag)}>
              {s.text}
            </button>
          ))}
        </div>
      )}

      <div className="ew-root">
        <button type="button" className="ew-toggle" title="Emote wheel" onClick={() => setOpen((o) => !o)}>
          {open ? '✕' : '😜'}
        </button>
        {open && (
          <div className="ew-panel">
            {usable.length === 0 && <div className="mc-empty">No emotes yet.</div>}
            {usable.map((e) => (
              <button type="button" className="ew-btn" key={e.id} title={e.label} onClick={() => send(e)}>
                <span>{e.emoji}</span>
                <span className="ew-btn-label">{e.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default EmoteWheel;