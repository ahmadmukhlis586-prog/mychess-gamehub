'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS REALTIME SERVER
|--------------------------------------------------------------------------
|
| Express + Socket.IO + chess.js + PostgreSQL
| ... (rest of comments)
|
*/

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer'); // ✅ ADDED
const { pool } = require('./db/connection');
const db = require('./db/helpers');
const cloudStorage = require('./db/storage'); // ✅ Cloud storage (Supabase) with local fallback
const { registerAuthExtra } = require('./auth-extra'); // ✅ ADDED (auth extras: rate limit, password reset, avatar) — additive

const app = express();
app.use(cors()); 
app.use(express.json());

// ✅ ADDED (auth extras: rate limiting on login/register + trust proxy) — purely additive
const { applyEarlyMiddleware } = require('./auth-extra');
applyEarlyMiddleware(app);

const server = http.createServer(app);

// Add static file serving for assets
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use('/audio', express.static(path.join(__dirname, 'public/assets/audio')));

/*
|--------------------------------------------------------------------------
| CONFIGURATION
|--------------------------------------------------------------------------
*/

const PORT = Number(process.env.PORT) || 4000;

const CLIENT_ORIGINS = ['*'];

const LOBBY_CODE_LENGTH = 6;

/*
|--------------------------------------------------------------------------
| EXPRESS CORS
|--------------------------------------------------------------------------
*/

app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (CLIENT_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

/*
|--------------------------------------------------------------------------
| ✅ FILE UPLOAD CONFIGURATION (MULTER)
|--------------------------------------------------------------------------
*/

// Ensure directories exist
const fs = require('fs');
const assetsDir = path.join(__dirname, 'public/assets');
const imagesDir = path.join(assetsDir, 'images');
const audioDir = path.join(assetsDir, 'audio');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

// Set up storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'cover_image') {
            cb(null, imagesDir);
        } else if (file.fieldname === 'audio_file') {
            cb(null, audioDir);
        } else {
            cb(null, assetsDir);
        }
    },
    filename: (req, file, cb) => {
        // Use a random unique name, preserve the original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

/*
|--------------------------------------------------------------------------
| SOCKET.IO
|--------------------------------------------------------------------------
*/

const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGINS,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
});

// Store io instance for use in routes
app.set('io', io);

/*
|--------------------------------------------------------------------------
| SESSION STORAGE (Memory Cache - Fast Access)
|--------------------------------------------------------------------------
*/

const sessions = new Map();

/*
|--------------------------------------------------------------------------
| ACCOUNT HELPERS
|--------------------------------------------------------------------------
*/

function normalizeEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

function cleanUsername(username) {
    return String(username || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 24);
}

function validateUsername(username) {
    return /^[a-zA-Z0-9_ -]{3,24}$/.test(username);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/*
|--------------------------------------------------------------------------
| PASSWORD HASHING
|--------------------------------------------------------------------------
*/

function hashPassword(password) {
    const salt = crypto
        .randomBytes(16)
        .toString('hex');

    const hash = crypto
        .scryptSync(password, salt, 64)
        .toString('hex');

    return {
        salt,
        hash,
    };
}

function verifyPassword(
    password,
    storedHash,
    storedSalt
) {
    try {
        if (
            !storedHash ||
            !storedSalt
        ) {
            return false;
        }

        const hash = crypto.scryptSync(
            password,
            storedSalt,
            64
        );

        const stored = Buffer.from(
            storedHash,
            'hex'
        );

        return (
            stored.length === hash.length &&
            crypto.timingSafeEqual(
                stored,
                hash
            )
        );
    } catch {
        return false;
    }
}

/*
|--------------------------------------------------------------------------
| SESSION FUNCTIONS
|--------------------------------------------------------------------------
*/

async function createSession(accountId) {
    const token = crypto
        .randomBytes(32)
        .toString('hex');

    await db.createSession(token, accountId);
    
    sessions.set(token, {
        accountId,
        createdAt: Date.now(),
    });

    return token;
}

async function deleteSession(token) {
    if (token) {
        await db.deleteSession(token);
        sessions.delete(token);
    }
}

async function getAccountFromToken(token) {
    if (!token) {
        return null;
    }

    const session = sessions.get(token);
    if (session) {
        const account = await db.findAccountById(session.accountId);
        if (account) return account;
    }

    const dbSession = await db.findSessionByToken(token);
    if (dbSession) {
        sessions.set(token, {
            accountId: dbSession.account_id,
            createdAt: Date.now(),
        });
        
        return {
            id: dbSession.account_id,
            username: dbSession.username,
            email: dbSession.email,
            role: dbSession.role,
            elo: dbSession.elo,
            games: dbSession.games,
            wins: dbSession.wins,
            draws: dbSession.draws,
            losses: dbSession.losses,
        };
    }

    return null;
}

function publicAccount(account) {
    if (!account) {
        return null;
    }

    return {
        id: account.id,
        username: account.username,
        email: account.email,
        elo: Number(account.elo || 0),
        games: Number(account.games || 0),
        wins: Number(account.wins || 0),
        draws: Number(account.draws || 0),
        losses: Number(account.losses || 0),
        role: account.role || 'user',
        createdAt: account.created_at || account.createdAt,
    };
}

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

function getBearerToken(req) {
    const auth =
        req.headers.authorization || '';

    if (!auth.startsWith('Bearer ')) {
        return '';
    }

    return auth
        .slice(7)
        .trim();
}

async function requireAuth(req, res, next) {
    try {
        const token = getBearerToken(req);

        const account = await getAccountFromToken(token);

        if (!account) {
            return res.status(401).json({
                ok: false,
                message:
                    'Your MYCHESS session is invalid or expired.',
            });
        }

        req.account = account;
        req.authToken = token;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            ok: false,
            message: 'Authentication error.',
        });
    }
}

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/register',
    async (req, res) => {
        try {
            const username = cleanUsername(
                req.body?.username
            );

            const email = normalizeEmail(
                req.body?.email
            );

            const password = String(
                req.body?.password || ''
            );

            if (!username) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Please enter a username.',
                });
            }

            if (!validateUsername(username)) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Username must contain 3–24 letters, numbers, spaces, hyphens or underscores.',
                });
            }

            if (!validateEmail(email)) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Please enter a valid email address.',
                });
            }

            if (password.length < 8) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Password must contain at least 8 characters.',
                });
            }

            const existingUsername = await db.findAccountByUsername(username);
            if (existingUsername) {
                return res.status(409).json({
                    ok: false,
                    message:
                        'That username is already taken.',
                });
            }

            const existingEmail = await db.findAccountByEmail(email);
            if (existingEmail) {
                return res.status(409).json({
                    ok: false,
                    message:
                        'That email is already registered.',
                });
            }

            const passwordData = hashPassword(password);
            const accountId = crypto.randomUUID();

            const account = await db.createAccount({
                id: accountId,
                username,
                email,
                passwordHash: passwordData.hash,
                passwordSalt: passwordData.salt,
            });

            const token = await createSession(accountId);

            return res.status(201).json({
                ok: true,
                message:
                    'MYCHESS account created successfully.',
                token,
                account: publicAccount(account),
            });
        } catch (error) {
            console.error('Registration error:', error);
            return res.status(500).json({
                ok: false,
                message: 'Unable to create your account.',
            });
        }
    }
);

