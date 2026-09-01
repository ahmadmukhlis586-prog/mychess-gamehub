'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS AUTH EXTRA (ADDITIVE)
|--------------------------------------------------------------------------
| Adds, WITHOUT touching any existing code:
|   • Rate limiting / brute-force protection on authentication endpoints
|   • server.set('trust proxy', ...) so IP-based limits work behind Render's proxy
|   • Forgot password (email reset link via Resend SMTP)
|   • Reset password (validates the emailed token, sets a new password)
|   • Change password (logged-in user changes their own password)
|   • Profile avatar upload (persistent via existing cloud storage)
|
| Env vars (add to server/.env and Render):
|   RESEND_SMTP_USER   = your Resend SMTP username/API key
|   RESEND_SMTP_PASS   = your Resend SMTP password/API key
|   RESEND_FROM_EMAIL  = sender address, e.g. "MYCHESS <onboarding@resend.dev>"
|   PUBLIC_APP_URL     = public base URL used in reset links (defaults to request origin)
|--------------------------------------------------------------------------
*/

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    nodemailer = null;
}

const PBKDF2_ITERATIONS = 120000;

// One-way derivation independent of the existing scrypt hash, used only for
// the reset token lookup key (keeps secrets out of the DB/URL).
function hashResetToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

const getFromAddress = () =>
    process.env.RESEND_FROM_EMAIL || 'MYCHESS <onboarding@resend.dev>';

function buildMailer() {
    if (!nodemailer) return null;
    const user = process.env.RESEND_SMTP_USER;
    const pass = process.env.RESEND_SMTP_PASS;
    if (!user || !pass) return null;
    return nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: { user, pass },
    });
}

function resolvePublicUrl(req) {
    if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
    const host = req.get('host') || 'localhost:4000';
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    return `${proto}://${host}`;
}

// ---------------------------------------------------------------
// Rate limiters (per IP) — additive hardening
// ---------------------------------------------------------------

const authLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many login attempts. Please try again in a few minutes.' },
});

const authRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many accounts from this address. Please try again later.' },
});

const forgotLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many reset requests. Please try again later.' },
});

const resetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many reset attempts. Please try again later.' },
});

const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many password changes. Please try again later.' },
});

const avatarUploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, message: 'Too many uploads. Please try again later.' },
});

// ---------------------------------------------------------------
// Avatar upload (dedicated, additive multer config)
// ---------------------------------------------------------------

const AVATAR_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB

function ensureAvatarDir() {
    const imagesDir = path.join(__dirname, 'public/assets/images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    return imagesDir;
}

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, ensureAvatarDir()),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = (path.extname(file.originalname) || '.png').toLowerCase();
        cb(null, 'avatar-' + uniqueSuffix + ext);
    },
});

const avatarUploadMulter = multer({
    storage: avatarStorage,
    limits: { fileSize: AVATAR_SIZE_LIMIT },
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error('Only image files are allowed (jpg, png, gif, webp).'));
    },
});

const ALLOWED_AVATAR_CHARS = /^[A-Za-z0-9_\- ]{3,24}$/;

// ---------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------

// Applies early middleware that needs no later-defined helpers. Called
// near the top of server.js so rate limiters run BEFORE existing routes.
function applyEarlyMiddleware(app) {
    if (!app) return;
    // Trust proxy so Express reads the real client IP forwarded by Render.
    try {
        app.set('trust proxy', 1);
    } catch (e) {
        console.error('[auth-extra] Failed to set trust proxy:', e.message);
    }
    app.use('/api/auth/login', authLoginLimiter);
    app.use('/api/auth/register', authRegisterLimiter);
}

