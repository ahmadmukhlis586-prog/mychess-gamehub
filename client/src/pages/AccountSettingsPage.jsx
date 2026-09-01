import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FloatingBackground from '../components/FloatingBackground';
import { API_BASE } from '../config';

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const AccountSettingsPage = ({ token, account }) => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwType, setPwType] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/avatar/${account?.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.ok && d.avatar) setAvatarUrl(d.avatar); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, account?.id]);

  async function handleAvatar(file) {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      alert('Please choose an image file (jpg, png, gif, or webp).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      return;
    }
    const fd = new FormData();
    fd.append('avatar', file);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && data.avatar) {
        setAvatarUrl(data.avatar);
        if (account) account.avatar = data.avatar;
        alert('Avatar updated!');
      } else {
        alert(data.message || 'Could not upload your avatar.');
      }
    } catch (e) {
      alert('Could not upload your avatar.');
    }
    setUploading(false);
  }

  async function handlePassword(event) {
    event.preventDefault();
    if (!currentPassword) { setPwMsg('Please enter your current password.'); setPwType('error'); return; }
    if (newPassword.length < 8) { setPwMsg('New password must contain at least 8 characters.'); setPwType('error'); return; }
    if (newPassword !== confirmPassword) { setPwMsg('New passwords do not match.'); setPwType('error'); return; }
    setPwLoading(true);
    setPwMsg('');
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setPwMsg('Your password has been changed.');
        setPwType('success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwMsg(data.message || 'Could not change your password.');
        setPwType('error');
      }
    } catch (e) {
      setPwMsg('Could not change your password.');
      setPwType('error');
    }
    setPwLoading(false);
  }

  const displayName = account?.username || 'Player';

  return (
    <div className="pp-page">
      <FloatingBackground />
      <header className="pp-header">
        <button type="button" className="mychess-home-logout" onClick={() => navigate('/')}>← Back</button>
      </header>
      <main className="pp-main ac-main">
        <h1 className="ac-title">Account Settings</h1>

        {/* AVATAR */}
        <div className="ac-card">
          <h2 className="ac-card-title">Profile Picture</h2>
          <div className="ac-avatar-row">
            <div className="ac-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="ac-avatar-img" />
              ) : (
                <span>{displayName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="ac-avatar-controls">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(event) => handleAvatar(event.target.files?.[0])}
              />
              <button
                type="button"
                className="ac-btn"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <small className="ac-hint">JPG, PNG, GIF or WebP up to 5 MB.</small>
            </div>
          </div>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="ac-card">
          <h2 className="ac-card-title">Change Password</h2>
          <form onSubmit={handlePassword} className="mychess-form ac-form">
            <div className="mychess-field">
              <label>CURRENT PASSWORD</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter your current password"
                autoComplete="current-password"
                disabled={pwLoading}
              />
            </div>
            <div className="mychess-field">
              <label>NEW PASSWORD</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={pwLoading}
              />
            </div>
            <div className="mychess-field">
              <label>CONFIRM NEW PASSWORD</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                disabled={pwLoading}
              />
            </div>
            {pwMsg && <div className={`mychess-message ${pwType}`}>{pwMsg}</div>}
            <button type="submit" className="ac-btn ac-btn-primary" disabled={pwLoading}>
              {pwLoading ? 'Saving...' : 'Change Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AccountSettingsPage;