/*
|--------------------------------------------------------------------------
| LOGIN
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/login',
    async (req, res) => {
        try {
            const email = normalizeEmail(
                req.body?.email
            );

            const password = String(
                req.body?.password || ''
            );

            if (!validateEmail(email)) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Please enter a valid email address.',
                });
            }

            if (!password) {
                return res.status(400).json({
                    ok: false,
                    message:
                        'Please enter your password.',
                });
            }

            const account = await db.findAccountByEmail(email);

            if (
                !account ||
                !verifyPassword(
                    password,
                    account.password_hash,
                    account.password_salt
                )
            ) {
                return res.status(401).json({
                    ok: false,
                    message:
                        'Incorrect email or password.',
                });
            }

            const token = await createSession(account.id);

            return res.json({
                ok: true,
                message: 'Login successful.',
                token,
                account: publicAccount(account),
            });
        } catch (error) {
            console.error('Login error:', error);
            return res.status(500).json({
                ok: false,
                message: 'Unable to login.',
            });
        }
    }
);

// ============================================
// TOURNAMENTS
// ============================================
app.get('/api/tournaments', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT t.*, u.username as creator_name,
                (SELECT COUNT(*) FROM tournament_players WHERE tournament_id = t.id) as player_count
            FROM tournaments t JOIN accounts u ON t.creator_id = u.id
            ORDER BY t.created_at DESC LIMIT 50
        `);
        res.json({ ok: true, tournaments: result.rows });
    } catch (error) {
        console.error('Tournaments list error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/tournaments', requireAuth, async (req, res) => {
    try {
        const { name, description, maxPlayers, pointsPerWin, entryCost, disconnectElo } = req.body;
        if (!name || !maxPlayers || !pointsPerWin) return res.status(400).json({ ok: false, message: 'Missing fields' });
        const result = await pool.query(
            'INSERT INTO tournaments (creator_id, name, description, max_players, points_per_win, entry_cost, disconnect_elo) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
            [req.account.id, name, description || '', maxPlayers, pointsPerWin, entryCost || 0, disconnectElo || 0]
        );
        const t = result.rows[0];
        await pool.query('INSERT INTO tournament_players (tournament_id, account_id) VALUES ($1,$2)', [t.id, req.account.id]);
        if ((entryCost || 0) > 0) await db.addElo(req.account.id, -(entryCost || 0));
        res.json({ ok: true, tournament: t });
    } catch (error) {
        console.error('Tournament create error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/tournaments/:id/join', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false, message: 'Tournament not found' });
        if (t.status !== 'waiting') return res.status(400).json({ ok: false, message: 'Tournament already started' });
        const pc = (await pool.query('SELECT COUNT(*) FROM tournament_players WHERE tournament_id=$1', [tid])).rows[0].count;
        if (parseInt(pc) >= t.max_players) return res.status(400).json({ ok: false, message: 'Tournament full' });
        const existing = (await pool.query('SELECT id FROM tournament_players WHERE tournament_id=$1 AND account_id=$2', [tid, req.account.id])).rows[0];
        if (existing) return res.status(400).json({ ok: false, message: 'Already joined' });
        if (t.entry_cost > 0) {
            const acc = await db.findAccountById(req.account.id);
            if ((acc.elo || 0) < t.entry_cost) return res.status(400).json({ ok: false, message: 'Not enough ELO' });
            await db.addElo(req.account.id, -t.entry_cost);
        }
        await pool.query('INSERT INTO tournament_players (tournament_id, account_id) VALUES ($1,$2)', [tid, req.account.id]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Tournament join error:', error);
        res.status(500).json({ ok: false });
    }
});

app.get('/api/tournaments/:id', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query(`SELECT t.*, u.username as creator_name FROM tournaments t JOIN accounts u ON t.creator_id=u.id WHERE t.id=$1`, [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false });
        const players = (await pool.query(`
            SELECT tp.*, u.username, u.elo FROM tournament_players tp
            JOIN accounts u ON tp.account_id=u.id WHERE tp.tournament_id=$1 ORDER BY tp.points DESC
        `, [tid])).rows;
        const duels = (await pool.query(`
            SELECT td.*, c.username as challenger_name, o.username as opponent_name,
                w.username as winner_name
            FROM tournament_duels td
            JOIN accounts c ON td.challenger_id=c.id
            JOIN accounts o ON td.opponent_id=o.id
            LEFT JOIN accounts w ON td.winner_id=w.id
            WHERE td.tournament_id=$1 ORDER BY td.created_at DESC LIMIT 20
        `, [tid])).rows;

        // Clean up stale accepted duels whose game rooms no longer exist or are finished
        const acceptedDuels = duels.filter(d => d.status === 'accepted' && d.room_id);
        for (const d of acceptedDuels) {
            const game = games.get(d.room_id);
            const gameDead = !game || game.status === 'finished' || game.resultRecorded;
            if (gameDead) {
                const winnerId = game && game.result?.winner === 'white' ? game.players.white?.playerId
                    : game && game.result?.winner === 'black' ? game.players.black?.playerId : null;
                const isDisconnect = game?.result?.disconnect === true;
                const eloToAward = isDisconnect && t.disconnect_elo > 0 ? t.disconnect_elo : t.points_per_win;
                await pool.query("UPDATE tournament_duels SET status='completed', winner_id=$1, result='completed' WHERE id=$2", [winnerId, d.id]);
                if (winnerId) {
                    await pool.query('UPDATE tournament_players SET points = points + $1, games_played = games_played + 1 WHERE tournament_id=$2 AND account_id=$3', [eloToAward, tid, winnerId]);
                }
                const loserId = winnerId === d.challenger_id ? d.opponent_id : (winnerId === d.opponent_id ? d.challenger_id : null);
                if (loserId) {
                    await pool.query('UPDATE tournament_players SET games_played = games_played + 1 WHERE tournament_id=$1 AND account_id=$2', [tid, loserId]);
                }
                d.status = 'completed';
                d.winner_id = winnerId;
                d.result = 'completed';
            }
        }

        res.json({ ok: true, tournament: t, players, duels });
    } catch (error) {
        console.error('Tournament detail error:', error);
        res.status(500).json({ ok: false });
    }
});

// TOURNAMENT MATCH HISTORY — all completed duels + aggregated player stats
app.get('/api/tournaments/:id/history', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false });

        const players = (await pool.query(`
            SELECT tp.*, u.username, u.elo FROM tournament_players tp
            JOIN accounts u ON tp.account_id=u.id WHERE tp.tournament_id=$1 ORDER BY tp.points DESC
        `, [tid])).rows;

        const allDuels = (await pool.query(`
            SELECT td.*, c.username as challenger_name, o.username as opponent_name,
                w.username as winner_name
            FROM tournament_duels td
            JOIN accounts c ON td.challenger_id=c.id
            JOIN accounts o ON td.opponent_id=o.id
            LEFT JOIN accounts w ON td.winner_id=w.id
            WHERE td.tournament_id=$1 ORDER BY td.created_at DESC
        `, [tid])).rows;

        const completedDuels = allDuels.filter(d => d.status === 'completed');
        const pendingDuels = allDuels.filter(d => d.status === 'pending' || d.status === 'accepted');
        const declinedDuels = allDuels.filter(d => d.status === 'declined');

        const stats = players.map(p => {
            const pid = p.account_id || p.player_id || p.id;
            const wins = completedDuels.filter(d => d.winner_id === pid).length;
            const losses = completedDuels.filter(d =>
                (d.challenger_id === pid || d.opponent_id === pid) && d.winner_id && d.winner_id !== pid
            ).length;
            const totalGames = completedDuels.filter(d => d.challenger_id === pid || d.opponent_id === pid).length;
            const draws = totalGames - wins - losses;
            return {
                account_id: pid,
                username: p.username,
                elo: p.elo,
                points: p.points || 0,
                games_played: p.games_played || totalGames,
                wins,
                losses,
                draws: draws > 0 ? draws : 0,
                winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
            };
        }).sort((a, b) => b.points - a.points || b.wins - a.wins || b.elo - a.elo);

        res.json({ ok: true, players: stats, completedDuels, pendingDuels, declinedDuels, totalDuels: allDuels.length });
    } catch (error) {
        console.error('Tournament history error:', error);
        res.status(500).json({ ok: false });
    }
});

// CLEAR ALL FINISHED TOURNAMENTS
app.delete('/api/tournaments/clear-finished', requireAuth, async (req, res) => {
    try {
        const finishedIds = (await pool.query('SELECT id FROM tournaments WHERE status=$1', ['finished'])).rows.map(r => r.id);
        if (finishedIds.length === 0) return res.json({ ok: true, count: 0 });
        await pool.query('DELETE FROM tournament_duels WHERE tournament_id = ANY($1)', [finishedIds]);
        await pool.query('DELETE FROM tournament_players WHERE tournament_id = ANY($1)', [finishedIds]);
        await pool.query('DELETE FROM tournaments WHERE id = ANY($1)', [finishedIds]);
        res.json({ ok: true, count: finishedIds.length });
    } catch (error) {
        console.error('Tournament clear finished error:', error);
        res.status(500).json({ ok: false });
    }
});

// DELETE TOURNAMENT — creator can delete their own tournament (only if waiting)
app.delete('/api/tournaments/:id', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false });
        if (t.creator_id !== req.account.id) return res.status(403).json({ ok: false, message: 'Only creator can delete' });
        if (t.status !== 'waiting') return res.status(400).json({ ok: false, message: 'Can only delete waiting tournaments' });
        await pool.query('DELETE FROM tournament_duels WHERE tournament_id=$1', [tid]);
        await pool.query('DELETE FROM tournament_players WHERE tournament_id=$1', [tid]);
        await pool.query('DELETE FROM tournaments WHERE id=$1', [tid]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Tournament delete error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/tournaments/:id/start', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false });
        if (t.creator_id !== req.account.id) return res.status(403).json({ ok: false, message: 'Only creator can start' });
        await pool.query("UPDATE tournaments SET status='active' WHERE id=$1", [tid]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Tournament start error:', error);
        res.status(500).json({ ok: false });
    }
});

// FINISH TOURNAMENT — creator declares final standings
app.post('/api/tournaments/:id/finish', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t) return res.status(404).json({ ok: false });
        if (t.creator_id !== req.account.id) return res.status(403).json({ ok: false, message: 'Only creator can finish' });
        if (t.status === 'finished') return res.status(400).json({ ok: false, message: 'Already finished' });
        await pool.query("UPDATE tournaments SET status='finished' WHERE id=$1", [tid]);
        const standings = (await pool.query(`
            SELECT tp.account_id, u.username, u.elo, tp.points FROM tournament_players tp
            JOIN accounts u ON tp.account_id=u.id WHERE tp.tournament_id=$1 ORDER BY tp.points DESC
        `, [tid])).rows;
        res.json({ ok: true, standings });
    } catch (error) {
        console.error('Tournament finish error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/tournaments/:id/duel', requireAuth, async (req, res) => {
    try {
        const tid = req.params.id;
        const { opponentId } = req.body;
        if (!opponentId) return res.status(400).json({ ok: false });
        const t = (await pool.query('SELECT * FROM tournaments WHERE id=$1', [tid])).rows[0];
        if (!t || t.status !== 'active') return res.status(400).json({ ok: false, message: 'Tournament not active' });
        const existing = (await pool.query(
            "SELECT id FROM tournament_duels WHERE tournament_id=$1 AND status='pending' AND ((challenger_id=$2 AND opponent_id=$3) OR (challenger_id=$3 AND opponent_id=$2))",
            [tid, req.account.id, opponentId]
        )).rows[0];
        if (existing) return res.status(400).json({ ok: false, message: 'Duel already pending' });
        const result = await pool.query(
            'INSERT INTO tournament_duels (tournament_id, challenger_id, opponent_id) VALUES ($1,$2,$3) RETURNING *',
            [tid, req.account.id, opponentId]
        );
        res.json({ ok: true, duel: result.rows[0] });
    } catch (error) {
        console.error('Duel request error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/tournaments/duel/:duelId/respond', requireAuth, async (req, res) => {
    try {
        const { accept } = req.body;
        const duel = (await pool.query('SELECT * FROM tournament_duels WHERE id=$1', [req.params.duelId])).rows[0];
        if (!duel) return res.status(404).json({ ok: false, message: 'Duel not found' });
        if (duel.opponent_id !== req.account.id) return res.status(403).json({ ok: false, message: 'Not your duel' });
        if (duel.status !== 'pending') return res.status(400).json({ ok: false, message: 'Duel already responded' });
        if (!accept) {
            await pool.query("UPDATE tournament_duels SET status='declined' WHERE id=$1", [duel.id]);
            return res.json({ ok: true, status: 'declined' });
        }
        const roomId = generateLobbyCode();
        const game = createGame();
        game.owner = { playerId: duel.challenger_id, username: 'Challenger' };
        games.set(roomId, game);
        await pool.query("UPDATE tournament_duels SET status='accepted', room_id=$1 WHERE id=$2", [roomId, duel.id]);
        res.json({ ok: true, status: 'accepted', duel: { ...duel, room_id: roomId }, roomId });
    } catch (error) {
        console.error('Duel respond error:', error.message || error);
        res.status(500).json({ ok: false, message: error.message || 'Server error' });
    }
});

app.post('/api/tournaments/duel/:duelId/result', requireAuth, async (req, res) => {
    try {
        const { winnerId } = req.body;
        const duel = (await pool.query('SELECT * FROM tournament_duels WHERE id=$1', [req.params.duelId])).rows[0];
        if (!duel) return res.status(404).json({ ok: false });
        await pool.query("UPDATE tournament_duels SET status='completed', winner_id=$1, result='completed' WHERE id=$2", [winnerId, duel.id]);
        const t = (await pool.query('SELECT points_per_win FROM tournaments WHERE id=$1', [duel.tournament_id])).rows[0];
        if (winnerId && t) {
            await pool.query('UPDATE tournament_players SET points = points + $1 WHERE tournament_id=$2 AND account_id=$3', [t.points_per_win, duel.tournament_id, winnerId]);
        }
        res.json({ ok: true });
    } catch (error) {
        console.error('Duel result error:', error);
        res.status(500).json({ ok: false });
    }
});

function daysBetweenDates(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1 + 'T12:00:00Z');
    const d2 = new Date(dateStr2 + 'T12:00:00Z');
    return Math.round((d2 - d1) / 86400000);
}

// ============================================
// DAILY CALENDAR
// ============================================
app.get('/api/daily-calendar', requireAuth, async (req, res) => {
    try {
        const rewards = (await pool.query('SELECT * FROM daily_calendar ORDER BY day_number')).rows;
        const localDate = req.query.localDate || new Date().toISOString().split('T')[0];
        const lastClaim = (await pool.query('SELECT claim_date FROM user_calendar_claims WHERE account_id=$1 ORDER BY claim_date DESC LIMIT 1', [req.account.id])).rows[0];
        let currentDay = 1;
        if (lastClaim) {
            const lastDateStr = typeof lastClaim.claim_date === 'string' ? lastClaim.claim_date : new Date(lastClaim.claim_date).toISOString().split('T')[0];
            const diffDays = daysBetweenDates(lastDateStr, localDate);
            if (diffDays === 0) {
                currentDay = (await pool.query('SELECT COUNT(*) FROM user_calendar_claims WHERE account_id=$1', [req.account.id])).rows[0].count;
            } else if (diffDays === 1) {
                currentDay = (await pool.query('SELECT COUNT(*) FROM user_calendar_claims WHERE account_id=$1', [req.account.id])).rows[0].count + 1;
            } else {
                currentDay = 1;
            }
        }
        if (currentDay > 31) currentDay = 1;
        const todayClaimed = (await pool.query('SELECT id FROM user_calendar_claims WHERE account_id=$1 AND claim_date=$2', [req.account.id, localDate])).rows[0];
        res.json({ ok: true, rewards, currentDay: Math.min(currentDay, 31), todayClaimed: !!todayClaimed, today: localDate });
    } catch (error) {
        console.error('Calendar error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/daily-calendar/claim', requireAuth, async (req, res) => {
    try {
        const localDate = req.body.localDate || new Date().toISOString().split('T')[0];
        const todayClaimed = (await pool.query('SELECT id FROM user_calendar_claims WHERE account_id=$1 AND claim_date=$2', [req.account.id, localDate])).rows[0];
        if (todayClaimed) return res.status(400).json({ ok: false, message: 'Already claimed today' });
        const lastClaim = (await pool.query('SELECT claim_date FROM user_calendar_claims WHERE account_id=$1 ORDER BY claim_date DESC LIMIT 1', [req.account.id])).rows[0];
        let nextDay = 1;
        if (lastClaim) {
            const lastDateStr = typeof lastClaim.claim_date === 'string' ? lastClaim.claim_date : new Date(lastClaim.claim_date).toISOString().split('T')[0];
            const diffDays = daysBetweenDates(lastDateStr, localDate);
            if (diffDays === 0) {
                return res.status(400).json({ ok: false, message: 'Already claimed today' });
            } else if (diffDays === 1) {
                nextDay = (await pool.query('SELECT COUNT(*) FROM user_calendar_claims WHERE account_id=$1', [req.account.id])).rows[0].count + 1;
            } else {
                nextDay = 1;
            }
            if (nextDay > 31) nextDay = 1;
        }
        const reward = (await pool.query('SELECT * FROM daily_calendar WHERE day_number=$1', [nextDay])).rows[0];
        if (!reward) return res.status(404).json({ ok: false });
        await pool.query('INSERT INTO user_calendar_claims (account_id, claim_date, reward_type, reward_amount) VALUES ($1,$2,$3,$4)', [req.account.id, localDate, reward.reward_type, reward.reward_amount]);
        if (reward.reward_type === 'elo') await db.addElo(req.account.id, reward.reward_amount);
        if (reward.reward_type === 'loot_box') {
            for (let i = 0; i < reward.reward_amount; i++) {
                const box = (await pool.query('SELECT id FROM loot_boxes ORDER BY RANDOM() LIMIT 1')).rows[0];
                if (box) await pool.query('INSERT INTO user_loot_boxes (account_id, loot_box_id) VALUES ($1,$2)', [req.account.id, box.id]);
            }
        }
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, reward, newElo: updated ? updated.elo : 0 });
    } catch (error) {
        console.error('Calendar claim error:', error);
        res.status(500).json({ ok: false });
    }
});

// ============================================
// LOOT BOXES
// ============================================
app.get('/api/loot-boxes', requireAuth, async (req, res) => {
    try {
        const boxes = (await pool.query('SELECT * FROM loot_boxes ORDER BY cost_elo')).rows;
        const owned = (await pool.query("SELECT lb.*, l.name as box_name, l.icon, l.rarity FROM user_loot_boxes lb JOIN loot_boxes l ON lb.loot_box_id=l.id WHERE lb.account_id=$1 AND lb.opened=FALSE", [req.account.id])).rows;
        res.json({ ok: true, boxes, owned });
    } catch (error) {
        console.error('Loot boxes error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/loot-boxes/buy', requireAuth, async (req, res) => {
    try {
        const { lootBoxId } = req.body;
        const box = (await pool.query('SELECT * FROM loot_boxes WHERE id=$1', [lootBoxId])).rows[0];
        if (!box) return res.status(404).json({ ok: false });
        const acc = await db.findAccountById(req.account.id);
        if ((acc.elo || 0) < box.cost_elo) return res.status(400).json({ ok: false, message: 'Not enough ELO' });
        await db.addElo(req.account.id, -box.cost_elo);
        await pool.query('INSERT INTO user_loot_boxes (account_id, loot_box_id) VALUES ($1,$2)', [req.account.id, box.id]);
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, newElo: updated.elo });
    } catch (error) {
        console.error('Loot box buy error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/loot-boxes/open', requireAuth, async (req, res) => {
    try {
        const { userBoxId } = req.body;
        const userBox = (await pool.query('SELECT * FROM user_loot_boxes WHERE id=$1 AND account_id=$2 AND opened=FALSE', [userBoxId, req.account.id])).rows[0];
        if (!userBox) return res.status(404).json({ ok: false, message: 'Box not found or already opened' });
        const rewards = (await pool.query('SELECT * FROM loot_box_rewards WHERE loot_box_id=$1 ORDER BY drop_chance', [userBox.loot_box_id])).rows;
        if (rewards.length === 0) return res.status(500).json({ ok: false });
        let roll = Math.random() * 100;
        let chosen = rewards[0];
        for (const r of rewards) {
            roll -= r.drop_chance;
            if (roll <= 0) { chosen = r; break; }
        }
        if (chosen.reward_type === 'elo') await db.addElo(req.account.id, chosen.reward_value);
        await pool.query("UPDATE user_loot_boxes SET opened=TRUE, reward_type=$1, reward_name=$2, reward_value=$3, opened_at=NOW() WHERE id=$4", [chosen.reward_type, chosen.reward_name, chosen.reward_value, userBox.id]);
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, reward: { type: chosen.reward_type, name: chosen.reward_name, value: chosen.reward_value, rarity: chosen.rarity }, newElo: updated ? updated.elo : 0 });
    } catch (error) {
        console.error('Loot box open error:', error);
        res.status(500).json({ ok: false });
    }
});

// ============================================
// GAME REPLAYS
// ============================================
app.get('/api/replays', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT g.id, g.room_id, g.created_at, g.result,
                w.username as white_name, b.username as black_name,
                g.white_id, g.black_id, g.moves
            FROM games g
            LEFT JOIN accounts w ON g.white_id = w.id
            LEFT JOIN accounts b ON g.black_id = b.id
            WHERE g.white_id = $1 OR g.black_id = $1
            ORDER BY g.created_at DESC LIMIT 50
        `, [req.account.id]);
        res.json({ ok: true, replays: result.rows });
    } catch (error) {
        console.error('Replays error:', error);
        res.status(500).json({ ok: false });
    }
});

app.get('/api/replays/:gameId', requireAuth, async (req, res) => {
    try {
        const game = (await pool.query(`
            SELECT g.*, w.username as white_name, b.username as black_name
            FROM games g
            LEFT JOIN accounts w ON g.white_id = w.id
            LEFT JOIN accounts b ON g.black_id = b.id
            WHERE g.id = $1
        `, [req.params.gameId])).rows[0];
        if (!game) return res.status(404).json({ ok: false });
        res.json({ ok: true, game });
    } catch (error) {
        console.error('Replay detail error:', error);
        res.status(500).json({ ok: false });
    }
});

// ============================================
// EMOJI REACTIONS
// ============================================
app.get('/api/emojis', requireAuth, async (req, res) => {
    try {
        const all = (await pool.query('SELECT * FROM emoji_reactions ORDER BY cost_elo')).rows;
        const owned = (await pool.query('SELECT e.name FROM user_emoji_inventory u JOIN emoji_reactions e ON u.emoji_id=e.id WHERE u.account_id=$1', [req.account.id])).rows.map(r => r.name.toLowerCase());
        res.json({ ok: true, emojis: all, owned });
    } catch (error) {
        console.error('Emojis error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/emojis/buy', requireAuth, async (req, res) => {
    try {
        const { emojiId } = req.body;
        const emoji = (await pool.query('SELECT * FROM emoji_reactions WHERE LOWER(name)=LOWER($1)', [emojiId])).rows[0];
        if (!emoji) return res.status(404).json({ ok: false });
        const existing = (await pool.query('SELECT u.id FROM user_emoji_inventory u JOIN emoji_reactions e ON u.emoji_id=e.id WHERE u.account_id=$1 AND LOWER(e.name)=LOWER($2)', [req.account.id, emojiId])).rows[0];
        if (existing) return res.status(400).json({ ok: false, message: 'Already owned' });
        if (emoji.cost_elo > 0) {
            const acc = await db.findAccountById(req.account.id);
            if ((acc.elo || 0) < emoji.cost_elo) return res.status(400).json({ ok: false, message: 'Not enough ELO' });
            await db.addElo(req.account.id, -emoji.cost_elo);
        }
        await pool.query('INSERT INTO user_emoji_inventory (account_id, emoji_id) VALUES ($1,$2)', [req.account.id, emoji.id]);
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, newElo: updated ? updated.elo : 0 });
    } catch (error) {
        console.error('Emoji buy error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/emojis/send', requireAuth, async (req, res) => {
    try {
        const { roomId, receiverId, emoji } = req.body;
        if (!roomId || !emoji) return res.status(400).json({ ok: false });
        await pool.query('INSERT INTO game_reactions (game_room_id, sender_id, receiver_id, emoji) VALUES ($1,$2,$3,$4)', [roomId, req.account.id, receiverId || null, emoji]);
        if (io) io.to(roomId).emit('emojiReaction', { senderId: req.account.id, senderName: req.account.username, emoji });
        res.json({ ok: true });
    } catch (error) {
        console.error('Emoji send error:', error);
        res.status(500).json({ ok: false });
    }
});

// ============================================
// PROFILE THEMES + ANIMATED BOARD THEMES
// ============================================
app.get('/api/profile-themes', requireAuth, async (req, res) => {
    try {
        const themes = (await pool.query('SELECT * FROM profile_themes ORDER BY cost_elo')).rows;
        const equipped = (await pool.query('SELECT * FROM user_profile_theme WHERE account_id=$1', [req.account.id])).rows[0];
        res.json({ ok: true, themes, equipped: equipped || null });
    } catch (error) {
        console.error('Profile themes error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/profile-themes/buy', requireAuth, async (req, res) => {
    try {
        const { themeId } = req.body;
        const theme = (await pool.query('SELECT * FROM profile_themes WHERE id=$1', [themeId])).rows[0];
        if (!theme) return res.status(404).json({ ok: false });
        if (theme.cost_elo > 0) {
            const acc = await db.findAccountById(req.account.id);
            if ((acc.elo || 0) < theme.cost_elo) return res.status(400).json({ ok: false, message: 'Not enough ELO' });
            await db.addElo(req.account.id, -theme.cost_elo);
        }
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, newElo: updated ? updated.elo : 0 });
    } catch (error) {
        console.error('Profile theme buy error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/profile-themes/equip', requireAuth, async (req, res) => {
    try {
        const { themeId } = req.body;
        await pool.query('INSERT INTO user_profile_theme (account_id, theme_id) VALUES ($1,$2) ON CONFLICT (account_id) DO UPDATE SET theme_id=$2', [req.account.id, themeId]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Profile theme equip error:', error);
        res.status(500).json({ ok: false });
    }
});

app.get('/api/board-themes', requireAuth, async (req, res) => {
    try {
        const themes = (await pool.query('SELECT * FROM animated_board_themes ORDER BY cost_elo')).rows;
        const equipped = (await pool.query('SELECT * FROM user_board_theme WHERE account_id=$1', [req.account.id])).rows[0];
        res.json({ ok: true, themes, equipped: equipped || null });
    } catch (error) {
        console.error('Board themes error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/board-themes/buy', requireAuth, async (req, res) => {
    try {
        const { themeId } = req.body;
        const theme = (await pool.query('SELECT * FROM animated_board_themes WHERE id=$1', [themeId])).rows[0];
        if (!theme) return res.status(404).json({ ok: false });
        if (theme.cost_elo > 0) {
            const acc = await db.findAccountById(req.account.id);
            if ((acc.elo || 0) < theme.cost_elo) return res.status(400).json({ ok: false, message: 'Not enough ELO' });
            await db.addElo(req.account.id, -theme.cost_elo);
        }
        const updated = await db.findAccountById(req.account.id);
        res.json({ ok: true, newElo: updated ? updated.elo : 0 });
    } catch (error) {
        console.error('Board theme buy error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/board-themes/equip', requireAuth, async (req, res) => {
    try {
        const { themeId } = req.body;
        await pool.query('INSERT INTO user_board_theme (account_id, board_theme_id) VALUES ($1,$2) ON CONFLICT (account_id) DO UPDATE SET board_theme_id=$2', [req.account.id, themeId]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Board theme equip error:', error);
        res.status(500).json({ ok: false });
    }
});

/*
|--------------------------------------------------------------------------
| GET EQUIPPED PROFILE + BOARD THEMES (ADDITIVE)
| Resolves the account's currently equipped animated board theme and public
| profile theme. Separate from /shop/equipped (the shop_items "Items" board
| system) so both can coexist without overwriting each other.
|--------------------------------------------------------------------------
*/

