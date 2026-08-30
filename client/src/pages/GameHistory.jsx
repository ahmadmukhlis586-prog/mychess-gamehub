import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config'; // ✅ ADD THIS IMPORT

const GameHistory = ({ token, onBack }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        setError('');
        try {
            // ✅ FIXED: Use API_BASE
            const response = await fetch(`${API_BASE}/games/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.ok) {
                setGames(data.games || []);
            } else {
                setError(data.message || 'Failed to load history');
            }
        } catch (err) {
            console.error('History fetch error:', err);
            setError('Cannot connect to server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-MY', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="mychess-home-page">
            <div className="floating-bg">
                <div className="circle-node circle-1"></div>
                <div className="circle-node circle-2"></div>
                <div className="circle-node circle-3"></div>
                <div className="circle-node circle-4"></div>
                <div className="circle-node circle-5"></div>
                <div className="circle-node circle-6"></div>
                <div className="circle-node circle-7"></div>
                <div className="circle-node circle-8"></div>
                <div className="circle-node circle-9"></div>
                <div className="circle-node circle-10"></div>
            </div>

            <header className="mychess-home-header">
                <div className="mychess-home-brand">
                    <div className="mychess-logo-mark">♞</div>
                    <div>
                        <div className="mychess-brand">MYCHESS</div>
                        <div className="mychess-brand-subtitle">GAME HISTORY</div>
                    </div>
                </div>

                <div className="mychess-user-area">
                    <button onClick={onBack} className="mychess-home-logout">
                        ← Back to Dashboard
                    </button>
                </div>
            </header>

            <main className="mychess-home-main" style={{ maxWidth: '1000px' }}>
                <div className="mychess-home-hero" style={{ marginBottom: '30px' }}>
                    <div className="mychess-home-eyebrow">MATCH LOGS</div>
                    <h1>Your Game History</h1>
                    <p>Review all of your previous matches, dates, opponents and scores.</p>
                </div>

                {loading && (
                    <div className="mychess-elo-card">
                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>Loading your games...</p>
                    </div>
                )}

                {error && (
                    <div className="mychess-message error" style={{ marginBottom: '20px' }}>
                        {error}
                    </div>
                )}

                {!loading && !error && games.length === 0 && (
                    <div className="mychess-elo-card">
                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>No games found yet. Go play a match!</p>
                    </div>
                )}

                <div className="game-history-list">
                    {games.map((game) => (
                        <div key={game.id} className="game-history-card">
                            <div className="game-history-header">
                                <div>
                                    <span className="game-date">
                                        📅 {formatDate(game.date)} at {formatTime(game.date)}
                                    </span>
                                    <span className="game-room">
                                        Room: #{game.roomId}
                                    </span>
                                </div>
                                <span className={`game-result ${game.result === 'draw' ? 'draw' : ''}`}>
                                    {game.result === 'draw' ? 'Draw' : (game.playerScore === 1 ? 'Victory' : 'Defeat')}
                                </span>
                            </div>

                            <div className="game-history-body">
                                <div className="game-opponent">
                                    <strong>Opponent:</strong> {game.opponent}
                                </div>
                                <div className="game-score">
                                    <strong>Your Score:</strong> {game.playerScore} - {game.opponentScore}
                                </div>
                                <div className="game-moves">
                                    <strong>Moves:</strong> {game.movesCount}
                                </div>
                                <div className="game-color">
                                    <strong>You played:</strong> {game.playerColor === 'white' ? 'White' : 'Black'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default GameHistory;