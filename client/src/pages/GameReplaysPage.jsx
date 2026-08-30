import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, TOKEN_KEY } from '../config';
import { Chess } from 'chess.js';
import ChessPiece from '../components/ChessPiece';
import FloatingBackground from '../components/FloatingBackground';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const RESULT_COLORS = {
  '1-0': { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: '1-0', sub: 'White wins' },
  '0-1': { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: '0-1', sub: 'Black wins' },
  '½-½': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: '½-½', sub: 'Draw' },
  'draw': { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: '½-½', sub: 'Draw' },
  'white': { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: '1-0', sub: 'White wins' },
  'black': { color: '#f87171', bg: 'rgba(248,113,113,0.12)', label: '0-1', sub: 'Black wins' },
};

function parseFEN(fen) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  if (!fen) return board;
  const placement = String(fen).split(' ')[0] || '';
  const rows = placement.split('/');
  for (let row = 0; row < 8; row += 1) {
    let col = 0;
    for (const ch of rows[row] || '') {
      if (/\d/.test(ch)) {
        col += Number(ch);
      } else {
        const color = ch === ch.toUpperCase() ? 'w' : 'b';
        board[row][col] = { color, type: ch.toLowerCase() };
        col += 1;
      }
    }
  }
  return board;
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  const now = new Date();
  const diffMs = now - dt;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Just now';
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 1) return 'Today';
  if (diffD === 1) return 'Yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getResultInfo(result) {
  if (!result) return { color: '#888', bg: 'rgba(136,136,136,0.12)', label: '?', sub: 'Unknown' };
  const normalized = String(result).trim();
  return RESULT_COLORS[normalized] || { color: '#888', bg: 'rgba(136,136,136,0.12)', label: normalized, sub: '' };
}

function formatMoveNotation(move) {
  if (!move) return '';
  if (move.san) return move.san;
  if (move.from && move.to) {
    let notation = move.from + move.to;
    if (move.promotion) notation += move.promotion;
    return notation;
  }
  return '?';
}