app.get('/api/themes/equipped', requireAuth, async (req, res) => {
    try {
        const [profileTheme, boardTheme] = await Promise.all([
            db.getEquippedProfileTheme(req.account.id),
            db.getEquippedBoardTheme(req.account.id),
        ]);
        res.json({ ok: true, profileTheme, boardTheme });
    } catch (error) {
        console.error('Get equipped themes error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load equipped themes' });
    }
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

app.get(
    '/api/auth/me',
    requireAuth,
    (req, res) => {
        res.json({
            ok: true,
            account: publicAccount(req.account),
        });
    }
);

/*
|--------------------------------------------------------------------------
| GAME HISTORY API (WITH DETAILED MATCH INFO)
|--------------------------------------------------------------------------
*/

app.get('/api/games/history', requireAuth, async (req, res) => {
    try {
        const gamesList = await db.getGameHistory(req.account.id);

        // Format the data for the frontend
        const formattedGames = gamesList.map(game => {
            const moves = typeof game.moves === 'string' ? JSON.parse(game.moves) : (game.moves || []);
            const isWhite = game.white_player_id === req.account.id;
            const opponentName = isWhite ? game.black_username : game.white_username;
            const playerScore = (game.result === 'white' && isWhite) || (game.result === 'black' && !isWhite) ? 1 : (game.result === 'draw' ? 0.5 : 0);
            const opponentScore = 1 - playerScore;

            return {
                id: game.id,
                roomId: game.room_id,
                date: game.finished_at,
                opponent: opponentName || 'Unknown',
                result: game.result,
                playerScore,
                opponentScore,
                movesCount: moves.length,
                moves: moves,
                playerColor: isWhite ? 'white' : 'black'
            };
        });

        return res.json({
            ok: true,
            games: formattedGames
        });
    } catch (error) {
        console.error('Game history error:', error);
        return res.status(500).json({
            ok: false,
            message: 'Unable to load game history.'
        });
    }
});

/*
|--------------------------------------------------------------------------
| LOGOUT
|--------------------------------------------------------------------------
*/

app.post(
    '/api/auth/logout',
    requireAuth,
    async (req, res) => {
        await deleteSession(req.authToken);

        res.json({
            ok: true,
            message: 'Logged out successfully.',
        });
    }
);

/*
|--------------------------------------------------------------------------
| ACTIVE GAME STORAGE (In-Memory)
|--------------------------------------------------------------------------
*/

const games = new Map();

const onlineUsers = new Map();

/*
|--------------------------------------------------------------------------
| ROOM HELPERS
|--------------------------------------------------------------------------
*/

function generateLobbyCode() {
    let code;

    do {
        code = '';

        for (
            let i = 0;
            i < LOBBY_CODE_LENGTH;
            i += 1
        ) {
            code += Math.floor(
                Math.random() * 10
            );
        }
    } while (games.has(code));

    return code;
}

function cleanRoom(room) {
    return String(room || '')
        .trim()
        .replace(/\D/g, '')
        .slice(0, LOBBY_CODE_LENGTH);
}

function cleanName(name) {
    return (
        String(name || 'Player')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 24) ||
        'Player'
    );
}

/*
|--------------------------------------------------------------------------
| CREATE GAME OBJECT
|--------------------------------------------------------------------------
*/

function createGame() {
    return {
        chess: new Chess(),

        players: {
            white: null,
            black: null,
        },

        history: [],

        messages: [],

        lastMove: null,

        owner: null,

        status: 'waiting',

        resultRecorded: false,

        result: null,

        createdAt: Date.now(),

        updatedAt: Date.now(),
    };
}

/*
|--------------------------------------------------------------------------
| PLAYER HELPERS
|--------------------------------------------------------------------------
*/

function publicPlayers(game) {
    return {
        white: game.players.white
            ? {
                  id:
                      game.players.white
                          .playerId,
                  name:
                      game.players.white.name,
              }
            : null,

        black: game.players.black
            ? {
                  id:
                      game.players.black
                          .playerId,
                  name:
                      game.players.black.name,
              }
            : null,
    };
}

function roleOf(game, socket) {
    if (
        game.players.white &&
        game.players.white.socketId ===
            socket.id
    ) {
        return 'w';
    }

    if (
        game.players.black &&
        game.players.black.socketId ===
            socket.id
    ) {
        return 'b';
    }

    return 'spectator';
}

/*
|--------------------------------------------------------------------------
| GAME STATE
|--------------------------------------------------------------------------
*/

function getGameState(game) {
    return {
        FEN: game.chess.fen(),

        fen: game.chess.fen(),

        history: [...game.history],

        players:
            publicPlayers(game),

        isCheck:
            game.chess.isCheck(),

        isGameOver:
            game.chess.isGameOver(),

        isCheckmate:
            game.chess.isCheckmate(),

        isDraw:
            game.chess.isDraw(),

        isStalemate:
            game.chess.isStalemate(),

        lastMove:
            game.lastMove,

        status:
            game.status,

        result:
            game.result,

        turn:
            game.chess.turn(),
    };
}

/*
|--------------------------------------------------------------------------
| SEND PLAYER ROLE
|--------------------------------------------------------------------------
*/

function emitRole(socket, game) {
    socket.emit(
        'playerRole',
        {
            role:
                roleOf(
                    game,
                    socket
                ),

            messages:
                game.messages,

            ...getGameState(game),
        }
    );
}

/*
|--------------------------------------------------------------------------
| ELO RESULT SYSTEM (Using Database)
|--------------------------------------------------------------------------
*/

async function updateAccountResult(
    accountId,
    result
) {
    return await db.updateAccountStats(accountId, result);
}

/*
|--------------------------------------------------------------------------
| DETERMINE GAME RESULT
|--------------------------------------------------------------------------
*/

function determineGameResult(game) {
    if (!game.chess.isGameOver()) {
        return null;
    }

    if (game.chess.isCheckmate()) {
        const loser =
            game.chess.turn();

        const winner =
            loser === 'w'
                ? 'b'
                : 'w';

        return {
            type: 'checkmate',
            winner,
            loser,
        };
    }

    return {
        type: 'draw',
        winner: null,
        loser: null,
    };
}

/*
|--------------------------------------------------------------------------
| SAVE COMPLETED GAME (Using Database)
|--------------------------------------------------------------------------
*/

async function saveCompletedGame(
    roomId,
    game
) {
    try {
        const white =
            game.players.white;

        const black =
            game.players.black;

        if (!white || !black) {
            return null;
        }

        const gameRecord = {
            id: crypto.randomUUID(),
            roomId,
            white: {
                playerId: white.playerId,
                username: white.name,
            },
            black: {
                playerId: black.playerId,
                username: black.name,
            },
            moves: [...game.history],
            result: game.result?.winner === 'white'
                ? 'white'
                : game.result?.winner === 'black'
                ? 'black'
                : 'draw',
            resultType: game.result?.type || 'draw',
            winner: game.result?.winnerName || null,
            startedAt: new Date(game.createdAt).toISOString(),
            finishedAt: new Date().toISOString(),
        };

        const saved = await db.saveGame(gameRecord);

        console.log(
            `[Game History] Saved game ${saved.id} from room ${roomId}`
        );

        return saved;
    } catch (error) {
        console.error(
            'Unable to save completed game:',
            error
        );

        return null;
    }
}

/*
|--------------------------------------------------------------------------
| UPDATE QUESTS AFTER GAME
|--------------------------------------------------------------------------
*/

async function updateQuestsAfterGame(playerId, result, capturedPieces) {
    if (!playerId) return;
    try {
        // 1. Update match participation quests
        await db.updateQuestProgress(playerId, 'play_5_games', 1);
        await db.updateQuestProgress(playerId, 'play_games', 1);

        // 2. If won, update victory quests
        if (result === 'win') {
            await db.updateQuestProgress(playerId, 'first_win', 1);
            await db.updateQuestProgress(playerId, 'win_games', 1);
        }

        // 3. If pieces captured, update piece capture quests
        if (capturedPieces > 0) {
            await db.updateQuestProgress(playerId, 'capture_10_pieces', capturedPieces);
            await db.updateQuestProgress(playerId, 'capture_pieces', capturedPieces);
        }
    } catch (error) {
        console.error(`updateQuestsAfterGame error for ${playerId}:`, error);
    }
}

/*
|--------------------------------------------------------------------------
| RECORD GAME RESULT
|--------------------------------------------------------------------------
*/

async function recordGameResult(
    roomId,
    game
) {
    if (game.resultRecorded) {
        return;
    }

    const result =
        determineGameResult(game);

    if (!result) {
        return;
    }

    const white =
        game.players.white;

    const black =
        game.players.black;

    if (!white || !black) {
        return;
    }

    game.resultRecorded = true;

    game.status = 'finished';

    let whiteResult;

    let blackResult;

    if (result.type === 'draw') {
        whiteResult = 'draw';
        blackResult = 'draw';

        game.result = {
            type: 'draw',
            winner: null,
            winnerName: null,
            message: 'Draw game.',
        };
    } else if (
        result.winner === 'w'
    ) {
        whiteResult = 'win';
        blackResult = 'loss';

        game.result = {
            type: 'win',
            winner: 'white',
            winnerName: white.name,
            message: `${white.name} wins!`,
        };
    } else {
        whiteResult = 'loss';
        blackResult = 'win';

        game.result = {
            type: 'win',
            winner: 'black',
            winnerName: black.name,
            message: `${black.name} wins!`,
        };
    }

    const whiteAccount =
        await updateAccountResult(
            white.playerId,
            whiteResult
        );

    const blackAccount =
        await updateAccountResult(
            black.playerId,
            blackResult
        );

    const savedGame =
        await saveCompletedGame(
            roomId,
            game
        );

    // After updating account stats...
try {
    const capturedPieces = game.history.filter(move => move.includes('x')).length;
    await updateQuestsAfterGame(white.playerId, whiteResult, capturedPieces);
    await updateQuestsAfterGame(black.playerId, blackResult, capturedPieces);
} catch (error) {
    console.error('Failed to update quests:', error);
}

// Check achievements and create notifications after game
try {
    const allAchievements = await db.getAllAchievements();
    for (const [pid, pResult] of [[white.playerId, whiteResult], [black.playerId, blackResult]]) {
        if (!pid) continue;
        const acc = await db.findAccountById(pid);
        if (!acc) continue;
        for (const ach of allAchievements) {
            let met = false;
            if (ach.requirement_type === 'wins' && acc.wins >= ach.requirement_value) met = true;
            if (ach.requirement_type === 'games' && acc.games >= ach.requirement_value) met = true;
            if (ach.requirement_type === 'elo' && acc.elo >= ach.requirement_value) met = true;
            if (met) {
                const userAchs = await db.getUserAchievements(pid);
                const already = userAchs.find(a => a.id === ach.id && a.unlocked_at);
                if (!already) {
                    await db.unlockAchievement(pid, ach.id);
                    await db.createNotification(pid, 'achievement', '🏆 Achievement Unlocked!', `${ach.name}: ${ach.description}`, { achievementId: ach.id, reward: ach.elo_reward });
                    io.to(pid).emit('notification', { type: 'achievement', title: '🏆 Achievement Unlocked!', message: ach.name });
                }
            }
        }
        if (pResult === 'win') {
            await db.createNotification(pid, 'match', '🏆 Match Won!', `You won against ${pid === white.playerId ? black.username : white.username}`, { result: 'win' });
        }
    }
} catch (error) {
    console.error('Achievement check error:', error);
}

    io.to(roomId).emit(
        'gameResult',
        {
            ...game.result,
            white: whiteAccount,
            black: blackAccount,
            savedGame,
            elo: {
                white:
                    whiteResult ===
                    'win'
                        ? 10
                        : whiteResult ===
                          'loss'
                        ? -5
                        : 3,
                black:
                    blackResult ===
                    'win'
                        ? 10
                        : blackResult ===
                          'loss'
                        ? -5
                        : 3,
            },
        }
    );

    // Auto-report tournament duel result
    try {
        const tdResult = await pool.query("SELECT * FROM tournament_duels WHERE room_id=$1 AND status='accepted' LIMIT 1", [roomId]);
        if (tdResult.rows.length > 0) {
            const td = tdResult.rows[0];
            let winnerId = null;
            if (game.result?.winner === 'white') winnerId = white.playerId;
            else if (game.result?.winner === 'black') winnerId = black.playerId;
            await pool.query("UPDATE tournament_duels SET status='completed', winner_id=$1, result='completed' WHERE id=$2", [winnerId, td.id]);
            const tInfo = await pool.query('SELECT points_per_win FROM tournaments WHERE id=$1', [td.tournament_id]);
            if (winnerId && tInfo.rows.length > 0) {
                await pool.query('UPDATE tournament_players SET points = points + $1, games_played = games_played + 1 WHERE tournament_id=$2 AND account_id=$3', [tInfo.rows[0].points_per_win, td.tournament_id, winnerId]);
            }
            // Update games_played for both players
            await pool.query('UPDATE tournament_players SET games_played = games_played + 1 WHERE tournament_id=$1 AND account_id IN ($2,$3)', [td.tournament_id, td.challenger_id, td.opponent_id]);
        }
    } catch (e) {
        console.error('Tournament auto-report error:', e);
    }

    game.updatedAt =
        Date.now();
}

