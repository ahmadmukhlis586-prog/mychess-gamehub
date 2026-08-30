import React from 'react';
import FloatingBackground from '../components/FloatingBackground';
import MusicWidget from '../components/MusicWidget';

const ChessTipsPage = ({ onBack, onPlayAI }) => {
  return (
    <div className="chess-tips-page">
      <FloatingBackground />
      <MusicWidget />

      <header className="chess-tips-header">
        <div className="chess-tips-brand">
          <div className="mychess-logo-mark">♞</div>
          <div>
            <div className="chess-tips-brand-name">MYCHESS</div>
            <div className="chess-tips-brand-subtitle">CHESS TIPS & STRATEGY</div>
          </div>
        </div>
        <button type="button" className="mychess-home-logout" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </header>

      <main className="chess-tips-main">
        <div className="chess-tips-container">
          
          <div className="chess-tips-hero">
            <span className="inline-block animate-bounce text-4xl">👑</span>
            <h1 className="chess-tips-h1">
              Chess Tips, Rules & Master Strategies
            </h1>
            <p className="chess-tips-subtitle">
              Everything you need to know about chess in clear, beginner-friendly steps.
            </p>
          </div>

          <div className="chess-tips-card">
            <div className="chess-tips-card-header">
              <span className="chess-tips-number">01.</span>
              <h2 className="chess-tips-h2">Understanding the Board & Setup</h2>
            </div>
            
            <div className="chess-tips-grid-2">
              <div className="chess-tips-tile">
                <h3 className="chess-tips-tile-title">📐 Board Orientation Rule</h3>
                <p className="chess-tips-tile-text">Always set up the board so that the <strong>light-colored square</strong> is on the bottom-right.</p>
              </div>
              <div className="chess-tips-tile">
                <h3 className="chess-tips-tile-title">👑 Queen On Her Own Color</h3>
                <p className="chess-tips-tile-text">White Queen starts on a light square ($d1$), Black Queen on dark ($d8$).</p>
              </div>
            </div>
          </div>

          <div className="chess-tips-section">
            <div className="chess-tips-section-header">
              <span className="chess-tips-label">The Army</span>
              <h2 className="chess-tips-h2">02. How Pieces Move</h2>
            </div>

            <div className="chess-tips-grid-3">
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♟️</div>
                <h3 className="chess-tips-piece-name">Pawn (1 Pt)</h3>
                <p className="chess-tips-tile-text">Moves forward 1 square (or 2 on first move). Promotes at the end!</p>
              </div>
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♞</div>
                <h3 className="chess-tips-piece-name">Knight (3 Pts)</h3>
                <p className="chess-tips-tile-text">Moves in an 'L-shape'. Only piece that can jump over others!</p>
              </div>
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♝</div>
                <h3 className="chess-tips-piece-name">Bishop (3 Pts)</h3>
                <p className="chess-tips-tile-text">Moves diagonally as far as open.</p>
              </div>
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♜</div>
                <h3 className="chess-tips-piece-name">Rook (5 Pts)</h3>
                <p className="chess-tips-tile-text">Moves horizontally or vertically as far as open.</p>
              </div>
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♛</div>
                <h3 className="chess-tips-piece-name">Queen (9 Pts)</h3>
                <p className="chess-tips-tile-text">Combines Rook and Bishop powers.</p>
              </div>
              <div className="chess-tips-pieces-card">
                <div className="chess-tips-piece-icon">♚</div>
                <h3 className="chess-tips-piece-name">King (Priceless)</h3>
                <p className="chess-tips-tile-text">Moves 1 square any direction. Protect at all costs!</p>
              </div>
            </div>
          </div>

          <div className="chess-tips-card">
            <div className="chess-tips-card-header">
              <span className="chess-tips-number">03.</span>
              <h2 className="chess-tips-h2">3 Golden Principles for Every Beginner</h2>
            </div>

            <div className="chess-tips-grid-3">
              <div className="chess-tips-tile">
                <span className="chess-tips-tile-label">1. Control the Center</span>
                <p className="chess-tips-tile-text">Occupying the 4 center squares gives maximum freedom.</p>
              </div>
              <div className="chess-tips-tile">
                <span className="chess-tips-tile-label">2. Develop Minor Pieces</span>
                <p className="chess-tips-tile-text">Bring out Knights and Bishops early.</p>
              </div>
              <div className="chess-tips-tile">
                <span className="chess-tips-tile-label">3. Castle Early</span>
                <p className="chess-tips-tile-text">Tuck your King safely behind a pawn shield.</p>
              </div>
            </div>
          </div>

          <div className="chess-tips-cta">
            <button 
  type="button" 
  className="next-gen-btn" 
  onClick={onPlayAI} 
>
  🤖 Practice Your Skills vs AI Bot
</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChessTipsPage;