import React, { useState, useEffect } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';

const QuestsPage = ({ onClose, onAccountUpdate }) => {
    const [quests, setQuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [account, setAccount] = useState(null);
    const [claimingId, setClaimingId] = useState(null);

    useEffect(() => {
        fetchQuests();
        fetchAccount();
    }, []);

    const fetchQuests = async () => {
        try {
            const storedToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/quests`, {
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${storedToken}` 
                }
            });
            const data = await response.json();
            if (data.ok) {
                setQuests(data.quests || []);
                setMessage(null);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to load quests' });
                setQuests([]);
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Cannot connect to server. Please check your connection.' });
            setQuests([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccount = async () => {
        try {
            const storedToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${storedToken}` }
            });
            const data = await response.json();
            if (data.ok) setAccount(data.account);
        } catch (error) {}
    };

    const handleClaim = async (questId) => {
        if (claimingId) return;
        setClaimingId(questId);
        try {
            const storedToken = localStorage.getItem(TOKEN_KEY);
            const response = await fetch(`${API_BASE}/quests/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${storedToken}`
                },
                body: JSON.stringify({ questId })
            });
            const data = await response.json();
            if (data.ok) {
                setMessage({ type: 'success', text: data.message || 'Reward claimed!' });
                await fetchQuests();
                await fetchAccount();
                if (onAccountUpdate) onAccountUpdate();
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to claim reward' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Cannot connect to server. Please try again.' });
        }
        setClaimingId(null);
    };

    const getQuestIcon = (questType) => {
        const icons = {
            'first_win': '🏆',
            'play_5_games': '🎮',
            'play_games': '🎮',
            'win_games': '🏅',
            'capture_10_pieces': '⚔️',
            'capture_pieces': '⚔️'
        };
        return icons[questType] || '📜';
    };

    return (
        <div className="shop-overlay">
            <button className="shop-close-btn" onClick={onClose}>← Back</button>
            
            <div className="shop-page">
                <div className="shop-header">
                    <div className="shop-title">
                        <h1>📜 Missions & Quests</h1>
                        <p>Complete objectives to earn ELO rewards!</p>
                    </div>
                    {account && (
                        <div className="currency-gems">⭐ {account.elo || 0} ELO</div>
                    )}
                </div>

                {message && (
                    <div className={`shop-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="shop-items">
                    {loading ? (
                        <div className="loading-spinner">Loading Quests...</div>
                    ) : quests.length === 0 ? (
                        <div className="empty-shop">
                            {message?.type === 'error' 
                                ? '⚠️ ' + message.text 
                                : 'No quests available. Please check back later!'}
                        </div>
                    ) : (
                        quests.map(quest => {
                            const progress = quest.progress || 0;
                            const completed = quest.completed || false;
                            const claimed = quest.claimed || false;
                            const progressPercent = Math.min((progress / quest.goal) * 100, 100);

                            return (
                                <div 
                                    key={quest.id} 
                                    className={`shop-item ${completed ? 'owned' : ''}`}
                                    style={{ borderColor: completed ? '#34d399' : 'rgba(168,85,247,0.2)' }}
                                >
                                    <div className="item-icon">
                                        {getQuestIcon(quest.quest_type)}
                                    </div>
                                    <div className="item-info">
                                        <h3>{quest.quest_name || 'Unnamed Quest'}</h3>
                                        <p>{quest.description || 'Complete this quest to earn rewards!'}</p>
                                        
                                        <div style={{
                                            width: '100%',
                                            height: '8px',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '5px',
                                            margin: '10px 0',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${progressPercent}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #a855f7, #ec4899)',
                                                borderRadius: '5px',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                        
                                        <div className="item-meta">
                                            <span className="item-category">Progress: {progress}/{quest.goal || 1}</span>
                                            <span className="item-price">+{quest.reward_elo || 0} ELO</span>
                                        </div>
                                    </div>
                                    <div className="item-actions">
                                        {!completed ? (
                                            <button className="purchase-btn" disabled>
                                                In Progress
                                            </button>
                                        ) : !claimed ? (
                                            <button 
                                                className="purchase-btn" 
                                                onClick={() => handleClaim(quest.id)}
                                                disabled={claimingId === quest.id}
                                                style={{ background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                                            >
                                                {claimingId === quest.id ? 'Claiming...' : '🎁 Claim Reward!'}
                                            </button>
                                        ) : (
                                            <button className="equip-btn equipped" disabled>
                                                ✓ Claimed
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuestsPage;
