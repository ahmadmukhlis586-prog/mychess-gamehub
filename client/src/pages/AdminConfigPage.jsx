import React, { useState, useEffect } from 'react';
import FloatingBackground from '../components/FloatingBackground';
import MusicWidget from '../components/MusicWidget';
import { API_BASE, SERVER_URL } from '../config';

const AdminConfigPage = ({ token, onBack }) => {
  const [data, setData] = useState({ announcements: [], quests: [], shopItems: [], musicAlbums: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('announcements');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  // File Upload States & Success Overlay State
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [announcementImage, setAnnouncementImage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // ADDED: state for the Profile Themes + Board Themes admin tabs
  const [profileThemes, setProfileThemes] = useState([]);
  const [boardThemes, setBoardThemes] = useState([]);
  const [profileForm, setProfileForm] = useState({});
  const [boardForm, setBoardForm] = useState({});
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingBoard, setEditingBoard] = useState(null);
  const [themesLoading, setThemesLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchProfileThemeList();
    fetchBoardThemeList();
  }, []);

  // Auto-hide success overlay after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const getEndpoint = (tab) => {
    const map = {
      'announcements': 'announcements',
      'quests': 'quests',
      'shop': 'shop',
      'musicAlbums': 'music'
    };
    return map[tab] || tab;
  };

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.ok) setData(result);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isEditing = !!editingItem;
    const endpoint = getEndpoint(activeTab);

    let id = null;
    if (editingItem) {
      if (activeTab === 'announcements') id = editingItem.announcement_id || editingItem.id;
      else if (activeTab === 'shop') id = editingItem.id || editingItem.item_id;
      else id = editingItem.id;
    }

    // Use FormData for Music Albums to support actual file uploads
    if (activeTab === 'musicAlbums') {
      const uploadPayload = new FormData();
      uploadPayload.append('title', formData.title || '');
      uploadPayload.append('artist', formData.artist || '');
      uploadPayload.append('category', formData.category || '');
      
      // Only append if a file was selected
      if (coverFile) uploadPayload.append('cover_image', coverFile);
      if (audioFile) uploadPayload.append('audio_file', audioFile);

      const url = isEditing
        ? `${API_BASE}/admin/${endpoint}/update/${id}`
        : `${API_BASE}/admin/${endpoint}/create`;
      
      const method = isEditing ? 'PUT' : 'POST';

      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: uploadPayload
        });

        if (response.ok) {
          setFormData({});
          setEditingItem(null);
          setAudioFile(null);
          setCoverFile(null);
          setShowSuccess(true); // ✅ Show Green Overlay
          fetchData(); // ✅ IMMEDIATELY FETCH AND SHOW NEW ITEM
        } else {
          const err = await response.json();
          alert(`Failed to save album: ${err.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        alert('Error saving album. Check if backend is running.');
      }
      return;
    }

    // Announcements support image upload via FormData
    if (activeTab === 'announcements') {
      const uploadPayload = new FormData();
      uploadPayload.append('title', formData.title || '');
      uploadPayload.append('category', formData.category || '');
      uploadPayload.append('content', formData.content || '');
      uploadPayload.append('event_date', formData.event_date || '');
      uploadPayload.append('prize_pool', formData.prize_pool || '');
      uploadPayload.append('button_label', formData.button_label || '');
      uploadPayload.append('button_link', formData.button_link || '');
      if (formData.image_url) uploadPayload.append('image_url', formData.image_url);
      if (announcementImage) uploadPayload.append('image', announcementImage);

      const url = isEditing
        ? `${API_BASE}/admin/${endpoint}/update/${id}`
        : `${API_BASE}/admin/${endpoint}/create`;

      const method = isEditing ? 'PUT' : 'POST';

      try {
        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: uploadPayload
        });

        if (response.ok) {
          setFormData({});
          setEditingItem(null);
          setAnnouncementImage(null);
          setShowSuccess(true);
          fetchData();
        } else {
          const err = await response.json();
          alert(`Failed to save announcement: ${err.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Save error:', error);
        alert('Error saving announcement. Check if backend is running.');
      }
      return;
    }

    // Existing logic for other tabs
    const url = isEditing
      ? `${API_BASE}/admin/${endpoint}/update/${id}`
      : `${API_BASE}/admin/${endpoint}/create`;
    
    const method = isEditing ? 'PUT' : 'POST';

    try {
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      setFormData({});
      setEditingItem(null);
      setShowSuccess(true); // ✅ Show Green Overlay
      fetchData(); // ✅ IMMEDIATELY FETCH AND SHOW NEW ITEM
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    try {
      const endpoint = getEndpoint(activeTab);

      await fetch(`${API_BASE}/admin/${endpoint}/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSuccess(true); // ✅ Show Green Overlay
      fetchData(); // ✅ IMMEDIATELY REFRESH LIST
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData(item);
    setAudioFile(null);
    setCoverFile(null);
    setAnnouncementImage(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getItems = () => {
    const map = {
      'announcements': data.announcements || [],
      'quests': data.quests || [],
      'shop': data.shopItems || [],
      'musicAlbums': data.musicAlbums || []
    };
    return map[activeTab] || [];
  };

  // =========================================================================
  // ✅ ADDED: admin handlers for PROFILE THEMES tab (additive, dedicated funcs)
  // =========================================================================
  const fetchProfileThemeList = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/profile-themes`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (result.ok) setProfileThemes(result.themes || []);
    } catch (error) {
      console.error('Error fetching profile themes:', error);
    }
  };

  const handleProfileThemeChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditProfileTheme = (item) => {
    setEditingProfile(item);
    setProfileForm(item);
  };

  const handleProfileThemeSave = async (e) => {
    e.preventDefault();
    const isEditing = !!editingProfile;
    const url = isEditing
      ? `${API_BASE}/admin/profile-themes/update/${editingProfile.id}`
      : `${API_BASE}/admin/profile-themes/create`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      });
      setProfileForm({});
      setEditingProfile(null);
      setShowSuccess(true);
      fetchProfileThemeList();
    } catch (error) {
      console.error('Profile theme save error:', error);
    }
  };

  const handleProfileThemeDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this profile theme?')) return;
    try {
      await fetch(`${API_BASE}/admin/profile-themes/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSuccess(true);
      fetchProfileThemeList();
    } catch (error) {
      console.error('Profile theme delete error:', error);
    }
  };

  // =========================================================================
  // ✅ ADDED: admin handlers for BOARD THEMES tab (additive, dedicated funcs)
  // =========================================================================
  const fetchBoardThemeList = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/board-themes`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await res.json();
      if (result.ok) setBoardThemes(result.themes || []);
    } catch (error) {
      console.error('Error fetching board themes:', error);
    }
  };

  const handleBoardThemeChange = (e) => {
    const { name, value } = e.target;
    setBoardForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditBoardTheme = (item) => {
    setEditingBoard(item);
    setBoardForm(item);
  };

  const handleBoardThemeSave = async (e) => {
    e.preventDefault();
    const isEditing = !!editingBoard;
    const url = isEditing
      ? `${API_BASE}/admin/board-themes/update/${editingBoard.id}`
      : `${API_BASE}/admin/board-themes/create`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(boardForm)
      });
      setBoardForm({});
      setEditingBoard(null);
      setShowSuccess(true);
      fetchBoardThemeList();
    } catch (error) {
      console.error('Board theme save error:', error);
    }
  };

  const handleBoardThemeDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this board theme?')) return;
    try {
      await fetch(`${API_BASE}/admin/board-themes/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSuccess(true);
      fetchBoardThemeList();
    } catch (error) {
      console.error('Board theme delete error:', error);
    }
  };

  return (
    <div className="chess-ai-page">
      {/* ✅ Animated Success Toast */}
      {showSuccess && (
        <div className="admin-success-toast">
          <span className="admin-success-check">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <div className="admin-success-text">
            <strong>Saved Successfully!</strong>
            <span>Your changes have been applied.</span>
          </div>
        </div>
      )}

      <FloatingBackground />
      <MusicWidget />

      <header className="chess-tips-header">
        <div className="chess-tips-brand">
          <div className="mychess-logo-mark">🔧</div>
          <div>
            <div className="chess-tips-brand-name">ADMIN CONFIG</div>
            <div className="chess-tips-brand-subtitle">MYCHESS CONTROL PANEL</div>
          </div>
        </div>
        <button type="button" className="mychess-home-logout" onClick={onBack}>← Back to Dashboard</button>
      </header>

      <main className="chess-ai-main" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '20px' }}>
        {/* Neon Tab Switcher */}
        <div className="admin-tabs-neon">
          <button className={`admin-tab ${activeTab === 'announcements' ? 'active' : ''}`} onClick={() => { setActiveTab('announcements'); setEditingItem(null); setFormData({}); setAudioFile(null); setCoverFile(null); setAnnouncementImage(null); }}>📰 Announcements</button>
          <button className={`admin-tab ${activeTab === 'quests' ? 'active' : ''}`} onClick={() => { setActiveTab('quests'); setEditingItem(null); setFormData({}); setAudioFile(null); setCoverFile(null); setAnnouncementImage(null); }}>🎯 Quests</button>
          <button className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => { setActiveTab('shop'); setEditingItem(null); setFormData({}); setAudioFile(null); setCoverFile(null); setAnnouncementImage(null); }}>🛒 Shop Items</button>
          <button className={`admin-tab ${activeTab === 'musicAlbums' ? 'active' : ''}`} onClick={() => { setActiveTab('musicAlbums'); setEditingItem(null); setFormData({}); setAudioFile(null); setCoverFile(null); setAnnouncementImage(null); }}>🎵 Music Albums</button>
          <button className={`admin-tab ${activeTab === 'profileThemes' ? 'active' : ''}`} onClick={() => { setActiveTab('profileThemes'); setEditingItem(null); setFormData({}); setEditingProfile(null); setProfileForm({}); fetchProfileThemeList(); }}>🎨 Profile Themes</button>
          <button className={`admin-tab ${activeTab === 'boardThemes' ? 'active' : ''}`} onClick={() => { setActiveTab('boardThemes'); setEditingItem(null); setFormData({}); setEditingBoard(null); setBoardForm({}); fetchBoardThemeList(); }}>♟️ Board Themes</button>
        </div>

        {/* ADDED: Profile Themes editor (shown only on its tab) */}
        {activeTab === 'profileThemes' && (
          <div className="admin-glass-card">
            <h3 className="admin-form-title">
              {editingProfile ? `Edit Profile Theme` : `Create New Profile Theme`}
            </h3>
            <form onSubmit={handleProfileThemeSave} className="admin-form-grid">
              <div className="admin-input-group">
                <label>Name</label>
                <input type="text" name="name" placeholder="Crimson" value={profileForm.name || ''} onChange={handleProfileThemeChange} required />
              </div>
              <div className="admin-input-group">
                <label>CSS Class</label>
                <input type="text" name="css_class" placeholder="pt-crimson" value={profileForm.css_class || ''} onChange={handleProfileThemeChange} required />
              </div>
              <div className="admin-input-group full-width">
                <label>Gradient</label>
                <input type="text" name="gradient" placeholder="linear-gradient(135deg,#dc2626,#991b1b)" value={profileForm.gradient || ''} onChange={handleProfileThemeChange} required />
              </div>
              <div className="admin-input-group">
                <label>Preview URL (optional)</label>
                <input type="text" name="preview_url" placeholder="https://..." value={profileForm.preview_url || ''} onChange={handleProfileThemeChange} />
              </div>
              <div className="admin-input-group">
                <label>Cost (ELO)</label>
                <input type="number" name="cost_elo" placeholder="50" value={profileForm.cost_elo ?? ''} onChange={handleProfileThemeChange} />
              </div>
              <div className="admin-form-actions full-width">
                <button type="submit" className="admin-save-btn">{editingProfile ? 'Update Theme' : 'Create Theme'}</button>
                {editingProfile && <button type="button" className="admin-cancel-btn" onClick={() => { setEditingProfile(null); setProfileForm({}); }}>Cancel</button>}
              </div>
            </form>
          </div>
        )}

        {/* ADDED: Board Themes editor (shown only on its tab) */}
        {activeTab === 'boardThemes' && (
          <div className="admin-glass-card">
            <h3 className="admin-form-title">
              {editingBoard ? `Edit Board Theme` : `Create New Board Theme`}
            </h3>
            <form onSubmit={handleBoardThemeSave} className="admin-form-grid">
              <div className="admin-input-group">
                <label>Name</label>
                <input type="text" name="name" placeholder="Neon Glow" value={boardForm.name || ''} onChange={handleBoardThemeChange} required />
              </div>
              <div className="admin-input-group">
                <label>CSS Class</label>
                <input type="text" name="css_class" placeholder="abt-neon" value={boardForm.css_class || ''} onChange={handleBoardThemeChange} required />
              </div>
              <div className="admin-input-group">
                <label>Animation CSS</label>
                <input type="text" name="animation_css" placeholder="abt-neon-anim" value={boardForm.animation_css || ''} onChange={handleBoardThemeChange} />
              </div>
              <div className="admin-input-group">
                <label>Light Square (hex)</label>
                <input type="text" name="light_sq" placeholder="#1a1a2e" value={boardForm.light_sq || ''} onChange={handleBoardThemeChange} />
              </div>
              <div className="admin-input-group">
                <label>Dark Square (hex)</label>
                <input type="text" name="dark_sq" placeholder="#0d1117" value={boardForm.dark_sq || ''} onChange={handleBoardThemeChange} />
              </div>
              <div className="admin-input-group">
                <label>Cost (ELO)</label>
                <input type="number" name="cost_elo" placeholder="100" value={boardForm.cost_elo ?? ''} onChange={handleBoardThemeChange} />
              </div>
              <div className="admin-form-actions full-width">
                <button type="submit" className="admin-save-btn">{editingBoard ? 'Update Theme' : 'Create Theme'}</button>
                {editingBoard && <button type="button" className="admin-cancel-btn" onClick={() => { setEditingBoard(null); setBoardForm({}); }}>Cancel</button>}
              </div>
            </form>
          </div>
        )}

        {activeTab !== 'profileThemes' && activeTab !== 'boardThemes' && (
        <div className="admin-glass-card">
          <h3 className="admin-form-title">
            {editingItem ? `✏️ Edit ${activeTab === 'musicAlbums' ? 'Album' : activeTab === 'announcements' ? 'Announcement' : activeTab === 'quests' ? 'Quest' : 'Shop Item'}` : `➕ Create New ${activeTab === 'musicAlbums' ? 'Album' : activeTab === 'announcements' ? 'Announcement' : activeTab === 'quests' ? 'Quest' : 'Shop Item'}`}
          </h3>
          <form onSubmit={handleSave} className="admin-form-grid">
            {activeTab === 'announcements' && (
              <>
                <div className="admin-input-group">
                  <label>Title</label>
                  <input type="text" name="title" placeholder="Enter title..." value={formData.title || ''} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Category</label>
                  <input type="text" name="category" placeholder="General / Tournament..." value={formData.category || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group full-width">
                  <label>Content</label>
                  <textarea name="content" placeholder="Write your announcement..." value={formData.content || ''} onChange={handleChange} required></textarea>
                </div>
                <div className="admin-input-group">
                  <label>Event Date</label>
                  <input type="text" name="event_date" placeholder="Sep 05 / 2026-09-05..." value={formData.event_date || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Prize Pool</label>
                  <input type="text" name="prize_pool" placeholder="RM 500 / +200 ELO..." value={formData.prize_pool || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Button Label</label>
                  <input type="text" name="button_label" placeholder="Register Now" value={formData.button_label || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Button Link (URL)</label>
                  <input type="text" name="button_link" placeholder="https://example.com/register" value={formData.button_link || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group full-width">
                  <label>Upload Announcement Image</label>
                  <input type="file" name="image" accept="image/*" onChange={(e) => setAnnouncementImage(e.target.files[0])} />
                </div>
              </>
            )}
            {activeTab === 'quests' && (
              <>
                <div className="admin-input-group">
                  <label>Quest Type</label>
                  <input type="text" name="quest_type" placeholder="first_win..." value={formData.quest_type || ''} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Quest Name</label>
                  <input type="text" name="quest_name" placeholder="First Victory..." value={formData.quest_name || ''} onChange={handleChange} required />
                </div>
                <div className="admin-input-group full-width">
                  <label>Description</label>
                  <input type="text" name="description" placeholder="Win your first game..." value={formData.description || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Goal</label>
                  <input type="number" name="goal" placeholder="1" value={formData.goal || 1} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Reward ELO</label>
                  <input type="number" name="reward_elo" placeholder="50" value={formData.reward_elo || 0} onChange={handleChange} required />
                </div>
              </>
            )}
            {activeTab === 'shop' && (
              <>
                <div className="admin-input-group">
                  <label>Item Name</label>
                  <input type="text" name="name" placeholder="Golden Royal..." value={formData.name || ''} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Category</label>
                  <select name="category" value={formData.category || ''} onChange={handleChange} required>
                    <option value="piece">Piece</option>
                    <option value="board">Board</option>
                    <option value="effect">Effect</option>
                    <option value="name_color">Name Color</option>
                    <option value="avatar_frame">Avatar Frame</option>
                  </select>
                </div>
                <div className="admin-input-group">
                  <label>Description</label>
                  <input type="text" name="description" placeholder="Luxurious gold piece..." value={formData.description || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Price (ELO)</label>
                  <input type="number" name="price" placeholder="350" value={formData.price || 0} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Rarity</label>
                  <select name="rarity" value={formData.rarity || 'common'} onChange={handleChange}>
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div className="admin-input-group full-width">
                  <label>Preview Data (JSON)</label>
                  <textarea name="preview_data" placeholder='{"color": "#ffd700", "glow": true}' value={typeof formData.preview_data === 'object' ? JSON.stringify(formData.preview_data) : formData.preview_data || ''} onChange={(e) => setFormData(prev => ({ ...prev, preview_data: e.target.value }))}></textarea>
                </div>
              </>
            )}
            
            {/* ✅ UPDATED MUSIC ALBUM SECTION (File Uploads) */}
            {activeTab === 'musicAlbums' && (
              <>
                <div className="admin-input-group">
                  <label>Album Title</label>
                  <input type="text" name="title" placeholder="Neon Chess..." value={formData.title || ''} onChange={handleChange} required />
                </div>
                <div className="admin-input-group">
                  <label>Artist</label>
                  <input type="text" name="artist" placeholder="MyChess Soundtrack..." value={formData.artist || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group">
                  <label>Category</label>
                  <input type="text" name="category" placeholder="Most Picked Song / Best KPOP..." value={formData.category || ''} onChange={handleChange} />
                </div>
                <div className="admin-input-group full-width">
                  <label>Upload Cover Image</label>
                  <input type="file" name="cover_image" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} />
                </div>
                <div className="admin-input-group full-width">
                  <label>Upload Audio File (.mp3)</label>
                  <input type="file" name="audio_file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} required={!editingItem} />
                </div>
              </>
            )}
            
            <div className="admin-form-actions full-width">
              <button type="submit" className="admin-save-btn">{editingItem ? 'Update Item' : 'Create Item'}</button>
              {editingItem && <button type="button" className="admin-cancel-btn" onClick={() => { setEditingItem(null); setFormData({}); setAudioFile(null); setCoverFile(null); setAnnouncementImage(null); }}>Cancel</button>}
            </div>
          </form>
        </div>
        )}

        {/* ADDED: Profile Themes list (shown only on its tab) */}
        {activeTab === 'profileThemes' && (
          <div className="admin-list-section">
            <h3 className="admin-list-title">📂 Existing Profile Themes</h3>
            {themesLoading ? <p className="admin-empty">Loading...</p> : profileThemes.length === 0 ? <p className="admin-empty">No profile themes found.</p> : (
              <div className="admin-list-grid">
                {profileThemes.map(item => (
                  <div key={item.id} className="admin-list-item">
                    <div className="admin-item-info">
                      <span className="admin-item-name">{item.name}</span>
                      <span className="admin-item-meta">{item.cost_elo == null || item.cost_elo === 0 ? 'Free' : `${item.cost_elo} ELO`} · {item.css_class || 'No class'}</span>
                    </div>
                    <div className="admin-item-actions">
                      <button className="admin-edit-btn" onClick={() => handleEditProfileTheme(item)}>✏️ Edit</button>
                      <button className="admin-delete-btn" onClick={() => handleProfileThemeDelete(item.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADDED: Board Themes list (shown only on its tab) */}
        {activeTab === 'boardThemes' && (
          <div className="admin-list-section">
            <h3 className="admin-list-title">📂 Existing Board Themes</h3>
            {themesLoading ? <p className="admin-empty">Loading...</p> : boardThemes.length === 0 ? <p className="admin-empty">No board themes found.</p> : (
              <div className="admin-list-grid">
                {boardThemes.map(item => (
                  <div key={item.id} className="admin-list-item">
                    <div className="admin-item-info">
                      <span className="admin-item-name">{item.name}</span>
                      <span className="admin-item-meta">{item.cost_elo == null || item.cost_elo === 0 ? 'Free' : `${item.cost_elo} ELO`} · {item.light_sq || '?'}/{item.dark_sq || '?'}</span>
                    </div>
                    <div className="admin-item-actions">
                      <button className="admin-edit-btn" onClick={() => handleEditBoardTheme(item)}>✏️ Edit</button>
                      <button className="admin-delete-btn" onClick={() => handleBoardThemeDelete(item.id)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Section */}
        {activeTab !== 'profileThemes' && activeTab !== 'boardThemes' && (
        <div className="admin-list-section">
          <h3 className="admin-list-title">📂 Existing {activeTab === 'musicAlbums' ? 'Music Albums' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
          {loading ? <p className="admin-empty">Loading...</p> : getItems().length === 0 ? <p className="admin-empty">No items found.</p> : (
            <div className="admin-list-grid">
              {getItems().map(item => {
                const id = item.id || item.announcement_id || item.item_id;
                const name = activeTab === 'shop' ? item.name : activeTab === 'quests' ? item.quest_name : activeTab === 'musicAlbums' ? item.title : item.title;
                const meta = activeTab === 'shop' ? `${item.price} ELO` : activeTab === 'quests' ? `+${item.reward_elo} ELO` : activeTab === 'musicAlbums' ? `🎵 ${item.audio_file || 'Audio'}` : item.category;
                
                return (
                  <div key={id} className="admin-list-item">
                    {/* ✅ Display Cover Image if it exists */}
                    {activeTab === 'musicAlbums' && item.cover_image && (
  <img 
    src={item.cover_image.startsWith('http') ? item.cover_image : `${SERVER_URL}${item.cover_image}`} 
    alt={name} 
    style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginRight: '10px' }} 
  />
)}
                    <div className="admin-item-info">
                      <span className="admin-item-name">{name}</span>
                      <span className="admin-item-meta">{meta}</span>
                    </div>
                    <div className="admin-item-actions">
                      <button className="admin-edit-btn" onClick={() => handleEdit(item)}>✏️ Edit</button>
                      <button className="admin-delete-btn" onClick={() => handleDelete(id)}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  );
};

export default AdminConfigPage;
