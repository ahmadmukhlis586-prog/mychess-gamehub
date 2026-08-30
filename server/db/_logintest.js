const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const remote = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });

async function findAccountByEmail(email) {
    const r = await remote.query('SELECT * FROM public.accounts WHERE email = $1', [email.toLowerCase()]);
    return r.rows[0] || null;
}
function verifyPassword(password, storedHash, storedSalt) {
    try {
        if (!storedHash || !storedSalt) return false;
        const hash = crypto.scryptSync(password, storedSalt, 64);
        const stored = Buffer.from(storedHash, 'hex');
        return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
    } catch { return false; }
}
async function createSession(token, accountId) {
    const r = await remote.query('INSERT INTO public.sessions (token, account_id) VALUES ($1, $2) RETURNING *', [token, accountId]);
    return r.rows[0];
}

(async () => {
    // List account emails for the user to identify
    const accs = await remote.query("SELECT id, email, role FROM public.accounts");
    console.log('Accounts:', accs.rows.map(a => a.email + ' (role=' + a.role + ')').join(', '));

    // Test a full insert into sessions (simulating login's createSession)
    try {
        const sess = await createSession('test-' + Date.now(), accs.rows[0].id);
        console.log('createSession OK, expires_at =', sess.expires_at);
        // cleanup test session
        await remote.query('DELETE FROM public.sessions WHERE token = $1', [sess.token]);
        console.log('cleaned test session');
    } catch (e) {
        console.log('createSession FAILED:', e.message);
    }
    process.exit(0);
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
