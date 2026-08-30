import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const LOOT_BOXES = [
  { id: 'bronze', name: 'Bronze Crate', icon: '📦', rarity: 'common', price: 50 },
  { id: 'silver', name: 'Silver Crate', icon: '🎁', rarity: 'rare', price: 150 },
  { id: 'gold', name: 'Gold Crate', icon: '🏆', rarity: 'epic', price: 400 },
  { id: 'diamond', name: 'Diamond Crate', icon: '💎', rarity: 'legendary', price: 1000 },
];

const RARITY_COLORS = {
  common: '#9e9e9e',
  rare: '#2196f3',
  epic: '#9c27b0',
  legendary: '#ffd700',
};

const STYLES = {
  container: {
    padding: '24px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#e0d6ff',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  shopGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '40px',
  },
  card: {
    background: 'rgba(15,10,28,0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(139,92,246,0.2)',
    borderRadius: '16px',
    padding: '24px 16px',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    transition: 'transform 0.2s, border-color 0.3s',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    border: '1px solid rgba(139,92,246,0.5)',
  },
  icon: {
    fontSize: '48px',
    marginBottom: '12px',
    display: 'block',
  },
  name: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '8px',
  },
  rarityBadge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  price: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#a78bfa',
    marginBottom: '14px',
  },
  buyBtn: {
    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    width: '100%',
  },
  ownedGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  ownedCard: {
    background: 'rgba(15,10,28,0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(139,92,246,0.15)',
    borderRadius: '12px',
    padding: '16px 12px',
    textAlign: 'center',
    position: 'relative',
  },
  openBtn: {
    background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 20px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'opacity 0.2s',
  },
  rewardOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  rewardCard: {
    background: 'rgba(15,10,28,0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '40px 56px',
    textAlign: 'center',
    border: '2px solid rgba(139,92,246,0.4)',
    animation: 'lb-reveal 0.4s ease-out forwards',
    minWidth: '280px',
  },
  rewardValue: {
    fontSize: '42px',
    fontWeight: '800',
    marginTop: '8px',
    marginBottom: '4px',
  },
  rewardLabel: {
    fontSize: '14px',
    color: '#a5a0b5',
  },
  rewardName: {
    fontSize: '18px',
    color: '#e0d6ff',
    fontWeight: '600',
    marginTop: '10px',
  },
  emptyText: {
    color: '#6b6580',
    fontStyle: 'italic',
    fontSize: '14px',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '100%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
    pointerEvents: 'none',
  },
};

const CSS_KEYFRAMES = `
@keyframes lb-shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  10% { transform: translateX(-8px) rotate(-3deg); }
  20% { transform: translateX(8px) rotate(3deg); }
  30% { transform: translateX(-6px) rotate(-2deg); }
  40% { transform: translateX(6px) rotate(2deg); }
  50% { transform: translateX(-4px) rotate(-1deg); }
  60% { transform: translateX(4px) rotate(1deg); }
  70% { transform: translateX(-2px) rotate(0); }
  80% { transform: translateX(2px) rotate(0); }
  90% { transform: translateX(-1px) rotate(0); }
}
@keyframes lb-flash {
  0% { opacity: 0; }
  15% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes lb-reveal {
  0% { transform: scale(0.5); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes lb-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px var(--glow-color); }
  50% { box-shadow: 0 0 40px var(--glow-color), 0 0 60px var(--glow-color); }
}
.lb-shaking {
  animation: lb-shake 1s ease-in-out;
}
.lb-flashing::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #fff;
  animation: lb-flash 0.5s ease-out forwards;
  pointer-events: none;
  z-index: 5;
  border-radius: inherit;
}
`;

