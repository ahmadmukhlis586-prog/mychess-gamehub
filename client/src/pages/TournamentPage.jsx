import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import FloatingBackground from '../components/FloatingBackground';

const TournamentPage = ({ token, onBack, account, onAccountUpdate, onJoinRoom }) => {
  const [view, setView] = useState('list');
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const [dueling, setDueling] = useState(null);
  const [respondingTo, setRespondingTo] = useState(null);
  const [submittingResult, setSubmittingResult] = useState(null);
  const [reportingWinnerFor, setReportingWinnerFor] = useState(null);
  const [matchHistory, setMatchHistory] = useState(null);
  const [historyTab, setHistoryTab] = useState('duels');
  const [clearingFinished, setClearingFinished] = useState(false);
  const [detailLoaded, setDetailLoaded] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    maxPlayers: 8,
    pointsPerWin: 10,
    entryCost: 0,
    disconnectElo: 5
  });

  const clearMessage = () => setTimeout(() => setMessage(null), 4000);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setTournaments(data.tournaments || []);
      else setMessage({ type: 'error', text: data.message || 'Failed to load tournaments' });
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
    }
  }, [token]);

  const fetchTournamentDetail = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedTournament({ ...data.tournament, players: data.players || [], duels: data.duels || [] });
        setDetailLoaded(true);
      } else setMessage({ type: 'error', text: data.message || 'Failed to load tournament' });
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
    }
  }, [token]);

  const fetchMatchHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) setMatchHistory(data);
    } catch {}
  }, [token]);

  useEffect(() => {
    if (view === 'list') {
      setLoading(true);
      fetchTournaments().finally(() => setLoading(false));
    }
  }, [view, fetchTournaments]);

  useEffect(() => {
    if (view === 'detail' && selectedTournament?.id) {
      fetchTournamentDetail(selectedTournament.id);
      fetchMatchHistory(selectedTournament.id);
      const interval = setInterval(() => {
        fetchTournamentDetail(selectedTournament.id);
        fetchMatchHistory(selectedTournament.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [view, selectedTournament?.id, fetchTournamentDetail, fetchMatchHistory]);

  const handleClearFinished = async () => {
    setClearingFinished(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/clear-finished`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.count > 0 ? `Cleared ${data.count} finished tournament${data.count > 1 ? 's' : ''}.` : 'No finished tournaments to clear.' });
        clearMessage();
        fetchTournaments();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to clear' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setClearingFinished(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: 'Tournament name is required.' });
      clearMessage();
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          maxPlayers: Number(form.maxPlayers),
          pointsPerWin: Number(form.pointsPerWin),
          entryCost: Number(form.entryCost),
          disconnectElo: Number(form.disconnectElo)
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Tournament created!' });
        clearMessage();
        setForm({ name: '', description: '', maxPlayers: 8, pointsPerWin: 10, entryCost: 0, disconnectElo: 5 });
        setView('list');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to create tournament' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setCreating(false);
  };

  const handleJoin = async (id) => {
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Joined tournament!' });
        clearMessage();
        fetchTournamentDetail(id);
        if (onAccountUpdate) onAccountUpdate();
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to join' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setJoining(false);
  };

  const handleStart = async (id) => {
    setStarting(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${id}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Tournament started!' });
        clearMessage();
        fetchTournamentDetail(id);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to start' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setStarting(false);
  };

  const handleDuel = async (tournamentId, opponentId) => {
    setDueling(opponentId);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/duel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ opponentId })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Duel request sent!' });
        clearMessage();
        fetchTournamentDetail(tournamentId);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to send duel request' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setDueling(null);
  };

  const handleDuelRespond = async (duelId, accept) => {
    setRespondingTo(duelId);
    try {
      const res = await fetch(`${API_BASE}/tournaments/duel/${duelId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ accept })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: accept ? 'Duel accepted!' : 'Duel declined.' });
        clearMessage();
        if (accept && data.roomId && onJoinRoom) {
          setTimeout(() => onJoinRoom(data.roomId), 500);
        }
        if (selectedTournament?.id) fetchTournamentDetail(selectedTournament.id);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to respond' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setRespondingTo(null);
  };

  const handleReportResult = async (duelId, winnerId) => {
    setSubmittingResult(duelId);
    try {
      const res = await fetch(`${API_BASE}/tournaments/duel/${duelId}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ winnerId })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: 'Result reported!' });
        clearMessage();
        if (selectedTournament?.id) fetchTournamentDetail(selectedTournament.id);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to report result' });
        clearMessage();
      }
    } catch {
      setMessage({ type: 'error', text: 'Cannot connect to server.' });
      clearMessage();
    }
    setSubmittingResult(null);
    setReportingWinnerFor(null);
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'waiting': return { label: 'WAITING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⏳' };
      case 'active': return { label: 'ACTIVE', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🔥' };
      case 'finished': return { label: 'FINISHED', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '🏆' };
      default: return { label: 'UNKNOWN', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: '❓' };
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPendingDuels = (duels, myId) => {
    if (!duels) return [];
    return duels.filter(d => d.status === 'pending' && d.opponent_id === myId);
  };

  const getActiveDuels = (duels, myId) => {
    if (!duels) return [];
    return duels.filter(d => (d.challenger_id === myId || d.opponent_id === myId) && d.status === 'accepted');
  };

  const getFinishedDuels = (duels, myId) => {
    if (!duels) return [];
    return duels.filter(d => (d.challenger_id === myId || d.opponent_id === myId) && d.status === 'finished');
  };

  const myId = account?.id;
  const myPlayer = selectedTournament?.players?.find(p => p.account_id === myId || p.player_id === myId || p.id === myId);
  const isCreator = selectedTournament && myId && (selectedTournament.creator_id === myId || selectedTournament.created_by === myId);
  const isJoined = myPlayer != null;
  const pendingDuels = getPendingDuels(selectedTournament?.duels, myId);
  const activeDuels = getActiveDuels(selectedTournament?.duels, myId);
  const finishedDuels = getFinishedDuels(selectedTournament?.duels, myId);

  const joinedDuelRoomsRef = useRef(new Set());
  useEffect(() => {
    joinedDuelRoomsRef.current.clear();
  }, [selectedTournament?.id]);
  useEffect(() => {
    if (!detailLoaded || !selectedTournament?.duels || !myId || !onJoinRoom) return;
    const myAccepted = selectedTournament.duels.find(d =>
      d.status === 'accepted' && d.room_id &&
      (d.challenger_id === myId || d.opponent_id === myId) &&
      !joinedDuelRoomsRef.current.has(d.room_id)
    );
    if (myAccepted) {
      joinedDuelRoomsRef.current.add(myAccepted.room_id);
      setTimeout(() => onJoinRoom(myAccepted.room_id), 800);
    }
  }, [detailLoaded, selectedTournament?.duels, myId, onJoinRoom]);

  const renderList = () => (
    <main className="mychess-home-main" style={{ maxWidth: '900px' }}>
      <div className="mychess-home-hero" style={{ marginBottom: '30px' }}>
        <div className="mychess-home-eyebrow">COMPETITIVE</div>
        <h1>Tournaments</h1>
        <p>Create or join tournaments to compete for ELO and glory!</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <button
          className="mychess-primary-button"
          onClick={() => setView('create')}
        >
          Create Tournament <span>+</span>
        </button>
        {tournaments.some(t => t.status === 'finished') && (
          <button
            className="mychess-primary-button"
            disabled={clearingFinished}
            onClick={handleClearFinished}
            style={{
              background: clearingFinished ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, rgba(239,68,68,0.3), rgba(185,28,28,0.3))',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              opacity: clearingFinished ? 0.5 : 1
            }}
          >
            {clearingFinished ? 'Clearing...' : '🗑️ Clear Finished'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="mychess-elo-card">
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Loading tournaments...</p>
        </div>
      ) : tournaments.length === 0 ? (
        <div className="mychess-elo-card">
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
            No tournaments yet. Be the first to create one!
          </p>
        </div>
      ) : (
        <div className="game-history-list">
          {tournaments.map(t => {
            const st = getStatusConfig(t.status);
            return (
              <div
                key={t.id}
                className="game-history-card"
                style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onClick={() => { setDetailLoaded(false); setSelectedTournament(t); setView('detail'); }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(109,51,230,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div className="game-history-header">
                  <div>
                    <span className="game-date" style={{ color: '#fff', fontSize: '14px' }}>
                      {st.icon} {t.name}
                    </span>
                  </div>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: st.bg,
                    color: st.color,
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.08em'
                  }}>
                    {st.label}
                  </span>
                </div>
                <div className="game-history-body">
                  {t.description && (
                    <div className="game-opponent" style={{ marginBottom: '6px' }}>
                      {t.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    <span>👥 {t.player_count || t.players?.length || 0}/{t.max_players || t.maxPlayers} players</span>
                    <span>⭐ {t.points_per_win || t.pointsPerWin} pts/win</span>
            <span>💰 {t.entry_cost || t.entryCost} ELO entry</span>
            {t.disconnect_elo > 0 && <span style={{ color: '#ef4444' }}>⚡ {t.disconnect_elo} DC penalty</span>}
                    {t.creator_name && <span>👑 {t.creator_name}</span>}
                    {t.created_at && <span>📅 {formatDate(t.created_at)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );

  const renderCreate = () => (
    <main className="mychess-home-main" style={{ maxWidth: '600px' }}>
      <div className="mychess-home-hero" style={{ marginBottom: '30px' }}>
        <div className="mychess-home-eyebrow">NEW</div>
        <h1>Create Tournament</h1>
        <p>Set up a new tournament for players to compete!</p>
      </div>

      <form onSubmit={handleCreate}>
        <div className="mychess-elo-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
              Tournament Name *
            </label>
            <input
              type="text"
              className="mychess-input"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Enter tournament name..."
              maxLength={60}
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              className="mychess-input"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your tournament..."
              maxLength={300}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Max Players (2-50)
              </label>
              <input
                type="number"
                className="mychess-input"
                value={form.maxPlayers}
                onChange={e => setForm({ ...form, maxPlayers: Math.max(2, Math.min(50, Number(e.target.value))) })}
                min={2}
                max={50}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Points Per Win (1-100)
              </label>
              <input
                type="number"
                className="mychess-input"
                value={form.pointsPerWin}
                onChange={e => setForm({ ...form, pointsPerWin: Math.max(1, Math.min(100, Number(e.target.value))) })}
                min={1}
                max={100}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                Entry Cost (0-500 ELO)
              </label>
              <input
                type="number"
                className="mychess-input"
                value={form.entryCost}
                onChange={e => setForm({ ...form, entryCost: Math.max(0, Math.min(500, Number(e.target.value))) })}
                min={0}
                max={500}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
              Disconnect Penalty (0-100 pts) — Points the remaining player gets when opponent disconnects
            </label>
            <input
              type="number"
              className="mychess-input"
              value={form.disconnectElo}
              onChange={e => setForm({ ...form, disconnectElo: Math.max(0, Math.min(100, Number(e.target.value))) })}
              min={0}
              max={100}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
            <button
              type="submit"
              className="mychess-primary-button"
              disabled={creating}
              style={{ flex: 1 }}
            >
              {creating ? 'Creating...' : 'Create Tournament'} <span>+</span>
            </button>
            <button
              type="button"
              className="mychess-shop-button"
              onClick={() => setView('list')}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </main>
  );

  const renderDetail = () => {
    if (!selectedTournament) return null;
    const t = selectedTournament;
    const st = getStatusConfig(t.status);

    return (
      <main className="mychess-home-main" style={{ maxWidth: '1000px' }}>
        <div className="mychess-home-hero" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="mychess-shop-button"
              onClick={() => { setView('list'); setSelectedTournament(null); }}
            >
              ← Back
            </button>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '999px',
              background: st.bg,
              color: st.color,
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em'
            }}>
              {st.icon} {st.label}
            </span>
          </div>
          <h1 style={{ marginTop: '12px' }}>{t.name}</h1>
          {t.description && <p>{t.description}</p>}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            <span>👥 {t.players?.length || 0}/{t.max_players || t.maxPlayers} players</span>
            <span>⭐ {t.points_per_win || t.pointsPerWin} pts/win</span>
            <span>💰 {t.entry_cost || t.entryCost} ELO entry</span>
            {t.disconnect_elo > 0 && <span style={{ color: '#ef4444' }}>⚡ {t.disconnect_elo} DC penalty</span>}
            {t.creator_name && <span>👑 {t.creator_name}</span>}
            {t.created_at && <span>📅 {formatDate(t.created_at)}</span>}
          </div>
        </div>

        <div className="tn-grid">
          <div className="tn-main" style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
            {/* Action Buttons */}
            <div className="tn-actions">
              {t.status === 'waiting' && isCreator && (
                <>
                  <button
                    className="mychess-primary-button"
                    onClick={() => handleStart(t.id)}
                    disabled={starting || (t.players?.length || 0) < 2}
                    style={{ flex: 1 }}
                  >
                    {starting ? 'Starting...' : 'Start Tournament'} 🏁
                  </button>
                  <button
                    className="mychess-primary-button"
                    onClick={async () => {
                      if (!window.confirm('Delete this tournament? This cannot be undone.')) return;
                      try {
                        const res = await fetch(`${API_BASE}/tournaments/${t.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setMessage({ type: 'success', text: 'Tournament deleted.' });
                          clearMessage();
                          setView('list');
                        } else {
                          setMessage({ type: 'error', text: data.message || 'Failed to delete' });
                          clearMessage();
                        }
                      } catch {
                        setMessage({ type: 'error', text: 'Network error' });
                        clearMessage();
                      }
                    }}
                    style={{ flex: 0, padding: '10px 18px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                  >
                    🗑 Delete
                  </button>
                </>
              )}
              {t.status === 'waiting' && !isJoined && (t.players?.length || 0) < (t.max_players || t.maxPlayers) && (
                <button
                  className="mychess-primary-button"
                  onClick={() => handleJoin(t.id)}
                  disabled={joining}
                  style={{ flex: 1 }}
                >
                  {joining ? 'Joining...' : 'Join Tournament'} ⚔️
                </button>
              )}
              {t.status === 'waiting' && isJoined && !isCreator && (
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#f59e0b',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  You are enrolled. Waiting for the creator to start...
                </div>
              )}
              {t.status === 'active' && isCreator && (
                <button
                  className="mychess-primary-button"
                  onClick={async () => {
                    if (!window.confirm('Finish this tournament and declare final standings?')) return;
                    try {
                      const res = await fetch(`${API_BASE}/tournaments/${t.id}/finish`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
                      });
                      const data = await res.json();
                      if (data.ok) {
                        setMessage({ type: 'success', text: 'Tournament finished! Final standings declared.' });
                        clearMessage();
                        fetchTournamentDetail(t.id);
                        fetchMatchHistory(t.id);
                      } else {
                        setMessage({ type: 'error', text: data.message || 'Failed to finish' });
                        clearMessage();
                      }
                    } catch {
                      setMessage({ type: 'error', text: 'Network error' });
                      clearMessage();
                    }
                  }}
                  style={{ flex: 1, background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.2))', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  Finish Tournament 🏁
                </button>
              )}
            </div>

            {/* Players List — wider in main column */}
            <div className="mychess-elo-card">
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                👥 Players ({t.players?.length || 0})
              </div>
              {(!t.players || t.players.length === 0) ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '12px', padding: '16px 0' }}>
                  No players yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(t.players || []).map((p, idx) => {
                    const pid = p.account_id || p.player_id || p.id;
                    const isMe = pid === myId;
                    return (
                      <div
                        key={pid || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: isMe ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                          border: isMe ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.05)',
                          cursor: t.status === 'active' && !isMe && isJoined ? 'pointer' : 'default',
                          transition: 'all 0.15s'
                        }}
                        onClick={() => {
                          if (t.status === 'active' && !isMe && isJoined) {
                            handleDuel(t.id, pid);
                          }
                        }}
                        onMouseEnter={e => {
                          if (t.status === 'active' && !isMe && isJoined) {
                            e.currentTarget.style.background = 'rgba(139,92,246,0.2)';
                            e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)';
                          }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = isMe ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)';
                          e.currentTarget.style.borderColor = isMe ? 'rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.05)';
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'grid',
                          placeItems: 'center',
                          background: idx === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
                            idx === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
                            idx === 2 ? 'linear-gradient(135deg, #c2884d, #a16a3a)' :
                            'rgba(255,255,255,0.06)',
                          fontWeight: 800,
                          fontSize: '11px',
                          flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {p.username || p.name || `Player ${pid}`}
                            {isMe && <span style={{ marginLeft: '6px', color: '#a78bfa', fontSize: '10px' }}>YOU</span>}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            {p.games_played || 0} games · {p.points || 0} pts
                          </div>
                        </div>
                        {t.status === 'active' && !isMe && isJoined && (
                          <div style={{
                            fontSize: '9px',
                            color: '#a78bfa',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap'
                          }}>
                            DUEL →
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending Duel Requests */}
            {pendingDuels.length > 0 && (
              <div className="mychess-elo-card">
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  ⚔️ Incoming Duel Requests ({pendingDuels.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingDuels.map(duel => {
                    const challengerName = t.players?.find(p => (p.player_id || p.id) === duel.challenger_id)?.username || duel.challenger_name || 'Unknown';
                    return (
                      <div
                        key={duel.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.2)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {challengerName} challenges you!
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            Duel request pending
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button
                            className="mychess-primary-button"
                            onClick={() => handleDuelRespond(duel.id, true)}
                            disabled={respondingTo === duel.id}
                            style={{ padding: '6px 14px', fontSize: '11px' }}
                          >
                            {respondingTo === duel.id ? '...' : 'Accept'}
                          </button>
                          <button
                            className="mychess-shop-button"
                            onClick={() => handleDuelRespond(duel.id, false)}
                            disabled={respondingTo === duel.id}
                            style={{ padding: '6px 14px', fontSize: '11px' }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Duels */}
            {activeDuels.length > 0 && (
              <div className="mychess-elo-card">
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  ⚡ Active Duels ({activeDuels.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeDuels.map(duel => {
                    const opponentId = duel.challenger_id === myId ? duel.opponent_id : duel.challenger_id;
                    const opponentName = t.players?.find(p => (p.player_id || p.id) === opponentId)?.username || duel.opponent_name || 'Unknown';
                    return (
                      <div
                        key={duel.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.2)'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            vs {opponentName}
                          </div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                            Duel in progress — play your match!
                          </div>
                        </div>
                        {duel.room_id && onJoinRoom && (
                          <button
                            className="mychess-shop-button"
                            onClick={() => onJoinRoom(duel.room_id)}
                            style={{ padding: '6px 14px', fontSize: '11px', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: '#fff' }}
                          >
                            Join Match
                          </button>
                        )}
                        {!duel.room_id && (
                        <button
                          className="mychess-shop-button"
                          onClick={() => setReportingWinnerFor(duel.id)}
                          style={{ padding: '6px 14px', fontSize: '11px', whiteSpace: 'nowrap' }}
                        >
                          Report Result
                        </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Result Reporting Modal */}
            {reportingWinnerFor && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 99999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  background: 'rgba(5,3,10,0.84)',
                  backdropFilter: 'blur(12px)'
                }}
                onClick={() => setReportingWinnerFor(null)}
              >
                <div
                  className="mychess-elo-card"
                  style={{ width: 'min(400px,100%)', padding: '24px', textAlign: 'center' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                    ⚖️ Report Duel Result
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                    Who won the duel? Report the correct result.
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      const duel = (selectedTournament?.duels || []).find(d => d.id === reportingWinnerFor);
                      if (!duel) return null;
                      const challengerId = duel.challenger_id;
                      const opponentId = duel.opponent_id;
                      const challengerName = t.players?.find(p => (p.player_id || p.id) === challengerId)?.username || 'Challenger';
                      const opponentName = t.players?.find(p => (p.player_id || p.id) === opponentId)?.username || 'Opponent';
                      return (
                        <>
                          <button
                            className="mychess-primary-button"
                            onClick={() => handleReportResult(reportingWinnerFor, challengerId)}
                            disabled={submittingResult === reportingWinnerFor}
                          >
                            {submittingResult === reportingWinnerFor ? 'Submitting...' : `${challengerName} won`}
                          </button>
                          <button
                            className="mychess-primary-button"
                            onClick={() => handleReportResult(reportingWinnerFor, opponentId)}
                            disabled={submittingResult === reportingWinnerFor}
                          >
                            {submittingResult === reportingWinnerFor ? 'Submitting...' : `${opponentName} won`}
                          </button>
                          <button
                            className="mychess-shop-button"
                            onClick={() => setReportingWinnerFor(null)}
                          >
                            Cancel
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Duel History */}
            {finishedDuels.length > 0 && (
              <div className="mychess-elo-card">
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                  📜 Duel History ({finishedDuels.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {finishedDuels.map(duel => {
                    const opponentId = duel.challenger_id === myId ? duel.opponent_id : duel.challenger_id;
                    const opponentName = t.players?.find(p => (p.player_id || p.id) === opponentId)?.username || 'Unknown';
                    const won = duel.winner_id === myId;
                    const draw = duel.winner_id === null || duel.winner_id === undefined;
                    return (
                      <div
                        key={duel.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          background: won ? 'rgba(16,185,129,0.08)' : draw ? 'rgba(107,114,128,0.08)' : 'rgba(239,68,68,0.08)',
                          border: won ? '1px solid rgba(16,185,129,0.2)' : draw ? '1px solid rgba(107,114,128,0.2)' : '1px solid rgba(239,68,68,0.2)'
                        }}
                      >
                        <div style={{
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: won ? 'rgba(16,185,129,0.2)' : draw ? 'rgba(107,114,128,0.2)' : 'rgba(239,68,68,0.2)',
                          color: won ? '#10b981' : draw ? '#6b7280' : '#ef4444',
                          fontSize: '10px',
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          flexShrink: 0
                        }}>
                          {won ? 'WIN' : draw ? 'DRAW' : 'LOSS'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            vs {opponentName}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="tn-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Tournament Info */}
            <div className="mychess-elo-card" style={{ padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                ℹ️ Tournament Info
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Status</span>
                  <span style={{ color: st.color, fontWeight: 700 }}>{st.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Max Players</span>
                  <span style={{ fontWeight: 700 }}>{t.max_players || t.maxPlayers}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Points Per Win</span>
                  <span style={{ fontWeight: 700 }}>{t.points_per_win || t.pointsPerWin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Entry Cost</span>
                  <span style={{ fontWeight: 700 }}>{t.entry_cost || t.entryCost} ELO</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Disconnect Penalty</span>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>{t.disconnect_elo != null ? t.disconnect_elo : 0} pts</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Created</span>
                  <span style={{ fontWeight: 700 }}>{formatDate(t.created_at) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            {t.status === 'active' && isJoined && (
              <div className="mychess-elo-card" style={{ padding: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>
                  💡 How It Works
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.5' }}>
                  <p style={{ margin: '0 0 8px' }}>Click a player in the leaderboard to send a duel request.</p>
                  <p style={{ margin: '0 0 8px' }}>Once accepted, play your chess match and report the result.</p>
                  <p style={{ margin: 0 }}>Earn {t.points_per_win || t.pointsPerWin} points per win!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
           MATCH HISTORY SECTION
           ============================================================ */}
        {matchHistory && (
          <div style={{ marginTop: '24px' }}>
            <div className="mychess-elo-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
                  📊 Match History
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                  {['standings', 'duels', 'pending'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setHistoryTab(tab)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        background: historyTab === tab ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                        color: historyTab === tab ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab === 'standings' ? '🏅 Standings' : tab === 'duels' ? '⚔️ Completed' : '⏳ Pending'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Standings Tab */}
              {historyTab === 'standings' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    {matchHistory.players.slice(0, 3).map((p, idx) => (
                      <div key={p.account_id} style={{
                        padding: '14px',
                        borderRadius: '12px',
                        border: idx === 0 ? '2px solid rgba(251,191,36,0.4)' : idx === 1 ? '2px solid rgba(192,192,192,0.3)' : '2px solid rgba(205,127,50,0.3)',
                        background: idx === 0 ? 'rgba(251,191,36,0.06)' : idx === 1 ? 'rgba(192,192,192,0.04)' : 'rgba(205,127,50,0.04)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '4px' }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>{p.username}</div>
                        <div style={{ fontWeight: 700, fontSize: '18px', color: '#a78bfa', marginTop: '4px' }}>{p.points} pts</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                          {p.wins}W {p.losses}L {p.draws}D · {p.winRate}% WR · {p.elo} ELO
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          {['#', 'Player', 'Points', 'W', 'L', 'D', 'Win%', 'ELO'].map(h => (
                            <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {matchHistory.players.map((p, idx) => (
                          <tr key={p.account_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '8px 10px', color: idx < 3 ? ['#fbbf24','#c0c0c0','#cd7f32'][idx] : 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color: '#fff' }}>
                              {p.username}
                              {p.account_id === myId && <span style={{ marginLeft: '6px', color: '#a78bfa', fontSize: '9px' }}>YOU</span>}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 800, color: '#a78bfa' }}>{p.points}</td>
                            <td style={{ padding: '8px 10px', color: '#22c55e', fontWeight: 600 }}>{p.wins}</td>
                            <td style={{ padding: '8px 10px', color: '#ef4444', fontWeight: 600 }}>{p.losses}</td>
                            <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{p.draws}</td>
                            <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{p.winRate}%</td>
                            <td style={{ padding: '8px 10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{p.elo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Completed Duels Tab */}
              {historyTab === 'duels' && (
                <div>
                  {matchHistory.completedDuels.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '12px', padding: '24px 0' }}>No completed duels yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matchHistory.completedDuels.map((d, idx) => {
                        const challengerWon = d.winner_id === d.challenger_id;
                        return (
                          <div key={d.id || idx} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                            borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)'
                          }}>
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800,
                              background: challengerWon ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                              color: challengerWon ? '#22c55e' : '#ef4444', letterSpacing: '0.06em'
                            }}>
                              {challengerWon ? 'WIN' : 'LOSS'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontWeight: 700, fontSize: '12px', color: challengerWon ? '#22c55e' : '#fff' }}>
                                {d.challenger_name}
                              </span>
                              <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)', fontSize: '11px' }}>vs</span>
                              <span style={{ fontWeight: 700, fontSize: '12px', color: !challengerWon ? '#22c55e' : '#fff' }}>
                                {d.opponent_name}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
                              {d.created_at ? new Date(d.created_at).toLocaleDateString() : ''}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Pending Duels Tab */}
              {historyTab === 'pending' && (
                <div>
                  {matchHistory.pendingDuels.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '12px', padding: '24px 0' }}>No pending duels.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {matchHistory.pendingDuels.map((d, idx) => (
                        <div key={d.id || idx} style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px',
                          borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)'
                        }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 800,
                            background: d.status === 'accepted' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                            color: d.status === 'accepted' ? '#22c55e' : '#f59e0b', letterSpacing: '0.06em'
                          }}>
                            {d.status === 'accepted' ? 'ACCEPTED' : 'PENDING'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0, fontSize: '12px' }}>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{d.challenger_name}</span>
                            <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.2)' }}>vs</span>
                            <span style={{ fontWeight: 700, color: '#fff' }}>{d.opponent_name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: '12px', fontSize: '10px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
                Total: {matchHistory.completedDuels.length} completed · {matchHistory.pendingDuels.length} pending · {matchHistory.declinedDuels.length} declined
              </div>
            </div>
          </div>
        )}
      </main>
    );
  };

  return (
    <div className="mychess-home-page">
      <style>{`
        .tn-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 20px; align-items: start; }
        @media (max-width: 768px) { .tn-grid { grid-template-columns: 1fr; } .tn-sidebar { order: 2; } .tn-main { order: 1; } .tn-actions { flex-direction: column; } .tn-actions button { width: 100%; text-align: center; } }
        .tn-actions { display: flex; gap: 10px; flex-wrap: wrap; }
      `}</style>
      <FloatingBackground />

      <header className="mychess-home-header">
        <div className="mychess-home-brand">
          <div className="mychess-logo-mark">🏆</div>
          <div>
            <div className="mychess-brand">MYCHESS</div>
            <div className="mychess-brand-subtitle">TOURNAMENTS</div>
          </div>
        </div>

        <div className="mychess-user-area">
          <button onClick={onBack} className="mychess-home-logout">
            ← Back to Dashboard
          </button>
        </div>
      </header>

      {message && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 99999,
            padding: '10px 20px',
            borderRadius: '10px',
            background: message.type === 'error'
              ? 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(185,28,28,0.9))'
              : 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.9))',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
            textAlign: 'center',
            maxWidth: '90vw'
          }}
        >
          {message.text}
        </div>
      )}

      {view === 'list' && renderList()}
      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
    </div>
  );
};

export default TournamentPage;
