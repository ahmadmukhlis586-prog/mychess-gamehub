import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Component,
} from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';

import { io } from 'socket.io-client';
import './App.css';
import ShopPage from './pages/ShopPage';
import { initClickSound, playClickSound, reinitializeTheme, playCaptureSound } from './helpers';
import MusicWidget from './components/MusicWidget';
import MessageNotifier from './components/MessageNotifier';
import FloatingBackground from './components/FloatingBackground';
import GameHistory from './pages/GameHistory';
import InventoryPage from './pages/InventoryPage';
import SplashScreen from './SplashScreen';
import QuestsPage from './pages/QuestsPage';
import ChessTipsPage from './pages/ChessTipsPage';
import ChessAIPage from './pages/ChessAIPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AchievementsPage from './pages/AchievementsPage';
import PlayerProfile from './pages/PlayerProfile';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CinematicHero from './components/CinematicHero';
import NotificationToast from './components/NotificationToast';
import MusicCarousel from './components/MusicCarousel';
import EntranceThemes from './components/EntranceThemes';
import MatchCosmeticsPanel from './components/MatchCosmeticsPanel';
import ChessQuiz from './components/ChessQuiz';
import RecentMatchesFeed from './components/RecentMatchesFeed';
import GameStatsBar from './components/GameStatsBar';
import DailyCalendar from './components/DailyCalendar';
import LootBox from './components/LootBox';
import TournamentPage from './pages/TournamentPage';

import { notifyMusicForMatch } from './helpers';
import { Chess } from 'chess.js';
import ChessPiece from './components/ChessPiece';
import CapturedPieces, { getCapturedPieces } from './components/CapturedPieces';
import MatchFoundVS from './components/MatchFoundVS';
import ScrollReveal from './components/ScrollReveal';
import LoginParticles from './components/LoginParticles';
import EloRing from './components/EloRing';
import VictoryParticles from './components/VictoryParticles';
import AnnouncementsSection from './components/AnnouncementsSection';
import FriendsPanel from './components/FriendsPanel';
import Avatar from './components/Avatar';
import UsernameLink from './components/UsernameLink';
import InstallAppButton from './components/InstallAppButton';
import EmojiReactions from './components/EmojiReactions';
import { playCheckSound, playPurchaseSound } from './helpers';

// ✅ IMPORT FROM CONFIG (SINGLE SOURCE OF TRUTH)
import { SERVER_URL, API_BASE } from "./config";

// ============================================================
// ERROR BOUNDARY - catches render errors from child components
// ============================================================
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err) { console.error('Section error:', err); }
  render() { return this.state.hasError ? (this.props.fallback || null) : this.props.children; }
}

// ============================================================
// CONSTANTS
// ============================================================
const TOKEN_KEY = 'mychess_token';
const ROOM_KEY = 'mychess_room';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// NOTE: Pieces are rendered as inline SVG via <ChessPiece /> so they are
// always visible on every device (no font dependency) and scale with the board.

