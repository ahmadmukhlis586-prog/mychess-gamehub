import React, { useState, useEffect } from 'react';
import { playClickSound } from '../helpers';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const MatchCosmeticsPanel = ({ token }) => {
  const [banners, setBanners] = useState([]);
  const [equipped, setEquipped] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [bannersRes, equippedRes] = await Promise.all([
          fetch(`${API_BASE}/entrance/themes`),
          fetch(`${API_BASE}/entrance/equipped`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [bannersData, equippedData] = await Promise.all([
          bannersRes.json(),
          equippedRes.json(),
        ]);
        if (!mounted) return;
        if (bannersData.ok) setBanners(bannersData.themes || []);
        if (equippedData.ok) setEquipped(equippedData.theme);
      } catch (e) {
        console.error('Entrance banners load error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  const handleBanner = async (banner) => {
    playClickSound();
    const isEquipped = equipped?.id === banner.id;
    if (isEquipped) {
      setEquipped(null);
      await fetch(`${API_BASE}/entrance/unequip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } else {
      setEquipped(banner);
      await fetch(`${API_BASE}/entrance/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: banner.id }),
      }).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <section className="mc-panel">
      <div className="mc-section">
        <div className="mc-header">
          <h2>🎪 Entrance Banners</h2>
          <p>Pick your entrance flex. When a match starts, both players see this banner drop — no sound, pure style. Click a banner to equip it.</p>
        </div>
        {banners.length === 0 ? (
          <div className="mc-empty">No entrance banners available yet.</div>
        ) : (
          <div className="mc-grid">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className={`mc-card mc-theme ${equipped?.id === banner.id ? 'selected' : ''}`}
                style={{ '--ent-glow': banner.glow_hex || '#a855f7' }}
                onClick={() => handleBanner(banner)}
              >
                <span className="mc-emoji">{banner.emoji || '⚡'}</span>
                <div className="mc-meta">
                  <strong>{banner.name}</strong>
                  <em className={`mc-rarity r-${banner.rarity || 'common'}`}>{banner.rarity || 'common'}</em>
                </div>
                <div className="mc-tagline">{banner.tagline || ''}</div>
                {equipped?.id === banner.id && <div className="mc-badge">✓ EQUIPPED</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MatchCosmeticsPanel;