const GameReplaysPage = ({ token, onBack }) => {
  const [view, setView] = useState('list');
  const [replays, setReplays] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [error, setError] = useState('');
  const autoPlayRef = useRef(null);

  const fetchReplays = useCallback(() => {
    setLoading(true);
    setError('');
    const storedToken = token || localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setError('No authentication token found.');
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/replays`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.replays)) {
          setReplays(data.replays);
        } else {
          setError(data.message || 'Failed to load replays.');
        }
      })
      .catch(() => setError('Unable to connect to server.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchReplays();
  }, [fetchReplays]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
    setIsAutoPlaying(false);
  }, []);

  useEffect(() => {
    return () => stopAutoPlay();
  }, [stopAutoPlay]);

  const openReplay = useCallback((game) => {
    stopAutoPlay();
    setViewerLoading(true);
    setCurrentMoveIndex(-1);
    const storedToken = token || localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setError('No authentication token found.');
      setViewerLoading(false);
      return;
    }
    fetch(`${API_BASE}/replays/${game.id}`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.game) {
          setSelectedGame(data.game);
          setView('viewer');
        } else {
          setError(data.message || 'Failed to load game details.');
        }
      })
      .catch(() => setError('Unable to load game details.'))
      .finally(() => setViewerLoading(false));
  }, [token, stopAutoPlay]);

  const goToList = useCallback(() => {
    stopAutoPlay();
    setView('list');
    setSelectedGame(null);
    setCurrentMoveIndex(-1);
  }, [stopAutoPlay]);

  const getMoves = useCallback(() => {
    if (!selectedGame) return [];
    let raw = selectedGame.moves;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch { raw = []; }
    }
    return Array.isArray(raw) ? raw : [];
  }, [selectedGame]);

  const totalMoves = getMoves().length;

  const goToStart = useCallback(() => {
    stopAutoPlay();
    setCurrentMoveIndex(-1);
  }, [stopAutoPlay]);

  const goToEnd = useCallback(() => {
    stopAutoPlay();
    setCurrentMoveIndex(totalMoves - 1);
  }, [stopAutoPlay, totalMoves]);

  const goPrev = useCallback(() => {
    stopAutoPlay();
    setCurrentMoveIndex(prev => Math.max(-1, prev - 1));
  }, [stopAutoPlay]);

  const goNext = useCallback(() => {
    stopAutoPlay();
    setCurrentMoveIndex(prev => Math.min(totalMoves - 1, prev + 1));
  }, [stopAutoPlay, totalMoves]);

  const toggleAutoPlay = useCallback(() => {
    if (isAutoPlaying) {
      stopAutoPlay();
    } else {
      if (currentMoveIndex >= totalMoves - 1) {
        setCurrentMoveIndex(-1);
      }
      setIsAutoPlaying(true);
      autoPlayRef.current = setInterval(() => {
        setCurrentMoveIndex(prev => {
          if (prev >= totalMoves - 1) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
            setIsAutoPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
  }, [isAutoPlaying, currentMoveIndex, totalMoves, stopAutoPlay]);

  const buildPosition = useCallback(() => {
    const moves = getMoves();
    const chess = new Chess();
    for (let i = 0; i <= currentMoveIndex && i < moves.length; i++) {
      const move = moves[i];
      try {
        if (move.san) {
          chess.move(move.san);
        } else if (move.from && move.to) {
          chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
        }
      } catch (e) {
        break;
      }
    }
    return parseFEN(chess.fen());
  }, [getMoves, currentMoveIndex]);

  const getLastMove = useCallback(() => {
    const moves = getMoves();
    if (currentMoveIndex < 0 || currentMoveIndex >= moves.length) return null;
    return moves[currentMoveIndex];
  }, [getMoves, currentMoveIndex]);

  const getFENForIndex = useCallback((moves, idx) => {
    const chess = new Chess();
    for (let i = 0; i <= idx && i < moves.length; i++) {
      const move = moves[i];
      try {
        if (move.san) {
          chess.move(move.san);
        } else if (move.from && move.to) {
          chess.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
        }
      } catch {
        break;
      }
    }
    return chess.fen();
  }, []);

  const renderBoard = () => {
    const board = buildPosition();
    const lastMove = getLastMove();

    return (
      <div style={styles.boardWrap}>
        <div style={styles.board}>
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} style={{ display: 'contents' }}>
              {Array.from({ length: 8 }, (_, col) => {
                const square = `${FILES[col]}${8 - row}`;
                const piece = board[row][col];
                const isDark = (row + col) % 2 === 1;
                const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
                const isLastMoveFrom = lastMove && lastMove.from === square;
                const isLastMoveTo = lastMove && lastMove.to === square;

                return (
                  <div
                    key={square}
                    style={{
                      ...styles.square,
                      background: isDark ? '#5b466f' : '#e8e3ee',
                      boxShadow: isLastMoveTo
                        ? '0 0 12px 2px rgba(168,85,247,0.45), inset 0 0 8px rgba(168,85,247,0.2)'
                        : isLastMoveFrom
                          ? '0 0 8px 1px rgba(168,85,247,0.25)'
                          : 'none',
                    }}
                  >
                    {col === 0 && (
                      <span style={{ ...styles.coordinate, color: isDark ? '#f2dfff' : '#694d78', left: 2, top: 2 }}>
                        {8 - row}
                      </span>
                    )}
                    {row === 7 && (
                      <span style={{ ...styles.coordinate, color: isDark ? '#f2dfff' : '#694d78', right: 2, bottom: 2 }}>
                        {FILES[col]}
                      </span>
                    )}
                    {piece && (
                      <ChessPiece color={piece.color} type={piece.type} />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMovePanel = () => {
    const moves = getMoves();
    if (moves.length === 0) {
      return (
        <div style={styles.movePanelEmpty}>
          <span style={{ color: '#756d80', fontSize: 13 }}>No moves recorded.</span>
        </div>
      );
    }

    const rows = [];
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      rows.push({ moveNum, whiteMove, blackMove, whiteIndex: i, blackIndex: i + 1 });
    }

    return (
      <div style={styles.moveListContainer}>
        {rows.map(({ moveNum, whiteMove, blackMove, whiteIndex, blackIndex }) => {
          const isWhiteActive = currentMoveIndex === whiteIndex;
          const isBlackActive = blackMove && currentMoveIndex === blackIndex;
          const isPast = currentMoveIndex >= (blackMove ? blackIndex : whiteIndex);

          return (
            <div key={moveNum} style={{ ...styles.moveRow, opacity: isPast ? 1 : 0.4 }}>
              <span style={styles.moveNumber}>{moveNum}.</span>
              <span
                style={{
                  ...styles.moveCell,
                  background: isWhiteActive ? 'rgba(168,85,247,0.25)' : 'transparent',
                  borderRadius: 4,
                  boxShadow: isWhiteActive ? '0 0 8px rgba(168,85,247,0.3)' : 'none',
                }}
                onClick={() => { stopAutoPlay(); setCurrentMoveIndex(whiteIndex); }}
              >
                {formatMoveNotation(whiteMove)}
              </span>
              {blackMove ? (
                <span
                  style={{
                    ...styles.moveCell,
                    background: isBlackActive ? 'rgba(168,85,247,0.25)' : 'transparent',
                    borderRadius: 4,
                    boxShadow: isBlackActive ? '0 0 8px rgba(168,85,247,0.3)' : 'none',
                  }}
                  onClick={() => { stopAutoPlay(); setCurrentMoveIndex(blackIndex); }}
                >
                  {formatMoveNotation(blackMove)}
                </span>
              ) : (
                <span style={styles.moveCell} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderViewer = () => {
    if (!selectedGame) return null;

    const displayMoveNumber = currentMoveIndex >= 0 ? Math.floor(currentMoveIndex / 2) + 1 : 0;
    const isWhiteTurn = currentMoveIndex >= 0 ? currentMoveIndex % 2 === 0 : true;
    const resultInfo = getResultInfo(selectedGame.result);
    const whiteName = selectedGame.white_name || 'White';
    const blackName = selectedGame.black_name || 'Black';

    return (
      <div style={styles.viewerContainer}>
        <header style={styles.viewerHeader}>
          <button type="button" style={styles.backBtn} onClick={goToList}>
            ← Back to Replays
          </button>
          <div style={styles.viewerTitle}>
            <span style={{ color: '#c9c1d5', fontWeight: 700, fontSize: 13 }}>{whiteName}</span>
            <span style={{ color: '#66557a', margin: '0 8px', fontSize: 13 }}>vs</span>
            <span style={{ color: '#c9c1d5', fontWeight: 700, fontSize: 13 }}>{blackName}</span>
            <span style={{ ...styles.resultBadge, color: resultInfo.color, background: resultInfo.bg, marginLeft: 10 }}>
              {resultInfo.label}
            </span>
          </div>
        </header>

        {viewerLoading ? (
          <div style={styles.loading}>Loading game...</div>
        ) : (
          <div style={styles.viewerBody}>
            <div style={styles.viewerBoardSection}>
              <div style={styles.playerBar}>
                <div style={styles.playerInfo}>
                  <div style={styles.avatar}>{blackName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={styles.playerName}>{blackName}</div>
                    <div style={styles.playerMeta}>BLACK</div>
                  </div>
                </div>
                {!isWhiteTurn && currentMoveIndex >= 0 && (
                  <span style={styles.turnBadge}>MOVE</span>
                )}
              </div>

              {renderBoard()}

              <div style={{ ...styles.playerBar, marginTop: 8 }}>
                <div style={styles.playerInfo}>
                  <div style={styles.avatar}>{whiteName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div style={styles.playerName}>{whiteName}</div>
                    <div style={styles.playerMeta}>WHITE</div>
                  </div>
                </div>
                {isWhiteTurn && currentMoveIndex >= 0 && (
                  <span style={styles.turnBadge}>MOVE</span>
                )}
              </div>

              <div style={styles.controlsBar}>
                <button type="button" style={styles.navBtn} onClick={goToStart} title="Go to start">
                  ⏮
                </button>
                <button type="button" style={styles.navBtn} onClick={goPrev} title="Previous move">
                  ◀
                </button>
                <span style={styles.moveCounter}>
                  Move {currentMoveIndex >= 0 ? currentMoveIndex + 1 : 0} of {totalMoves}
                </span>
                <button type="button" style={styles.navBtn} onClick={goNext} title="Next move">
                  ▶
                </button>
                <button type="button" style={styles.navBtn} onClick={goToEnd} title="Go to end">
                  ⏭
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.navBtn,
                    ...styles.autoPlayBtn,
                    background: isAutoPlaying ? 'linear-gradient(135deg,#8848ff,#6025cb)' : 'rgba(255,255,255,0.06)',
                    color: isAutoPlaying ? '#fff' : '#c9c1d5',
                  }}
                  onClick={toggleAutoPlay}
                  title={isAutoPlaying ? 'Pause auto-play' : 'Auto-play moves'}
                >
                  {isAutoPlaying ? '⏸' : '▶▶'}
                </button>
              </div>
            </div>

            <div style={styles.viewerSidePanel}>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>MOVES</span>
                  <span style={styles.cardMuted}>{totalMoves} total</span>
                </div>
                {renderMovePanel()}
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTitle}>GAME INFO</span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Result</span>
                    <span style={{ color: resultInfo.color, fontWeight: 700, fontSize: 13 }}>{resultInfo.label}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Result Detail</span>
                    <span style={styles.infoValue}>{resultInfo.sub || '—'}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Date</span>
                    <span style={styles.infoValue}>{formatDate(selectedGame.created_at)}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>White</span>
                    <span style={styles.infoValue}>{whiteName}</span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoLabel}>Black</span>
                    <span style={styles.infoValue}>{blackName}</span>
                  </div>
                  {selectedGame.room_id && (
                    <div style={styles.infoRow}>
                      <span style={styles.infoLabel}>Room</span>
                      <span style={styles.infoValue}>{selectedGame.room_id}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderList = () => {
    if (loading) {
      return <div style={styles.loading}>Loading replays...</div>;
    }
    if (error) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>⚠️</div>
          <p style={{ color: '#f87171', fontSize: 14, margin: '10px 0' }}>{error}</p>
          <button type="button" style={styles.retryBtn} onClick={fetchReplays}>Retry</button>
        </div>
      );
    }
    if (replays.length === 0) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>♟️</div>
          <p style={{ color: '#c9c1d5', fontSize: 14, margin: '10px 0' }}>No replays yet.</p>
          <p style={{ color: '#756d80', fontSize: 12 }}>Your completed games will appear here.</p>
        </div>
      );
    }

    return (
      <div style={styles.replayGrid}>
        {replays.map((game) => {
          const resultInfo = getResultInfo(game.result);
          const whiteName = game.white_name || 'White';
          const blackName = game.black_name || 'Black';
          const moveCount = (() => {
            let raw = game.moves;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch { raw = []; }
            }
            return Array.isArray(raw) ? raw.length : 0;
          })();

          return (
            <div key={game.id} style={styles.replayCard}>
              <div style={styles.replayCardHeader}>
                <span style={{ ...styles.resultBadge, color: resultInfo.color, background: resultInfo.bg }}>
                  {resultInfo.label}
                </span>
                <span style={styles.replayDate}>{formatDate(game.created_at)}</span>
              </div>
              <div style={styles.replayCardBody}>
                <div style={styles.replayPlayers}>
                  <div style={styles.replayPlayerRow}>
                    <span style={styles.colorDot}>⬤</span>
                    <span style={styles.replayPlayerName}>{whiteName}</span>
                  </div>
                  <div style={styles.replayVersus}>vs</div>
                  <div style={styles.replayPlayerRow}>
                    <span style={{ ...styles.colorDot, color: '#333' }}>⬤</span>
                    <span style={styles.replayPlayerName}>{blackName}</span>
                  </div>
                </div>
                <div style={styles.replayCardMeta}>
                  <span>{moveCount} moves</span>
                </div>
              </div>
              <div style={styles.replayCardFooter}>
                <button
                  type="button"
                  style={styles.watchBtn}
                  onClick={() => openReplay(game)}
                  disabled={viewerLoading}
                >
                  {viewerLoading ? 'Loading...' : '▶ Watch Replay'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mychess-home-page">
      <FloatingBackground />
      <header style={styles.header}>
        <button type="button" style={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <div style={styles.brand}>
          <div style={styles.logo}>🎬</div>
          <div>
            <div style={styles.brandName}>GAME REPLAYS</div>
            <div style={styles.brandSub}>
              {view === 'list' ? `${replays.length} GAMES RECORDED` : 'VIEWING REPLAY'}
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {view === 'list' ? renderList() : renderViewer()}
      </main>
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    flexWrap: 'wrap',
  },
  backBtn: {
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.045)',
    color: '#fff',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(145deg,#8b4dff,#5420ae)',
    boxShadow: '0 10px 30px rgba(109,51,230,.35)',
    fontSize: 18,
  },
  brandName: {
    fontWeight: 800,
    letterSpacing: '.12em',
    fontSize: 14,
    color: '#fff',
  },
  brandSub: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '.15em',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  main: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 16px 40px',
    boxSizing: 'border-box',
  },
  loading: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#c9c1d5',
    fontSize: 14,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  retryBtn: {
    border: '1px solid rgba(168,85,247,0.3)',
    background: 'rgba(168,85,247,0.12)',
    color: '#c19cff',
    borderRadius: 8,
    padding: '8px 20px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
    marginTop: 10,
  },
  replayGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
  },
  replayCard: {
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))',
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  replayCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  resultBadge: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.08em',
    padding: '3px 10px',
    borderRadius: 6,
  },
  replayDate: {
    fontSize: 11,
    color: '#756d80',
  },
  replayCardBody: {
    padding: '14px',
    flex: 1,
  },
  replayPlayers: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  replayPlayerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    fontSize: 10,
    color: '#fff',
    lineHeight: 1,
  },
  replayPlayerName: {
    fontWeight: 700,
    fontSize: 14,
    color: '#e8e3ee',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  replayVersus: {
    fontSize: 11,
    color: '#66557a',
    paddingLeft: 14,
  },
  replayCardMeta: {
    marginTop: 10,
    fontSize: 11,
    color: '#756d80',
  },
  replayCardFooter: {
    padding: '10px 14px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  watchBtn: {
    width: '100%',
    border: '1px solid rgba(168,85,247,0.3)',
    background: 'linear-gradient(135deg,#8848ff,#6025cb)',
    color: '#fff',
    borderRadius: 8,
    padding: '9px 16px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '.06em',
    textAlign: 'center',
  },
  viewerContainer: {
    width: '100%',
  },
  viewerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  viewerTitle: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
  },
  viewerBody: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: 16,
    width: '100%',
  },
  viewerBoardSection: {
    minWidth: 0,
  },
  playerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: 10,
    background: 'rgba(0,0,0,0.22)',
    border: '1px solid rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(145deg,#24153b,#120b1f)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontWeight: 800,
    fontSize: 13,
    color: '#fff',
  },
  playerName: {
    fontWeight: 700,
    fontSize: 13,
    color: '#e8e3ee',
  },
  playerMeta: {
    fontSize: 9,
    color: '#827a8f',
    letterSpacing: '.1em',
    marginTop: 1,
  },
  turnBadge: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: '#b58cff',
    padding: '2px 8px',
    background: 'rgba(168,85,247,0.15)',
    borderRadius: 4,
  },
  boardWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    maxWidth: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.42)',
  },
  board: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gridTemplateRows: 'repeat(8, 1fr)',
    userSelect: 'none',
  },
  square: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    aspectRatio: '1 / 1',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
  },
  coordinate: {
    position: 'absolute',
    fontSize: 7,
    fontWeight: 700,
    pointerEvents: 'none',
    opacity: 0.5,
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(0,0,0,0.22)',
    border: '1px solid rgba(255,255,255,0.06)',
    flexWrap: 'wrap',
  },
  navBtn: {
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.06)',
    color: '#c9c1d5',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    lineHeight: 1,
    minWidth: 34,
    textAlign: 'center',
  },
  autoPlayBtn: {
    fontSize: 11,
    letterSpacing: '.04em',
    padding: '5px 12px',
  },
  moveCounter: {
    fontSize: 11,
    color: '#827a8f',
    fontWeight: 600,
    padding: '0 6px',
    whiteSpace: 'nowrap',
  },
  viewerSidePanel: {
    display: 'grid',
    gap: 10,
    minWidth: 0,
  },
  card: {
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))',
    boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: '#e8e3ee',
  },
  cardMuted: {
    fontSize: 10,
    color: '#756d80',
  },
  cardBody: {
    padding: '10px 12px',
  },
  movePanelEmpty: {
    padding: '24px 12px',
    textAlign: 'center',
  },
  moveListContainer: {
    maxHeight: 340,
    overflowY: 'auto',
    padding: '6px',
  },
  moveRow: {
    display: 'grid',
    gridTemplateColumns: '28px 1fr 1fr',
    gap: 2,
    padding: '3px 4px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontSize: 12,
    alignItems: 'center',
  },
  moveNumber: {
    color: '#66557a',
    fontWeight: 600,
    fontSize: 11,
    textAlign: 'right',
    paddingRight: 4,
  },
  moveCell: {
    padding: '2px 6px',
    color: '#e8e3ee',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: 12,
    whiteSpace: 'nowrap',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '5px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  infoLabel: {
    fontSize: 11,
    color: '#756d80',
    fontWeight: 600,
  },
  infoValue: {
    fontSize: 12,
    color: '#e8e3ee',
    fontWeight: 600,
  },
};

export default GameReplaysPage;