function injectStyles() {
  if (document.getElementById('lb-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'lb-keyframes';
  style.textContent = CSS_KEYFRAMES;
  document.head.appendChild(style);
}

export default function LootBox({ token, onEloUpdate }) {
  const [boxes, setBoxes] = useState([]);
  const [owned, setOwned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);
  const [lastReward, setLastReward] = useState(null);
  const [showReward, setShowReward] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  useEffect(() => {
    injectStyles();
    fetchBoxes();
  }, []);

  const fetchBoxes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/loot-boxes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) {
        setBoxes(data.boxes || []);
        setOwned(data.owned || []);
      }
    } catch (err) {
      console.error('Failed to fetch loot boxes:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleBuy = useCallback(async (boxId) => {
    try {
      const res = await fetch(`${API_BASE}/api/loot-boxes/buy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lootBoxId: boxId }),
      });
      const data = await res.json();
      if (data.ok) {
        if (onEloUpdate && data.newElo !== undefined) {
          onEloUpdate(data.newElo);
        }
        await fetchBoxes();
      }
    } catch (err) {
      console.error('Failed to buy loot box:', err);
    }
  }, [token, onEloUpdate, fetchBoxes]);

  const handleOpen = useCallback(async (userBoxId) => {
    if (openingId) return;
    setOpeningId(userBoxId);
    setLastReward(null);
    setShowReward(false);

    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/loot-boxes/open`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userBoxId }),
        });
        const data = await res.json();
        if (data.ok) {
          if (onEloUpdate && data.newElo !== undefined) {
            onEloUpdate(data.newElo);
          }
          setLastReward(data.reward);
          setShowReward(true);
          setTimeout(() => {
            setShowReward(false);
            setLastReward(null);
            setOpeningId(null);
            fetchBoxes();
          }, 3000);
        } else {
          setOpeningId(null);
        }
      } catch (err) {
        console.error('Failed to open loot box:', err);
        setOpeningId(null);
      }
    }, 1200);
  }, [openingId, token, onEloUpdate, fetchBoxes]);

  const getOwnedCount = useCallback((boxId) => {
    return owned.filter((o) => o.lootBoxId === boxId || o.boxId === boxId).length;
  }, [owned]);

  if (loading) {
    return (
      <div style={STYLES.container}>
        <div style={{ ...STYLES.emptyText, textAlign: 'center', padding: '40px' }}>
          Loading loot boxes...
        </div>
      </div>
    );
  }

  return (
    <div style={STYLES.container}>
      <h2 style={STYLES.sectionTitle}>Loot Box Shop</h2>

      <div style={STYLES.shopGrid}>
        {LOOT_BOXES.map((box) => (
          <div
            key={box.id}
            className="lb-shop-card"
            style={{
              ...STYLES.card,
              ...(hoveredCard === box.id ? STYLES.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(box.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={STYLES.shimmer} />
            <span style={STYLES.icon}>{box.icon}</span>
            <div style={STYLES.name}>{box.name}</div>
            <span
              style={{
                ...STYLES.rarityBadge,
                background: `${RARITY_COLORS[box.rarity]}22`,
                color: RARITY_COLORS[box.rarity],
                border: `1px solid ${RARITY_COLORS[box.rarity]}55`,
              }}
            >
              {box.rarity}
            </span>
            <div style={STYLES.price}>{box.price} ELO</div>
            {getOwnedCount(box.id) > 0 && (
              <div style={{ fontSize: '12px', color: '#6b6580', marginBottom: '10px' }}>
                Owned: {getOwnedCount(box.id)}
              </div>
            )}
            <button
              style={STYLES.buyBtn}
              onClick={() => handleBuy(box.id)}
              onMouseDown={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Buy
            </button>
          </div>
        ))}
      </div>

      <h2 style={STYLES.sectionTitle}>Your Crates</h2>

      {owned.length === 0 ? (
        <div style={STYLES.emptyText}>No unopened crates. Visit the shop above to buy some!</div>
      ) : (
        <div style={STYLES.ownedGrid}>
          {owned.map((item) => {
            const boxDef = LOOT_BOXES.find(
              (b) => b.id === item.lootBoxId || b.id === item.boxId
            );
            const isOpening = openingId === item.id;
            const shimmerColor = boxDef ? RARITY_COLORS[boxDef.rarity] : '#7c3aed';

            return (
              <div
                key={item.id}
                className={`lb-owned-card ${isOpening ? 'lb-shaking lb-flashing' : ''}`}
                style={{
                  ...STYLES.ownedCard,
                  ...(isOpening
                    ? {
                        '--glow-color': shimmerColor,
                        boxShadow: `0 0 20px ${shimmerColor}44`,
                      }
                    : {}),
                }}
              >
                <span style={{ fontSize: '36px', display: 'block', marginBottom: '8px' }}>
                  {boxDef ? boxDef.icon : '📦'}
                </span>
                <div style={STYLES.name}>
                  {boxDef ? boxDef.name : 'Unknown Crate'}
                </div>
                <button
                  style={{
                    ...STYLES.openBtn,
                    opacity: isOpening ? 0.5 : 1,
                    cursor: isOpening ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isOpening}
                  onClick={() => handleOpen(item.id)}
                >
                  {isOpening ? 'Opening...' : 'Open'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showReward && lastReward && (
        <div style={STYLES.rewardOverlay}>
          <div
            className="lb-reveal"
            style={{
              ...STYLES.rewardCard,
              borderColor: `${RARITY_COLORS[lastReward.rarity] || '#7c3aed'}88`,
              boxShadow: `0 0 30px ${RARITY_COLORS[lastReward.rarity] || '#7c3aed'}33, 0 0 60px ${RARITY_COLORS[lastReward.rarity] || '#7c3aed'}11`,
            }}
          >
            <div style={{ fontSize: '56px', marginBottom: '8px' }}>
              {lastReward.type === 'elo' ? '✨' : '🎁'}
            </div>
            <div
              style={{
                ...STYLES.rewardValue,
                color: RARITY_COLORS[lastReward.rarity] || '#a78bfa',
                textShadow: `0 0 20px ${RARITY_COLORS[lastReward.rarity] || '#7c3aed'}66`,
              }}
            >
              {lastReward.type === 'elo'
                ? `+${lastReward.value} ELO`
                : lastReward.name}
            </div>
            {lastReward.type !== 'elo' && lastReward.value && (
              <div
                style={{
                  ...STYLES.rewardValue,
                  fontSize: '24px',
                  color: RARITY_COLORS[lastReward.rarity] || '#a78bfa',
                }}
              >
                +{lastReward.value} ELO
              </div>
            )}
            <div style={STYLES.rewardLabel}>
              <span
                style={{
                  color: RARITY_COLORS[lastReward.rarity] || '#a78bfa',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                }}
              >
                {lastReward.rarity}
              </span>
              {' '}reward
            </div>
            {lastReward.name && lastReward.type !== 'elo' && (
              <div style={STYLES.rewardName}>{lastReward.name}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