/*
|--------------------------------------------------------------------------
| CREATE LOBBY API
|--------------------------------------------------------------------------
*/

app.post(
    '/api/lobby/create',
    requireAuth,
    (req, res) => {
        try {
            const roomId =
                generateLobbyCode();

            const game =
                createGame();

            game.owner = {
                playerId:
                    req.account.id,
                username:
                    req.account.username,
            };

            games.set(
                roomId,
                game
            );

            return res
                .status(201)
                .json({
                    ok: true,
                    roomId,
                    status: 'waiting',
                    message: 'MYCHESS lobby created successfully.',
                });
        } catch (error) {
            console.error(
                'Create lobby error:',
                error
            );

            return res
                .status(500)
                .json({
                    ok: false,
                    message: 'Unable to create MYCHESS lobby.',
                });
        }
    }
);

/*
|--------------------------------------------------------------------------
| JOIN / CHECK LOBBY API
|--------------------------------------------------------------------------
*/

app.post(
    '/api/lobby/join',
    requireAuth,
    (req, res) => {
        const roomId =
            cleanRoom(
                req.body?.roomId
            );

        if (
            roomId.length !==
            LOBBY_CODE_LENGTH
        ) {
            return res
                .status(400)
                .json({
                    ok: false,
                    message: 'Please enter a valid 6-digit room code.',
                });
        }

        const game =
            games.get(roomId);

        if (!game) {
            return res
                .status(404)
                .json({
                    ok: false,
                    message: 'That MYCHESS lobby does not exist.',
                });
        }

        const full =
            Boolean(
                game.players.white
            ) &&
            Boolean(
                game.players.black
            );

        if (full) {
            return res
                .status(409)
                .json({
                    ok: false,
                    message: 'This MYCHESS lobby is already full.',
                });
        }

        return res.json({
            ok: true,
            roomId,
            status: 'available',
            message: 'Lobby found.',
        });
    }
);

/*
|--------------------------------------------------------------------------
| LOBBY STATUS
|--------------------------------------------------------------------------
*/

app.get(
    '/api/lobby/:roomId',
    requireAuth,
    (req, res) => {
        const roomId =
            cleanRoom(
                req.params.roomId
            );

        const game =
            games.get(roomId);

        if (!game) {
            return res
                .status(404)
                .json({
                    ok: false,
                    message: 'Lobby not found.',
                });
        }

        const playerCount =
            Number(
                Boolean(
                    game.players.white
                )
            ) +
            Number(
                Boolean(
                    game.players.black
                )
            );

        let status = 'waiting';

        if (
            playerCount >= 2 &&
            game.status !==
                'finished'
        ) {
            status = 'playing';
        }

        if (
            game.status ===
            'finished'
        ) {
            status = 'finished';
        }

        return res.json({
            ok: true,
            roomId,
            status,
            playerCount,
            players: publicPlayers(game),
            result: game.result,
        });
    }
);

/*
|--------------------------------------------------------------------------
| GET ACTIVE PUBLIC LOBBIES
|--------------------------------------------------------------------------
*/

app.get('/api/lobbies/active', requireAuth, (req, res) => {
    try {
        const activeLobbies = [];
        
        for (const [roomId, game] of games.entries()) {
            const playerCount = (game.players.white ? 1 : 0) + (game.players.black ? 1 : 0);
            
            // Only show lobbies that are not full and not finished
            if (playerCount < 2 && game.status !== 'finished') {
                activeLobbies.push({
                    roomId: roomId,
                    hostName: game.players.white?.name || game.players.black?.name || 'Unknown',
                    playerCount: playerCount,
                    status: game.status
                });
            }
        }
        
        res.json({
            ok: true,
            lobbies: activeLobbies
        });
    } catch (error) {
        console.error('Active lobbies error:', error);
        res.status(500).json({ ok: false, message: 'Unable to fetch lobbies' });
    }
});

