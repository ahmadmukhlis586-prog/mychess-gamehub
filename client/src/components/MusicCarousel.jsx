import React, { useState, useEffect } from 'react';
import { playClickSound } from '../helpers';
import { API_BASE, SERVER_URL } from '../config';

const MusicCarousel = ({ token }) => {
  const [albums, setAlbums] = useState([]);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [equippedAlbum, setEquippedAlbum] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlbums();
    fetchEquipped();
  }, []);

  const fetchAlbums = async () => {
    try {
      // ✅ FIXED: Use API_BASE
      const res = await fetch(`${API_BASE}/music/albums`);
      const data = await res.json();
      if (data.ok) setAlbums(data.albums || []);
    } catch (e) { 
      console.error('Error fetching albums:', e);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchEquipped = async () => {
    try {
      // ✅ FIXED: Use API_BASE
      const res = await fetch(`${API_BASE}/music/equipped`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (data.ok) {
        setEquippedAlbum(data.album);
        if (data.album) {
          localStorage.setItem('mychess_equipped_album', data.album.audio_file);
        } else {
          localStorage.removeItem('mychess_equipped_album');
        }
      }
    } catch (e) { 
      console.error('Error fetching equipped:', e);
    }
  };

  const handleToggleEquip = async (album) => {
    playClickSound();

    const isAlreadyEquipped = equippedAlbum?.id === album.id;

    if (isAlreadyEquipped) {
      setSelectedAlbum(null);
      setEquippedAlbum(null);
      localStorage.removeItem('mychess_equipped_album');

      try {
        // ✅ FIXED: Use API_BASE
        await fetch(`${API_BASE}/music/unequip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId: album.id })
        });
      } catch (e) { 
        console.error('Unequip error:', e);
      }
    } else {
      setSelectedAlbum(album);
      setEquippedAlbum(album);
      localStorage.setItem('mychess_equipped_album', album.audio_file);

      try {
        // ✅ FIXED: Use API_BASE
        await fetch(`${API_BASE}/music/equip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ albumId: album.id })
        });
      } catch (e) { 
        console.error('Equip error:', e);
      }
    }
  };

  const handleBackToDefault = async () => {
    playClickSound();
    setSelectedAlbum(null);
    setEquippedAlbum(null);
    localStorage.removeItem('mychess_equipped_album');

    try {
      // ✅ FIXED: Use API_BASE
      await fetch(`${API_BASE}/music/unequip-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
    } catch (e) { 
      console.error('Unequip all error:', e);
    }
  };

  const groupAlbumsByCategory = (list) => {
    const groups = {};
    (list || []).forEach((album) => {
      const cat = (album.category || '').trim() || 'All Albums';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(album);
    });
    return groups;
  };

  const renderAlbumCard = (album) => {
    const isHovered = hoveredId === album.id;
    const isSelected = selectedAlbum?.id === album.id || equippedAlbum?.id === album.id;

    return (
      <div
        key={album.id}
        className={`music-album-card ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
        onMouseEnter={() => setHoveredId(album.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => handleToggleEquip(album)}
      >
        <div className="album-cover">
          {album.cover_image ? (
            <img 
              src={album.cover_image.startsWith('http') ? album.cover_image : `${SERVER_URL}${album.cover_image}`} 
              alt={album.title} 
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.classList.add('show-placeholder');
              }}
            />
          ) : (
            <div className="album-cover-placeholder">♟️</div>
          )}
          
          <div className="album-overlay">
            <span className="album-play-icon">
              {isSelected ? '✓' : '▶'}
            </span>
          </div>
        </div>
        <div className="album-info">
          <h4>{album.title}</h4>
          <p>{album.artist}</p>
        </div>
        {isSelected && <div className="equipped-badge">✓ EQUIPPED</div>}
      </div>
    );
  };

  const grouped = groupAlbumsByCategory(albums);
  const groupKeys = Object.keys(grouped);

  return (
    <div className="music-carousel-section">
      <div className="music-carousel-header">
        <div>
          <h2 className="section-title">🎵 Equip Your Match Music</h2>
          <p className="section-subtitle">Hover to explore, click to equip. Your selected music will play during matches!</p>
        </div>
        
        {(equippedAlbum || selectedAlbum) && (
          <button className="back-to-default-btn" onClick={handleBackToDefault}>
            🎵 Back to Default
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="music-loading">
          <p>Loading Albums...</p>
        </div>
      ) : albums.length === 0 ? (
        <div className="music-empty">
          <p>No albums available yet.</p>
        </div>
      ) : (
        groupKeys.map((cat) => (
          <div key={cat} className="music-category-group">
            <h3 className="music-category-title">{cat}</h3>
            <div className="music-carousel">
              {grouped[cat].map((album) => renderAlbumCard(album))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MusicCarousel;