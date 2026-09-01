import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FloatingBackground from '../components/FloatingBackground';
import { API_BASE } from '../config';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email) {
      setMessage('Please enter your email address.');
      setMessageType('error');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(data.message || 'If that email exists, a reset link has been sent.');
      setMessageType(data.ok ? 'success' : 'error');
      setEmail('');
    } catch (e) {
      setMessage('Could not send the reset link. Please try again.');
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
            <h2>Forgot password</h2>
            <p>Enter your email and we'll send you a link to reset your password.</p>
          </div>
          <form className="mychess-form" onSubmit={handleSubmit}>
            <div className="mychess-field">
              <label>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {message && <div className={`mychess-message ${messageType}`}>{message}</div>}
            <button type="submit" className="mychess-primary-button" disabled={loading}>
              {loading ? (<><span className="mychess-spinner" />Sending...</>) : (<>Send Reset Link<span>→</span></>)}
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

export default ForgotPasswordPage;