app.get('/api/leaderboard', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, elo, games, wins, draws, losses
             FROM accounts
             WHERE games > 0
             ORDER BY elo DESC
             LIMIT 10`
        );
        res.json({ ok: true, players: result.rows });
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load leaderboard' });
    }
});

// ============================================
// DAILY PUZZLE ENDPOINTS
// ============================================
app.get('/api/daily-puzzle', requireAuth, async (req, res) => {
    try {
        const puzzle = await db.getTodayPuzzle();
        if (!puzzle) return res.json({ ok: true, puzzle: null });
        const attempt = await db.getPuzzleAttempt(req.account.id, puzzle.id);
        res.json({
            ok: true,
            puzzle: {
                id: puzzle.id,
                fen: puzzle.fen,
                difficulty: puzzle.difficulty,
                description: puzzle.description,
                hint: puzzle.hint,
                reward_elo: puzzle.reward_elo,
                date: puzzle.puzzle_date,
            },
            attempt: attempt ? { solved: attempt.solved, attempts: attempt.attempts } : null,
        });
    } catch (error) {
        console.error('Daily puzzle error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load puzzle' });
    }
});

app.post('/api/daily-puzzle/solve', requireAuth, async (req, res) => {
    try {
        const puzzle = await db.getTodayPuzzle();
        if (!puzzle) return res.status(404).json({ ok: false, message: 'No puzzle today' });
        const attempt = await db.getPuzzleAttempt(req.account.id, puzzle.id);
        if (attempt && attempt.solved) return res.json({ ok: true, alreadySolved: true, reward: 0 });

        const record = await db.recordPuzzleAttempt(req.account.id, puzzle.id, true);
        if (record && !attempt?.solved) {
            await db.addElo(req.account.id, puzzle.reward_elo);
        }
        res.json({ ok: true, reward: puzzle.reward_elo });
    } catch (error) {
        console.error('Puzzle solve error:', error);
        res.status(500).json({ ok: false, message: 'Unable to save puzzle result' });
    }
});

app.post('/api/daily-puzzle/attempt', requireAuth, async (req, res) => {
    try {
        const puzzle = await db.getTodayPuzzle();
        if (!puzzle) return res.status(404).json({ ok: false, message: 'No puzzle today' });
        await db.recordPuzzleAttempt(req.account.id, puzzle.id, false);
        res.json({ ok: true });
    } catch (error) {
        console.error('Puzzle attempt error:', error);
        res.status(500).json({ ok: false, message: 'Unable to record attempt' });
    }
});

// ============================================
// RECENT MATCHES FEED
// ============================================
app.get('/api/recent-matches', requireAuth, async (req, res) => {
    try {
        const matches = await db.getRecentMatches(10);
        res.json({ ok: true, matches });
    } catch (error) {
        console.error('Recent matches error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load recent matches' });
    }
});

// ============================================
// GAME STATS
// ============================================
app.get('/api/game-stats', requireAuth, async (req, res) => {
    try {
        const stats = await db.getGameStats();
        res.json({ ok: true, stats });
    } catch (error) {
        console.error('Game stats error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load stats' });
    }
});

// ============================================
// CHESS QUIZ
// ============================================
app.get('/api/chess-quiz/questions', requireAuth, async (req, res) => {
    try {
        const questions = await db.getQuizQuestions();
        res.json({ ok: true, questions });
    } catch (error) {
        console.error('Quiz questions error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load quiz questions' });
    }
});

app.post('/api/chess-quiz/check', requireAuth, async (req, res) => {
    try {
        const { questionId, answer } = req.body;
        if (!questionId || !answer) {
            return res.status(400).json({ ok: false, message: 'Missing questionId or answer' });
        }
        const result = await db.checkQuizAnswer(questionId, answer);
        if (!result) {
            return res.status(404).json({ ok: false, message: 'Question not found' });
        }
        let eloEarned = 0;
        if (result.correct) {
            eloEarned = 2;
            await db.addElo(req.account.id, eloEarned);
        }
        const updatedAccount = await db.findAccountById(req.account.id);
        res.json({
            ok: true,
            correct: result.correct,
            correctAnswer: result.correctAnswer,
            eloEarned,
            newElo: updatedAccount ? updatedAccount.elo : 0,
        });
    } catch (error) {
        console.error('Quiz check error:', error);
        res.status(500).json({ ok: false, message: 'Unable to check answer' });
    }
});

// ============================================
// STREAK ENDPOINT
// ============================================
app.post('/api/streak/claim', requireAuth, async (req, res) => {
    try {
        const result = await db.updateStreak(req.account.id);
        res.json({ ok: true, ...result });
    } catch (error) {
        console.error('Streak claim error:', error);
        res.status(500).json({ ok: false, message: 'Unable to claim streak' });
    }
});

app.get('/api/streak', requireAuth, async (req, res) => {
    try {
        const info = await db.getStreakInfo(req.account.id);
        if (!info) return res.json({ ok: true, streak: 0, lastDailyLogin: null });
        const now = new Date();
        const last = info.last_daily_login ? new Date(info.last_daily_login) : null;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let claimedToday = false;
        if (last) {
            const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            claimedToday = (today - lastDay) < (1000 * 60 * 60 * 24);
        }
        res.json({ ok: true, streak: info.login_streak || 0, claimedToday, lastDailyLogin: info.last_daily_login });
    } catch (error) {
        console.error('Streak info error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load streak' });
    }
});

// ============================================
// ACHIEVEMENTS ENDPOINT
// ============================================
app.get('/api/achievements', requireAuth, async (req, res) => {
    try {
        const achievements = await db.getUserAchievements(req.account.id);
        res.json({ ok: true, achievements });
    } catch (error) {
        console.error('Achievements error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load achievements' });
    }
});

app.post('/api/achievements/:id/claim', requireAuth, async (req, res) => {
    try {
        const result = await db.claimAchievementReward(req.account.id, req.params.id);
        if (!result) return res.status(400).json({ ok: false, message: 'Already claimed or not unlocked' });
        res.json({ ok: true, elo: result.elo });
    } catch (error) {
        console.error('Achievement claim error:', error);
        res.status(500).json({ ok: false, message: 'Unable to claim reward' });
    }
});

// ============================================
// MATCH HISTORY TIMELINE ENDPOINT
// ============================================
app.get('/api/match-history/:userId', requireAuth, async (req, res) => {
    try {
        const matches = await db.getMatchTimeline(req.params.userId, 30);
        res.json({ ok: true, matches });
    } catch (error) {
        console.error('Match timeline error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load match history' });
    }
});

// ============================================
// PLAYER PROFILE ENDPOINT
// ============================================
app.get('/api/profile/:userId', requireAuth, async (req, res) => {
    try {
        const profile = await db.getPublicProfile(req.params.userId);
        if (!profile) return res.status(404).json({ ok: false, message: 'Player not found' });
        const matches = await db.getMatchTimeline(req.params.userId, 10);
        const achievements = await db.getUserAchievements(req.params.userId);
        const unlockedCount = achievements.filter(a => a.unlocked_at).length;
        const theme = await db.getEquippedProfileTheme(req.params.userId);
        res.json({ ok: true, profile, recentMatches: matches, totalAchievements: achievements.length, unlockedAchievements: unlockedCount, theme });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load profile' });
    }
});

// ADDITIVE: resolve a public profile by username (used by clickable username links)
app.get('/api/profile/by-username/:username', requireAuth, async (req, res) => {
    try {
        const account = await db.findAccountByUsername(req.params.username);
        if (!account) return res.status(404).json({ ok: false, message: 'Player not found' });
        const profile = await db.getPublicProfile(account.id);
        const matches = await db.getMatchTimeline(account.id, 10);
        const achievements = await db.getUserAchievements(account.id);
        const unlockedCount = achievements.filter(a => a.unlocked_at).length;
        const theme = await db.getEquippedProfileTheme(account.id);
        res.json({ ok: true, id: account.id, profile, recentMatches: matches, totalAchievements: achievements.length, unlockedAchievements: unlockedCount, theme });
    } catch (error) {
        console.error('Profile-by-username error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load profile' });
    }
});

// ============================================
// NOTIFICATIONS ENDPOINT
// ============================================
app.get('/api/notifications', requireAuth, async (req, res) => {
    try {
        const notifications = await db.getNotifications(req.account.id, 30);
        const unreadCount = await db.getUnreadCount(req.account.id);
        res.json({ ok: true, notifications, unreadCount });
    } catch (error) {
        console.error('Notifications error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load notifications' });
    }
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
    try {
        await db.markNotificationRead(req.params.id, req.account.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to mark as read' });
    }
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
    try {
        await db.markAllNotificationsRead(req.account.id);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to mark all as read' });
    }
});

// ============================================
// ONLINE COUNT ENDPOINT (REST fallback)
// ============================================
app.get('/api/online-count', (req, res) => {
    res.json({ ok: true, count: onlineUsers.size });
});

/*
|--------------------------------------------------------------------------
| FRIENDS & CHALLENGE
|--------------------------------------------------------------------------
*/

const activeAccounts = new Map(); // accountId -> { username, socketIds:Set }

// Canonical row: store (lower, higher) so each friendship has one row.
function friendKeys(a, b) {
    return a < b ? [a, b] : [b, a];
}

// Search users by username/email (exclude self)
app.get('/api/friends/search', requireAuth, async (req, res) => {
    try {
        const q = (req.query.q || '').toString().trim();
        if (!q) return res.json({ ok: true, users: [] });
        const r = await pool.query(
            `SELECT id, username, elo, role FROM accounts
             WHERE id <> $1 AND (username ILIKE $2 OR email ILIKE $2)
             ORDER BY username LIMIT 12`,
            [req.account.id, `%${q}%`]
        );
        res.json({ ok: true, users: r.rows });
    } catch (error) {
        console.error('Friend search error:', error);
        res.status(500).json({ ok: false, message: 'Search failed' });
    }
});

// Send a friend request
app.post('/api/friends/request', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        if (!friendId || friendId === req.account.id) {
            return res.status(400).json({ ok: false, message: 'Invalid user' });
        }
        const [low, high] = friendKeys(req.account.id, friendId);
        const existing = await pool.query(
            'SELECT * FROM friends WHERE user_id=$1 AND friend_id=$2',
            [low, high]
        );
        if (existing.rows.length) {
            const row = existing.rows[0];
            if (row.status === 'accepted') return res.json({ ok: true, message: 'Already friends' });
            if (row.status === 'pending') {
                // If the reverse request exists from them, accept immediately
                if (row.requester_id === friendId) {
                    await pool.query('UPDATE friends SET status=$1 WHERE id=$2', ['accepted', row.id]);
                    emitFriendUpdate(req.account.id);
                    emitFriendUpdate(friendId);
                    return res.json({ ok: true, message: 'You are now friends!' });
                }
                return res.json({ ok: true, message: 'Request already sent' });
            }
            // declined -> re-send
            await pool.query(
                'UPDATE friends SET status=$1, requester_id=$2 WHERE id=$3',
                ['pending', req.account.id, row.id]
            );
            emitFriendRequest(friendId, req.account, 'friendRequest');
            await notifyFriendRequest(friendId, req.account);
            return res.json({ ok: true, message: 'Friend request sent' });
        }

        const ins = await pool.query(
            'INSERT INTO friends (user_id, friend_id, status, requester_id) VALUES ($1,$2,$3,$4) RETURNING *',
            [low, high, 'pending', req.account.id]
        );
        emitFriendRequest(friendId, req.account, 'friendRequest');
        await notifyFriendRequest(friendId, req.account);
        res.json({ ok: true, message: 'Friend request sent', id: ins.rows[0].id });
    } catch (error) {
        console.error('Friend request error:', error);
        res.status(500).json({ ok: false, message: 'Could not send request' });
    }
});

// Accept a friend request
app.post('/api/friends/accept', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        const [low, high] = friendKeys(req.account.id, friendId);
        const r = await pool.query(
            `UPDATE friends SET status='accepted'
             WHERE user_id=$1 AND friend_id=$2 AND status='pending'
             RETURNING *`,
            [low, high]
        );
        if (!r.rows.length) return res.status(404).json({ ok: false, message: 'No pending request' });
        emitFriendUpdate(req.account.id);
        emitFriendUpdate(friendId);
        emitFriendRequest(req.account, { id: friendId, username: req.account.username }, 'friendAccepted');
        const requesterId = r.rows[0].requester_id && r.rows[0].requester_id !== req.account.id ? r.rows[0].requester_id : friendId;
        await notifyFriendAccepted(requesterId, req.account);
        res.json({ ok: true });
    } catch (error) {
        console.error('Friend accept error:', error);
        res.status(500).json({ ok: false, message: 'Could not accept' });
    }
});

// Decline a friend request
app.post('/api/friends/decline', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        const [low, high] = friendKeys(req.account.id, friendId);
        await pool.query(
            'UPDATE friends SET status=$1 WHERE user_id=$2 AND friend_id=$3',
            ['declined', low, high]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Could not decline' });
    }
});

// Remove (unfriend) / cancel outgoing
app.post('/api/friends/remove', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        const [low, high] = friendKeys(req.account.id, friendId);
        await pool.query('DELETE FROM friends WHERE user_id=$1 AND friend_id=$2', [low, high]);
        emitFriendUpdate(req.account.id);
        emitFriendUpdate(friendId);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Could not remove' });
    }
});

// List friends (accepted) + incoming pending requests
app.get('/api/friends', requireAuth, async (req, res) => {
    try {
        const me = req.account.id;
        // Accepted friends
        const f = await pool.query(
            `SELECT f.user_id, f.friend_id, a.username, a.elo, a.role
             FROM friends f
             JOIN accounts a ON (a.id = CASE WHEN f.user_id=$1 THEN f.friend_id ELSE f.user_id END)
             WHERE f.status='accepted' AND ($1 IN (f.user_id, f.friend_id))
             ORDER BY a.username`,
            [me]
        );
        // Incoming pending requests (where requester is not me, and I'm one of the two parties)
        const inc = await pool.query(
            `SELECT f.id, f.requester_id AS user_id, a.username, a.elo, a.role
             FROM friends f
             JOIN accounts a ON a.id = f.requester_id
             WHERE f.status='pending' AND f.requester_id <> $1 AND ($1 = f.user_id OR $1 = f.friend_id)
             ORDER BY f.created_at DESC`,
            [me]
        );
        const friendIds = f.rows.map(x => (x.user_id === me ? x.friend_id : x.user_id));
        const friends = f.rows.map(x => {
            const uid = x.user_id === me ? x.friend_id : x.user_id;
            return {
                id: uid,
                username: x.username,
                elo: Number(x.elo || 0),
                online: activeAccounts.has(uid),
            };
        });
        const requests = inc.rows.map(x => ({
            id: x.id,
            user_id: x.user_id,
            username: x.username,
            elo: Number(x.elo || 0),
            online: activeAccounts.has(x.user_id),
        }));
        res.json({ ok: true, friends, requests, anyOnline: activeAccounts.size });
    } catch (error) {
        console.error('Friend list error:', error);
        res.status(500).json({ ok: false, message: 'Could not load friends' });
    }
});

// Verify two accounts are accepted friends
async function areFriends(a, b) {
    const [low, high] = friendKeys(String(a), String(b));
    const r = await pool.query(
        `SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2 AND status='accepted'`,
        [low, high]
    );
    return r.rows.length > 0;
}

/*
|--------------------------------------------------------------------------
| FRIEND MESSAGES (private DM chat)
|--------------------------------------------------------------------------
*/

// Unread direct messages, grouped per sender (for the floating message bubble).
app.get('/api/messages/unread', requireAuth, async (req, res) => {
    try {
        const me = req.account.id;
        const r = await pool.query(
            `SELECT u.id AS sender_id, u.username AS sender_name, COUNT(*) AS count
             FROM friend_messages m
             JOIN accounts u ON u.id = m.sender_id
             WHERE m.receiver_id=$1 AND m.read_at IS NULL
             GROUP BY u.id, u.username
             ORDER BY MAX(m.created_at) DESC`,
            [me]
        );
        const total = r.rows.reduce((sum, x) => sum + Number(x.count || 0), 0);
        res.json({ ok: true, total, senders: r.rows });
    } catch (error) {
        console.error('Unread messages error:', error);
        res.status(500).json({ ok: false, message: 'Could not load unread messages' });
    }
});

// Get the conversation with a friend (oldest -> newest)
app.get('/api/messages/:friendId', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.params.friendId || '');
        if (!(await areFriends(req.account.id, friendId))) {
            return res.status(403).json({ ok: false, message: 'Not friends' });
        }
        const me = req.account.id;
        const r = await pool.query(
            `SELECT id, sender_id, receiver_id, body, created_at, read_at
             FROM friend_messages
             WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
             ORDER BY created_at ASC, id ASC
             LIMIT 500`,
            [me, friendId]
        );
        res.json({
            ok: true,
            messages: r.rows.map((m) => ({
                id: m.id,
                fromMe: m.sender_id === me,
                senderId: m.sender_id,
                body: m.body,
                createdAt: m.created_at,
                read: !!m.read_at,
            })),
        });
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ ok: false, message: 'Could not load messages' });
    }
});

// Send a private message to a friend
app.post('/api/messages', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        const body = String(req.body.body || '').trim().slice(0, 1000);
        if (!friendId || !body) {
            return res.status(400).json({ ok: false, message: 'Message cannot be empty' });
        }
        if (!(await areFriends(req.account.id, friendId))) {
            return res.status(403).json({ ok: false, message: 'Not friends' });
        }
        const ins = await pool.query(
            `INSERT INTO friend_messages (sender_id, receiver_id, body)
             VALUES ($1, $2, $3) RETURNING id, sender_id, receiver_id, body, created_at, read_at`,
            [req.account.id, friendId, body]
        );
        const msg = ins.rows[0];
        emitFriendMessage(friendId, {
            id: msg.id,
            fromId: req.account.id,
            fromName: req.account.username,
            toId: friendId,
            body: msg.body,
            at: msg.created_at,
        });
        // echo back to sender's own sockets
        emitFriendMessage(req.account.id, {
            id: msg.id,
            fromId: req.account.id,
            fromName: req.account.username,
            toId: friendId,
            body: msg.body,
            at: msg.created_at,
        }, true);
        res.json({
            ok: true,
            message: {
                id: msg.id,
                fromMe: true,
                senderId: msg.sender_id,
                body: msg.body,
                createdAt: msg.created_at,
                read: !!msg.read_at,
            },
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ ok: false, message: 'Could not send message' });
    }
});

// Mark a conversation with a friend as read
app.post('/api/messages/read', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        await pool.query(
            `UPDATE friend_messages SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
             WHERE receiver_id=$1 AND sender_id=$2 AND read_at IS NULL`,
            [req.account.id, friendId]
        );
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Could not mark read' });
    }
});

/*
|--------------------------------------------------------------------------
| FRIEND / CHALLENGE REALTIME EVENTS (socket)
|--------------------------------------------------------------------------
*/

function emitFriendRequest(targetAccountId, from, evType) {
    const target = activeAccounts.get(String(targetAccountId));
    if (target) {
        target.socketIds.forEach((sid) => {
            io.to(sid).emit(evType || 'friendRequest', {
                fromId: from.id,
                fromName: from.username || from,
                at: Date.now(),
            });
        });
    }
}

function emitFriendUpdate(accountId) {
    const target = activeAccounts.get(String(accountId));
    if (target) {
        target.socketIds.forEach((sid) => {
            io.to(sid).emit('friendListChanged');
        });
    }
}

// Deliver a private message to all sockets of the target account.
// If echo is true, the target is the sender (used to sync their other devices).
function emitFriendMessage(targetAccountId, payload, echo) {
    const target = activeAccounts.get(String(targetAccountId));
    if (target) {
        target.socketIds.forEach((sid) => {
            io.to(sid).emit('friendMessage', { ...payload, echo: !!echo });
        });
    }
}

// Deliver the existing 'notification' socket event to all of an account's
// sockets (the header notification bell listens for this event on any socket).
function emitNotification(accountId, data) {
    const target = activeAccounts.get(String(accountId));
    if (target) {
        target.socketIds.forEach((sid) => {
            io.to(sid).emit('notification', data);
        });
    }
}

// Persist + push a friend-request notification to the receiver's bell.
async function notifyFriendRequest(receiverId, from) {
    try {
        await db.createNotification(
            receiverId,
            'friendRequest',
            '🔔 New Friend Request',
            `${from.username} sent you a friend request`,
            { type: 'friendRequest', fromId: from.id, fromName: from.username }
        );
    } catch (e) {
        console.error('Friend request notification error:', e);
    }
    emitNotification(receiverId, {
        type: 'friendRequest',
        title: '🔔 New Friend Request',
        message: `${from.username} sent you a friend request`,
    });
}

// Persist + push an "accepted" notification to the original requester.
async function notifyFriendAccepted(requesterId, from) {
    try {
        await db.createNotification(
            requesterId,
            'friendAccepted',
            '✅ Friend Request Accepted',
            `${from.username} accepted your friend request`,
            { type: 'friendAccepted', fromId: from.id, fromName: from.username }
        );
    } catch (e) {
        console.error('Friend accepted notification error:', e);
    }
    emitNotification(requesterId, {
        type: 'friendAccepted',
        title: '✅ Friend Request Accepted',
        message: `${from.username} accepted your friend request`,
    });
}

// Persist + push a new DM notification to the receiver's bell.
async function notifyNewMessage(receiverId, from, bodyPreview) {
    // Direct messages are surfaced via the floating message bubble on the
    // client (listening for the 'friendMessage' socket event), not here.
}

// Challenge a friend: the challenger creates a room, then invites the friend.
app.post('/api/friends/challenge', requireAuth, async (req, res) => {
    try {
        const friendId = String(req.body.friendId || '');
        // Verify they are actually friends
        const [low, high] = friendKeys(req.account.id, friendId);
        const check = await pool.query(
            `SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2 AND status='accepted'`,
            [low, high]
        );
        if (!check.rows.length) {
            return res.status(403).json({ ok: false, message: 'Not friends' });
        }
        const target = activeAccounts.get(friendId);
        if (!target) {
            return res.status(400).json({ ok: false, message: 'Your friend is offline' });
        }
        const roomCode = generateLobbyCode();
        const game = createGame();
        game.owner = {
            playerId: req.account.id,
            username: req.account.username,
        };
        games.set(roomCode, game);
        // Send invite to all the friend's sockets
        target.socketIds.forEach((sid) => {
            io.to(sid).emit('challengeInvite', {
                fromId: req.account.id,
                fromName: req.account.username,
                roomCode,
                at: Date.now(),
            });
        });
        res.json({ ok: true, roomCode });
    } catch (error) {
        console.error('Challenge error:', error);
        res.status(500).json({ ok: false, message: 'Could not send challenge' });
    }
});

/*
|--------------------------------------------------------------------------
| SOCKET.IO AUTHENTICATION
|--------------------------------------------------------------------------
*/

io.use(
    async (socket, next) => {
        try {
            const token =
                String(
                    socket.handshake
                        ?.auth
                        ?.token || ''
                ).trim();

            const account =
                await getAccountFromToken(
                    token
                );

            if (!account) {
                return next(
                    new Error(
                        'MYCHESS authentication failed. Please login again.'
                    )
                );
            }

            socket.data.account =
                account;

            socket.data.accountId =
                account.id;

            socket.data.username =
                account.username;

            next();
        } catch (error) {
            console.error(
                'Socket authentication error:',
                error
            );

            next(
                new Error(
                    'Unable to authenticate MYCHESS connection.'
                )
            );
        }
    }
);

/*
|--------------------------------------------------------------------------
| SOCKET.IO CONNECTION
|--------------------------------------------------------------------------
*/

io.on(
    'connection',
    socket => {
        console.log(
            `[Socket] Connected: ${socket.id} (${socket.data.username})`
        );

        onlineUsers.set(socket.id, socket.data.username);
        io.emit('onlineCount', onlineUsers.size);

        // Presence tracking for friends/challenges
        const acctId = String(socket.data.accountId || '');
        if (acctId) {
            const entry = activeAccounts.get(acctId) || { username: socket.data.username, socketIds: new Set() };
            entry.socketIds.add(socket.id);
            activeAccounts.set(acctId, entry);
        }

        socket.on(
            'joinRoom',
            payload => {
                try {
                    const {
                        roomId,
                        username,
                        playerId,
                    } =
                        payload || {};

                    const room =
                        cleanRoom(
                            roomId
                        );

                    const name =
                        cleanName(
                            username ||
                                socket
                                    .data
                                    .username
                        );

                    const pid =
                        String(
                            socket
                                .data
                                .accountId ||
                                playerId ||
                                socket.id
                        );

                    if (
                        room.length !==
                        LOBBY_CODE_LENGTH
                    ) {
                        return socket.emit(
                            'roomError',
                            {
                                message:
                                    'Invalid 6-digit room code.',
                            }
                        );
                    }

                    const game =
                        games.get(room);

                    if (!game) {
                        return socket.emit(
                            'roomError',
                            {
                                message:
                                    'This MYCHESS lobby does not exist.',
                            }
                        );
                    }

                    if (game.status === 'finished') {
                        return socket.emit(
                            'roomError',
                            {
                                message:
                                    'This match has already ended.',
                            }
                        );
                    }

                    if (
                        socket.data.room &&
                        socket.data.room !==
                            room
                    ) {
                        socket.leave(
                            socket.data.room
                        );
                    }

                    let existingSeat =
                        null;

                    if (
                        game.players
                            .white
                            ?.playerId ===
                        pid
                    ) {
                        existingSeat =
                            'white';
                    }

                    if (
                        game.players
                            .black
                            ?.playerId ===
                        pid
                    ) {
                        existingSeat =
                            'black';
                    }

                    if (
                        existingSeat ===
                        'white'
                    ) {
                        game.players.white =
                            {
                                ...game
                                    .players
                                    .white,
                                socketId:
                                    socket.id,
                                name,
                            };
                    } else if (
                        existingSeat ===
                        'black'
                    ) {
                        game.players.black =
                            {
                                ...game
                                    .players
                                    .black,
                                socketId:
                                    socket.id,
                                name,
                            };
                    } else if (
                        !game.players
                            .white
                    ) {
                        game.players.white =
                            {
                                socketId:
                                    socket.id,
                                playerId:
                                    pid,
                                name,
                            };
                    } else if (
                        !game.players
                            .black
                    ) {
                        game.players.black =
                            {
                                socketId:
                                    socket.id,
                                playerId:
                                    pid,
                                name,
                            };
                                        } else {
                        // ⬇️ START SPECTATOR LOGIC
                        socket.join(room);
                        socket.data.room = room;
                        socket.data.role = 'spectator';
                        socket.data.playerId = 'spectator-' + socket.id;
                        
                        socket.emit('playerRole', { role: 'spectator', ...getGameState(game) });
                        return;
                        // ⬆️ END SPECTATOR LOGIC
                    }
                    

                    socket.join(room);

                    socket.data.room =
                        room;

                    socket.data.playerId =
                        pid;

                    socket.data.username =
                        name;

                    game.updatedAt =
                        Date.now();

                    if (
                        game.players
                            .white &&
                        game.players
                            .black
                    ) {
                        game.status =
                            game.resultRecorded
                                ? 'finished'
                                : 'playing';
                    }

                    emitRole(
                        socket,
                        game
                    );

                    io.to(room).emit(
                        'playersUpdated',
                        {
                            players:
                                publicPlayers(
                                    game
                                ),
                        }
                    );

                    if (
                        game.players
                            .white &&
                        game.players
                            .black &&
                        !game.resultRecorded
                    ) {
                        io.to(room).emit(
                            'gameStart',
                            getGameState(
                                game
                            )
                        );
                    }

                    console.log(
                        `[Room ${room}] ${name} joined as ${roleOf(
                            game,
                            socket
                        )}`
                    );
                } catch (error) {
                    console.error(
                        'joinRoom error:',
                        error
                    );

                    socket.emit(
                        'roomError',
                        {
                            message:
                                'Unable to join the MYCHESS room.',
                        }
                    );
                }
            }
        );

        socket.on(
            'getRoomState',
            payload => {
                const room =
                    cleanRoom(
                        payload?.roomId
                    );

                const game =
                    games.get(room);

                if (!game) {
                    return socket.emit(
                        'roomError',
                        {
                            message:
                                'MYCHESS room not found.',
                        }
                    );
                }

                emitRole(
                    socket,
                    game
                );
            }
        );

        socket.on(
            'makeMove',
            payload => {
                try {
                    const {
                        roomId,
                        move,
                    } =
                        payload || {};

                    const room =
                        cleanRoom(
                            roomId
                        );

                    const game =
                        games.get(room);

                    if (!game) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'Game room does not exist.',
                            }
                        );
                    }

                    if (
                        game.status ===
                            'finished' ||
                        game.chess.isGameOver()
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'This chess game has already finished.',
                            }
                        );
                    }

                    if (
                        socket.data.room !==
                        room
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'You are not connected to this MYCHESS room.',
                            }
                        );
                    }

                    const role =
                        roleOf(
                            game,
                            socket
                        );

                    if (
                        role ===
                        'spectator'
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'You are not an active player in this match.',
                            }
                        );
                    }

                    if (
                        !game.players
                            .white ||
                        !game.players
                            .black
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'Waiting for both players.',
                            }
                        );
                    }

                    if (
                        game.chess.turn() !==
                        role
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'It is not your turn.',
                            }
                        );
                    }

                    if (
                        !move ||
                        !/^[a-h][1-8]$/.test(
                            String(
                                move.from ||
                                    ''
                            )
                        ) ||
                        !/^[a-h][1-8]$/.test(
                            String(
                                move.to ||
                                    ''
                            )
                        )
                    ) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'Invalid move data.',
                            }
                        );
                    }

                    const from =
                        String(
                            move.from
                        );

                    const to =
                        String(
                            move.to
                        );

                    const requestedPromotion =
                        String(
                            move.promotion ||
                                ''
                        ).toLowerCase();

                    const promotion =
                        [
                            'q',
                            'r',
                            'b',
                            'n',
                        ].includes(
                            requestedPromotion
                        )
                            ? requestedPromotion
                            : 'q';

                    const result =
                        game.chess.move(
                            {
                                from,
                                to,
                                promotion,
                            }
                        );

                    if (!result) {
                        return socket.emit(
                            'moveRejected',
                            {
                                message:
                                    'Illegal chess move.',
                            }
                        );
                    }

                    game.history.push(
                        result.san
                    );

                    game.lastMove = {
    from: result.from,
    to: result.to,
    san: result.san,
    captured: result.captured || null,
};

                    game.updatedAt =
                        Date.now();

                    io.to(room).emit(
                        'moveMade',
                        {
                            ...getGameState(
                                game
                            ),
                            san:
                                result.san,
                            turn:
                                game.chess.turn(),
                        }
                    );

                    if (
                        game.chess.isGameOver()
                    ) {
                        recordGameResult(
                            room,
                            game
                        );
                    }
                } catch (error) {
                    console.error(
                        'makeMove error:',
                        error
                    );

                    socket.emit(
                        'moveRejected',
                        {
                            message:
                                'Invalid chess move.',
                        }
                    );
                }
            }
        );

        socket.on(
            'sendChat',
            payload => {
                try {
                    const room =
                        cleanRoom(
                            payload?.roomId
                        );

                    const text =
                        String(
                            payload?.message ||
                                ''
                        )
                            .trim()
                            .slice(
                                0,
                                280
                            );

                    const game =
                        games.get(room);

                    if (
                        !game ||
                        !text ||
                        socket.data.room !==
                            room
                    ) {
                        return;
                    }

                    const message = {
                        id:
                            crypto.randomUUID(),
                        playerId:
                            socket.data
                                .accountId,
                        username:
                            socket.data
                                .username ||
                            'Player',
                        message:
                            text,
                        timestamp:
                            Date.now(),
                    };

                    game.messages.push(
                        message
                    );

                    game.messages =
                        game.messages.slice(
                            -100
                        );

                    io.to(room).emit(
                        'chatMessage',
                        message
                    );
                } catch (error) {
                    console.error(
                        'sendChat error:',
                        error
                    );
                }
            }
        );

        socket.on(
            'resetGame',
            payload => {
                try {
                    const room =
                        cleanRoom(
                            payload?.roomId
                        );

                    const game =
                        games.get(room);

                    if (!game) {
                        return;
                    }

                    const role =
                        roleOf(
                            game,
                            socket
                        );

                    if (
                        role ===
                        'spectator'
                    ) {
                        return;
                    }

                    game.chess =
                        new Chess();

                    game.history = [];

                    game.lastMove =
                        null;

                    game.result =
                        null;

                    game.resultRecorded =
                        false;

                    game.status =
                        game.players.white &&
                        game.players.black
                            ? 'playing'
                            : 'waiting';

                    game.updatedAt =
                        Date.now();

                    io.to(room).emit(
                        'gameReset',
                        getGameState(
                            game
                        )
                    );

                    if (
                        game.players.white &&
                        game.players.black
                    ) {
                        io.to(room).emit(
                            'gameStart',
                            getGameState(
                                game
                            )
                        );
                    }
                } catch (error) {
                    console.error(
                        'resetGame error:',
                        error
                    );
                }
            }
        );

        socket.on(
            'leaveRoom',
            payload => {
                const room =
                    cleanRoom(
                        payload?.roomId
                    );

                if (
                    socket.data.room ===
                    room
                    ) {
                    socket.leave(room);

                    socket.data.room =
                        null;
                }
            }
        );

        socket.on(
            'quickMatch',
            payload => {
                try {
                    const accountId =
                        socket.data.accountId;
                    const username =
                        socket.data.username;

                    if (
                        !accountId ||
                        !username
                    ) {
                        return socket.emit(
                            'roomError',
                            {
                                message:
                                    'Authentication required for Quick Match.',
                            }
                        );
                    }

                    for (const [sid] of matchQueue) {
                        if (sid === socket.id) {
                            return socket.emit(
                                'roomError',
                                {
                                    message:
                                        'You are already in the Quick Match queue.',
                                }
                            );
                        }
                    }

                    matchQueue.set(
                        socket.id,
                        {
                            socket,
                            accountId,
                            username,
                            joinedAt: Date.now(),
                        }
                    );

                    socket.emit(
                        'quickMatchQueued',
                        {
                            position: matchQueue.size,
                            message:
                                'Searching for an opponent...',
                        }
                    );

                    console.log(
                        `[QuickMatch] ${username} joined queue (total: ${matchQueue.size})`
                    );

                    tryMatchPlayers();
                } catch (error) {
                    console.error(
                        'quickMatch error:',
                        error
                    );
                    socket.emit(
                        'roomError',
                        {
                            message:
                                'Unable to join Quick Match.',
                        }
                    );
                }
            }
        );

        socket.on(
            'cancelQuickMatch',
            () => {
                if (matchQueue.has(socket.id)) {
                    matchQueue.delete(socket.id);
                    socket.emit(
                        'quickMatchCancelled'
                    );
                    console.log(
                        `[QuickMatch] ${socket.data.username} left queue`
                    );
                }
            }
        );

        socket.on(
            'disconnect',
            reason => {
                console.log(
                    `[Socket] Disconnected: ${socket.id} (${reason})`
                );

                onlineUsers.delete(socket.id);
                io.emit('onlineCount', onlineUsers.size);

                // Remove presence for friends/challenges
                const acctId = String(socket.data.accountId || '');
                if (acctId && activeAccounts.has(acctId)) {
                    const entry = activeAccounts.get(acctId);
                    entry.socketIds.delete(socket.id);
                    if (entry.socketIds.size === 0) activeAccounts.delete(acctId);
                }

                matchQueue.delete(socket.id);

                for (
                    const [
                        room,
                        game,
                    ] of games
                ) {
                    let changed =
                        false;

                    if (
                        game.players
                            .white
                            ?.socketId ===
                        socket.id
                    ) {
                        game.players.white.socketId =
                            null;
                        changed =
                            true;
                    }

                    if (
                        game.players
                            .black
                            ?.socketId ===
                        socket.id
                    ) {
                        game.players.black.socketId =
                            null;
                        changed =
                            true;
                    }

                    if (changed) {
                        game.updatedAt =
                            Date.now();

                        io.to(room).emit(
                            'playersUpdated',
                            {
                                players:
                                    publicPlayers(
                                        game
                                    ),
                            }
                        );

                        const whiteNull =
                            game.players
                                .white &&
                            !game.players
                                .white
                                .socketId;
                        const blackNull =
                            game.players
                                .black &&
                            !game.players
                                .black
                                .socketId;

                        if (
                            (whiteNull ||
                                blackNull) &&
                            game.status ===
                                'playing'
                        ) {
                            io.to(room).emit(
                                'opponentDisconnected'
                            );

                            // Tournament duel disconnect handling
                            (async () => {
                                try {
                                    if (game.resultRecorded) return;
                                    const tdResult = await pool.query("SELECT * FROM tournament_duels WHERE room_id=$1 AND status='accepted' LIMIT 1", [room]);
                                    if (tdResult.rows.length === 0) return;
                                    const td = tdResult.rows[0];

                                    const disconnectedSocketId = whiteNull ? game.players.white?.socketId : (blackNull ? game.players.black?.socketId : null);
                                    const remainingSocketId = whiteNull ? game.players.black?.socketId : (blackNull ? game.players.white?.socketId : null);

                                    let disconnectedPlayerId = whiteNull ? game.players.white?.playerId : game.players.black?.playerId;
                                    let remainingPlayerId = whiteNull ? game.players.black?.playerId : game.players.white?.playerId;

                                    if (!remainingPlayerId) return;

                                    game.resultRecorded = true;
                                    game.status = 'finished';
                                    game.result = {
                                        type: 'win',
                                        winner: whiteNull ? 'black' : 'white',
                                        winnerName: whiteNull ? (game.players.black?.name || 'Player') : (game.players.white?.name || 'Player'),
                                        message: `${whiteNull ? (game.players.black?.name || 'Player') : (game.players.white?.name || 'Player')} wins! Opponent disconnected.`,
                                        disconnect: true
                                    };

                                    await pool.query("UPDATE tournament_duels SET status='completed', winner_id=$1, result='completed' WHERE id=$2", [remainingPlayerId, td.id]);

                                    const tInfo = await pool.query('SELECT disconnect_elo, points_per_win FROM tournaments WHERE id=$1', [td.tournament_id]);
                                    if (tInfo.rows.length > 0) {
                                        const tData = tInfo.rows[0];
                                        const eloToAward = (tData.disconnect_elo > 0) ? tData.disconnect_elo : tData.points_per_win;
                                        await pool.query('UPDATE tournament_players SET points = points + $1, games_played = games_played + 1 WHERE tournament_id=$2 AND account_id=$3', [eloToAward, td.tournament_id, remainingPlayerId]);
                                        await pool.query('UPDATE tournament_players SET games_played = games_played + 1 WHERE tournament_id=$1 AND account_id=$2', [td.tournament_id, disconnectedPlayerId]);
                                    }

                                    const winnerAccount = remainingPlayerId ? await db.findAccountById(remainingPlayerId) : null;
                                    const loserAccount = disconnectedPlayerId ? await db.findAccountById(disconnectedPlayerId) : null;

                                    const tData2 = tInfo.rows[0] || {};
                                    const eloAwarded = (tData2.disconnect_elo > 0) ? tData2.disconnect_elo : (tData2.points_per_win || 10);

                                    io.to(room).emit('gameResult', {
                                        ...game.result,
                                        white: whiteNull ? null : winnerAccount,
                                        black: blackNull ? null : winnerAccount,
                                        savedGame: null,
                                        elo: {
                                            white: whiteNull ? 0 : eloAwarded,
                                            black: blackNull ? 0 : eloAwarded,
                                        },
                                        disconnectAward: eloAwarded
                                    });

                                    io.to(room).emit('tournamentDuelCompleted', {
                                        duelId: td.id,
                                        winnerId: remainingPlayerId,
                                        disconnect: true,
                                        eloAwarded
                                    });

                                    console.log(`[Tournament] Duel ${td.id} auto-completed by disconnect. Winner: ${remainingPlayerId}, +${eloAwarded} pts`);
                                    games.delete(room);
                                } catch (e) {
                                    console.error('Tournament disconnect auto-report error:', e.message || e);
                                }
                            })();
                        }
                    }
                }
            }
        );
    }
);

/*
|--------------------------------------------------------------------------
| QUICK MATCHMAKING QUEUE
|--------------------------------------------------------------------------
*/

const matchQueue = new Map();

function tryMatchPlayers() {
    const waiting = [];
    for (const [socketId, entry] of matchQueue) {
        if (entry.socket.connected) {
            waiting.push({ socketId, ...entry });
        } else {
            matchQueue.delete(socketId);
        }
    }

    if (waiting.length < 2) return;

    const first = waiting[0];
    const second = waiting[1];

    matchQueue.delete(first.socketId);
    matchQueue.delete(second.socketId);

    if (first.socket.id === second.socket.id) return;

    const roomId = generateLobbyCode();
    const game = createGame();

    const assignWhite = Math.random() < 0.5;
    const whitePlayer = assignWhite ? first : second;
    const blackPlayer = assignWhite ? second : first;

    game.players.white = {
        socketId: whitePlayer.socket.id,
        playerId: whitePlayer.accountId,
        name: whitePlayer.username,
    };

    game.players.black = {
        socketId: blackPlayer.socket.id,
        playerId: blackPlayer.accountId,
        name: blackPlayer.username,
    };

    game.owner = {
        playerId: whitePlayer.accountId,
        username: whitePlayer.username,
    };

    games.set(roomId, game);

    whitePlayer.socket.join(roomId);
    whitePlayer.socket.data.room = roomId;
    whitePlayer.socket.data.playerId = whitePlayer.accountId;
    whitePlayer.socket.data.username = whitePlayer.username;

    blackPlayer.socket.join(roomId);
    blackPlayer.socket.data.room = roomId;
    blackPlayer.socket.data.playerId = blackPlayer.accountId;
    blackPlayer.socket.data.username = blackPlayer.username;

    game.status = 'playing';
    game.updatedAt = Date.now();

    emitRole(whitePlayer.socket, game);
    emitRole(blackPlayer.socket, game);

    io.to(roomId).emit('playersUpdated', {
        players: publicPlayers(game),
    });

    io.to(roomId).emit('gameStart', getGameState(game));

    whitePlayer.socket.emit('matchFound', {
        roomId,
        role: 'w',
        players: publicPlayers(game),
    });

    blackPlayer.socket.emit('matchFound', {
        roomId,
        role: 'b',
        players: publicPlayers(game),
    });

    console.log(`[QuickMatch] Match created: Room ${roomId} (${whitePlayer.username} vs ${blackPlayer.username})`);
}

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get(
    '/health',
    async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            
            const totalAccounts = await db.getTotalPlayerCount();
            const totalGames = await db.getTotalGamesPlayed();

            res.json({
                ok: true,
                service: 'mychess-server',
                port: PORT,
                rooms: games.size,
                accounts: totalAccounts,
                games: totalGames,
                socket: true,
                chess: true,
                elo: true,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Health check error:', error);
            res.status(500).json({
                ok: false,
                message: 'Health check failed',
                error: error.message
            });
        }
    }
);

// ============================================
// CURRENCY ROUTES (ELO BASED)
// ============================================

// Get user ELO & Currency data
app.get('/api/currency', requireAuth, async (req, res) => {
    try {
        // Pull ELO directly from the accounts table
        const result = await db.getUserElo(req.account.id);
        
        let loginStreak = 0;
        try {
            const currencyRow = await pool.query(
                'SELECT login_streak FROM user_currency WHERE account_id = $1',
                [req.account.id]
            );
            if (currencyRow.rows.length > 0) {
                loginStreak = currencyRow.rows[0].login_streak || 0;
            }
        } catch (err) {
            console.error('Error fetching streak:', err);
        }

        res.json({
            ok: true,
            currency: { gems: result.elo, loginStreak }
        });
    } catch (error) {
        console.error('Get ELO error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load balance' });
    }
});

// Claim Daily Login Bonus
app.post('/api/currency/daily-login', requireAuth, async (req, res) => {
    try {
        const accountId = req.account.id;

        // Ensure user_currency row exists
        await pool.query(
            `INSERT INTO user_currency (account_id, gems, login_streak)
             VALUES ($1, 0, 0)
             ON CONFLICT (account_id) DO NOTHING`,
            [accountId]
        );

        const curResult = await pool.query(
            'SELECT last_daily_login, login_streak FROM user_currency WHERE account_id = $1',
            [accountId]
        );

        const userCur = curResult.rows[0];
        const now = new Date();
        let streak = userCur?.login_streak || 0;

        if (userCur?.last_daily_login) {
            const lastLogin = new Date(userCur.last_daily_login);
            const diffMs = now - lastLogin;
            const diffHours = diffMs / (1000 * 60 * 60);

            // If claimed less than 20 hours ago, prevent claiming again
            if (diffHours < 20) {
                return res.status(400).json({
                    ok: false,
                    message: 'Daily bonus already claimed today! Check back tomorrow.'
                });
            }

            // If claimed within 20-48 hours, advance streak
            if (diffHours <= 48) {
                streak += 1;
            } else {
                // Streak broken, reset to 1
                streak = 1;
            }
        } else {
            streak = 1;
        }

        const bonusElo = 20 + Math.min(streak * 5, 50); // 25, 30, 35... up to 70 bonus ELO

        // Update accounts.elo and user_currency
        await db.addElo(accountId, bonusElo);
        await pool.query(
            `UPDATE user_currency 
             SET last_daily_login = NOW(), login_streak = $1, total_gems_earned = total_gems_earned + $2, updated_at = NOW()
             WHERE account_id = $3`,
            [streak, bonusElo, accountId]
        );

        return res.json({
            ok: true,
            message: `Daily bonus claimed! (Day ${streak} Streak)`,
            bonus: bonusElo,
            loginStreak: streak
        });
    } catch (error) {
        console.error('Daily bonus error:', error);
        return res.status(500).json({ ok: false, message: 'Unable to claim daily bonus' });
    }
});

// ============================================
// SHOP ROUTES (ELO BASED)
// ============================================

// Get shop items
app.get('/api/shop/items', requireAuth, async (req, res) => {
    try {
        const { category } = req.query;
        const items = await db.getShopItems(category);
        const inventory = await db.getUserInventory(req.account.id);
        const ownedIds = inventory.map(i => i.item_id);
        
        // Add ownership flag
        const itemsWithOwnership = items.map(item => ({
            ...item,
            owned: ownedIds.includes(item.id),
            inventoryId: inventory.find(i => i.item_id === item.id)?.id || null,
            equipped: inventory.find(i => i.item_id === item.id)?.is_equipped || false
        }));
        
        res.json({
            ok: true,
            items: itemsWithOwnership
        });
    } catch (error) {
        console.error('Get shop items error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load shop' });
    }
});

// Purchase item (Using ELO)
app.post('/api/shop/purchase', requireAuth, async (req, res) => {
    try {
        const { itemId } = req.body;
        
        // 1. Get the item price
        const item = await db.getShopItem(itemId);
        if (!item) {
            return res.status(404).json({ ok: false, message: 'Item not found' });
        }

        // 2. Check & Deduct ELO
        const updatedUser = await db.spendElo(req.account.id, item.price);
        if (!updatedUser) {
            return res.status(400).json({ ok: false, message: 'Not enough ELO points!' });
        }

        // 3. Add item to inventory
        const result = await db.addToInventory(req.account.id, itemId);
        
        res.json({
            ok: true,
            message: 'Item purchased successfully! Your new ELO balance is: ' + updatedUser.elo,
            inventory: result
        });
    } catch (error) {
        console.error('Purchase error:', error);
        res.status(400).json({ 
            ok: false, 
            message: error.message || 'Unable to purchase item'
        });
    }
});

// Get user inventory
app.get('/api/shop/inventory', requireAuth, async (req, res) => {
    try {
        const inventory = await db.getUserInventory(req.account.id);
        res.json({
            ok: true,
            inventory
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load inventory' });
    }
});

// Equip item
app.post('/api/shop/equip', requireAuth, async (req, res) => {
    try {
        const { inventoryId } = req.body;
        
        const result = await db.equipItem(req.account.id, inventoryId);
        
        res.json({
            ok: true,
            message: 'Item equipped!',
            ...result
        });
    } catch (error) {
        console.error('Equip item error:', error);
        res.status(400).json({ 
            ok: false, 
            message: error.message || 'Unable to equip item'
        });
    }
});

/*
|--------------------------------------------------------------------------
| UNEQUIP ALL ITEMS (Back to Default)
|--------------------------------------------------------------------------
*/

app.post('/api/shop/unequip-all', requireAuth, async (req, res) => {
    try {
        const result = await db.resetEquippedItems(req.account.id);
        res.json({
            ok: true,
            message: 'All items unequipped. Back to default!',
            resetCount: result
        });
    } catch (error) {
        console.error('Reset equipped items error:', error);
        res.status(500).json({ ok: false, message: 'Unable to reset items' });
    }
});

/*
|--------------------------------------------------------------------------
| GET EQUIPPED ITEMS (For In-Game Display)
|--------------------------------------------------------------------------
*/

app.get('/api/shop/equipped', requireAuth, async (req, res) => {
    try {
        const equippedItems = await db.getUserInventory(req.account.id);
        const equipped = equippedItems.filter(item => item.is_equipped === true);
        
        res.json({
            ok: true,
            equipped: equipped
        });
    } catch (error) {
        console.error('Get equipped items error:', error);
        res.status(500).json({ ok: false, message: 'Unable to load equipped items' });
    }
});

/*
|--------------------------------------------------------------------------
| AI HINT (Next Best Move)
|--------------------------------------------------------------------------
*/

app.post('/api/game/hint', requireAuth, (req, res) => {
    try {
        const { fen } = req.body;
        
        if (!fen) {
            return res.status(400).json({ ok: false, message: 'FEN is required' });
        }

        const game = new Chess(fen);
        const moves = game.moves({ verbose: true });
        
        if (moves.length === 0) {
            return res.json({ ok: true, hint: null, message: 'No legal moves available' });
        }

        let bestMove = null;
        let bestScore = -Infinity;

        for (const move of moves) {
            let score = 0;
            if (move.captured) {
                const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
                score += pieceValues[move.captured] || 0;
                if (move.promotion) score += 8;
            } else {
                if (move.to.includes('d') || move.to.includes('e') || move.to.includes('4') || move.to.includes('5')) {
                    score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        if (!bestMove || bestScore === 0) {
            bestMove = moves[Math.floor(Math.random() * moves.length)];
        }

        res.json({
            ok: true,
            hint: {
                from: bestMove.from,
                to: bestMove.to,
                san: bestMove.san
            }
        });
    } catch (error) {
        console.error('AI Hint error:', error);
        res.status(500).json({ ok: false, message: 'Unable to generate hint' });
    }
});

/*
|--------------------------------------------------------------------------
| QUEST ROUTES
|--------------------------------------------------------------------------
*/

// Get all quests with user progress
app.get('/api/quests', requireAuth, async (req, res) => {
    try {
        const quests = await db.getUserQuests(req.account.id);
        res.json({ ok: true, quests });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to load quests' });
    }
});

// Claim quest reward
app.post('/api/quests/claim', requireAuth, async (req, res) => {
    try {
        const { questId } = req.body;
        const result = await db.claimQuestReward(req.account.id, questId);
        res.json({ ok: true, message: `Reward claimed! +${result.reward} ELO`, reward: result.reward });
    } catch (error) {
        res.status(400).json({ ok: false, message: error.message });
    }
});

/*
|--------------------------------------------------------------------------
| ADMIN PANEL - SECURE API (CRUD)
|--------------------------------------------------------------------------
*/

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
    if (!req.account || req.account.role !== 'admin') {
        return res.status(403).json({ ok: false, message: 'Admin access required' });
    }
    next();
}

// Admin: Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const account = await db.findAccountByEmail(email);

        if (!account || account.role !== 'admin') {
            return res.status(401).json({ ok: false, message: 'Invalid admin credentials' });
        }

        if (!verifyPassword(password, account.password_hash, account.password_salt)) {
            return res.status(401).json({ ok: false, message: 'Invalid admin credentials' });
        }

        const token = await createSession(account.id);
        res.json({ ok: true, token, account: publicAccount(account) });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Admin login failed' });
    }
});

// Admin: Get all data (Announcements, Quests, Shop Items)
app.get('/api/admin/data', requireAuth, requireAdmin, async (req, res) => {
    try {
        const announcements = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC').then(r => r.rows);
        const quests = await db.getQuests();
        const shopItems = await db.getShopItems();
        const musicAlbums = await pool.query('SELECT * FROM music_albums ORDER BY id ASC').then(r => r.rows);
        
        res.json({ ok: true, announcements, quests, shopItems, musicAlbums });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to fetch admin data' });
    }
});

// Admin: CRUD for Announcements
app.post('/api/admin/announcements/create', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
    const { title, category, content, event_date, prize_pool, button_label, button_link } = req.body;
    let image_url = req.body.image_url || null;
    if (req.file) image_url = await cloudStorage.saveUploadedFile(req.file, 'images');
    try {
        const result = await pool.query(
            'INSERT INTO announcements (title, category, content, image_url, event_date, prize_pool, button_label, button_link) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [title, category, content, image_url, event_date || null, prize_pool || null, button_label || null, button_link || null]
        );
        res.json({ ok: true, announcement: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create announcement' });
    }
});

app.put('/api/admin/announcements/update/:id', requireAuth, requireAdmin, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, category, content, image_url, event_date, prize_pool, button_label, button_link } = req.body;
    let finalImageUrl = image_url || null;
    if (req.file) finalImageUrl = await cloudStorage.saveUploadedFile(req.file, 'images');
    try {
        const result = await pool.query(
            'UPDATE announcements SET title = $1, category = $2, content = $3, image_url = $4, event_date = $5, prize_pool = $6, button_label = $7, button_link = $8 WHERE announcement_id = $9 RETURNING *',
            [title, category, content, finalImageUrl, event_date || null, prize_pool || null, button_label || null, button_link || null, id]
        );
        res.json({ ok: true, announcement: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update announcement' });
    }
});

// Public: Get all announcements for homepage display
app.get('/api/announcements/public', async (req, res) => {
    try {
        const announcements = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC').then(r => r.rows);
        res.json({ ok: true, announcements });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to fetch announcements' });
    }
});

app.delete('/api/admin/announcements/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM announcements WHERE announcement_id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete announcement' });
    }
});

// Admin: CRUD for Quests
app.post('/api/admin/quests/create', requireAuth, requireAdmin, async (req, res) => {
    const { quest_type, quest_name, description, goal, reward_elo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO quests (quest_type, quest_name, description, goal, reward_elo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [quest_type, quest_name, description, goal, reward_elo]
        );
        res.json({ ok: true, quest: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create quest' });
    }
});

app.put('/api/admin/quests/update/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { quest_type, quest_name, description, goal, reward_elo } = req.body;
    try {
        const result = await pool.query(
            'UPDATE quests SET quest_type = $1, quest_name = $2, description = $3, goal = $4, reward_elo = $5 WHERE id = $6 RETURNING *',
            [quest_type, quest_name, description, goal, reward_elo, id]
        );
        res.json({ ok: true, quest: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update quest' });
    }
});

app.delete('/api/admin/quests/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM quests WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete quest' });
    }
});

// Admin: CRUD for Shop Items
app.post('/api/admin/shop/create', requireAuth, requireAdmin, async (req, res) => {
    const { name, description, category, price, rarity, preview_data } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO shop_items (name, description, category, price, rarity, preview_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, category, price, rarity, preview_data ? JSON.stringify(preview_data) : null]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create item' });
    }
});

app.put('/api/admin/shop/update/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, category, price, rarity, preview_data } = req.body;
    try {
        const result = await pool.query(
            'UPDATE shop_items SET name = $1, description = $2, category = $3, price = $4, rarity = $5, preview_data = $6 WHERE id = $7 RETURNING *',
            [name, description, category, price, rarity, preview_data ? JSON.stringify(preview_data) : null, id]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update item' });
    }
});

app.delete('/api/admin/shop/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM shop_items WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete item' });
    }
});

// Get all music albums
app.get('/api/music/albums', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM music_albums WHERE is_active = TRUE ORDER BY id ASC');
        res.json({ ok: true, albums: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to load albums' });
    }
});

// Equip a music album (Save to DB)
app.post('/api/music/equip', requireAuth, async (req, res) => {
    try {
        const { albumId } = req.body;
        const accountId = req.account.id;

        await pool.query(
            `INSERT INTO user_music_selection (account_id, album_id)
             VALUES ($1, $2)
             ON CONFLICT (account_id) DO UPDATE SET album_id = EXCLUDED.album_id`,
            [accountId, albumId]
        );

        res.json({ ok: true, message: 'Music album equipped!' });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to equip album' });
    }
});

// Get user's equipped music album
app.get('/api/music/equipped', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ma.* FROM music_albums ma
             JOIN user_music_selection ums ON ma.id = ums.album_id
             WHERE ums.account_id = $1`,
            [req.account.id]
        );
        res.json({ ok: true, album: result.rows[0] || null });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to get equipped album' });
    }
});

