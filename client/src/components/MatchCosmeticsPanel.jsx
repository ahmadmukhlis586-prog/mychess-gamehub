import React, { useState, useEffect } from 'react';
import { playClickSound } from '../helpers';
import { API_BASE, TOKEN_KEY } from '../config';
import './match_cosmetics.css';

const MatchCosmeticsPanel = ({ token }) => {
  const [trails, setTrails] = useState([]);
  const [equippedTrail, setEquippedTrail] = useState(null);
  const [themes, setThemes] = useState([]);
  const [equippedTheme, setEquippedTheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [trailsRes, equippedTrailRes, themesRes, equippedThemeRes] = await Promise.all([
          fetch(`${API_BASE}/trails`),
          fetch(`${API_BASE}/trails/equipped`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/entrance/themes`),
          fetch(`${API_BASE}/entrance/equipped`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const [trailsData, equippedTrailData, themesData, equippedThemeData] = await Promise.all([
          trailsRes.json(),
          equippedTrailRes.json(),
          themesRes.json(),
          equippedThemeRes.json(),
        ]);
        if (!mounted) return;
        if (trailsData.ok) setTrails(trailsData.trails || []);
        if (equippedTrailData.ok) setEquippedTrail(equippedTrailData.trail);
        if (themesData.ok) setThemes(themesData.themes || []);
        if (equippedThemeData.ok) setEquippedTheme(equippedThemeData.theme);
      } catch (e) {
        console.error('Match cosmetics load error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [token]);

  const handleTrail = async (trail) => {
    playClickSound();
    const isEquipped = equippedTrail?.id === trail.id;
    if (isEquipped) {
      setEquippedTrail(null);
      await fetch(`${API_BASE}/trails/unequip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } else {
      setEquippedTrail(trail);
      await fetch(`${API_BASE}/trails/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trailId: trail.id }),
      }).catch(() => {});
    }
  };

  const handleTheme = async (theme) => {
    playClickSound();
    const isEquipped = equippedTheme?.id === theme.id;
    if (isEquipped) {
      setEquippedTheme(null);
      await fetch(`${API_BASE}/entrance/unequip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    } else {
      setEquippedTheme(theme);
      await fetch(`${API_BASE}/entrance/equip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id }),
      }).catch(() => {});
    }
  };

  if (loading) return null;

  return (
    <section className="mc-panel">
      <div className="mc-section">
        <div className="mc-header">
          <h2>✨ Move Trails</h2>
          <p>Your last move leaves a glowing comet streak across the board. Same rarity/equip pattern as your music albums — click to equip for live matches.</p>
        </div>
        {trails.length === 0 ? (
          <div className="mc-empty">No move trails available yet.</div>
        ) : (
          <div className="mc-grid">
            {trails.map((trail) => (
              <div
                key={trail.id}
                className={`mc-card ${equippedTrail?.id === trail.id ? 'selected' : ''}`}
                onClick={() => handleTrail(trail)}
              >
                <div className="mc-swatch" style={{ background: `linear-gradient(135deg, ${trail.color_hex || '#c084fc'}, ${trail.glow_hex || '#7c3aed'})` }}>
                  🛤️
                </div>
                <div className="mc-meta">
                  <strong>{trail.name}</strong>
                  <em className={`mc-rarity r-${trail.rarity || 'common'}`}>{trail.rarity || 'common'}</em>
                </div>
                {equippedTrail?.id === trail.id && <div className="mc-badge">✓ EQUIPPED</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mc-section">
        <div className="mc-header">
          <h2>🎪 Entrance Themes</h2>
          <p>Pick a flex. When a match starts, your entrance theme plays and both players see your entrance banner!</p>
        </div>
        {themes.length === 0 ? (
          <div className="mc-empty">No entrance themes available yet.</div>
        ) : (
          <div className="mc-grid">
            {themes.map((theme) => (
              <div
                key={theme.id}
                className={`mc-card mc-theme ${equippedTheme?.id === theme.id ? 'selected' : ''}`}
                onClick={() => handleTheme(theme)}
              >
                <span className="mc-emoji">{theme.emoji || '⚡'}</span>
                <div className="mc-meta">
                  <strong>{theme.name}</strong>
                  <em className={`mc-rarity r-${theme.rarity || 'common'}`}>{theme.rarity || 'common'}</em>
                </div>
                <div className="mc-tagline">{theme.tagline || ''}</div>
                {equippedTheme?.id === theme.id && <div className="mc-badge">✓ EQUIPPED</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MatchCosmeticsPanel;