function registerAuthExtra({
    app,
    pool,
    db,
    hashPassword,
    verifyPassword,
    requireAuth,
    cloudStorage,
}) {
    if (!app) return;

    // Trust proxy so Express reads the real client IP forwarded by Render.
    // (Set in a new module; no existing line is modified.)
    try {
        app.set('trust proxy', 1);
    } catch (e) {
        console.error('[auth-extra] Failed to set trust proxy:', e.message);
    }

    // -----------------------------------------------------------
    // FORGOT PASSWORD
    // -----------------------------------------------------------
    app.post('/api/auth/forgot', forgotLimiter, async (req, res) => {
        try {
            const email = String(req.body?.email || '').toLowerCase().trim();
            if (!email) {
                return res.status(400).json({ ok: false, message: 'Please enter your email address.' });
            }

            const account = await db.findAccountByEmail(email);
            // Always respond generically to avoid account-enumeration.
            if (!account) {
                return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
            }

            // Invalidate any previously unused tokens for this account.
            await pool.query(
                `UPDATE password_reset_tokens SET used = TRUE WHERE account_id = $1 AND used = FALSE`,
                [account.id]
            );

            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = hashResetToken(token);
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            await pool.query(
                `INSERT INTO password_reset_tokens (account_id, token, expires_at)
                 VALUES ($1, $2, $3)`,
                [account.id, tokenHash, expiresAt]
            );

            const base = resolvePublicUrl(req);
            const resetUrl = `${base}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(account.email)}`;

            const mailer = buildMailer();
            let sent = false;
            if (mailer) {
                try {
                    await mailer.sendMail({
                        from: getFromAddress(),
                        to: account.email,
                        subject: 'Reset your MYCHESS password',
                        html: `
                          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;background:#0f0d22;color:#e0e7ff;border-radius:16px;">
                            <h2 style="margin:0 0 12px;color:#fff;">MYCHESS Password Reset</h2>
                            <p>Hello <strong>${account.username.replace(/[<>&]/g, '')}</strong>,</p>
                            <p>Click the button below to reset your MYCHESS password. This link is valid for <strong>15 minutes</strong>.</p>
                            <p style="margin:24px 0;text-align:center;">
                              <a href="${resetUrl}" style="background:#6366f1;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">Reset Password</a>
                            </p>
                            <p>If you did not request this, you can safely ignore this email.</p>
                          </div>
                        `,
                    });
                    sent = true;
                } catch (e) {
                    console.error('[auth-extra] Email send failed:', e.message);
                }
            }

            if (!sent) {
                // No mailer configured (dev/testing) — surface the link in logs.
                console.log(`[auth-extra] Forgot-password link for ${account.email}: ${resetUrl}`);
            }

            return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
        } catch (error) {
            console.error('[auth-extra] Forgot password error:', error);
            return res.status(500).json({ ok: false, message: 'Could not process your request.' });
        }
    });

    // -----------------------------------------------------------
    // RESET PASSWORD
    // -----------------------------------------------------------
    app.post('/api/auth/reset', resetLimiter, async (req, res) => {
        try {
            const token = String(req.body?.token || '').trim();
            const email = String(req.body?.email || '').toLowerCase().trim();
            const newPassword = String(req.body?.password || '');

            if (!token || !email) {
                return res.status(400).json({ ok: false, message: 'Invalid or missing reset link.' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ ok: false, message: 'Password must contain at least 8 characters.' });
            }

            const tokenHash = hashResetToken(token);
            const account = await db.findAccountByEmail(email);
            if (!account) {
                return res.status(400).json({ ok: false, message: 'That account no longer exists.' });
            }

            const row = await pool.query(
                `SELECT id, expires_at, used
                 FROM password_reset_tokens
                 WHERE account_id = $1 AND token = $2
                 ORDER BY created_at DESC LIMIT 1`,
                [account.id, tokenHash]
            );

            const record = row.rows[0];
            if (!record) {
                return res.status(400).json({ ok: false, message: 'This reset link is invalid.' });
            }
            if (record.used) {
                return res.status(400).json({ ok: false, message: 'This reset link has already been used.' });
            }
            if (new Date(record.expires_at).getTime() < Date.now()) {
                return res.status(400).json({ ok: false, message: 'This reset link has expired. Please request a new one.' });
            }

            const passwordData = hashPassword(newPassword);
            await pool.query(
                `UPDATE accounts SET password_hash = $1, password_salt = $2 WHERE id = $3`,
                [passwordData.hash, passwordData.salt, account.id]
            );
            await pool.query(
                `UPDATE password_reset_tokens SET used = TRUE WHERE id = $1`,
                [record.id]
            );

            // Invalidate existing sessions so the old password can't be used.
            await pool.query(
                `DELETE FROM sessions WHERE account_id = $1`,
                [account.id]
            );

            return res.json({ ok: true, message: 'Your password has been reset. You can now log in.' });
        } catch (error) {
            console.error('[auth-extra] Reset password error:', error);
            return res.status(500).json({ ok: false, message: 'Could not reset your password.' });
        }
    });

    // -----------------------------------------------------------
    // CHANGE PASSWORD (logged in)
    // -----------------------------------------------------------
    app.post('/api/auth/change-password', changePasswordLimiter, requireAuth, async (req, res) => {
        try {
            const currentPassword = String(req.body?.currentPassword || '');
            const newPassword = String(req.body?.newPassword || '');

            if (!currentPassword) {
                return res.status(400).json({ ok: false, message: 'Please enter your current password.' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ ok: false, message: 'New password must contain at least 8 characters.' });
            }

            const account = await db.findAccountById(req.account.id);
            if (!account) {
                return res.status(401).json({ ok: false, message: 'Account not found.' });
            }
            if (!verifyPassword(currentPassword, account.password_hash, account.password_salt)) {
                return res.status(400).json({ ok: false, message: 'Your current password is incorrect.' });
            }

            const passwordData = hashPassword(newPassword);
            await pool.query(
                `UPDATE accounts SET password_hash = $1, password_salt = $2 WHERE id = $3`,
                [passwordData.hash, passwordData.salt, account.id]
            );

            return res.json({ ok: true, message: 'Your password has been changed.' });
        } catch (error) {
            console.error('[auth-extra] Change password error:', error);
            return res.status(500).json({ ok: false, message: 'Could not change your password.' });
        }
    });

    // -----------------------------------------------------------
    // AVATAR UPLOAD (logged in)
    // -----------------------------------------------------------
    app.post(
        '/api/auth/avatar',
        avatarUploadLimiter,
        requireAuth,
        avatarUploadMulter.single('avatar'),
        (err, req, res, next) => {
            // Multer / file-upload errors surface here (before the handler).
            if (err) {
                const msg = /size/i.test(err.message || '')
                    ? 'Avatar image is too large (max 5 MB).'
                    : /image files/i.test(err.message || '')
                        ? err.message
                        : 'Could not process the uploaded image.';
                return res.status(400).json({ ok: false, message: msg });
            }
            return next();
        },
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ ok: false, message: 'Please choose an image to upload.' });
                }

                let finalUrl = null;
                if (cloudStorage && typeof cloudStorage.saveUploadedFile === 'function') {
                    try {
                        finalUrl = await cloudStorage.saveUploadedFile(req.file, 'images');
                    } catch (e) {
                        console.error('[auth-extra] cloud save error:', e.message);
                    }
                }
                // Local fallback path built from the uploaded filename.
                if (!finalUrl) {
                    finalUrl = `/assets/images/${req.file.filename}`;
                }

                await pool.query(
                    `UPDATE accounts SET avatar = $1 WHERE id = $2`,
                    [finalUrl, req.account.id]
                );

                return res.json({ ok: true, avatar: finalUrl });
            } catch (error) {
                console.error('[auth-extra] Avatar upload error:', error.message || error);
                return res.status(500).json({ ok: false, message: 'Could not upload your avatar.' });
            }
        }
    );

    // -----------------------------------------------------------
    // GET AVATAR for a user (for display anywhere)
    // -----------------------------------------------------------
    app.get('/api/avatar/:userId', requireAuth, async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT avatar FROM accounts WHERE id = $1`,
                [req.params.userId]
            );
            const avatar = result.rows[0]?.avatar || null;
            return res.json({ ok: true, avatar });
        } catch (error) {
            console.error('[auth-extra] Get avatar error:', error);
            return res.status(500).json({ ok: false, message: 'Could not load avatar.' });
        }
    });
}

module.exports = { registerAuthExtra, applyEarlyMiddleware, authLoginLimiter, authRegisterLimiter, hashResetToken };