// Unequip a specific album
app.post('/api/music/unequip', requireAuth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM user_music_selection WHERE account_id = $1 AND album_id = $2',
            [req.account.id, req.body.albumId]
        );
        res.json({ ok: true, message: 'Album unequipped' });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to unequip album' });
    }
});

// Unequip all albums (Back to Default)
app.post('/api/music/unequip-all', requireAuth, async (req, res) => {
    try {
        await pool.query(
            'DELETE FROM user_music_selection WHERE account_id = $1',
            [req.account.id]
        );
        res.json({ ok: true, message: 'Back to default music' });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Unable to reset music' });
    }
});

// ✅ Admin: CRUD for Music Albums (WITH FILE UPLOAD SUPPORT)
// Create (with multer middleware)
app.post('/api/admin/music/create', requireAuth, requireAdmin, upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'audio_file', maxCount: 1 }
]), async (req, res) => {
    const { title, artist, category } = req.body;
    
    // Determine file paths (cloud URL if Supabase configured, else local)
    const coverPath = req.files?.cover_image ? await cloudStorage.saveUploadedFile(req.files.cover_image[0], 'images') : null;
    const audioPath = req.files?.audio_file ? await cloudStorage.saveUploadedFile(req.files.audio_file[0], 'audio') : null;

    if (!title || !audioPath) {
        return res.status(400).json({ ok: false, message: 'Title and Audio File are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO music_albums (title, artist, category, cover_image, audio_file) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, artist, category || null, coverPath, audioPath]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create album' });
    }
});

// Update (with multer middleware)
app.put('/api/admin/music/update/:id', requireAuth, requireAdmin, upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'audio_file', maxCount: 1 }
]), async (req, res) => {
    const { id } = req.params;
    const { title, artist, category } = req.body;

    // Get the current album to keep old files if no new ones are uploaded
    const currentAlbum = await pool.query('SELECT * FROM music_albums WHERE id = $1', [id]);
    if (currentAlbum.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Album not found' });
    }
    
    // Determine file paths (keep old if no new files)
    const coverPath = req.files?.cover_image ? await cloudStorage.saveUploadedFile(req.files.cover_image[0], 'images') : currentAlbum.rows[0].cover_image;
    const audioPath = req.files?.audio_file ? await cloudStorage.saveUploadedFile(req.files.audio_file[0], 'audio') : currentAlbum.rows[0].audio_file;

    try {
        const result = await pool.query(
            'UPDATE music_albums SET title = $1, artist = $2, category = $3, cover_image = $4, audio_file = $5 WHERE id = $6 RETURNING *',
            [title, artist, category || null, coverPath, audioPath, id]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update album' });
    }
});

// Delete
app.delete('/api/admin/music/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM music_albums WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete album' });
    }
});

// ===========================================================================
// ✅ ADDED: Admin CRUD for PROFILE THEMES (profile_themes table)
// Fully additive helpers for the Admin Config Panel -> Profile Themes tab.
// ===========================================================================
app.get('/api/admin/profile-themes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM profile_themes ORDER BY cost_elo ASC, id ASC');
        res.json({ ok: true, themes: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to fetch profile themes' });
    }
});

