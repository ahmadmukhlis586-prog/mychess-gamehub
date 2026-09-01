import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import ChessPiece from '../components/ChessPiece';

const EMOJI_CATALOG = [
  { id: 'thumbs up', emoji: '👍', name: 'Thumbs Up', cost_elo: 0 },
  { id: 'clap', emoji: '👏', name: 'Clap', cost_elo: 0 },
  { id: 'laugh', emoji: '😂', name: 'Laugh', cost_elo: 0 },
  { id: 'shocked', emoji: '😱', name: 'Shocked', cost_elo: 0 },
  { id: 'fire', emoji: '🔥', name: 'Fire', cost_elo: 10 },
  { id: 'skull', emoji: '💀', name: 'Skull', cost_elo: 10 },
  { id: 'bullseye', emoji: '🎯', name: 'Bullseye', cost_elo: 10 },
  { id: 'crown', emoji: '👑', name: 'Crown', cost_elo: 20 },
  { id: 'devil', emoji: '😈', name: 'Devil', cost_elo: 20 },
  { id: 'big brain', emoji: '🧠', name: 'Big Brain', cost_elo: 30 },
  { id: 'trophy', emoji: '🏆', name: 'Trophy', cost_elo: 50 },
  { id: 'diamond', emoji: '💎', name: 'Diamond', cost_elo: 100 },
];

const InventoryPage = ({ token, onClose, account }) => {
    const [inventory, setInventory] = useState([]);
    const [ownedEmojis, setOwnedEmojis] = useState([]);
    const [profileThemes, setProfileThemes] = useState([]);
    const [profileEquipped, setProfileEquipped] = useState(null);
    const [boardThemes, setBoardThemes] = useState([]);
    const [boardEquipped, setBoardEquipped] = useState(null);
    const [activeTab, setActiveTab] = useState('items');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // State for live preview
    const [previewColor, setPreviewColor] = useState('#ffffff');

    // ADDED: hover preview for profile/board theme tabs (customize menu)
    const [themePreview, setThemePreview] = useState(null);
    const [themePreviewKind, setThemePreviewKind] = useState('board');

    const showBoardThemePreview = (theme) => { setThemePreview(theme); setThemePreviewKind('board'); };
    const showProfileThemePreview = (theme) => { setThemePreview(theme); setThemePreviewKind('profile'); };

    const themeMiniBoard = (light, dark) => {
        const setup = [['r','n','b','q','k','b','n','r'], ['p','p','p','p','p','p','p','p']];
        const cells = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const isDark = (r + c) % 2 === 1;
                const letter = (r < 2) ? setup[r][c] : ((r > 5) ? setup[r - 6][c] : null);
                cells.push(
                    <div key={`${r}-${c}`} className="pth-mini-sq" style={{ background: isDark ? dark : light }}>
                        {letter && (
                            <span className="pth-mini-piece">
                                <ChessPiece color={r < 2 ? 'w' : 'b'} type={letter} />
                            </span>
                        )}
                    </div>
                );
            }
        }
        return <div className="pth-mini-board">{cells}</div>;
    };

    const themePreviewPanel = () => {
        if (!themePreview) return null;
        return (
            <div className="pth-preview-panel">
                <div>
                    <div className="pth-preview-label">MATCH / PROFILE PREVIEW</div>
                    {themePreviewKind === 'board'
                        ? themeMiniBoard(themePreview.light_sq || '#f0d9b5', themePreview.dark_sq || '#b58863')
                        : (
                            <div
                                className="pth-mini-profile"
                                style={{ background: themePreview.gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)' }}
                            >
                                <div className="pth-mini-profile-body">
                                    <div className="pth-mini-avatar">P</div>
                                    <div className="pth-mini-pname">Player</div>
                                    <div className="pth-mini-pmeta">Member since 2026</div>
                                    <div className="pth-mini-elo">
                                        <div className="pth-mini-elo-num">1200</div>
                                        <div className="pth-mini-elo-lbl">ELO RATING</div>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
                <div className="pth-preview-note">
                    {themePreviewKind === 'board'
                        ? 'How this board looks in-match. Equip to use it immediately.'
                        : 'How this background looks on your public profile. Equip to apply it.'}
                </div>
            </div>
        );
    };

    useEffect(() => {
        fetchAllInventory();
    }, []);

    const fetchAllInventory = async () => {
        setLoading(true);
        try {
            const [itemsRes, emojisRes, ptRes, btRes] = await Promise.all([
                fetch(`${API_BASE}/shop/inventory`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/emojis`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/profile-themes`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_BASE}/board-themes`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            const itemsData = await itemsRes.json();
            if (itemsData.ok) {
                setInventory((itemsData.inventory || []).filter(item => item.id && item.item_id));
            }

            const emojisData = await emojisRes.json();
            if (emojisData.ok) {
                const owned = (emojisData.owned || []).map(name => name.toLowerCase());
                setOwnedEmojis(EMOJI_CATALOG.filter(e => owned.includes(e.id.toLowerCase())));
            }

            const ptData = await ptRes.json();
            if (ptData.ok) {
                setProfileThemes(ptData.themes || []);
                setProfileEquipped(ptData.equipped?.theme_id || null);
            }

            const btData = await btRes.json();
            if (btData.ok) {
                setBoardThemes(btData.themes || []);
                setBoardEquipped(btData.equipped?.board_theme_id || null);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEquip = async (inventoryId) => {
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_BASE}/shop/equip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ inventoryId })
            });
            const data = await response.json();
            if (data.ok) {
                setMessage({ type: 'success', text: 'Item equipped! ✨' });
                await fetchAllInventory();
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to equip' });
            }
        } catch (error) {
            console.error('Equip error:', error);
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEquipProfile = async (themeId) => {
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_BASE}/profile-themes/equip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ themeId })
            });
            const data = await response.json();
            if (data.ok) {
                setProfileEquipped(themeId);
                setMessage({ type: 'success', text: 'Profile theme equipped!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to equip' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Cannot connect to server.' });
        }
        setLoading(false);
    };

    const handleEquipBoard = async (themeId) => {
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_BASE}/board-themes/equip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ themeId })
            });
            const data = await response.json();
            if (data.ok) {
                setBoardEquipped(themeId);
                setMessage({ type: 'success', text: 'Board theme equipped!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to equip' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Cannot connect to server.' });
        }
        setLoading(false);
    };

    const handleResetToDefault = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const response = await fetch(`${API_BASE}/shop/unequip-all`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.ok) {
                setMessage({ type: 'success', text: 'All items unequipped. Back to default! ✨' });
                await fetchAllInventory();
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to reset' });
            }
        } catch (error) {
            console.error('Reset error:', error);
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const invTabs = [
        { id: 'items', label: '♟ Items' },
        { id: 'emojis', label: '😄 Reactions' },
        { id: 'profile', label: '🎨 Profile' },
        { id: 'board', label: '🎯 Board' },
    ];

    const triggerPreview = (item) => {
        if (item.category === 'piece') {
            const color = item.preview_data?.color || '#ffffff';
            setPreviewColor(color);
        }
    };

    const getCategoryEmoji = (category) => {
        const emojis = {
            piece: '♟️',
            board: '🎯',
            effect: '✨',
            name_color: '🎨',
            avatar_frame: '🖼️'
        };
        return emojis[category] || '📦';
    };

    return (
        <div className="shop-overlay">
            <button className="shop-close-btn" onClick={onClose}>← Back</button>

            <button 
                className="reset-default-btn" 
                onClick={handleResetToDefault}
                disabled={loading}
            >
                ♻️ Back to Default
            </button>
            
            <div className="shop-page">
                <div className="shop-header">
                    <div className="shop-title">
                        <h1>🎨 My Inventory</h1>
                        <p>Equip your purchased items to customize your game!</p>
                    </div>
                </div>

                {message && (
                    <div className={`shop-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="shop-main-tabs">
                    {invTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`shop-main-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* LIVE PIECE PREVIEW SECTION (only for items tab) */}
                {activeTab === 'items' && (
                    <div className="inventory-preview-section">
                        <h2 className="preview-title">🔮 Live Piece Preview</h2>
                        <p className="preview-subtitle">Hover or click on a piece skin to see your army!</p>
                        
                        <div className="preview-board">
                            <div className="preview-row">
                                <span className="preview-piece"><ChessPiece color="b" type="r" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece"><ChessPiece color="b" type="n" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece"><ChessPiece color="b" type="b" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece" style={{ transform: 'scale(1.15)' }}><ChessPiece color="b" type="q" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece" style={{ transform: 'scale(1.1)' }}><ChessPiece color="b" type="k" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece"><ChessPiece color="b" type="b" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece"><ChessPiece color="b" type="n" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                <span className="preview-piece"><ChessPiece color="b" type="r" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                            </div>
                            <div className="preview-row pawn-row">
                                {[...Array(8)].map((_, i) => (
                                    <span key={i} className="preview-piece"><ChessPiece color="b" type="p" tint={previewColor !== '#ffffff' ? previewColor : undefined} /></span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ITEMS TAB */}
                {activeTab === 'items' && (
                    <div className="shop-items">
                        {loading ? (
                            <div className="loading-spinner">Loading Inventory...</div>
                        ) : inventory.length === 0 ? (
                            <div className="empty-shop">
                                {message?.type === 'error' ? '⚠️ ' + message.text : "You haven't bought anything yet. Visit the Shop!"}
                            </div>
                        ) : (
                            inventory.map(item => {
                                const isEquipped = item.is_equipped === true;
                                return (
                                    <div 
                                        key={item.id} 
                                        className={`shop-item ${isEquipped ? 'owned' : ''} rarity-${item.rarity}`}
                                        onMouseEnter={() => triggerPreview(item)}
                                    >
                                        <div className="item-icon">{getCategoryEmoji(item.category)}</div>
                                        <div className="item-info">
                                            <h3>{item.name}</h3>
                                            <p>{item.description}</p>
                                            <div className="item-meta">
                                                <span className="item-category">{item.category}</span>
                                                {isEquipped && <span className="item-equipped">⚡ Equipped</span>}
                                            </div>
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                className={`equip-btn ${isEquipped ? 'equipped' : ''}`}
                                                onClick={() => handleEquip(item.id)}
                                                disabled={loading || isEquipped}
                                            >
                                                {isEquipped ? '✓ Equipped' : 'Equip'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* EMOJIS TAB */}
                {activeTab === 'emojis' && (
                    <div className="shop-items">
                        {loading ? (
                            <div className="loading-spinner">Loading...</div>
                        ) : ownedEmojis.length === 0 ? (
                            <div className="empty-shop">No reactions bought yet. Visit the Shop!</div>
                        ) : (
                            ownedEmojis.map(item => (
                                <div key={item.id} className="shop-item owned">
                                    <div className="item-icon" style={{ fontSize: 36 }}>{item.emoji}</div>
                                    <div className="item-info">
                                        <h3>{item.name}</h3>
                                        <div className="item-meta">
                                            <span className="item-category">Reaction</span>
                                            <span className="item-equipped">✓ Owned</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* PROFILE THEMES TAB */}
                {activeTab === 'profile' && (
                    <div className="shop-items">
                        {loading ? (
                            <div className="loading-spinner">Loading...</div>
                        ) : profileThemes.length === 0 ? (
                            <div className="empty-shop">No profile themes available.</div>
                        ) : (
                            profileThemes.filter(theme => theme.cost_elo === 0 || theme.id === profileEquipped).map(theme => {
                                const equipped = profileEquipped === theme.id;
                                return (
                                    <div key={theme.id}
                                        className={`shop-item ${equipped ? 'owned' : ''}`}
                                        onMouseEnter={() => showProfileThemePreview(theme)}
                                        onMouseLeave={() => setThemePreview(null)}>
                                        <div className="item-icon">
                                            <div style={{ width: 60, height: 40, borderRadius: 8, background: theme.gradient || 'linear-gradient(135deg,#1a1a2e,#16213e)' }} />
                                        </div>
                                        <div className="item-info">
                                            <h3>{theme.name}</h3>
                                            <div className="item-meta">
                                                <span className="item-category">Profile Theme</span>
                                                {equipped && <span className="item-equipped">⚡ Equipped</span>}
                                            </div>
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                className={`equip-btn ${equipped ? 'equipped' : ''}`}
                                                onClick={() => handleEquipProfile(theme.id)}
                                                disabled={loading || equipped}
                                            >
                                                {equipped ? '✓ Equipped' : 'Equip'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {themePreviewPanel()}
                    </div>
                )}

                {/* BOARD THEMES TAB */}
                {activeTab === 'board' && (
                    <div className="shop-items">
                        {loading ? (
                            <div className="loading-spinner">Loading...</div>
                        ) : boardThemes.length === 0 ? (
                            <div className="empty-shop">No board themes available.</div>
                        ) : (
                            boardThemes.filter(theme => theme.cost_elo === 0 || theme.id === boardEquipped).map(theme => {
                                const equipped = boardEquipped === theme.id;
                                return (
                                    <div key={theme.id}
                                        className={`shop-item ${equipped ? 'owned' : ''}`}
                                        onMouseEnter={() => showBoardThemePreview(theme)}
                                        onMouseLeave={() => setThemePreview(null)}>
                                        <div className="item-icon">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', width: 44, height: 44, borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ backgroundColor: theme.light_sq || '#f0d9b5' }} />
                                                <div style={{ backgroundColor: theme.dark_sq || '#b58863' }} />
                                                <div style={{ backgroundColor: theme.dark_sq || '#b58863' }} />
                                                <div style={{ backgroundColor: theme.light_sq || '#f0d9b5' }} />
                                            </div>
                                        </div>
                                        <div className="item-info">
                                            <h3>{theme.name}</h3>
                                            <div className="item-meta">
                                                <span className="item-category">Board Theme</span>
                                                {equipped && <span className="item-equipped">⚡ Equipped</span>}
                                            </div>
                                        </div>
                                        <div className="item-actions">
                                            <button
                                                className={`equip-btn ${equipped ? 'equipped' : ''}`}
                                                onClick={() => handleEquipBoard(theme.id)}
                                                disabled={loading || equipped}
                                            >
                                                {equipped ? '✓ Equipped' : 'Equip'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {themePreviewPanel()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InventoryPage;