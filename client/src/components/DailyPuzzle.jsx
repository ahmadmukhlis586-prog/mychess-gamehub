import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import ChessPiece from './ChessPiece';
import { API_BASE, TOKEN_KEY } from '../config';

export default function DailyPuzzle() {
  const chessRef = useRef(null);
  const [puzzle, setPuzzle] = useState(null);
  const [board, setBoard] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [status, setStatus] = useState('');
  const [solved, setSolved] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [rewardAnim, setRewardAnim] = useState(false);
  const [wrongMove, setWrongMove] = useState(null);
  const moveIndexRef = useRef(0);

  useEffect(() => {
    fetchPuzzle();
  }, []);

  const fetchPuzzle = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const res = await fetch(`${API_BASE}/daily-puzzle`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok && data.puzzle) {
        setPuzzle(data.puzzle);
        setSolved(data.attempt?.solved || false);
        moveIndexRef.current = 0;
        try {
          const chess = new Chess(data.puzzle.fen);
          chessRef.current = chess;
          setBoard(chess.board());
          const turn = chess.turn();
          if (data.attempt?.solved) {
            setStatus('Solved today!');
          } else {
            setStatus(`Your turn — play as ${turn === 'w' ? 'White' : 'Black'}`);
          }
        } catch (e) {
          console.error('Failed to load puzzle FEN:', e);
          setBoard([]);
          setStatus('Invalid puzzle position');
        }
      }
    } catch (e) {
      console.error('Puzzle load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getSquareName = (row, col) => {
    const files = 'abcdefgh';
    return files[col] + (8 - row);
  };

  const showLegalDots = useCallback((chess, square) => {
    try {
      const moves = chess.moves({ square, verbose: true });
      setLegalMoves(Array.isArray(moves) ? moves.map(m => m.to) : []);
    } catch {
      setLegalMoves([]);
    }
  }, []);

  const handleSquareClick = (row, col) => {
    if (solved || !puzzle || !chessRef.current) return;
    const chess = chessRef.current;
    const square = getSquareName(row, col);
    const piece = chess.get(square);
    const moves = puzzle.solution_moves || [];
    const currentMoveIndex = moveIndexRef.current;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }

      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        showLegalDots(chess, square);
        return;
      }

      const moveStr = selectedSquare + square;
      const solution = moves[currentMoveIndex];
      const isCorrectSolution = solution && moveStr.toLowerCase() === solution.toLowerCase();

      let moveResult = null;
      try {
        moveResult = chess.move({ from: selectedSquare, to: square, promotion: 'q' });
      } catch {}

      if (moveResult) {
        setBoard(chess.board());
        setSelectedSquare(null);
        setLegalMoves([]);

        if (isCorrectSolution) {
          const nextIndex = currentMoveIndex + 1;
          moveIndexRef.current = nextIndex;
          setMoveIndex(nextIndex);

          if (nextIndex >= moves.length) {
            setSolved(true);
            setStatus('Puzzle solved!');
            setRewardAnim(true);
            const token = localStorage.getItem(TOKEN_KEY);
            fetch(`${API_BASE}/daily-puzzle/solve`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            }).catch(() => {});
            setTimeout(() => setRewardAnim(false), 2000);
          } else {
            setStatus('Correct! Now find the next move...');
          }
        } else {
          setStatus('Not the best move — try again!');
          setWrongMove(moveStr);
          setTimeout(() => {
            chess.undo();
            setBoard(chess.board());
            setWrongMove(null);
            setStatus(`Your turn — play as ${chess.turn() === 'w' ? 'White' : 'Black'}`);
          }, 600);
        }
      } else {
        setSelectedSquare(null);
        setLegalMoves([]);
      }
      return;
    }

    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
      showLegalDots(chess, square);
    }
  };

  if (loading) {
    return (
      <div className="dp-container">
        <div className="dp-loading">
          <div className="dp-spinner" />
          <span>Loading puzzle...</span>
        </div>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="dp-container">
        <div className="dp-empty">No puzzle available today</div>
      </div>
    );
  }

  const solutionMoves = puzzle.solution_moves || [];
  const boardArray = Array.isArray(board) ? board : [];
  const isWrong = !!wrongMove;
  const playerColor = chessRef.current ? chessRef.current.turn() : 'w';
  const flipped = playerColor === 'b';

  const rows = flipped
    ? [...boardArray].reverse().map((row, revIdx) => ({ row, origRow: 7 - revIdx }))
    : boardArray.map((row, origRow) => ({ row, origRow }));
  const colOrder = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const files = flipped ? 'hgfedcba' : 'abcdefgh';

  const ownPieces = [];
  if (chessRef.current && !solved) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = getSquareName(r, c);
        const p = chessRef.current.get(sq);
        if (p && p.color === playerColor) ownPieces.push(sq);
      }
    }
  }

  return (
    <div className="dp-container">
      <div className="dp-left">
        <div className="dp-header">
          <div className="dp-label">DAILY PUZZLE</div>
          <div className={`dp-difficulty dp-diff-${puzzle.difficulty || 'medium'}`}>{puzzle.difficulty || 'medium'}</div>
        </div>
        <div className="dp-description">{puzzle.description || ''}</div>

        <div className="dp-board-wrapper">
          <div className={`dp-board ${isWrong ? 'dp-board-shake' : ''}`}>
            {rows.map(({ row, origRow }) =>
              (Array.isArray(row) ? row : []).map((cell, displayColIdx) => {
                const origCol = colOrder[displayColIdx];
                const isDark = (origRow + origCol) % 2 === 1;
                const square = getSquareName(origRow, origCol);
                const isSelected = selectedSquare === square;
                const isLegal = legalMoves.includes(square);
                const isOwn = ownPieces.includes(square);
                return (
                  <div
                    key={square}
                    className={`dp-square ${isDark ? 'dp-dark' : 'dp-light'} ${isSelected ? 'dp-selected' : ''} ${isLegal ? 'dp-legal' : ''} ${wrongMove && wrongMove.endsWith(square) ? 'dp-wrong' : ''} ${isOwn && !solved ? 'dp-movable' : ''}`}
                    onClick={() => handleSquareClick(origRow, origCol)}
                  >
                    {cell && (
                      <ChessPiece
                        color={cell.color}
                        type={cell.type}
                        tint={null}
                        className="dp-piece"
                      />
                    )}
                    {isLegal && !cell && <div className="dp-move-dot" />}
                    {isLegal && cell && <div className="dp-capture-ring" />}
                  </div>
                );
              })
            )}
          </div>
          <div className="dp-coords-bottom">
            {[...files].map(f => <span key={f}>{f}</span>)}
          </div>
        </div>

        <div className={`dp-status ${solved ? 'dp-solved' : ''} ${isWrong ? 'dp-status-wrong' : ''}`}>
          {rewardAnim && <span className="dp-reward-flash">+{puzzle.reward_elo || 5} ELO</span>}
          {status}
        </div>
      </div>

      <div className="dp-right">
        <div className="dp-info-card">
          <div className="dp-info-label">Playing as</div>
          <div className={`dp-info-value ${playerColor === 'w' ? 'dp-white-turn' : 'dp-black-turn'}`}>
            {playerColor === 'w' ? 'White' : 'Black'}
          </div>
        </div>
        <div className="dp-info-card">
          <div className="dp-info-label">Reward</div>
          <div className="dp-info-value dp-elo-reward">+{puzzle.reward_elo || 5} ELO</div>
        </div>
        <div className="dp-info-card">
          <div className="dp-info-label">Moves</div>
          <div className="dp-info-value">{moveIndex}/{solutionMoves.length}</div>
        </div>
        <div className="dp-info-card">
          <div className="dp-info-label">Status</div>
          <div className={`dp-info-value ${solved ? 'dp-status-solved' : ''}`}>{solved ? 'Solved' : 'Active'}</div>
        </div>

        {!solved && (
          <button
            className="dp-hint-btn"
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        )}
        {showHint && puzzle.hint && (
          <div className="dp-hint-text">{puzzle.hint}</div>
        )}
      </div>
    </div>
  );
}