app.post('/api/admin/profile-themes/create', requireAuth, requireAdmin, async (req, res) => {
    const { name, css_class, gradient, preview_url, cost_elo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO profile_themes (name, css_class, gradient, preview_url, cost_elo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, css_class, gradient, preview_url || null, cost_elo == null ? 0 : Number(cost_elo)]
        );
        res.json({ ok: true, theme: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create profile theme' });
    }
});

app.put('/api/admin/profile-themes/update/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, css_class, gradient, preview_url, cost_elo } = req.body;
    try {
        const result = await pool.query(
            'UPDATE profile_themes SET name = $1, css_class = $2, gradient = $3, preview_url = $4, cost_elo = $5 WHERE id = $6 RETURNING *',
            [name, css_class, gradient, preview_url || null, cost_elo == null ? 0 : Number(cost_elo), id]
        );
        res.json({ ok: true, theme: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update profile theme' });
    }
});

app.delete('/api/admin/profile-themes/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM profile_themes WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete profile theme' });
    }
});

// ===========================================================================
// ✅ ADDED: Admin CRUD for BOARD THEMES (animated_board_themes table)
// Fully additive helpers for the Admin Config Panel -> Board Themes tab.
// ===========================================================================
app.get('/api/admin/board-themes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM animated_board_themes ORDER BY cost_elo ASC, id ASC');
        res.json({ ok: true, themes: result.rows });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to fetch board themes' });
    }
});

app.post('/api/admin/board-themes/create', requireAuth, requireAdmin, async (req, res) => {
    const { name, css_class, animation_css, light_sq, dark_sq, cost_elo } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO animated_board_themes (name, css_class, animation_css, light_sq, dark_sq, cost_elo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, css_class, animation_css || 'none', light_sq || '#f0d9b5', dark_sq || '#b58863', cost_elo == null ? 0 : Number(cost_elo)]
        );
        res.json({ ok: true, theme: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to create board theme' });
    }
});

app.put('/api/admin/board-themes/update/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, css_class, animation_css, light_sq, dark_sq, cost_elo } = req.body;
    try {
        const result = await pool.query(
            'UPDATE animated_board_themes SET name = $1, css_class = $2, animation_css = $3, light_sq = $4, dark_sq = $5, cost_elo = $6 WHERE id = $7 RETURNING *',
            [name, css_class, animation_css || 'none', light_sq || '#f0d9b5', dark_sq || '#b58863', cost_elo == null ? 0 : Number(cost_elo), id]
        );
        res.json({ ok: true, theme: result.rows[0] });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to update board theme' });
    }
});

app.delete('/api/admin/board-themes/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM animated_board_themes WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ ok: false, message: 'Failed to delete board theme' });
    }
});

// ============================================
// MEME SOUNDS — in-match soundboard (player equips up to 12 sounds, click-to-play)
// ============================================
app.get('/api/meme-sounds', async (req, res) => {
    try {
        const sounds = (await pool.query('SELECT * FROM meme_sounds WHERE is_active = TRUE ORDER BY id ASC')).rows;
        res.json({ ok: true, sounds });
    } catch (error) {
        console.error('Meme sounds list error:', error);
        res.status(500).json({ ok: false });
    }
});

app.get('/api/meme-sounds/equipped', requireAuth, async (req, res) => {
    try {
        const rows = (await pool.query('SELECT meme_sound_id FROM user_meme_sound WHERE account_id = $1 ORDER BY equipped_at ASC', [req.account.id])).rows;
        res.json({ ok: true, soundIds: rows.map(r => r.meme_sound_id) });
    } catch (error) {
        console.error('Meme sounds equipped error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/meme-sounds/equip', requireAuth, async (req, res) => {
    try {
        const { memeSoundId } = req.body;
        const sound = (await pool.query('SELECT id FROM meme_sounds WHERE id = $1 AND is_active = TRUE', [memeSoundId])).rows[0];
        if (!sound) return res.status(404).json({ ok: false, message: 'Meme sound not found' });
        const count = (await pool.query('SELECT COUNT(*)::int AS n FROM user_meme_sound WHERE account_id = $1', [req.account.id])).rows[0].n;
        if (count >= 12) return res.status(400).json({ ok: false, message: 'Max 12 meme sounds' });
        await pool.query(
            'INSERT INTO user_meme_sound (account_id, meme_sound_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [req.account.id, memeSoundId]
        );
        const check = (await pool.query(
            'SELECT 1 FROM user_meme_sound WHERE account_id = $1 AND meme_sound_id = $2',
            [req.account.id, memeSoundId]
        )).rows.length;
        if (!check) return res.status(409).json({ ok: false, message: 'Could not equip that meme sound. Please try again.' });
        const equipped = (await pool.query(
            'SELECT meme_sound_id FROM user_meme_sound WHERE account_id = $1 ORDER BY equipped_at ASC',
            [req.account.id]
        )).rows.map(r => r.meme_sound_id);
        res.json({ ok: true, equipped });
    } catch (error) {
        console.error('Meme sound equip error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/meme-sounds/unequip', requireAuth, async (req, res) => {
    try {
        const { memeSoundId } = req.body;
        await pool.query('DELETE FROM user_meme_sound WHERE account_id = $1 AND meme_sound_id = $2', [req.account.id, memeSoundId]);
        const check = (await pool.query(
            'SELECT 1 FROM user_meme_sound WHERE account_id = $1 AND meme_sound_id = $2',
            [req.account.id, memeSoundId]
        )).rows.length;
        if (check) return res.status(409).json({ ok: false, message: 'Could not unequip that meme sound. Please try again.' });
        const equipped = (await pool.query(
            'SELECT meme_sound_id FROM user_meme_sound WHERE account_id = $1 ORDER BY equipped_at ASC',
            [req.account.id]
        )).rows.map(r => r.meme_sound_id);
        res.json({ ok: true, equipped });
    } catch (error) {
        console.error('Meme sound unequip error:', error);
        res.status(500).json({ ok: false });
    }
});

app.post('/api/meme-sounds/play', requireAuth, async (req, res) => {
    try {
        const { roomId, receiverId, memeSoundId, name, emoji, audioFile } = req.body;
        if (!roomId || !memeSoundId) return res.status(400).json({ ok: false });
        const bubbleText = `${emoji || '🔊'} ${name || 'Meme sound'}`;
        await pool.query(
            'INSERT INTO game_reactions (game_room_id, sender_id, receiver_id, emoji) VALUES ($1,$2,$3,$4)',
            [roomId, req.account.id, receiverId || null, bubbleText]
        );
        if (io) io.to(roomId).emit('memeSoundPlay', {
            senderId: req.account.id,
            senderName: req.account.username || 'Player',
            memeSoundId,
            name: name || '',
            emoji: emoji || '🔊',
            audioFile: audioFile || '',
        });
        res.json({ ok: true });
    } catch (error) {
        console.error('Meme sound play error:', error);
        res.status(500).json({ ok: false });
    }
});

// ============================================
// ADMIN — MEME SOUNDS CRUD (additive, mirrors music album admin pattern)
// ============================================
app.get('/api/admin/meme-sounds', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM meme_sounds ORDER BY id ASC');
        res.json({ ok: true, sounds: result.rows });
    } catch (error) {
        console.error('Admin meme sounds list error:', error);
        res.status(500).json({ ok: false, message: 'Failed to fetch meme sounds' });
    }
});

app.post('/api/admin/meme-sounds/create', requireAuth, requireAdmin, upload.fields([
    { name: 'audio_file', maxCount: 1 }
]), async (req, res) => {
    const { name, emoji } = req.body;
    const audioPath = req.files?.audio_file ? await cloudStorage.saveUploadedFile(req.files.audio_file[0], 'audio') : null;
    if (!name || !audioPath) {
        return res.status(400).json({ ok: false, message: 'Name and Audio File are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO meme_sounds (name, emoji, audio_file) VALUES ($1, $2, $3) RETURNING *',
            [name, emoji || '🔊', audioPath]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        console.error('Admin meme sound create error:', error);
        res.status(500).json({ ok: false, message: 'Failed to create meme sound' });
    }
});

app.put('/api/admin/meme-sounds/update/:id', requireAuth, requireAdmin, upload.fields([
    { name: 'audio_file', maxCount: 1 }
]), async (req, res) => {
    const { id } = req.params;
    const { name, emoji } = req.body;
    const current = await pool.query('SELECT * FROM meme_sounds WHERE id = $1', [id]);
    if (current.rows.length === 0) {
        return res.status(404).json({ ok: false, message: 'Meme sound not found' });
    }
    const audioPath = req.files?.audio_file ? await cloudStorage.saveUploadedFile(req.files.audio_file[0], 'audio') : current.rows[0].audio_file;
    try {
        const result = await pool.query(
            'UPDATE meme_sounds SET name = $1, emoji = $2, audio_file = $3 WHERE id = $4 RETURNING *',
            [name, emoji || '🔊', audioPath, id]
        );
        res.json({ ok: true, item: result.rows[0] });
    } catch (error) {
        console.error('Admin meme sound update error:', error);
        res.status(500).json({ ok: false, message: 'Failed to update meme sound' });
    }
});

app.delete('/api/admin/meme-sounds/delete/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM meme_sounds WHERE id = $1', [id]);
        res.json({ ok: true });
    } catch (error) {
        console.error('Admin meme sound delete error:', error);
        res.status(500).json({ ok: false, message: 'Failed to delete meme sound' });
    }
});

// ============================================
// MEME SOUNDS — SCHEMA ENSURE (run at boot so production DB is always ready)
// ============================================
async function ensureMemeSoundsSchema() {
    // Remove the retired entrance banner feature entirely
    await pool.query(`
        DROP TABLE IF EXISTS user_entrance_theme;
        DROP TABLE IF EXISTS entrance_themes;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS meme_sounds (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            emoji VARCHAR(20) DEFAULT '🔊',
            audio_file TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS user_meme_sound (
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            meme_sound_id INT NOT NULL REFERENCES meme_sounds(id) ON DELETE CASCADE,
            equipped_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (account_id, meme_sound_id)
        );
    `);

    await pool.query(`
        INSERT INTO meme_sounds (name, emoji, audio_file) VALUES
            ('Airhorn Blast', '📢', '/assets/audio/my-intro-sound.mp3'),
            ('Oof Moment', '🫢', '/assets/audio/h2h-styles.mp3'),
            ('Fatality', '💥', '/assets/audio/my-custom-kill-ori.mp3'),
            ('Let''s Gooo', '🚀', '/assets/audio/cortis-go.mp3'),
            ('Red Card', '🔴', '/assets/audio/my-intro-sound.mp3'),
            ('Moonwalk', '🕺', '/assets/audio/lngshot-moonwalkin.mp3'),
            ('Styled Out', '🕶️', '/assets/audio/my-intro-sound-fashion.mp3'),
            ('Hype Check', '🔥', '/assets/audio/my-intro-sound.mp3'),
            ('Silence', '🤫', '/assets/audio/h2h-styles.mp3'),
            ('Sick Play', '🫠', '/assets/audio/cortis-go.mp3'),
            ('GG EZ', '🎮', '/assets/audio/lngshot-moonwalkin.mp3'),
            ('Plot Twist', '🌀', '/assets/audio/my-custom-kill-ori.mp3')
        ON CONFLICT (name) DO NOTHING;
    `);
}

/*
|--------------------------------------------------------------------------
| ✅ SERVE REACT FRONTEND (Production Build)
|--------------------------------------------------------------------------
*/

// Serve static files from the client/dist folder
app.use(express.static(path.join(__dirname, '../client/dist')));

// ✅ ADDED (auth extras: rate limiting, trust proxy, password reset, change password, avatar upload) — purely additive
registerAuthExtra({
    app,
    pool,
    db,
    hashPassword,
    verifyPassword,
    requireAuth,
    cloudStorage,
});

// For React Router: Catch all non-API routes and serve the index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use(
    (req, res) => {
        res.status(404).json({
            ok: false,
            message:
                'MYCHESS API endpoint not found.',
        });
    }
);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
    (
        error,
        _req,
        res,
        _next
    ) => {
        console.error(
            'Express error:',
            error
        );

        res.status(500).json({
            ok: false,
            message:
                'MYCHESS server error.',
        });
    }
);

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const serverInstance = server.listen(PORT, async () => {
    console.log('');
    console.log('==========================================');
    console.log('        MYCHESS REALTIME SERVER');
    console.log('==========================================');
    console.log(`Server:  http://localhost:${PORT}`);
    console.log(`Health:  http://localhost:${PORT}/health`);

    try {
        await ensureMemeSoundsSchema();
        console.log('✅ meme sounds tables ensured');
    } catch (e) {
        console.error('⚠️ Failed to ensure match cosmetics schema:', e.message);
    }

    try {
        await pool.query("ALTER TABLE tournament_duels ADD COLUMN IF NOT EXISTS room_id VARCHAR(6)");
        console.log('✅ tournament_duels.room_id column ensured');
    } catch (e) {
        console.error('⚠️ Failed to ensure room_id column:', e.message);
    }

    try {
        await pool.query("ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS disconnect_elo INTEGER NOT NULL DEFAULT 0");
        console.log('✅ tournaments.disconnect_elo column ensured');
    } catch (e) {
        console.error('⚠️ Failed to ensure disconnect_elo column:', e.message);
    }

    console.log(`✅ MYCHESS Server is running on http://localhost:${PORT}`);
});

// This catches the EADDRINUSE error and retries after 2 seconds
serverInstance.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${PORT} is busy. Retrying in 2 seconds...`);
        setTimeout(() => {
            serverInstance.close();
            serverInstance.listen(PORT);
        }, 2000);
    } else {
        console.error('❌ Server error:', e);
    }
});

// This ensures Node exits cleanly if the server crashes
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down MYCHESS Server...');
    serverInstance.close(() => {
        process.exit(0);
    });
});