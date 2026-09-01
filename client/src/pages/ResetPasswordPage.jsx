import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import FloatingBackground from '../components/FloatingBackground';
import { API_BASE } from '../config';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!token || !email) {
      setMessage('This reset link is incomplete. Please request a new one.');
      setMessageType('error');
      return;
    }
    if (password.length < 8) {
      setMessage('Password must contain at least 8 characters.');
      setMessageType('error');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setMessage('Your password has been reset.');
        setMessageType('success');
        setTimeout(() => navigate('/'), 1400);
      } else {
        setMessage(data.message || 'Could not reset your password.');
        setMessageType('error');
      }
    } catch (e) {
      setMessage('Could not reset your password. Please try again.');
      setMessageType('error');
    }
    setLoading(false);
  }

  return (
    <div className="mychess-auth-page">
      <FloatingBackground />
      <div className="mychess-background-grid" />
      <div className="mychess-glow glow-one" />
      <div className="mychess-glow glow-two" />
      <main className="mychess-auth-container ac-solo">
        <section className="mychess-auth-panel ac-mini">
          <div className="mychess-auth-header">
            <div className="mychess-mobile-logo">♞</div>
            <h2>Set a new password</h2>
            <p>Choose a new password for your MYCHESS account.</p>
          </div>
          <form className="mychess-form" onSubmit={handleSubmit}>
            <div className="mychess-field">
              <label>NEW PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            <div className="mychess-field">
              <label>CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
            {message && <div className={`mychess-message ${messageType}`}>{message}</div>}
            <button type="submit" className="mychess-primary-button" disabled={loading}>
              {loading ? (<><span className="mychess-spinner" />Resetting...</>) : (<>Reset Password<span>→</span></>)}
            </button>
          </form>
          <div className="ac-backline">
            <Link to="/" className="ac-backlink">← Back to login</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ResetPasswordPage;
