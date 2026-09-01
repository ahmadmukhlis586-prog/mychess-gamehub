import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import { SERVER_URL, API_BASE, TOKEN_KEY } from '../config';
import Avatar from './Avatar';
import UsernameLink from './UsernameLink';

// ============================================================
// MYCHESS MESSAGE NOTIFIER — floating chat bubble
// A minimalist floating message button (bottom-right, above the
// music toggle) that notifies the user of every new direct
// message from friends. Shows an unread badge, live toasts, and
// opens a compact DM conversation. Fully additive / self-contained.
// ============================================================

function fmt(t) {
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d)) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageNotifier() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [senders, setSenders] = useState([]);   // unread grouped by sender
  const [toast, setToast] = useState(null);     // live incoming DM toast
  const [chatWith, setChatWith] = useState(null); // active conversation
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const [haveToken, setHaveToken] = useState(false);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);
  const toastTimer = useRef(null);
  const unreadTimer = useRef(null);

  const token = () => localStorage.getItem(TOKEN_KEY);

  // ---- fetch unread from server ----
  const loadUnread = useCallback(() => {
    const t = token();
    if (!t) return;
    fetch(`${API_BASE}/messages/unread`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setUnread(d.total || 0);
          setSenders(d.senders || []);
        }
      })
      .catch(() => {});
  }, []);

  // ---- auth state + socket ----
  useEffect(() => {
    setHaveToken(!!token());
    const pid = setInterval(() => {
      const loggedIn = !!token();
      setHaveToken(loggedIn);
      if (loggedIn) loadUnread();
    }, 15000);
    return () => clearInterval(pid);
  }, [loadUnread]);

  useEffect(() => {
    if (!haveToken) return;
    loadUnread();
    const presence = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: token() },
      reconnection: true,
    });
    socketRef.current = presence;

    presence.on('friendMessage', (data) => {
      // Only react to incoming messages addressed to me (the receiver).
      // The sender's own devices receive an echo with echo:true — ignore it.
      if (data && !data.echo) {
        loadUnread();
        const msg = data.body || '';
        const prev = toastTimer.current;
        if (prev) clearTimeout(prev);
        setToast({ fromName: data.fromName || 'Someone', body: msg, at: Date.now() });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
        // if a conversation with this sender is open, append it live
        setChatWith((cw) => {
          if (cw && cw.id === data.fromId) {
            setMessages((prevMsgs) =>
              prevMsgs.some((m) => m.id === data.id)
                ? prevMsgs
                : [...prevMsgs, {
                    id: data.id, fromMe: false, senderId: data.fromId,
                    body: msg, createdAt: data.at, read: false,
                  }]
            );
            markRead(data.fromId);
          }
          return cw;
        });
      }
    });

    return () => {
      presence.disconnect();
      socketRef.current = null;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [haveToken, loadUnread]);

  // ---- conversation ----
  const markRead = (friendId) => {
    const t = token();
    if (!t || !friendId) return;
    fetch(`${API_BASE}/messages/read`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ friendId }),
    }).then(() => loadUnread()).catch(() => {});
  };

  function openChat(sender) {
    setChatWith(sender);
    setMessages([]);
    setChatError('');
    setBusy(true);
    const t = token();
    fetch(`${API_BASE}/messages/${sender.sender_id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => {
        setMessages(d.ok ? (d.messages || []) : []);
        if (!d.ok) setChatError(d.message || 'Could not load chat.');
        if (d.ok) markRead(sender.sender_id);
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  }

  function sendMessage() {
    const body = draft.trim();
    if (!body || !chatWith) return;
    const t = token();
    setBusy(true);
    fetch(`${API_BASE}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ friendId: chatWith.sender_id, body }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setMessages(prev => [...prev, d.message]); setDraft(''); }
        else setChatError(d.message || 'Could not send message.');
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatWith]);

  if (!haveToken) return null;

  const bubble = (
    <div className="mn-wrap">
      <div className={`mn-toast ${toast ? 'show' : ''}`} onClick={() => { clearTimeout(toastTimer.current); setToast(null); }}>
        <div className="mn-toast-title">{toast?.fromName}</div>
        <div className="mn-toast-body">{toast?.body}</div>
      </div>

      <button type="button" className="mn-btn" title="Messages" onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.03 2 11c0 2.9 1.6 5.5 4.1 7.1-.1 1.1-.6 2.5-1.9 3.4 1.2 0 2.5-.4 3.6-1.1.8.2 1.6.3 2.5.3 5.52 0 10-4.03 10-9S17.52 2 12 2z"/>
        </svg>
        {unread > 0 && <span className="mn-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
    </div>
  );

  return (
    <>
      {!open && bubble}
      {open && createPortal(
        <div className="mn-popover" style={{ position: 'fixed', bottom: 152, right: 25, zIndex: 200001 }}>
          <button type="button" className="mn-close" onClick={() => setOpen(false)}>✕</button>

          {!chatWith && (
            <>
              <div className="mn-p-head">Direct Messages</div>
              <div className="mn-p-body">
                {unread === 0 && <div className="mn-empty">No new messages</div>}
                {senders.map(s => (
                  <div key={s.sender_id} className="mn-item" onClick={() => openChat(s)}>
                    <Avatar userId={s.sender_id} name={s.sender_name} size={38} />
                    <div className="mn-item-info">
                      <div className="mn-item-name"><UsernameLink name={s.sender_name} /></div>
                      <div className="mn-item-count">{s.count} new message{s.count > 1 ? 's' : ''}</div>
                    </div>
                    <div className="mn-chevron">›</div>
                  </div>
                ))}
                {unread === 0 && <button type="button" className="mn-done" onClick={() => setOpen(false)}>Done</button>}
              </div>
            </>
          )}

          {chatWith && (
            <>
              <div className="mn-chat-head">
                <button type="button" className="mn-back" onClick={() => { markRead(chatWith.sender_id); setChatWith(null); setMessages([]); }}>←</button>
                <Avatar userId={chatWith.sender_id} name={chatWith.sender_name} size={30} />
                <div className="mn-chat-title"><UsernameLink name={chatWith.sender_name} /></div>
              </div>
              {chatError && <div className="mn-error">{chatError}</div>}
              <div className="mn-chat-body">
                {busy && messages.length === 0 && <div className="mn-empty">Loading...</div>}
                {!busy && messages.length === 0 && !chatError && (
                  <div className="mn-empty">Say hi to {chatWith.sender_name}! 👋</div>
                )}
                {messages.map(m => (
                  <div key={m.id ?? m.createdAt + m.body} className={`mn-bubble ${m.fromMe ? 'mine' : 'theirs'}`}>
                    <div className="mn-bubble-text">{m.body}</div>
                    <div className="mn-bubble-time">{fmt(m.createdAt)}{m.fromMe && (m.read ? ' ✓✓' : ' ✓')}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="mn-input">
                <input
                  type="text"
                  placeholder={`Message ${chatWith.sender_name}...`}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                />
                <button type="button" className="mn-send" onClick={sendMessage} disabled={!draft.trim() || busy}>Send</button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
