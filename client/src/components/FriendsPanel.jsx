import React, { useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config';

// ============================================================
// MYCHESS FRIENDS PANEL
// Find friends, manage requests, challenge friends to a live
// match, and chat with friends (private DM). Realtime updates
// arrive via a refreshKey + dmTick that the parent bumps
// whenever presence socket events are received.
// ============================================================

export default function FriendsPanel({ token, onClose, refreshKey, dmIncoming, dmTick, onChallengeSent }) {
  const [tab, setTab] = useState('friends'); // 'friends' | 'add'
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const [chatWith, setChatWith] = useState(null); // friend object, opens chat
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const chatEndRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  function safeJson(r) { return r.json().catch(() => ({ ok: false })); }

  async function loadFriends() {
    if (!token) return;
    try {
      const r = await fetch(`${API_BASE}/friends`, { headers: authHeaders });
      const d = await safeJson(r);
      if (d.ok) {
        setFriends(d.friends || []);
        setRequests(d.requests || []);
      }
    } catch (e) {}
    setLoading(false);
  }

  useEffect(() => { loadFriends(); }, [refreshKey]);

  async function searchUsers() {
    if (!q.trim()) return;
    setSearching(true);
    setMsg('');
    try {
      const r = await fetch(`${API_BASE}/friends/search?q=${encodeURIComponent(q.trim())}`, { headers: authHeaders });
      const d = await safeJson(r);
      setResults(d.ok ? (d.users || []) : []);
      if (d.ok && d.users?.length === 0) setMsg('No players found with that name.');
    } catch (e) {}
    setSearching(false);
  }

  async function sendRequest(userId) {
    setBusy(userId);
    setMsg('');
    try {
      const r = await fetch(`${API_BASE}/friends/request`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      const d = await safeJson(r);
      setMsg(d.ok ? (d.message || 'Request sent!') : (d.message || 'Could not send request.'));
      setResults([]);
      setQ('');
      loadFriends();
    } catch (e) {}
    setBusy('');
  }

  async function acceptRequest(userId) {
    setBusy('a' + userId);
    try {
      await fetch(`${API_BASE}/friends/accept`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      loadFriends();
    } catch (e) {}
    setBusy('');
  }

  async function declineRequest(userId) {
    setBusy('d' + userId);
    try {
      await fetch(`${API_BASE}/friends/decline`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      loadFriends();
    } catch (e) {}
    setBusy('');
  }

  async function removeFriend(userId) {
    setBusy('r' + userId);
    try {
      await fetch(`${API_BASE}/friends/remove`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      loadFriends();
    } catch (e) {}
    setBusy('');
  }

  async function challengeFriend(userId) {
    setBusy('c' + userId);
    setMsg('');
    try {
      const r = await fetch(`${API_BASE}/friends/challenge`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: userId }),
      });
      const d = await safeJson(r);
      if (d.ok) {
        setMsg(`Challenge sent! Waiting for them to accept. Room #${d.roomCode}`);
        if (onChallengeSent && d.roomCode) onChallengeSent(d.roomCode);
      }
      else setMsg(d.message || 'Could not send challenge.');
    } catch (e) {}
    setBusy('');
  }

  // ---------------- CHAT ----------------

  async function loadMessages(friendId) {
    if (!token) return;
    setChatLoading(true);
    setChatMsg('');
    try {
      const r = await fetch(`${API_BASE}/messages/${friendId}`, { headers: authHeaders });
      const d = await safeJson(r);
      setMessages(d.ok ? (d.messages || []) : []);
      if (!d.ok) setChatMsg(d.message || 'Could not load chat.');
      if (d.ok) {
        fetch(`${API_BASE}/messages/read`, {
          method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId }),
        });
      }
    } catch (e) {}
    setChatLoading(false);
  }

  function openChat(friend) {
    setChatWith(friend);
    setMessages([]);
    loadMessages(friend.id);
  }

  async function sendMessage() {
    const body = draft.trim();
    if (!body || !chatWith) return;
    try {
      const r = await fetch(`${API_BASE}/messages`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: chatWith.id, body }),
      });
      const d = await safeJson(r);
      if (d.ok) {
        setMessages((prev) => [...prev, d.message]);
        setDraft('');
      } else {
        setChatMsg(d.message || 'Could not send message.');
      }
    } catch (e) {}
  }

  // Append realtime incoming message when it belongs to the open chat
  useEffect(() => {
    if (!dmIncoming || !chatWith) return;
    if (dmIncoming.fromId === chatWith.id) {
      setMessages((prev) => {
        if (prev.some((m) => m.id && m.id === dmIncoming.id)) return prev;
        return [...prev, {
          id: dmIncoming.id,
          fromMe: false,
          senderId: dmIncoming.fromId,
          body: dmIncoming.body,
          createdAt: dmIncoming.at,
          read: false,
        }];
      });
      fetch(`${API_BASE}/messages/read`, {
        method: 'POST', headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId: chatWith.id }),
      });
    }
  }, [dmTick]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatWith]);

  function formatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // If a chat is open, show the conversation instead of the tabs
  if (chatWith) {
    return (
      <div
        className="mychess-modal-backdrop"
        style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="mychess-modal friends-panel" style={{ width: 'min(480px,100%)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
          <button type="button" className="mychess-modal-close" onClick={onClose}>×</button>
          <div className="friends-chat-head">
            <button type="button" className="friends-back" onClick={() => { setChatWith(null); setMessages([]); }}>← Back</button>
            <div>
              <div className="friends-chat-title">{chatWith.username}</div>
              <div className="friends-sub">{chatWith.online ? 'Online' : 'Offline'}</div>
            </div>
          </div>

          <div className="friends-chat-body">
            {chatLoading && <div className="friends-chat-empty">Loading...</div>}
            {!chatLoading && messages.length === 0 && chatMsg === '' && (
              <div className="friends-chat-empty">Say hi to {chatWith.username}! 👋</div>
            )}
            {messages.map((m) => (
              <div key={m.id ?? m.createdAt + m.body} className={`friends-bubble ${m.fromMe ? 'mine' : 'theirs'}`}>
                <div className="friends-bubble-text">{m.body}</div>
                <div className="friends-bubble-time">{formatTime(m.createdAt)}{m.fromMe && (m.read ? ' ✓✓' : ' ✓')}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {chatMsg && <div className="friends-msg">{chatMsg}</div>}

          <div className="friends-chat-input">
            <input
              type="text"
              placeholder={`Message ${chatWith.username}...`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            />
            <button type="button" className="mychess-shop-button" onClick={sendMessage} disabled={!draft.trim()}>
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mychess-modal-backdrop"
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mychess-modal friends-panel" style={{ width: 'min(480px,100%)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' }}>
        <button type="button" className="mychess-modal-close" onClick={onClose}>×</button>
        <div className="mychess-modal-icon">🤝</div>
        <div className="mychess-modal-eyebrow">SOCIAL</div>
        <h2>Friends</h2>

        {/* Tabs */}
        <div className="friends-tabs">
          <button type="button" className={`friends-tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => { setTab('friends'); setMsg(''); }}>
            Friends ({friends.length})
          </button>
          <button type="button" className={`friends-tab ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab('add'); setMsg(''); }}>
            Add Friend
          </button>
        </div>

        {msg && <div className="friends-msg">{msg}</div>}

        {tab === 'friends' && (
          <div className="friends-body">
            {requests.length > 0 && (
              <div className="friends-section">
                <div className="friends-section-title">Pending Requests</div>
                {requests.map((r) => (
                  <div key={r.user_id} className="friends-row">
                    <div className="friends-info">
                      <div className="friends-name">{r.username} <span className={`friends-dot ${r.online ? 'online' : ''}`} /></div>
                      <div className="friends-sub">ELO {r.elo}</div>
                    </div>
                    <div className="friends-actions">
                      <button type="button" className="mychess-shop-button" onClick={() => acceptRequest(r.user_id)} disabled={busy === 'a' + r.user_id}>
                        Accept
                      </button>
                      <button type="button" className="mychess-shop-button friends-decline" onClick={() => declineRequest(r.user_id)} disabled={busy === 'd' + r.user_id}>
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="friends-section">
              <div className="friends-section-title">My Friends</div>
              {!loading && friends.length === 0 && (
                <div className="friends-empty">You have no friends yet. Go to "Add Friend" to find players!</div>
              )}
              {friends.map((f) => (
                <div key={f.id} className="friends-row">
                  <div className="friends-info">
                    <div className="friends-name">{f.username} <span className={`friends-dot ${f.online ? 'online' : ''}`} /></div>
                    <div className="friends-sub">{f.online ? 'Online' : 'Offline'} · ELO {f.elo}</div>
                  </div>
                  <div className="friends-actions">
                    <button type="button" className="mychess-shop-button" onClick={() => challengeFriend(f.id)} disabled={busy === 'c' + f.id}>
                      {busy === 'c' + f.id ? '...' : 'Challenge'}
                    </button>
                    <button type="button" className="mychess-shop-button" onClick={() => openChat(f)}>
                      Message
                    </button>
                    <button type="button" className="mychess-shop-button friends-remove" onClick={() => removeFriend(f.id)} disabled={busy === 'r' + f.id}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'add' && (
          <div className="friends-body">
            <div className="friends-search">
              <input
                type="text"
                placeholder="Search by username or email..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchUsers(); }}
              />
              <button type="button" className="mychess-shop-button" onClick={searchUsers} disabled={searching}>
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {results.length > 0 && (
              <div className="friends-section">
                <div className="friends-section-title">Results</div>
                {results.map((u) => (
                  <div key={u.id} className="friends-row">
                    <div className="friends-info">
                      <div className="friends-name">{u.username}</div>
                      <div className="friends-sub">ELO {u.elo}</div>
                    </div>
                    <button type="button" className="mychess-shop-button" onClick={() => sendRequest(u.id)} disabled={busy === u.id || u.id === 'self'}>
                      {busy === u.id ? '...' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button type="button" className="mychess-primary-button friends-done" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