// ============================================================
// MATCH PAGE STYLES - COMPLETE FIX FOR MOBILE
// ============================================================
const MATCH_STYLES = {
  page: {
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    background: 'transparent',
  },
  grid: {},
  container: {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '10px 8px 30px',
    boxSizing: 'border-box',
    overflowX: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    width: '100%',
    boxSizing: 'border-box',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  logo: { width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#8b4dff,#5420ae)', boxShadow: '0 10px 30px rgba(109,51,230,.35)', fontSize: 18 },
  brandName: { fontWeight: 800, letterSpacing: '.12em', fontSize: 14 },
  brandSub: { fontSize: 7, fontWeight: 700, letterSpacing: '.15em', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  topActions: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  smallButton: { border: '1px solid rgba(255,255,255,.09)', background: 'rgba(255,255,255,.045)', color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '11px' },
  statusPill: { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)', fontSize: 10, color: '#c9c1d5' },
  dot: { width: 6, height: 6, borderRadius: '50%', background: '#9b67ff', boxShadow: '0 0 14px rgba(155,103,255,.8)' },
  boardPanel: {
    minWidth: 0,
    padding: '10px',
    borderRadius: '14px',
    background: 'linear-gradient(145deg, rgba(255,255,255,.055), rgba(255,255,255,.018))',
    border: '1px solid rgba(255,255,255,.09)',
    boxShadow: '0 24px 80px rgba(0,0,0,.4), inset 0 1px rgba(255,255,255,.04)',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  playerBar: {
    minHeight: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    padding: '4px 10px',
    marginBottom: '6px',
    borderRadius: '10px',
    background: 'rgba(0,0,0,.22)',
    border: '1px solid rgba(255,255,255,.06)',
    width: '100%',
    boxSizing: 'border-box',
  },
  playerInfo: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  avatar: { width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg,#24153b,#120b1f)', border: '1px solid rgba(255,255,255,.08)', fontWeight: 800, fontSize: '12px', flexShrink: 0 },
  playerName: { fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px' },
  playerMeta: { fontSize: 9, color: '#827a8f', marginTop: 1 },
  turnBadge: { fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#b58cff', flexShrink: 0, padding: '2px 8px', background: 'rgba(168,85,247,0.15)', borderRadius: '4px' },
  boardWrap: {
    width: '100%',
    aspectRatio: '1 / 1',
    maxWidth: '100%',
    position: 'relative',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,.42)',
    margin: '0 auto',
  },
  board: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gridTemplateRows: 'repeat(8, 1fr)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    touchAction: 'none',
  },
  square: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    overflow: 'visible',
    aspectRatio: '1 / 1',
    width: '100%',
    height: '100%',
    minWidth: 0,
    minHeight: 0,
  },
  coordinates: { position: 'absolute', left: 2, top: 2, fontSize: 7, fontWeight: 700, pointerEvents: 'none', opacity: 0.5 },
  sidePanel: {
    minWidth: 0,
    display: 'grid',
    gap: '8px',
    width: '100%',
    boxSizing: 'border-box',
  },
  card: {
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,.08)',
    background: 'linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018))',
    boxShadow: '0 18px 50px rgba(0,0,0,.28)',
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box',
  },
  cardHeader: { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 10, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' },
  cardBody: { padding: '8px 12px' },
  clock: { fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 800, letterSpacing: '.03em' },
  clockLabel: { color: '#82798f', fontSize: 8, letterSpacing: '.1em', textTransform: 'uppercase' },
  roomCode: { fontSize: 18, fontWeight: 800, letterSpacing: '.12em', color: '#c19cff', wordBreak: 'break-all' },
  messageList: { height: '120px', overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px' },
  chatMessage: { padding: '4px 8px', borderRadius: '8px', background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.05)' },
  chatName: { fontSize: 8, fontWeight: 700, color: '#a97bff', marginBottom: 2 },
  chatText: { fontSize: 10, color: '#ddd7e5', lineHeight: 1.3, wordBreak: 'break-word' },
  chatForm: { display: 'flex', gap: 4, padding: '6px 12px 8px', borderTop: '1px solid rgba(255,255,255,.06)' },
  input: { flex: 1, minWidth: 0, border: '1px solid rgba(255,255,255,.09)', background: 'rgba(0,0,0,.25)', color: '#fff', borderRadius: 8, padding: '6px 8px', outline: 'none', fontSize: '11px' },
  sendButton: { border: 0, borderRadius: 8, padding: '0 12px', color: '#fff', background: 'linear-gradient(135deg,#8848ff,#6025cb)', fontWeight: 700, cursor: 'pointer', fontSize: '11px' },
  moves: { maxHeight: '100px', overflowY: 'auto', padding: '6px' },
  moveRow: { display: 'grid', gridTemplateColumns: '28px 1fr', gap: '4px', padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,.03)', fontSize: '10px' },
  muted: { color: '#7f7789' },
  resultBanner: { padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg,rgba(129,67,255,.18),rgba(129,67,255,.05))', border: '1px solid rgba(145,94,255,.25)', textAlign: 'center' },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function safeJson(response) {
  return response.json().catch(() => ({}));
}

function cleanRoom(room) {
  return String(room || '').replace(/\D/g, '').slice(0, 6);
}

function squareName(row, col) {
  return `${FILES[col]}${8 - row}`;
}

function parseFEN(fen) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  if (!fen) return board;
  const placement = String(fen).split(' ')[0] || '';
  const rows = placement.split('/');
  for (let row = 0; row < 8; row += 1) {
    let col = 0;
    for (const character of rows[row] || '') {
      if (/\d/.test(character)) {
        col += Number(character);
      } else {
        const color = character === character.toUpperCase() ? 'w' : 'b';
        board[row][col] = { color, type: character.toLowerCase() };
        col += 1;
      }
    }
  }
  return board;
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// Helper to get the applied visual from equipped items
function getEquippedVisual(equippedItems, category) {
  const item = equippedItems.find(i => i.category === category && i.is_equipped);
  return item?.preview_data || {};
}

// ============================================================
// MAIN APP COMPONENT
// ============================================================
function App() {
  const navigate = useNavigate();

  // ---- THEME INITIALIZATION & SOUND ----
  useEffect(() => {
    initClickSound();
    reinitializeTheme();
  }, []);

  // Global event listener for ALL clicks on buttons/links
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const target = e.target.closest('a, button, [role="button"]');
      if (target) {
        playClickSound();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // ---- AUTH STATE ----
  const [mode, setMode] = useState('login');
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [account, setAccount] = useState(null);
  const [screen, setScreen] = useState('home');
  const [lobbyMode, setLobbyMode] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState('');
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyMessage, setLobbyMessage] = useState('');
  const [lobbyMessageType, setLobbyMessageType] = useState('');
  const [isQuickMatching, setIsQuickMatching] = useState(false);
  const socketRef = useRef(null);
  const tempSocketRef = useRef(null);
  const [playerRole, setPlayerRole] = useState(null);
  const [players, setPlayers] = useState({ white: null, black: null });
  const [gameState, setGameState] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [matchMessage, setMatchMessage] = useState('');
  const [showMatchFoundVS, setShowMatchFoundVS] = useState(false);
  const matchFoundTriggeredRef = useRef(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [moveHistory, setMoveHistory] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [draggedSquare, setDraggedSquare] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const chatEndRef = useRef(null);
  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [equippedItems, setEquippedItems] = useState([]);
  // ADDED: equipped profile + animated board themes (separate "Themes" tab system)
  const [themes, setThemes] = useState({ profileTheme: null, boardTheme: null });
  const [activeLobbies, setActiveLobbies] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hintSquare, setHintSquare] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [moveTrailSquare, setMoveTrailSquare] = useState(null);
  const [damageExplosionSquare, setDamageExplosionSquare] = useState(null);
  const [showQuests, setShowQuests] = useState(false);
  const [showChessTips, setShowChessTips] = useState(false);
  const [showChessAI, setShowChessAI] = useState(false);
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [matchCommentary, setMatchCommentary] = useState('');
  const [legalMoveSquares, setLegalMoveSquares] = useState([]);
  const [showLoginParticles, setShowLoginParticles] = useState(false);
  const [captureFlashActive, setCaptureFlashActive] = useState(false);
  // Friends & Challenge
  const [showFriends, setShowFriends] = useState(false);
  const presenceSocketRef = useRef(null);
  const [invite, setInvite] = useState(null); // { fromId, fromName, roomCode }
  const [friendsRefresh, setFriendsRefresh] = useState(0);
  const [dmIncoming, setDmIncoming] = useState(null); // incoming DM to relay to FriendsPanel
  const [dmTick, setDmTick] = useState(0);
 
  const isRegister = mode === 'register';

  // This runs when the page changes
  useEffect(() => {
    if (window.location.pathname.includes('ai-arena')) {
      notifyMusicForMatch(true);
    } else {
      notifyMusicForMatch(false);
    }
  }, [window.location.pathname]);

  useEffect(() => {
    const killSwitch = setTimeout(() => {
      setShowSplash(false);
    }, 8000);
    return () => clearTimeout(killSwitch);
  }, []);

  // ---- CLOCK ----
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---- CHAT AUTO SCROLL ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ---- CHECK LOGIN SESSION ----
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setCheckingSession(false);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await safeJson(response);
        if (!response.ok || !data.ok) throw new Error(data.message || 'Session expired.');
        setAccount(data.account);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setAccount(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        setCheckingSession(false);
      });
  }, []);

  // ---- FETCH EQUIPPED ITEMS + LEADERBOARD ON LOGIN ----
  useEffect(() => {
    if (!account) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetch(`${API_BASE}/shop/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok) setEquippedItems(data.equipped); })
      .catch(() => {});
    fetch(`${API_BASE}/leaderboard`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok) setTopPlayers(data.players); })
      .catch(() => {});
  }, [account]);

  // ---- FETCH EQUIPPED THEMES ON LOGIN (ADDED) ----
  useEffect(() => {
    if (!account) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    fetch(`${API_BASE}/themes/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok) setThemes({ profileTheme: data.profileTheme, boardTheme: data.boardTheme }); })
      .catch(() => {});
  }, [account]);

  // ---- PRESENCE SOCKET (friends & challenges) ----
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!account || !token) return;

    const presence = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: true,
    });
    presenceSocketRef.current = presence;

    presence.on('connect', () => {});
    presence.on('friendRequest', (data) => {
      setFriendsRefresh((n) => n + 1);
    });
    presence.on('friendAccepted', () => {
      setFriendsRefresh((n) => n + 1);
    });
    presence.on('friendListChanged', () => {
      setFriendsRefresh((n) => n + 1);
    });
    presence.on('challengeInvite', (data) => {
      setInvite({
        fromId: data.fromId,
        fromName: data.fromName,
        roomCode: data.roomCode,
      });
    });
    presence.on('friendMessage', (data) => {
      setDmIncoming(data);
      setDmTick((n) => n + 1);
      setFriendsRefresh((n) => n + 1);
    });

    return () => {
      presence.disconnect();
      presenceSocketRef.current = null;
    };
  }, [account?.id]);

  // ---- CLEANUP SOCKET ----
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (tempSocketRef.current) {
        tempSocketRef.current.disconnect();
        tempSocketRef.current = null;
      }
    };
  }, []);

  // ---- CONNECT TO MATCH ----
  const connectToMatch = useCallback((roomId) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !account) {
      setMatchMessage('Your MYCHESS login session has expired.');
      return;
    }
    const room = cleanRoom(roomId);
    if (room.length !== 6) {
      setMatchMessage('Invalid MYCHESS room code.');
      return;
    }
    if (socketRef.current) socketRef.current.disconnect();

    fetch(`${API_BASE}/shop/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.ok) setEquippedItems(data.equipped);
      })
      .catch(() => {});
    // ADDED: refresh equipped themes when a match starts so the animated board
    // theme is current (parallel to the equippedItems refresh above).
    fetch(`${API_BASE}/themes/equipped`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (data.ok) setThemes({ profileTheme: data.profileTheme, boardTheme: data.boardTheme }); })
      .catch(() => {});

    setScreen('match');
    setOpponentLeft(false);
    notifyMusicForMatch(true);
    setGameStarted(false);
    matchFoundTriggeredRef.current = false;
    setPlayerRole(null);
    setSelectedSquare(null);
    setDraggedSquare(null);
    setMoveHistory([]);
    setChatMessages([]);
    setPlayers({ white: null, black: null });
    setConnectionStatus('connecting');
    setMatchMessage('Connecting to MYCHESS multiplayer server...');
    localStorage.setItem(ROOM_KEY, room);

    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      setMatchMessage('Connected. Joining match room...');
      newSocket.emit('joinRoom', { roomId: room, username: account.username, playerId: String(account.id) });
    });

    newSocket.on('playerRole', (data) => {
      if (!data) return;
      setPlayerRole(data.role || null);
      if (data.players) setPlayers(data.players);
      if (data.messages) setChatMessages(data.messages);
      if (data.history) setMoveHistory(data.history);
      setGameState(data);
      if (data.players?.white && data.players?.black) {
        setGameStarted(true);
        setMatchMessage('Both players are connected. Your match is ready.');
      } else {
        setMatchMessage('Waiting for your opponent to join...');
      }
    });

    newSocket.on('playersUpdated', (data) => {
      if (!data) return;
      if (data.players) {
        setPlayers(data.players);
        if (data.players.white && data.players.black) {
          setGameStarted(true);
          setMatchMessage('Opponent connected. Match started!');
        }
      }
    });

    newSocket.on('gameStart', (data) => {
      setGameStarted(true);
      setGameState(data);
      if (data?.players) setPlayers(data.players);
      if (data?.history) setMoveHistory(data.history);
      setMatchMessage('Match started! Good luck.');
    });

    newSocket.on('moveMade', (data) => {
      if (!data) return;
      setGameState(data);
      if (data.players) setPlayers(data.players);
      if (data.history) setMoveHistory(data.history);
      setSelectedSquare(null);
      setDraggedSquare(null);
      setLegalMoveSquares([]);
      setMatchMessage('');

      if (data.isCheckmate) {
        const winner = data.turn === 'w' ? 'Black' : 'White';
        setMatchCommentary(`👑 Checkmate! ${winner} wins the game!`);
      } else if (data.isDraw) {
        setMatchCommentary('🤝 Draw! Both players fought well.');
      } else if (data.isCheck) {
        setMatchCommentary(`⚠️ Your King is in Check! Protect him now!`);
      } else if (data.lastMove?.captured) {
        setMatchCommentary('💥 Piece captured! The board is heating up!');
      } else if (data.turn === playerRole) {
        setMatchCommentary('✅ Your turn! Time to make your next move!');
      } else {
        setMatchCommentary('⏳ Your opponent is thinking...');
      }

      if (data.lastMove?.captured) {
        playCaptureSound();
        setCaptureFlashActive(true);
        setTimeout(() => setCaptureFlashActive(false), 300);
        if (navigator.vibrate) navigator.vibrate([80, 30, 80]);
      } else {
        if (navigator.vibrate) navigator.vibrate(30);
      }

      if (data.isCheck) {
        playCheckSound();
      }

      if (data.lastMove?.to) {
        setMoveTrailSquare(data.lastMove.to);
        setTimeout(() => setMoveTrailSquare(null), 800);
      }
      if (data.lastMove?.captured) {
        setDamageExplosionSquare(data.lastMove.to);
        setTimeout(() => setDamageExplosionSquare(null), 800);
      }
    });

    newSocket.on('moveRejected', (data) => {
      setSelectedSquare(null);
      setDraggedSquare(null);
      setMatchMessage(data?.message || 'That move is not legal.');
    });

    newSocket.on('chatMessage', (data) => {
      if (!data) return;
      setChatMessages((previous) => [...previous, data].slice(-100));
    });

    newSocket.on('gameReset', (data) => {
      setGameState(data);
      setMoveHistory(data?.history || []);
      setSelectedSquare(null);
      setDraggedSquare(null);
      setMatchMessage('The game has been reset.');
    });

    newSocket.on('roomError', (data) => {
      setConnectionStatus('error');
      setMatchMessage(data?.message || 'Unable to join this MYCHESS room.');
    });

    newSocket.on('connect_error', (error) => {
      console.error('MYCHESS Socket.IO error:', error);
      setConnectionStatus('error');
      setMatchMessage('Unable to connect to the MYCHESS multiplayer server.');
    });

    newSocket.on('opponentDisconnected', () => {
      setOpponentLeft(true);
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setMatchMessage('Connection lost. Trying to reconnect...');
    });

    newSocket.io.on('reconnect', () => {
      setConnectionStatus('connected');
      newSocket.emit('joinRoom', { roomId: room, username: account.username, playerId: String(account.id) });
    });
  }, [account]);

  // ---- AUTH FUNCTIONS ----
  function clearMessage() {
    setMessage('');
    setMessageType('');
  }

  async function handleRegister(event) {
    event.preventDefault();
    clearMessage();
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanUsername) { setMessage('Please enter your in-game username.'); setMessageType('error'); return; }
    if (!cleanEmail) { setMessage('Please enter your email address.'); setMessageType('error'); return; }
    if (password.length < 8) { setMessage('Your password must contain at least 8 characters.'); setMessageType('error'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password }),
      });
      const data = await safeJson(response);
      if (!response.ok || !data.ok) throw new Error(data.message || 'Unable to create your account.');
      localStorage.setItem(TOKEN_KEY, data.token);
      setAccount(data.account);
      setShowLoginParticles(true);
      setTimeout(() => setShowLoginParticles(false), 1500);
      setPassword('');
      setMessage('Your MYCHESS account has been created successfully.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to create your account.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    clearMessage();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setMessage('Please enter your email address.'); setMessageType('error'); return; }
    if (!password) { setMessage('Please enter your password.'); setMessageType('error'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await safeJson(response);
      if (!response.ok || !data.ok) throw new Error(data.message || 'Unable to login.');
      localStorage.setItem(TOKEN_KEY, data.token);
      setAccount(data.account);
      setShowLoginParticles(true);
      setTimeout(() => setShowLoginParticles(false), 1500);
      setPassword('');
      setMessage('Welcome back to MYCHESS.');
      setMessageType('success');
    } catch (error) {
      setMessage(error.message || 'Unable to login.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      if (token) await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROOM_KEY);
    setAccount(null);
    setScreen('home');
    setLobbyMode(null);
    setCreatedRoom('');
    setRoomCode('');
    setLobbyMessage('');
    setLobbyMessageType('');
    setMode('login');
    setUsername('');
    setEmail('');
    setPassword('');
    setShowShop(false);
    setShowHistory(false);
    setShowInventory(false);
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    clearMessage();
    setPassword('');
  }

  // ---- FRIENDS & CHALLENGE ----
  function openFriends() {
    setShowFriends(true);
  }
  function closeFriends() {
    setShowFriends(false);
  }
  function acceptInvite() {
    if (!invite) return;
    const code = invite.roomCode;
    setInvite(null);
    setShowFriends(false);
    setRoomCode(code);
    connectToMatch(code);
  }
  function declineInvite() {
    setInvite(null);
  }

  // ---- LOBBY FUNCTIONS ----
  function openCreateLobby() {
    setLobbyMode('create');
    setCreatedRoom('');
    setLobbyMessage('');
    setLobbyMessageType('');
  }

  async function handleCreateLobby() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLobbyMessage('Your MYCHESS session has expired. Please login again.'); setLobbyMessageType('error'); return; }
    setLobbyLoading(true);
    setLobbyMessage('');
    try {
      const response = await fetch(`${API_BASE}/lobby/create`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await safeJson(response);
      if (!response.ok || !data.ok) throw new Error(data.message || 'Unable to create lobby.');
      const room = cleanRoom(data.roomId);
      if (room.length !== 6) throw new Error('The server returned an invalid room code.');
      setCreatedRoom(room);
      localStorage.setItem(ROOM_KEY, room);
      setLobbyMode(null);
      setLobbyMessage('');
      setLobbyMessageType('');
      connectToMatch(room);
    } catch (error) {
      setLobbyMessage(error.message || 'Unable to create lobby.');
      setLobbyMessageType('error');
    } finally {
      setLobbyLoading(false);
    }
  }

  function openJoinGame() {
    setLobbyMode('join');
    setRoomCode('');
    setLobbyMessage('');
    setLobbyMessageType('');
  }

  async function handleJoinGame() {
    const token = localStorage.getItem(TOKEN_KEY);
    const cleanCode = cleanRoom(roomCode);
    if (cleanCode.length !== 6) { setLobbyMessage('Please enter the 6-digit room code.'); setLobbyMessageType('error'); return; }
    if (!token) { setLobbyMessage('Your MYCHESS session has expired. Please login again.'); setLobbyMessageType('error'); return; }
    setLobbyLoading(true);
    setLobbyMessage('');
    try {
      const response = await fetch(`${API_BASE}/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: cleanCode }),
      });
      const data = await safeJson(response);
      if (!response.ok || !data.ok) throw new Error(data.message || 'Unable to join lobby.');
      localStorage.setItem(ROOM_KEY, data.roomId);
      setLobbyMode(null);
      setLobbyMessage('');
      setLobbyMessageType('');
      connectToMatch(data.roomId);
    } catch (error) {
      setLobbyMessage(error.message || 'Unable to join lobby.');
      setLobbyMessageType('error');
    } finally {
      setLobbyLoading(false);
    }
  }

  function closeLobbyModal() {
    if (lobbyLoading) return;
    setLobbyMode(null);
    setLobbyMessage('');
    setLobbyMessageType('');
  }

  // ---- QUICK MATCH ----
  function handleQuickMatch() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !account) {
      setLobbyMessage('Your MYCHESS session has expired. Please login again.');
      setLobbyMessageType('error');
      return;
    }
    if (isQuickMatching) return;
    setIsQuickMatching(true);
    setLobbyMessage('');
    setLobbyMessageType('');

    const tempSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });

    tempSocket.on('connect', () => {
      tempSocket.emit('quickMatch');
    });

    tempSocket.on('quickMatchQueued', () => {
      setLobbyMessage('Searching for an opponent...');
    });

    tempSocket.on('matchFound', (data) => {
      if (data && data.roomId) {
        setIsQuickMatching(false);
        setLobbyMessage('');
        setLobbyMessageType('');
        localStorage.setItem(ROOM_KEY, data.roomId);
        tempSocket.disconnect();
        connectToMatch(data.roomId);
      }
    });

    tempSocket.on('roomError', (data) => {
      setIsQuickMatching(false);
      setLobbyMessage(data?.message || 'Quick Match failed.');
      setLobbyMessageType('error');
      tempSocket.disconnect();
    });

    tempSocket.on('connect_error', () => {
      setIsQuickMatching(false);
      setLobbyMessage('Unable to connect to the server.');
      setLobbyMessageType('error');
      tempSocket.disconnect();
    });

    tempSocketRef.current = tempSocket;
  }

  function cancelQuickMatch() {
    if (tempSocketRef.current) {
      tempSocketRef.current.emit('cancelQuickMatch');
      tempSocketRef.current.disconnect();
      tempSocketRef.current = null;
    }
    setIsQuickMatching(false);
    setLobbyMessage('');
    setLobbyMessageType('');
  }

  // ---- CHESS LOGIC ----
  function submitMove(from, to) {
    if (!socketRef.current) { setMatchMessage('You are not connected to the multiplayer server.'); return; }
    if (!gameState || !gameStarted) return;
    if (playerRole !== 'w' && playerRole !== 'b') { setMatchMessage('You are not assigned a player side.'); return; }
    const turn = gameState.FEN?.split(' ')[1];
    if (turn && turn !== playerRole) { setMatchMessage('It is not your turn.'); return; }
    socketRef.current.emit('makeMove', { roomId: localStorage.getItem(ROOM_KEY), move: { from, to, promotion: 'q' } });
  }

  const getHint = async () => {
    if (!gameState || !gameStarted) return;
    const turn = gameState.FEN?.split(' ')[1];
    if (turn !== playerRole) { setMatchMessage('⏳ It is not your turn yet!'); return; }
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const response = await fetch(`${API_BASE}/game/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fen: gameState.FEN })
      });
      const data = await response.json();
      if (data.ok && data.hint) {
        setHintSquare(data.hint.from);
        setMatchMessage(`💡 Hint: Try moving ${data.hint.san}`);
        setTimeout(() => setHintSquare(null), 5000);
      } else {
        setMatchMessage('💡 No legal moves available.');
      }
    } catch (error) {
      console.error('Hint error:', error);
      setMatchMessage('⚠️ Unable to generate hint right now.');
    }
  };

  function handleSquareClick(square, piece) {
    if (!gameStarted || (playerRole !== 'w' && playerRole !== 'b')) return;
    
    if (selectedSquare) {
      if (selectedSquare === square) { setSelectedSquare(null); setLegalMoveSquares([]); return; }
      
      setLegalMoveSquares([]);
      submitMove(selectedSquare, square);
      setSelectedSquare(null);
      return;
    }
    
    if (piece && piece.color === playerRole) {
      const turn = gameState?.FEN?.split(' ')[1];
      if (turn && turn !== playerRole) { 
        setMatchCommentary('⏳ Wait for your opponent to move.');
        return; 
      }
      
      try {
        const game = new Chess(gameState.FEN);
        const moves = game.moves({ square, verbose: true });
        setLegalMoveSquares(moves.map(m => m.to));
      } catch (e) {
        console.error('Error generating legal moves:', e);
      }
      
      setSelectedSquare(square);
    }
  }

  function handleDragStart(event, square, piece) {
    if (!piece || !gameStarted || piece.color !== playerRole) { event.preventDefault(); return; }
    const turn = gameState?.FEN?.split(' ')[1];
    if (turn && turn !== playerRole) { event.preventDefault(); setMatchMessage('It is not your turn.'); return; }
    setDraggedSquare(square);
    try { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', square); } catch {}
  }

  function handleDragOver(event) {
    event.preventDefault();
    try { event.dataTransfer.dropEffect = 'move'; } catch {}
  }

  function handleDrop(event, targetSquare) {
    event.preventDefault();
    let from = draggedSquare;
    try { const transferred = event.dataTransfer.getData('text/plain'); if (transferred) from = transferred; } catch {}
    setDraggedSquare(null);
    if (!from || from === targetSquare) return;
    submitMove(from, targetSquare);
  }

  function sendChat(event) {
    event.preventDefault();
    const text = chatInput.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit('sendChat', { roomId: localStorage.getItem(ROOM_KEY), message: text.slice(0, 280) });
    setChatInput('');
  }

  function resetGame() {
    if (!socketRef.current) return;
    socketRef.current.emit('resetGame', { roomId: localStorage.getItem(ROOM_KEY) });
  }

  function leaveMatch() {
    const room = localStorage.getItem(ROOM_KEY);
    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId: room });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    localStorage.removeItem(ROOM_KEY);
    notifyMusicForMatch(false);
    setScreen('home');
    setGameStarted(false);
    matchFoundTriggeredRef.current = false;
    setPlayerRole(null);
    setGameState(null);
    setMoveHistory([]);
    setChatMessages([]);
    setPlayers({ white: null, black: null });
    setConnectionStatus('disconnected');
    setMatchMessage('');
    setOpponentLeft(false);
  }

  // ---- BOARD DATA ----
  const board = useMemo(() => parseFEN(gameState?.FEN), [gameState?.FEN]);

  const displayedBoard = useMemo(() => {
    const rows = [...Array(8).keys()];
    if (playerRole === 'b') rows.reverse();
    return rows.map((row) => {
      const cols = [...Array(8).keys()];
      if (playerRole === 'b') cols.reverse();
      return { row, cols };
    });
  }, [playerRole]);

  const currentTurn = gameState?.FEN?.split(' ')[1] || null;
  const isGameOver = Boolean(gameState?.isGameOver);
  const isCheck = Boolean(gameState?.isCheck);

  const { material, chronological: capturedChronological } = useMemo(() => {
    if (!moveHistory || moveHistory.length === 0) return { captured: { w: [], b: [] }, material: { w: 0, b: 0 }, chronological: [] };
    return getCapturedPieces(moveHistory);
  }, [moveHistory]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // ---- FETCH ACTIVE LOBBIES ----
  useEffect(() => {
    if (account && screen === 'home') fetchActiveLobbies();
  }, [account, screen]);

  const fetchActiveLobbies = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    try {
      const response = await fetch(`${API_BASE}/lobbies/active`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (data.ok) setActiveLobbies(data.lobbies);
    } catch (error) {
      console.error('Error fetching lobbies:', error);
    }
  };

  // ---- CONFETTI EFFECT ----
  useEffect(() => {
    if (isGameOver && screen === 'match') {
      const whiteWon = currentTurn === 'b';
      const blackWon = currentTurn === 'w';
      if ((playerRole === 'w' && whiteWon) || (playerRole === 'b' && blackWon)) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }
  }, [isGameOver, currentTurn, playerRole, screen]);

  // ---- MATCH RESULT ----
  const matchResult = useMemo(() => {
    if (!isGameOver) return '';
    const fen = gameState?.FEN || '';
    if (fen && fen.split(' ')[3] === '-') return 'Game over.';
    if (currentTurn === 'w') return 'Black wins.';
    if (currentTurn === 'b') return 'White wins.';
    return 'Game over.';
  }, [isGameOver, gameState?.FEN, currentTurn]);

  useEffect(() => {
    if (gameStarted && !matchFoundTriggeredRef.current && screen === 'match') {
      matchFoundTriggeredRef.current = true;
      setShowMatchFoundVS(true);
    }
  }, [gameStarted, screen]);

  // ---- RENDER: SPLASH ----
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // ---- RENDER: SESSION CHECK ----
  if (checkingSession) {
    return (
      <div className="mychess-auth-page">
        <div className="mychess-background-grid" />
        <div className="mychess-logo-mark">♞</div>
        <div className="mychess-loading-title">MYCHESS</div>
        <div className="mychess-loading-text">Preparing your game...</div>
      </div>
    );
  }

  // ---- RENDER: MATCH PAGE ----
  if (account && screen === 'match') {
    const whiteName = players.white?.name || 'Waiting...';
    const blackName = players.black?.name || 'Waiting...';
    const whiteTurn = currentTurn === 'w';
    const blackTurn = currentTurn === 'b';
    const boardTheme = getEquippedVisual(equippedItems, 'board');
    const lightColor = boardTheme.light || '#e8e3ee';
    const darkColor = boardTheme.dark || '#5b466f';
    // ADDED: The "Themes" tab animated board theme takes precedence over the Items
    // board so the two systems never both paint the board. Applies only when a board
    // theme is equipped, otherwise falls back to the Items board / default colors.
    const themedLight = themes.boardTheme?.light_sq || null;
    const themedDark = themes.boardTheme?.dark_sq || null;
    const boardLight = themedLight || lightColor;
    const boardDark = themedDark || darkColor;
    const nameColor = getEquippedVisual(equippedItems, 'name_color').color;
    const frameStyle = getEquippedVisual(equippedItems, 'avatar_frame').frame;
    const borderColor = frameStyle === 'gold' ? '#ffd700' : frameStyle === 'crystal' ? '#00ffff' : frameStyle === 'diamond' ? '#ffffff' : frameStyle === 'crown' ? '#ffd700' : 'rgba(255,255,255,.08)';

    // ADDED: Per-player cosmetics — the user's own equipped name color and avatar
    // frame apply ONLY to their own name/avatar; the opponent always renders default
    // so there is no color/effect confusion between players in-match. Additive only.
    const myNameColor = nameColor || '#fff';
    const oppNameColor = '#fff';
    const myBorderColor = borderColor;
    const oppBorderColor = 'rgba(255,255,255,.08)';

    // ADDED: the opponent's account id (for in-match reactions to target). The
    // user's own id comes from `account`; the opponent is the other player.
    const opponentId = playerRole === 'w' ? players.black?.id : players.white?.id;

    const findKingSquare = (fen, color) => {
      if (!fen) return null;
      const boardPart = fen.split(' ')[0];
      const rows = boardPart.split('/');
      const files = 'abcdefgh';
      const kingChar = color === 'w' ? 'K' : 'k';
      for (let r = 0; r < rows.length; r++) {
        let col = 0;
        for (const ch of rows[r]) {
          if (ch >= '1' && ch <= '8') { col += parseInt(ch); }
          else {
            if (ch === kingChar) return files[col] + (8 - r);
            col++;
          }
        }
      }
      return null;
    };
    const kingCheckSquare = isCheck ? findKingSquare(gameState?.FEN, currentTurn) : null;

    return (
      <div style={MATCH_STYLES.page}>
        <FloatingBackground />
        <MusicWidget />
        <EntranceThemes token={localStorage.getItem(TOKEN_KEY)} players={players} socket={socketRef.current} />
        <MessageNotifier />

        {showMatchFoundVS && (
          <MatchFoundVS
            whiteName={whiteName}
            blackName={blackName}
            playerRole={playerRole}
            onComplete={() => setShowMatchFoundVS(false)}
          />
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

        {showConfetti && (
          <div className="confetti-winner-banner">🏆 VICTORY! 🏆</div>
        )}

        <VictoryParticles active={showConfetti} />

        {captureFlashActive && (
          <div className="capture-flash-overlay" />
        )}

        <div style={MATCH_STYLES.grid} />
        <div style={MATCH_STYLES.container}>
          <header style={MATCH_STYLES.header}>
            <div style={MATCH_STYLES.brand}>
              <div style={MATCH_STYLES.logo}>♞</div>
              <div>
                <div style={MATCH_STYLES.brandName}>MYCHESS</div>
                <div style={MATCH_STYLES.brandSub}>REAL-TIME MULTIPLAYER</div>
              </div>
            </div>
            <div style={MATCH_STYLES.topActions}>
              <div style={MATCH_STYLES.statusPill}>
                <span style={{ ...MATCH_STYLES.dot, background: connectionStatus === 'connected' ? '#71e6a1' : '#f2a65a' }} />
                {connectionStatus === 'connected' ? 'CONNECTED' : connectionStatus === 'connecting' ? 'CONNECTING' : 'DISCONNECTED'}
              </div>
              <div style={{ ...MATCH_STYLES.statusPill, color: '#d5cde0' }}>{formatClock(currentTime)}</div>
              <button type="button" style={MATCH_STYLES.smallButton} onClick={leaveMatch}>Leave</button>
            </div>
          </header>

          <div className="match-layout">
            <section style={MATCH_STYLES.boardPanel}>
              {/* BLACK / TOP PLAYER */}
              <div style={MATCH_STYLES.playerBar}>
                <div style={MATCH_STYLES.playerInfo}>
                  <div style={{ ...MATCH_STYLES.avatar, border: `2px solid ${playerRole === 'b' ? myBorderColor : oppBorderColor}` }}>{blackName.charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={MATCH_STYLES.playerName}>
                      <span style={{ color: playerRole === 'b' ? myNameColor : oppNameColor }}>{blackName}</span>
                      {playerRole === 'b' && <span style={{ marginLeft: 7, color: '#a97bff', fontSize: 10 }}>YOU</span>}
                    </div>
                    <div style={MATCH_STYLES.playerMeta}>BLACK · OPPONENT</div>
                  </div>
                </div>
                {blackTurn && <div style={MATCH_STYLES.turnBadge}>YOUR TURN</div>}
              </div>

              {/* BOARD - FULL WIDTH SQUARE */}
<div style={MATCH_STYLES.boardWrap}>
  <div style={MATCH_STYLES.board} className={captureFlashActive ? 'board-shake' : ''}>
    {displayedBoard.map(({ row, cols }) => (
      <div key={row} style={{ display: 'contents' }}>
        {cols.map((col) => {
          const square = squareName(row, col);
          const piece = board[row][col];
          const isDark = (row + col) % 2 === 1;
          const isSelected = selectedSquare === square;
          const isLegalMove = legalMoveSquares.includes(square);
          const isLastMove = gameState?.lastMove?.from === square || gameState?.lastMove?.to === square;
          const pieceSkin = equippedItems.find((item) => item.category === 'piece');
          const effectData = getEquippedVisual(equippedItems, 'effect');
          const effectName = effectData?.effect || null;

          const getEffectStyle = () => {
            if (!effectName) return {};
            if (effectName === 'sparkle') return { filter: 'drop-shadow(0 0 6px rgba(255,215,0,.7))', animation: 'effectSparkle 1.5s ease-in-out infinite' };
            if (effectName === 'fire') return { filter: 'drop-shadow(0 0 8px rgba(255,80,0,.8))', animation: 'effectFire 1s ease-in-out infinite' };
            if (effectName === 'rainbow') return { animation: 'effectRainbow 2.5s linear infinite' };
            if (effectName === 'shadow') return { filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.6))', opacity: 0.85 };
            return {};
          };

          return (
            <div
              key={square}
              style={{
                ...MATCH_STYLES.square,
                background: isSelected ? 'linear-gradient(135deg,#a36bff,#6b32d7)' : isLastMove ? 'rgba(166,112,255,.42)' : isDark ? boardDark : boardLight,
                boxShadow: isSelected ? 'inset 0 0 0 2px rgba(255,255,255,.45)' : 'none',
              }}
              onClick={() => handleSquareClick(square, piece)}
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, square)}
              className={[
                kingCheckSquare === square ? 'check-king-pulse' : '',
                damageExplosionSquare === square ? 'damage-explosion' : '',
                moveTrailSquare === square ? 'move-trail' : '',
              ].filter(Boolean).join(' ')}
            >
              {isLegalMove && (
                <div className="ai-legal-move-dot" style={{
                  position: 'absolute',
                  width: '30%',
                  height: '30%',
                  background: 'rgba(168, 85, 247, 0.5)',
                  borderRadius: '50%',
                  zIndex: 3,
                  pointerEvents: 'none',
                }}></div>
              )}

              {col === (playerRole === 'b' ? 7 : 0) && (
                <span style={{ ...MATCH_STYLES.coordinates, color: isDark ? '#f2dfff' : '#694d78' }}>{8 - row}</span>
              )}
              {row === (playerRole === 'b' ? 0 : 7) && (
                <span style={{ position: 'absolute', right: 2, bottom: 2, fontSize: 7, fontWeight: 700, opacity: 0.5, color: isDark ? '#f2dfff' : '#694d78', pointerEvents: 'none' }}>
                  {FILES[col]}
                </span>
              )}
              {kingCheckSquare === square && (
                <span className="check-warning-icon">!</span>
              )}
              {piece && (
                <span
                  className="match-piece"
                  draggable={piece.color === playerRole && gameStarted}
                  onDragStart={(event) => handleDragStart(event, square, piece)}
                  style={{ opacity: draggedSquare === square ? 0.45 : 1, cursor: piece.color === playerRole && gameStarted ? 'grab' : 'default', ...(piece.color === playerRole ? getEffectStyle() : {}) }}
                >
                  <ChessPiece color={piece.color} type={piece.type} tint={piece.color === playerRole ? (pieceSkin?.preview_data?.color || undefined) : undefined} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    ))}
  </div>
</div>

              {/* WHITE / BOTTOM PLAYER */}
              <div style={{ ...MATCH_STYLES.playerBar, marginTop: 9, marginBottom: 0 }}>
                <div style={MATCH_STYLES.playerInfo}>
                  <div style={{ ...MATCH_STYLES.avatar, border: `2px solid ${playerRole === 'w' ? myBorderColor : oppBorderColor}` }}>{(players.white?.name || 'Waiting...').charAt(0).toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={MATCH_STYLES.playerName}>
                      <span style={{ color: playerRole === 'w' ? myNameColor : oppNameColor }}>{whiteName}</span>
                      {playerRole === 'w' && <span style={{ marginLeft: 7, color: '#a97bff', fontSize: 10 }}>YOU</span>}
                    </div>
                    <div style={MATCH_STYLES.playerMeta}>WHITE · PLAYER</div>
                  </div>
                </div>
                {whiteTurn && <div style={MATCH_STYLES.turnBadge}>YOUR TURN</div>}
              </div>

              {matchCommentary && (
                <div className="match-commentary-box">
                  {matchCommentary}
                </div>
              )}

              {/* ADDED: in-match reactions (owned emojis) — send to opponent + show
                  floating emoji animations from both players. Mounted additively. */}
              <EmojiReactions
                token={localStorage.getItem(TOKEN_KEY)}
                roomId={localStorage.getItem(ROOM_KEY)}
                receiverId={opponentId}
                socket={socketRef.current}
                account={account}
              />
            </section>

            {/* RIGHT SIDE */}
            <aside style={MATCH_STYLES.sidePanel}>
              {/* CLOCK / ROOM */}
              <div style={MATCH_STYLES.card}>
                <div style={MATCH_STYLES.cardHeader}>
                  <span style={MATCH_STYLES.cardTitle}>Match</span>
                  <span style={MATCH_STYLES.muted}>{gameStarted ? 'LIVE' : 'WAITING'}</span>
                </div>
                <div style={MATCH_STYLES.cardBody}>
                  <div style={MATCH_STYLES.clockLabel}>Current time</div>
                  <div style={MATCH_STYLES.clock}>{formatClock(currentTime)}</div>
                  <div style={{ marginTop: 13, ...MATCH_STYLES.clockLabel }}>Room</div>
                  <div style={MATCH_STYLES.roomCode}>{localStorage.getItem(ROOM_KEY) || '------'}</div>
                </div>
              </div>

              {/* RESULT */}
              {(isGameOver || matchResult) && (
                <div style={MATCH_STYLES.resultBanner}>
                  <div style={{ fontSize: 10, letterSpacing: '.15em', fontWeight: 900, color: '#a87cff' }}>MATCH RESULT</div>
                  <div style={{ marginTop: 6, fontSize: 21, fontWeight: 900 }}>{matchResult}</div>
                  <button type="button" style={{ ...MATCH_STYLES.smallButton, marginTop: 12, width: '100%' }} onClick={resetGame}>Play Again</button>
                </div>
              )}

              {/* CHAT */}
              <div style={MATCH_STYLES.card}>
                <div style={MATCH_STYLES.cardHeader}>
                  <span style={MATCH_STYLES.cardTitle}>Conversation</span>
                  <span style={MATCH_STYLES.muted}>{chatMessages.length}</span>
                </div>
                <div style={MATCH_STYLES.messageList}>
                  {chatMessages.length === 0 && <div style={{ color: '#756d80', fontSize: 12, textAlign: 'center', padding: '25px 8px' }}>Say hello to your opponent.</div>}
                  {chatMessages.map((item) => (
                    <div key={item.id} style={MATCH_STYLES.chatMessage}>
                      <div style={MATCH_STYLES.chatName}>{item.username}</div>
                      <div style={MATCH_STYLES.chatText}>{item.message}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form style={MATCH_STYLES.chatForm} onSubmit={sendChat}>
                  <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={280} placeholder="Message opponent..." style={MATCH_STYLES.input} />
                  <button type="submit" style={MATCH_STYLES.sendButton}>Send</button>
                </form>
              </div>

              {/* MOVES */}
              <div style={MATCH_STYLES.card}>
                <div style={MATCH_STYLES.cardHeader}>
                  <span style={MATCH_STYLES.cardTitle}>Moves</span>
                  <span style={MATCH_STYLES.muted}>{moveHistory.length}</span>
                </div>
                <div style={MATCH_STYLES.moves}>
                  {moveHistory.length === 0 && <div style={{ ...MATCH_STYLES.muted, fontSize: 12, textAlign: 'center', padding: 15 }}>No moves yet.</div>}
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, index) => {
                    const whiteMove = moveHistory[index * 2];
                    const blackMove = moveHistory[index * 2 + 1];
                    return (
                      <div key={index} style={MATCH_STYLES.moveRow}>
                        <span style={MATCH_STYLES.muted}>{index + 1}.</span>
                        <strong>{whiteMove || '—'}</strong>
                        <strong>{blackMove || '—'}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CAPTURED */}
              <div style={MATCH_STYLES.card}>
                <div style={MATCH_STYLES.cardHeader}>
                  <span style={MATCH_STYLES.cardTitle}>Captured</span>
                  <span style={MATCH_STYLES.muted}>{capturedChronological.length}</span>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto', padding: '2px 4px' }}>
                  <CapturedPieces captured={capturedChronological} material={material} isMobile={isMobile} />
                </div>
              </div>

              {/* CONTROLS */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <button type="button" style={MATCH_STYLES.smallButton} onClick={resetGame}>Reset</button>
                <button type="button" style={{ ...MATCH_STYLES.smallButton, color: '#ffb9c5' }} onClick={leaveMatch}>Leave</button>
              </div>
            </aside>
          </div>
        </div>

        {/* OPPONENT DISCONNECTED POPUP */}
        {opponentLeft && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
          >
            <div className="mychess-modal" style={{ width: 'min(400px,100%)', textAlign: 'center' }}>
              <div className="mychess-modal-icon" style={{ background: 'linear-gradient(145deg, #ef4444, #991b1b)', boxShadow: '0 12px 35px rgba(239,68,68,0.3)' }}>⚡</div>
              <div className="mychess-modal-eyebrow" style={{ color: '#fca5a5' }}>DISCONNECTED</div>
              <h2>Opponent Left</h2>
              <p>The opponent has disconnected from the match. You can leave this room.</p>
              <button type="button" className="mychess-primary-button" onClick={leaveMatch} style={{ marginTop: 8 }}>
                Return to Home <span>→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- RENDER: ROUTES ----
  return (
    <Routes>
      {/* Home Page (If logged in) */}
      <Route path="/" element={
        account ? (
          <div className="mychess-home-page">
            <FloatingBackground />
            <MusicWidget />
        <MessageNotifier />
            <LoginParticles active={showLoginParticles} />
            <div className="mychess-home-grid" />
            <div className="mychess-home-glow home-glow-one" />
            <div className="mychess-home-glow home-glow-two" />

            <header className="mychess-home-header">
              <div className="mychess-home-brand">
                <div className="mychess-logo-mark">♞</div>
                <div>
                  <div className="mychess-brand">MYCHESS</div>
                  <div className="mychess-brand-subtitle">ONLINE CHESS GAMEHUB</div>
                </div>
              </div>

              <div className="mychess-user-area">
                <div className="mychess-user-info">
                  <span>PLAYER</span>
                  <strong style={{ color: getEquippedVisual(equippedItems, 'name_color').color || '#fff' }}>{account.username}</strong>
                </div>
                
                <div className="mychess-header-actions">
                  <Link to="/tournaments" className="mychess-shop-button">Tournaments</Link>
                  <Link to="/quests" className="mychess-shop-button">Quests</Link>
                  <Link to="/achievements" className="mychess-shop-button">Trophies</Link>
                  <Link to="/history" className="mychess-shop-button">History</Link>
                  <Link to="/shop" className="mychess-shop-button">Shop</Link>
                  <Link to="/customize" className="mychess-shop-button">Customize</Link>
                  <Link to={`/profile/${account.id}`} className="mychess-shop-button">Profile</Link>

                  {account?.role === 'admin' && (
                    <button 
                      type="button" 
                      className="mychess-shop-button mychess-admin-btn" 
                      onClick={() => navigate('/admin-config')}
                    >
                      Admin
                    </button>
                  )}

                  <NotificationToast socket={socketRef.current} account={account} onEloUpdate={(newElo) => {
                    if (account) setAccount({ ...account, elo: newElo });
                  }} />

                  <button type="button" className="mychess-home-logout" onClick={handleLogout}>Logout</button>
                  <button type="button" className="mychess-home-settings" onClick={() => navigate('/settings')}>Settings</button>
                  <InstallAppButton />
                </div>
              </div>
            </header>

            <main className="mychess-home-main" style={{ 
              width: '100%', 
              maxWidth: '100%', 
              paddingLeft: '16px', 
              paddingRight: '16px', 
              margin: '0 auto', 
              boxSizing: 'border-box', 
              overflowX: 'hidden' 
            }}>
              <CinematicHero socket={socketRef.current} />

              <ScrollReveal>
              <section className="mychess-home-hero">
                <div className="mychess-home-eyebrow">READY FOR YOUR NEXT MATCH?</div>
                <h1 className="mychess-hologram-title">Welcome back, <span>{account.username}</span></h1>
                <p>Create a private lobby or join another player and start playing real-time chess.</p>
              </section>
              </ScrollReveal>
              <ScrollReveal delay={0.08}>
              <section className="mychess-elo-card">
                <div className="mychess-elo-card-label">TOTAL ELO</div>
                <EloRing elo={Number(account.elo || 0)} />
                <div className="mychess-elo-description">Your current MYCHESS rating</div>
              </section>
              </ScrollReveal>
              <ScrollReveal delay={0.16}>
              <section className="mychess-stats">
                <div className="mychess-stat-card"><span>GAMES</span><strong>{Number(account.games || 0)}</strong></div>
                <div className="mychess-stat-card"><span>WINS</span><strong>{Number(account.wins || 0)}</strong></div>
                <div className="mychess-stat-card"><span>DRAWS</span><strong>{Number(account.draws || 0)}</strong></div>
                <div className="mychess-stat-card"><span>LOSSES</span><strong>{Number(account.losses || 0)}</strong></div>
              </section>
              </ScrollReveal>

              <ScrollReveal delay={0.24}>
              <section className="mychess-home-actions" style={{ 
    display: 'grid', 
    gridTemplateColumns: '1fr', 
    gap: '12px',
    width: '100%',
    maxWidth: '100%'
}}>
    {/* Quick Match */}
    <button 
        type="button" 
        className="mychess-quick-match" 
        onClick={handleQuickMatch}
        disabled={isQuickMatching}
    >
        <div className="mychess-action-icon">⚡</div>
        <div className="mychess-action-content">
            <strong>{isQuickMatching ? 'Searching...' : 'Quick Match'}</strong>
            <span>{isQuickMatching ? 'Looking for an online opponent...' : 'Find a random opponent instantly and start playing'}</span>
        </div>
        <div className="mychess-action-arrow">{isQuickMatching ? <span className="mychess-searching-spinner" /> : '→'}</div>
    </button>

    {/* Create Lobby */}
    <Link 
        to="/" 
        className="mychess-game-action" 
        onClick={(e) => { e.preventDefault(); openCreateLobby(); }}
    >
        <div className="mychess-action-icon">+</div>
        <div className="mychess-action-content">
            <strong>Create Lobby</strong>
            <span>Create a private room for another player</span>
        </div>
        <div className="mychess-action-arrow">→</div>
    </Link>

    {/* Join Game */}
    <Link 
        to="/" 
        className="mychess-game-action" 
        onClick={(e) => { e.preventDefault(); openJoinGame(); }}
    >
        <div className="mychess-action-icon">#</div>
        <div className="mychess-action-content">
            <strong>Join Game</strong>
            <span>Enter a room code and challenge someone</span>
        </div>
        <div className="mychess-action-arrow">→</div>
    </Link>

    {/* Learn Chess Tips */}
    <button 
        type="button" 
        className="mychess-chess-tips-btn" 
        onClick={() => navigate('/chess-tips')}
    >
        <div className="mychess-action-icon">📖</div>
        <div className="mychess-action-content">
            <strong>Play VS AI Match</strong>
            <span>Enhance your game decisions and tactics with this integrated AI opponents!</span>
        </div>
        <div className="mychess-action-arrow">→</div>
    </button>

    {/* Tournaments */}
    <button 
        type="button" 
        className="mychess-tournament-btn" 
        onClick={() => navigate('/tournaments')}
    >
        <div className="mychess-action-icon">🏆</div>
        <div className="mychess-action-content">
            <strong>Tournaments</strong>
            <span>Compete in tournaments, challenge players & climb the leaderboard for ELO prizes</span>
        </div>
        <div className="mychess-action-arrow">→</div>
    </button>

    {/* Friends */}
    <button 
        type="button" 
        className="mychess-tournament-btn" 
        onClick={openFriends}
    >
        <div className="mychess-action-icon">🤝</div>
        <div className="mychess-action-content">
            <strong>Friends</strong>
            <span>Find friends, accept requests, and challenge them to a live match</span>
        </div>
        <div className="mychess-action-arrow">→</div>
    </button>
</section>
</ScrollReveal>

              {activeLobbies.length > 0 && (
                <section className="mychess-active-lobbies">
                  <h2 className="mychess-lobbies-title">🔥 Live Public Games</h2>
                  <div className="mychess-lobbies-list">
                    {activeLobbies.map((lobby) => (
                      <div key={lobby.roomId} className="mychess-lobby-item">
                        <div>
                          <strong>{lobby.hostName}</strong>
                          <span>Room #{lobby.roomId} • {lobby.playerCount}/2 Players</span>
                        </div>
                        <button onClick={() => { setRoomCode(lobby.roomId); handleJoinGame(); }} className="mychess-shop-button">Spectate</button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ============================================================
                 📢 ANNOUNCEMENTS (dynamic, added via Admin Config Panel)
                 ============================================================ */}
              <ScrollReveal>
              <AnnouncementsSection />
              </ScrollReveal>

              {/* ============================================================
                 🧠 SPLIT SECTION: MASTERCLASS
                 ============================================================ */}
              <ScrollReveal delay={0.1}>
              <section className="home-split-section home-split-reverse">
                <div className="home-split-card bg-brand-card">
                  <div className="home-split-visual masterclass-visual">
                    <span className="visual-icon">👑</span>
                    <div className="visual-overlay-text">Learn & Improve</div>
                  </div>
                  <div className="home-split-content">
                    <span className="home-split-tag">🎓 Free Guide</span>
                    <h2 className="home-split-title">Master the Game with Pro Strategies</h2>
                    <p className="home-split-text">From controlling the center to deadly checkmates—our step-by-step guide takes you from beginner to Grandmaster.</p>
                    <button className="mychess-chess-tips-btn" 
                      onClick={() => navigate('/chess-tips')}
                      style={{ display: 'inline-flex', padding: '12px 24px', maxWidth: '280px' }}>
                      <div className="mychess-action-content">
                        <strong>Start Learning</strong>
                        <span>Free Chess Guide</span>
                      </div>
                      <div className="mychess-action-arrow">→</div>
                    </button>
                  </div>
                </div>
              </section>
              </ScrollReveal>

              {/* ============================================================
                 🏅 SPLIT SECTION: LEADERBOARD
                 ============================================================ */}
              <ScrollReveal delay={0.1}>
              <section className="home-split-section">
                <div className="home-split-card">
                  <div className="home-split-visual leaderboard-visual">
                    <span className="visual-icon">🏅</span>
                    <div className="visual-overlay-text">Top 3 Players</div>
                  </div>
                  <div className="home-split-content">
                    <span className="home-split-tag">🏅 Elite</span>
                    <h2 className="home-split-title">Top Players This Month</h2>
                    <div className="leaderboard-mini-list">
                      {topPlayers.length === 0 ? (
                        <div className="leaderboard-card">
                          <span className="leaderboard-rank">—</span>
                          <div className="leaderboard-avatar">?</div>
                          <div className="leaderboard-name">No games played yet</div>
                          <span className="leaderboard-elo">0 ELO</span>
                        </div>
                      ) : (
                        topPlayers.slice(0, 3).map((player, index) => (
                          <div key={player.id} className="leaderboard-card">
                            <span className="leaderboard-rank">{index + 1}</span>
                            <div className="leaderboard-avatar">{player.username?.charAt(0).toUpperCase() || '?'}</div>
                            <div className="leaderboard-name"><UsernameLink name={player.username} /></div>
                            <span className="leaderboard-elo">{Number(player.elo || 0)} ELO</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
              </ScrollReveal>

              {/* ============================================================
                 📰 SPLIT SECTION: UPDATES
                 ============================================================ */}
              <ScrollReveal delay={0.1}>
              <section className="home-split-section home-split-reverse">
                <div className="home-split-card">
                  <div className="home-split-content">
                    <span className="home-split-tag">📰 Community</span>
                    <h2 className="home-split-title">Stay Updated</h2>
                    <p className="home-split-text">The latest news, events, and updates from the MyChess community.</p>
                    <div className="news-mini-list">
                      <div className="news-mini-item"><strong>New Merch</strong> Available now!</div>
                      <div className="news-mini-item"><strong>Friendly Match</strong> This Friday at the Hub!</div>
                      <div className="news-mini-item"><strong>AI Arena</strong> Now with 3 difficulties!</div>
                    </div>
                  </div>
                  <div className="home-split-visual news-visual">
                    <span className="visual-icon">📈</span>
                  </div>
                </div>
              </section>
              </ScrollReveal>

              {/* Game Stats Bar */}
              <ScrollReveal delay={0.05}>
              <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '0 4px', marginTop: 24 }}>
                <ErrorBoundary fallback={<div style={{textAlign:'center',padding:16,color:'rgba(255,255,255,0.3)',fontSize:12}}>Stats unavailable</div>}>
                  <GameStatsBar />
                </ErrorBoundary>
              </div>
              </ScrollReveal>

              {/* Chess Quiz */}
              <ScrollReveal delay={0.1}>
              <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '0 4px', marginTop: 24 }}>
                <ErrorBoundary fallback={<div style={{textAlign:'center',padding:16,color:'rgba(255,255,255,0.3)',fontSize:12}}>Quiz unavailable</div>}>
                  <ChessQuiz onEloUpdate={(newElo) => {
                    if (account) setAccount({ ...account, elo: newElo });
                  }} />
                </ErrorBoundary>
              </div>
              </ScrollReveal>

              {/* Recent Matches Feed */}
              <ScrollReveal delay={0.15}>
              <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '0 4px', marginTop: 24 }}>
                <ErrorBoundary fallback={<div style={{textAlign:'center',padding:16,color:'rgba(255,255,255,0.3)',fontSize:12}}>Feed unavailable</div>}>
                  <RecentMatchesFeed />
                </ErrorBoundary>
              </div>
              </ScrollReveal>

              {/* Loot Boxes */}
              <ScrollReveal delay={0.2}>
              <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', padding: '0 4px', marginTop: 24 }}>
                <ErrorBoundary fallback={<div style={{textAlign:'center',padding:16,color:'rgba(255,255,255,0.3)',fontSize:12}}>Loot boxes unavailable</div>}>
                  <LootBox token={localStorage.getItem(TOKEN_KEY)} onEloUpdate={(newElo) => {
                    if (account) setAccount({ ...account, elo: newElo });
                  }} />
                </ErrorBoundary>
              </div>
              </ScrollReveal>

              {/* Music Carousel — always last so new rows expand downward */}
              <ScrollReveal delay={0.25}>
              <div style={{ 
                width: '100%', 
                maxWidth: '100%', 
                overflow: 'hidden', 
                padding: '0 4px', 
                marginTop: 24,
                marginBottom: 40,
                boxSizing: 'border-box' 
              }}>
                <MusicCarousel token={localStorage.getItem(TOKEN_KEY)} />
              </div>
              </ScrollReveal>

              {/* Entrance banners — always last so new rows expand downward */}
              <ScrollReveal delay={0.3}>
              <div style={{
                width: '100%',
                maxWidth: '100%',
                overflow: 'hidden',
                padding: '0 4px',
                marginTop: 24,
                marginBottom: 40,
                boxSizing: 'border-box'
              }}>
                <MatchCosmeticsPanel token={localStorage.getItem(TOKEN_KEY)} />
              </div>
              </ScrollReveal>

              {/* Terms / Privacy footer — right below music albums */}
              <footer className="mychess-legal mychess-legal-footer">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms</a>
                <span>•</span>
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy</a>
              </footer>
            </main>

            {/* LOBBY MODAL */}
            {lobbyMode && (
              <div
                className="mychess-modal-backdrop"
                style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
                onMouseDown={(event) => { if (event.target === event.currentTarget) closeLobbyModal(); }}
              >
                <div className="mychess-modal" style={{ width: 'min(460px,100%)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
                  <button type="button" className="mychess-modal-close" onClick={closeLobbyModal} disabled={lobbyLoading}>×</button>
                  {lobbyMode === 'create' && (
                    <>
                      <div className="mychess-modal-icon">♞</div>
                      <div className="mychess-modal-eyebrow">PRIVATE MATCH</div>
                      <h2>Create Lobby</h2>
                      <p>Create a private room and wait for another player to join.</p>
                      <button type="button" className="mychess-primary-button" onClick={handleCreateLobby} disabled={lobbyLoading}>
                        {lobbyLoading ? 'Connecting...' : 'Create Lobby'}
                        {!lobbyLoading && <span>→</span>}
                      </button>
                      {lobbyMessage && <div className={`mychess-message ${lobbyMessageType}`}>{lobbyMessage}</div>}
                    </>
                  )}
                  {lobbyMode === 'join' && (
                    <>
                      <div className="mychess-modal-icon">#</div>
                      <div className="mychess-modal-eyebrow">ENTER ROOM</div>
                      <h2>Join Game</h2>
                      <p>Enter the 6-digit room code given to you by another player.</p>
                      <div className="mychess-room-input">
                        <input type="text" inputMode="numeric" maxLength={6} value={roomCode} onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" autoFocus disabled={lobbyLoading} />
                      </div>
                      {lobbyMessage && <div className={`mychess-message ${lobbyMessageType}`}>{lobbyMessage}</div>}
                      <button type="button" className="mychess-primary-button" onClick={handleJoinGame} disabled={lobbyLoading}>
                        {lobbyLoading ? 'Connecting...' : 'Join Game'}
                        {!lobbyLoading && <span>→</span>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* QUICK MATCH SEARCHING MODAL */}
            {isQuickMatching && (
              <div
                className="mychess-modal-backdrop"
                style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
                onMouseDown={(event) => { if (event.target === event.currentTarget) cancelQuickMatch(); }}
              >
                <div className="mychess-modal" style={{ width: 'min(400px,100%)', textAlign: 'center' }}>
                  <button type="button" className="mychess-modal-close" onClick={cancelQuickMatch}>×</button>
                  <div className="mychess-modal-icon" style={{ background: 'linear-gradient(145deg, #ff8c00, #cc6600)', boxShadow: '0 12px 35px rgba(255,140,0,0.3)' }}>⚡</div>
                  <div className="mychess-modal-eyebrow" style={{ color: '#ffb347' }}>QUICK MATCH</div>
                  <h2>Finding Opponent</h2>
                  <p>Hang tight! We're searching for an available player to match you with.</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                    <span className="mychess-searching-spinner" style={{ width: 24, height: 24, borderWidth: 4 }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Searching...</span>
                  </div>
                  <button type="button" className="mychess-primary-button" onClick={cancelQuickMatch} style={{ marginTop: 24, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* FRIENDS PANEL */}
            {showFriends && (
              <FriendsPanel
                token={localStorage.getItem(TOKEN_KEY)}
                onClose={closeFriends}
                refreshKey={friendsRefresh}
                dmIncoming={dmIncoming}
                dmTick={dmTick}
                onChallengeSent={(code) => {
                  setShowFriends(false);
                  setInvite(null);
                  setRoomCode(code);
                  connectToMatch(code);
                }}
              />
            )}

            {/* CHALLENGE INVITE POPUP */}
            {invite && (
              <div
                className="mychess-modal-backdrop"
                style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(5,3,10,.84)', backdropFilter: 'blur(12px)' }}
                onMouseDown={(event) => { if (event.target === event.currentTarget) declineInvite(); }}
              >
                <div className="mychess-modal" style={{ width: 'min(400px,100%)', textAlign: 'center' }}>
                  <button type="button" className="mychess-modal-close" onClick={declineInvite}>×</button>
                  <div className="mychess-modal-icon" style={{ background: 'linear-gradient(145deg, #22c55e, #15803d)', boxShadow: '0 12px 35px rgba(34,197,94,0.3)' }}>⚔️</div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}><Avatar userId={invite.fromId} name={invite.fromName} size={56} /></div>
                  <div className="mychess-modal-eyebrow" style={{ color: '#4ade80' }}>CHALLENGE</div>
                  <h2>{invite.fromName || 'A friend'} challenged you!</h2>
                  <p>They are waiting for you to join. Room #{invite.roomCode}</p>
                  <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="mychess-primary-button" onClick={acceptInvite}>
                      Accept & Play <span>→</span>
                    </button>
                    <button type="button" className="mychess-primary-button" onClick={declineInvite} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="mychess-auth-page">
            <FloatingBackground />
            <MusicWidget />
        <MessageNotifier />
            <div className="mychess-background-grid" />
            <div className="mychess-glow glow-one" />
            <div className="mychess-glow glow-two" />
            <main className="mychess-auth-container">
              <section className="mychess-brand-panel">
                <div className="mychess-brand-top">
                  <div className="mychess-logo-mark">♞</div>
                  <div>
                    <div className="mychess-brand">MYCHESS</div>
                    <div className="mychess-brand-subtitle">ONLINE CHESS</div>
                  </div>
                </div>
                <div className="mychess-brand-content">
                  <div className="mychess-eyebrow">PLAY · COMPETE · CLIMB</div>
                  <h1>Your next<br /><span>match</span> starts here.</h1>
                  <p>Play real-time chess against players online, build your ELO and become part of the MYCHESS community.</p>
                </div>
                <div className="mychess-brand-footer">
                  <span>♟</span><span>REAL-TIME MULTIPLAYER</span><span>•</span><span>ELO RANKED</span>
                </div>
              </section>
              <section className="mychess-auth-panel">
                <div className="mychess-auth-header">
                  <div className="mychess-mobile-logo">♞</div>
                  <h2>{isRegister ? 'Create account' : 'Welcome back'}</h2>
                  <p>{isRegister ? 'Create your MYCHESS player identity.' : 'Sign in to continue playing.'}</p>
                </div>
                <div className="mychess-auth-tabs">
                  <button type="button" className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
                  <button type="button" className={isRegister ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
                </div>
                <form className="mychess-form" onSubmit={isRegister ? handleRegister : handleLogin}>
                  {isRegister && (
                    <div className="mychess-field">
                      <label>IN-GAME USERNAME</label>
                      <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Choose your player name" maxLength={24} autoComplete="username" disabled={loading} />
                      <small>This is the name other players will see.</small>
                    </div>
                  )}
                  <div className="mychess-field">
                    <label>EMAIL</label>
                    <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" disabled={loading} />
                  </div>
                  <div className="mychess-field">
                    <label>PASSWORD</label>
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? 'Minimum 8 characters' : 'Enter your password'} autoComplete={isRegister ? 'new-password' : 'current-password'} disabled={loading} />
                  </div>
                  {!isRegister && (
                    <div className="mychess-forgot">
                      <button type="button" className="mychess-forgot-link" onClick={() => navigate('/forgot-password')}>Forgot password?</button>
                    </div>
                  )}
                  {message && <div className={`mychess-message ${messageType}`}>{message}</div>}
                  <button type="submit" className="mychess-primary-button" disabled={loading}>
                    {loading ? (<><span className="mychess-spinner" />Processing...</>) : (<>{isRegister ? 'Create MYCHESS Account' : 'Enter MYCHESS'}<span>→</span></>)}
                  </button>
                </form>
                <div className="mychess-legal">
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/terms'); }}>Terms</a>
                  <span>•</span>
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/privacy'); }}>Privacy</a>
                </div>
                <div className="mychess-legal" style={{ marginTop: 10 }}>
                  <InstallAppButton />
                </div>
              </section>
            </main>
          </div>
        )
      } />

      {/* Chess Tips Page */}
      <Route path="/chess-tips" element={<ChessTipsPage onBack={() => navigate('/')} onPlayAI={() => navigate('/ai-arena')} />} />

      {/* AI Arena Page */}
      <Route path="/ai-arena" element={
        <ChessAIPage 
          token={localStorage.getItem(TOKEN_KEY)} 
          onBack={() => {
            notifyMusicForMatch(false);
            navigate('/');
          }} 
        />
      } />

      {/* Shop, Inventory, History, Quests */}
      <Route path="/shop" element={<ShopPage account={account} token={localStorage.getItem(TOKEN_KEY)} onClose={() => navigate('/')} onEloUpdate={(newElo) => {
        if (account) setAccount({ ...account, elo: newElo });
      }} />} />
      <Route path="/customize" element={<InventoryPage account={account} token={localStorage.getItem(TOKEN_KEY)} onClose={() => navigate('/')} />} />
      <Route path="/history" element={<GameHistory token={localStorage.getItem(TOKEN_KEY)} onBack={() => navigate('/')} />} />
      <Route path="/quests" element={<QuestsPage token={localStorage.getItem(TOKEN_KEY)} onClose={() => navigate('/')} onAccountUpdate={async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.ok) setAccount(data.account);
        } catch (e) {}
      }} />} />

      {/* Admin Config Page */}
      <Route path="/admin-config" element={<AdminConfigPage token={localStorage.getItem(TOKEN_KEY)} onBack={() => navigate('/')} />} />

      {/* Achievements Page */}
      <Route path="/achievements" element={<AchievementsPage onBack={() => navigate('/')} onAccountUpdate={async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.ok) setAccount(data.account);
        } catch (e) {}
      }} />} />

      {/* Player Profile Page */}
      <Route path="/profile/:userId" element={<PlayerProfile onBack={() => navigate('/')} />} />
      <Route path="/profile/u/:username" element={<PlayerProfile onBack={() => navigate('/')} />} />

      {/* Tournament Page */}
      <Route path="/tournaments" element={<TournamentPage token={localStorage.getItem(TOKEN_KEY)} account={account} onBack={() => navigate('/')} onJoinRoom={connectToMatch} onAccountUpdate={async () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (!token) return;
        try {
          const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          const data = await res.json();
          if (data.ok) setAccount(data.account);
        } catch (e) {}
      }} />} />

      {/* Forgot Password Page (public) */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Reset Password Page (public) */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Account Settings Page (logged-in) */}
      <Route path="/settings" element={
        <AccountSettingsPage token={localStorage.getItem(TOKEN_KEY)} account={account} />
      } />

      {/* Legal pages (public) */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

    </Routes>
  );
}

export default App;