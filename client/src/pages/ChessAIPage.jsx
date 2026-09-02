import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import FloatingBackground from '../components/FloatingBackground';
import ChessPiece from '../components/ChessPiece';
import CapturedPieces, { getCapturedPieces } from '../components/CapturedPieces';
import MusicWidget from '../components/MusicWidget';
import { playCaptureSound, playVictorySound, playDefeatSound } from '../helpers';
import { API_BASE } from '../config';
import MemeSoundboard from '../components/MemeSoundboard';

const ChessAIPage = ({ token, onBack }) => {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [board, setBoard] = useState(chessRef.current.board());
  const [turn, setTurn] = useState('w');
  const [status, setStatus] = useState('Ready to play!');
  const [moveHistory, setMoveHistory] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [difficulty, setDifficulty] = useState(2);
  const [hint, setHint] = useState(null);
  const [isAIThinking, setIsAIThinking] = useState(false);

  const [moveTrailSquare, setMoveTrailSquare] = useState(null);
  const [damageExplosionSquare, setDamageExplosionSquare] = useState(null);
  const [lastMoveSquares, setLastMoveSquares] = useState([]);

  const [showConfetti, setShowConfetti] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [equippedItems, setEquippedItems] = useState({});
  // ADDED: separate state for the "Themes" tab animated board theme (precedence)
  const [themedBoardTheme, setThemedBoardTheme] = useState(null);

  const { material, chronological: capturedChronological } = useMemo(() => {
    if (!moveHistory || moveHistory.length === 0) return { captured: { w: [], b: [] }, material: { w: 0, b: 0 }, chronological: [] };
    return getCapturedPieces(moveHistory);
  }, [moveHistory]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => { updateGameState(); }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/shop/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok) setEquippedItems(data.equipped); })
      .catch(() => {});
  }, [token]);

  // ADDED: Normalize /shop/equipped (returns an array) into the keyed object the
  // page's render already expects, so equipped board / piece / effect cosmetics
  // apply in the AI Practice Arena. Board uses light/dark keys mapped to the page's
  // lightColor/darkColor, and effect maps to the page's `name` key. Additive only.
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/shop/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (!data.ok || !Array.isArray(data.equipped)) return;
        const arr = data.equipped;
        const findOne = (cat) => arr.find(i => i.category === cat && i.is_equipped);
        const board = findOne('board');
        const piece = findOne('piece');
        const effect = findOne('effect');
        const pd = board?.preview_data || {};
        setEquippedItems({
          board: board ? { preview_data: { ...pd, lightColor: pd.light, darkColor: pd.dark } } : {},
          piece: piece ? { preview_data: piece.preview_data } : {},
          effect: effect ? { preview_data: { ...(effect.preview_data || {}), name: effect.preview_data?.effect } } : {},
        });
      })
      .catch(() => {});
  }, [token]);

  // ADDED: Apply the "Themes" tab animated board theme in the AI arena too. When a
  // board theme is equipped it takes precedence (overrides the shop Items board),
  // exactly like the real match. Kept in its own state to avoid a fetch race.
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/themes/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok && data.boardTheme) setThemedBoardTheme(data.boardTheme); })
      .catch(() => {});
  }, [token]);

  const boardTheme = equippedItems.board?.preview_data || {};
  const shopBoardLight = boardTheme.lightColor;
  const shopBoardDark = boardTheme.darkColor;
  const boardLightColor = themedBoardTheme?.light_sq || shopBoardLight || undefined;
  const boardDarkColor = themedBoardTheme?.dark_sq || shopBoardDark || undefined;
  const pieceSkin = equippedItems.piece?.preview_data || {};
  const effectData = equippedItems.effect?.preview_data || {};

  const getEffectStyle = () => {
    const name = effectData.name;
    if (name === 'sparkle') return { filter: 'drop-shadow(0 0 6px rgba(255,215,0,.9))', animation: 'effectSparkle 1s ease-in-out infinite' };
    if (name === 'fire') return { filter: 'drop-shadow(0 0 8px rgba(255,60,0,.9))', animation: 'effectFire .8s ease-in-out infinite' };
    if (name === 'rainbow') return { filter: 'saturate(1.6)', animation: 'effectRainbow 2s linear infinite' };
    if (name === 'shadow') return { filter: 'drop-shadow(2px 2px 3px rgba(0,0,0,.7))', opacity: 0.88 };
    return {};
  };

  const updateGameState = () => {
    const game = chessRef.current;
    setFen(game.fen());
    setBoard(game.board());
    setTurn(game.turn());
    setMoveHistory(game.history());

    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      setStatus(`Checkmate! ${winner} wins!`);

      if (game.turn() === 'b') {
        setGameResult('win');
        playVictorySound();
        setShowConfetti(true);
      } else {
        setGameResult('loss');
        playDefeatSound();
      }
      setTimeout(() => setShowConfetti(false), 5000);
    } 
    else if (game.isDraw()) {
      setStatus('Draw!');
      setGameResult('draw');
    } 
    else if (game.isCheck()) {
      setStatus(`${game.turn() === 'w' ? 'White' : 'Black'} is in Check!`);
    } 
    else {
      setStatus(`${game.turn() === 'w' ? 'White (You)' : 'Black (AI)'}'s turn`);
    }
  };

  const evaluateBoard = (game) => {
    const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let score = 0;
    const boardState = game.board();
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = boardState[row][col];
        if (piece) {
          const value = pieceValues[piece.type] || 0;
          if (piece.color === 'b') score += value;
          else score -= value;
        }
      }
    }
    return score;
  };

  const makeAIMove = () => {
    if (chessRef.current.isGameOver()) return;
    setIsAIThinking(true);
    
    setTimeout(() => {
      const game = chessRef.current;
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) { setIsAIThinking(false); return; }

      let chosenMove = null;
      if (difficulty === 1) {
        chosenMove = moves[Math.floor(Math.random() * moves.length)];
      } else if (difficulty === 2) {
        const captures = moves.filter(m => m.captured);
        chosenMove = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];
      } else {
        let bestScore = -Infinity;
        for (const move of moves) {
          game.move(move);
          let score = evaluateBoard(game);
          game.undo();
          if (score > bestScore) { bestScore = score; chosenMove = move; }
        }
      }

      if (chosenMove) {
        if (chosenMove.captured) {
          playCaptureSound();
          setDamageExplosionSquare(chosenMove.to);
          setTimeout(() => setDamageExplosionSquare(null), 800);
          if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
        } else {
          if (navigator.vibrate) navigator.vibrate(30);
        }

        setMoveTrailSquare(chosenMove.to);
        setTimeout(() => setMoveTrailSquare(null), 800);
        setLastMoveSquares([chosenMove.from, chosenMove.to]);

        game.move({ from: chosenMove.from, to: chosenMove.to, promotion: 'q' });
        updateGameState();
      }
      setIsAIThinking(false);
    }, 500);
  };

  const handleSquareClick = (row, col) => {
    const game = chessRef.current;
    if (isAIThinking || game.turn() !== 'w') return;

    const square = String.fromCharCode(97 + col) + (8 - row);

    if (selectedSquare) {
      const from = selectedSquare;
      const to = square;
      try {
        const move = game.move({ from, to, promotion: 'q' });
        if (move) {
          if (move.captured) {
            playCaptureSound();
            setDamageExplosionSquare(move.to);
            setTimeout(() => setDamageExplosionSquare(null), 800);
            if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
          } else {
            if (navigator.vibrate) navigator.vibrate(30);
          }

          setMoveTrailSquare(move.to);
          setTimeout(() => setMoveTrailSquare(null), 800);
          setLastMoveSquares([move.from, move.to]);

          setSelectedSquare(null); setLegalMoves([]);
          updateGameState();
          setTimeout(makeAIMove, 300);
        } else { handleSelection(row, col); }
      } catch (error) { handleSelection(row, col); }
    } else {
      handleSelection(row, col);
    }
  };

  const handleSelection = (row, col) => {
    const game = chessRef.current;
    const square = String.fromCharCode(97 + col) + (8 - row);
    const piece = game.get(square);
    if (piece && piece.color === 'w') {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setLegalMoves(moves.map(m => m.to));
    } else { setSelectedSquare(null); setLegalMoves([]); }
  };

  const getHint = async () => {
    if (chessRef.current.isGameOver() || chessRef.current.turn() !== 'w') return;
    try {
      // ✅ FIXED: Use API_BASE
      const response = await fetch(`${API_BASE}/game/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fen: chessRef.current.fen() })
      });
      const data = await response.json();
      if (data.ok && data.hint) {
        setHint(data.hint); setSelectedSquare(data.hint.from);
        setStatus(`💡 Hint: Try moving ${data.hint.san}`);
        setTimeout(() => setHint(null), 5000);
      }
    } catch (error) {
      console.error('Error getting hint:', error);
      setStatus('⚠️ Hint unavailable. Please try again.');
    }
  };

  const resetGame = () => {
    chessRef.current = new Chess();
    setFen(chessRef.current.fen()); setBoard(chessRef.current.board());
    setTurn('w'); setStatus('Ready to play!'); setMoveHistory([]);
    setSelectedSquare(null); setLegalMoves([]); setHint(null); setIsAIThinking(false);
    setMoveTrailSquare(null); setDamageExplosionSquare(null); setLastMoveSquares([]);
    setShowConfetti(false); setGameResult(null);
  };

  const undoMove = () => {
    const game = chessRef.current;
    if (game.history().length > 0) {
      game.undo(); game.undo();
      updateGameState();
      setSelectedSquare(null); setLegalMoves([]);
      setMoveTrailSquare(null); setDamageExplosionSquare(null); setLastMoveSquares([]);
      setShowConfetti(false); setGameResult(null);
    }
  };

  return (
    <div className="chess-ai-page">
      <FloatingBackground /><MusicWidget />
      <header className="chess-tips-header">
        <div className="chess-tips-brand">
          <div className="mychess-logo-mark">♞</div>
          <div>
            <div className="chess-tips-brand-name">MYCHESS</div>
            <div className="chess-tips-brand-subtitle">AI PRACTICE ARENA</div>
          </div>
        </div>
        <button type="button" className="mychess-home-logout" onClick={onBack}>← Back to Dashboard</button>
      </header>

      {(gameResult || showConfetti) && (
        <div className="match-result-backdrop">
          <button className="match-result-close-btn" onClick={onBack}>×</button>
          <div className={`match-result-banner ${gameResult}`}>
            <div className="banner-text">
              {gameResult === 'win' ? '🏆 YOU WIN!' : gameResult === 'loss' ? '💀 YOU LOSE!' : '🤝 DRAW!'}
            </div>
          </div>
        </div>
      )}

      {showConfetti && (
        <>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
          <div className="confetti-piece"></div>
        </>
      )}

      <main className="chess-ai-main">
        <div className="chess-ai-container">
          <div className="chess-ai-difficulty">
            <span>🤖 AI Difficulty:</span>
            <select value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value))}>
              <option value={1}>Easy (Beginner)</option>
              <option value={2}>Medium (Club Player)</option>
              <option value={3}>Hard (Tactical)</option>
            </select>
          </div>

          <div className="chess-ai-status">
            <span>{turn === 'w' ? 'Your Turn' : 'AI Thinking...'}</span>
            <span>{status}</span>
          </div>

          <MemeSoundboard token={token} socket={null} aiMode />

          <div className="chess-ai-layout">
            <div className="chess-ai-board-container">
              <div className="chess-ai-board">
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} className="chess-ai-row">
                    {row.map((piece, colIndex) => {
                      const isDark = (rowIndex + colIndex) % 2 === 1;
                      const square = String.fromCharCode(97 + colIndex) + (8 - rowIndex);
                      const isSelected = selectedSquare === square;
                      const isLegalMove = legalMoves.includes(square);
                      const isHint = hint?.to === square || hint?.from === square;
                      const isLastMove = lastMoveSquares.includes(square);

                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`chess-ai-square ${isDark ? 'dark' : 'light'} ${isSelected ? 'selected' : ''} ${isLegalMove ? 'legal-move' : ''} ${isHint ? 'hint-square' : ''} ${isLastMove ? 'last-move' : ''} ${damageExplosionSquare === square ? 'damage-explosion' : ''} ${moveTrailSquare === square ? 'move-trail' : ''}`}
                          style={{
                            background: isDark
                              ? (boardDarkColor || undefined)
                              : (boardLightColor || undefined),
                          }}
                          onClick={() => handleSquareClick(rowIndex, colIndex)}
                        >
                          {piece && (
                            <span style={{ display: 'contents', ...(piece.color === 'w' ? getEffectStyle() : {}) }}>
                              <ChessPiece
                                color={piece.color}
                                type={piece.type}
                                tint={piece.color === 'w' ? (pieceSkin.color || undefined) : undefined}
                                className={`chess-ai-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`}
                              />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="chess-ai-side-panel">
              <div className="chess-ai-move-history">
                <h3>📜 Move History</h3>
                <div className="chess-ai-moves-list">
                  {moveHistory.length === 0 ? (<p className="chess-ai-empty-text">Make a move to start!</p>) : (
                    moveHistory.map((move, index) => (
                      <div key={index} className="chess-ai-move-row">
                        <span>{Math.floor(index / 2) + 1}.</span><span>{move}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="chess-ai-move-history" style={{ marginTop: 0 }}>
                <h3>♟ Captured</h3>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  <CapturedPieces captured={capturedChronological} material={material} isMobile={isMobile} />
                </div>
              </div>

              <div className="chess-ai-controls">
                <button onClick={getHint} className="mychess-shop-button">💡 Hint</button>
                <button onClick={undoMove} className="mychess-shop-button">↩️ Undo</button>
                <button onClick={resetGame} className="mychess-shop-button">🔄 New Game</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChessAIPage;