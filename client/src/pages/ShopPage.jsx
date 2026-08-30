import React, { useState, useEffect } from 'react';
import './ShopPage.css';
import { API_BASE } from '../config';
import EmojiShop from '../components/EmojiShop';
import ProfileThemes from '../components/ProfileThemes';
import TiltCard from '../components/TiltCard';
import PurchaseCelebration from '../components/PurchaseCelebration';
import { playPurchaseSound } from '../helpers';

const ShopPage = ({ account, token, onClose, onEloUpdate }) => {
    const [items, setItems] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [currency, setCurrency] = useState({ gems: 0 });
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [celebrationItem, setCelebrationItem] = useState(null);

    const categories = [
        { id: 'all', label: 'All' },
        { id: 'piece', label: '♟ Pieces' },
        { id: 'board', label: '🎯 Boards' },
        { id: 'effect', label: '✨ Effects' },
        { id: 'name_color', label: '🎨 Name Colors' },
        { id: 'avatar_frame', label: '🖼 Frames' }
    ];

    const shopTabs = [
        { id: 'items', label: '🛒 Items' },
        { id: 'reactions', label: '😄 Reactions' },
        { id: 'themes', label: '🎨 Themes' }
    ];

    const [activeShopTab, setActiveShopTab] = useState('items');

    useEffect(() => {
        fetchData();
    }, [selectedCategory]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // ✅ FIXED: Use API_BASE instead of hardcoded localhost
            const itemsRes = await fetch(
                `${API_BASE}/shop/items${selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const itemsData = await itemsRes.json();
            if (itemsData.ok) setItems(itemsData.items);

            const invRes = await fetch(`${API_BASE}/shop/inventory`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const invData = await invRes.json();
            if (invData.ok) setInventory(invData.inventory);

            const curRes = await fetch(`${API_BASE}/currency`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const curData = await curRes.json();
            if (curData.ok) setCurrency(curData.currency);
        } catch (error) {
            console.error('Error fetching shop data:', error);
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (itemId, price, itemData = null) => {
        if (currency.gems < price) {
            setMessage({ type: 'error', text: 'Not enough gems!' });
            return;
        }

        setLoading(true);
        try {
            // ✅ FIXED: Use API_BASE
            const response = await fetch(`${API_BASE}/shop/purchase`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ itemId })
            });
            const data = await response.json();
            if (data.ok) {
                playPurchaseSound();
                setCelebrationItem(itemData || { name: 'Item', icon: '🎁', rarity: 'common' });
                setMessage({ type: 'success', text: 'Item purchased successfully! 🎉' });
                await fetchData();
            } else {
                setMessage({ type: 'error', text: data.message || 'Purchase failed' });
            }
        } catch (error) {
            console.error('Purchase error:', error);
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleEquip = async (inventoryId) => {
        setLoading(true);
        try {
            // ✅ FIXED: Use API_BASE
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
                await fetchData();
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

    const getRarityColor = (rarity) => {
        const colors = {
            common: '#8a8a8a',
            uncommon: '#4ade80',
            rare: '#3b82f6',
            epic: '#8b5cf6',
            legendary: '#f59e0b'
        };
        return colors[rarity] || '#8a8a8a';
    };

    const getRarityLabel = (rarity) => {
        return rarity.charAt(0).toUpperCase() + rarity.slice(1);
    };

    const getCategoryEmoji = (category) => {
        const emojis = {
            piece: '♟',
            board: '🎯',
            effect: '✨',
            name_color: '🎨',
            avatar_frame: '🖼'
        };
        return emojis[category] || '📦';
    };

    return (
        <>
        <div className="shop-overlay">
            <button className="shop-close-btn" onClick={onClose}>← Back</button>

            <div className="shop-page">
                <div className="shop-header">
                    <div className="shop-title">
                        <h1>🛒 MYCHESS Shop</h1>
                        <p>Customize your chess experience!</p>
                    </div>
                    <div className="currency-display">
                        <div className="currency-gems">
                            💎 {currency.gems} ELO
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`shop-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="shop-main-tabs">
                    {shopTabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`shop-main-tab-btn ${activeShopTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveShopTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeShopTab === 'items' && (
                    <>
                        <div className="shop-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        <div className="shop-items">
                    {loading ? (
                        <div className="loading-spinner">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="empty-shop">
                            {message?.type === 'error' ? '⚠️ ' + message.text : 'No items available'}
                        </div>
                    ) : (
                        items.map(item => {
                            const isOwned = item.owned;
                            const isEquipped = item.equipped;
                            
                            return (
                                <TiltCard key={item.id}>
                                <div 
                                    className={`shop-item ${isOwned ? 'owned' : ''} rarity-${item.rarity}`}
                                    style={{ borderColor: getRarityColor(item.rarity) }}
                                >
                                    <div className="item-rarity" style={{ color: getRarityColor(item.rarity) }}>
                                        {getRarityLabel(item.rarity)}
                                    </div>
                                    <div className="item-icon">
                                        {getCategoryEmoji(item.category)}
                                        {item.preview_data?.glow && <div className="glow-effect" />}
                                        {item.preview_data?.particles && <div className="particles-effect" />}
                                    </div>
                                    <div className="item-info">
                                        <h3>{item.name}</h3>
                                        <p>{item.description}</p>
                                        <div className="item-meta">
                                            <span className="item-category">{item.category}</span>
                                            {!isOwned && (
                                                <span className="item-price">💎 {item.price}</span>
                                            )}
                                            {isOwned && (
                                                <span className="item-owned">✓ Owned</span>
                                            )}
                                            {isEquipped && (
                                                <span className="item-equipped">⚡ Equipped</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="item-actions">
                                        {!isOwned ? (
                                            <button
                                                className="purchase-btn"
                                                onClick={() => handlePurchase(item.id, item.price, item)}
                                                disabled={loading || currency.gems < item.price}
                                            >
                                                {currency.gems < item.price ? 'Need more gems' : 'Purchase'}
                                            </button>
                                        ) : (
                                            <button
                                                className={`equip-btn ${isEquipped ? 'equipped' : ''}`}
                                                onClick={() => handleEquip(item.inventoryId)}
                                                disabled={loading || isEquipped}
                                            >
                                                {isEquipped ? '✓ Equipped' : 'Equip'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                </TiltCard>
                            );
                        })
                    )}
                </div>
                    </>
                )}

                {activeShopTab === 'reactions' && (
                    <div className="shop-section-panel">
                        <EmojiShop token={token} onEloUpdate={onEloUpdate} />
                    </div>
                )}

                {activeShopTab === 'themes' && (
                    <div className="shop-section-panel">
                        <ProfileThemes token={token} onEloUpdate={onEloUpdate} />
                    </div>
                )}
            </div>
        </div>

        <PurchaseCelebration
            item={celebrationItem}
            visible={!!celebrationItem}
            onComplete={() => setCelebrationItem(null)}
        />
    </>
    );
};

export default ShopPage;