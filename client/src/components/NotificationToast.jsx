import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE, TOKEN_KEY } from '../config';
import DailyCalendar from './DailyCalendar';

const NotificationToast = ({ socket, account, onEloUpdate }) => {
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [todayClaimed, setTodayClaimed] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);

  const addToast = useCallback((data) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, ...data }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    if (!socket || !account) return;
    const handler = (data) => {
      addToast(data);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification', handler);
    return () => socket.off('notification', handler);
  }, [socket, account, addToast]);

  const fetchNotifications = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/notifications`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok) { setNotifications(d.notifications); setUnreadCount(d.unreadCount); } })
      .catch(() => {});
  };

  const fetchCalendarStatus = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    fetch(`${API_BASE}/daily-calendar?localDate=${localDate}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setTodayClaimed(d.todayClaimed || false);
          setCurrentDay(d.currentDay || 0);
        }
      })
      .catch(() => {});
  };

  const markAllRead = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    fetch(`${API_BASE}/notifications/read-all`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      .then(() => { setUnreadCount(0); setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); })
      .catch(() => {});
  };

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleBellClick = () => {
    const next = !showPanel;
    setShowPanel(next);
    if (next) {
      fetchNotifications();
      fetchCalendarStatus();
    }
  };

  if (!account) return null;

  return (
    <>
      <div className="nt-toasts">
        {toasts.map(toast => (
          <div key={toast.id} className="nt-toast" onClick={() => dismissToast(toast.id)}>
            <div className="nt-toast-title">{toast.title}</div>
            <div className="nt-toast-msg">{toast.message}</div>
          </div>
        ))}
      </div>

      <button type="button" className="nt-bell" onClick={handleBellClick}>
        🔔
        {unreadCount > 0 && <span className="nt-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {createPortal(
        <>
          {showPanel && !showCalendar && (
            <div className="nt-fullpage-overlay">
              <div className="nt-fullpage-header">
                <button type="button" className="nt-fullpage-close" onClick={() => setShowPanel(false)}>✕</button>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: '16px' }}>Notifications</h3>
                {unreadCount > 0 ? (
                  <button type="button" className="nt-mark-read" onClick={markAllRead}>Mark all read</button>
                ) : <div style={{ width: 80 }} />}
              </div>

              <div className="nt-fullpage-body">
                <div className="nt-item nt-calendar-entry">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                    <div style={{ fontSize: '28px', flexShrink: 0 }}>📅</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nt-item-title" style={{ fontSize: '14px' }}>31-Day Reward Calendar</div>
                      <div className="nt-item-msg" style={{ fontSize: '12px' }}>
                        {todayClaimed
                          ? 'Come back tomorrow for your next reward!'
                          : `Day ${currentDay + 1} — Claim your daily ELO reward now!`
                        }
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowPanel(false); setShowCalendar(true); }}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: todayClaimed
                          ? 'rgba(255,255,255,0.06)'
                          : 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                        color: todayClaimed ? 'rgba(255,255,255,0.35)' : '#fff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {todayClaimed ? 'View' : 'Claim'}
                    </button>
                  </div>
                </div>

                {notifications.length === 0 ? (
                  <div className="nt-empty">No notifications yet</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`nt-item ${n.is_read ? '' : 'nt-unread'}`}>
                    <div className="nt-item-title">{n.title}</div>
                    <div className="nt-item-msg">{n.message}</div>
                    <div className="nt-item-time">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showCalendar && (
            <div className="nt-fullpage-overlay">
              <div className="nt-fullpage-header">
                <button
                  type="button"
                  className="nt-fullpage-close"
                  onClick={() => { setShowCalendar(false); setShowPanel(true); }}
                >
                  ← Back
                </button>
                <h3 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: '16px' }}>📅 Daily Rewards</h3>
                <div style={{ width: 70 }} />
              </div>

              <div className="nt-fullpage-body">
                <DailyCalendar
                  token={localStorage.getItem(TOKEN_KEY)}
                  onEloUpdate={(newElo) => {
                    if (onEloUpdate) onEloUpdate(newElo);
                    fetchCalendarStatus();
                  }}
                />
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </>
  );
};

export default NotificationToast;
