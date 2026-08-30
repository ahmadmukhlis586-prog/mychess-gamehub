const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
// If a single DATABASE_URL is provided (e.g. on Render/Neon), use it.
// Otherwise fall back to the individual DB_* vars for local development.
const usingLocalVars = !process.env.DATABASE_URL;
const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
      })
    : new Pool({
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'mychessgame_db',
          password: process.env.DB_PASSWORD || 'mychess123',
          port: process.env.DB_PORT || 5432,
          max: 20, // Maximum number of clients in the pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
      });

// Neon/cloud hosts sometimes do not default search_path to public, which makes
// unqualified table names (e.g. `accounts`) fail with "relation does not exist".
// Run SET search_path on every new pooled connection so all queries resolve.
if (process.env.DATABASE_URL) {
    pool.on('connect', (client) => {
        client.query('SET search_path TO public').catch((e) => {
            console.error('Failed to set search_path:', e.message);
        });
    });
}

// If we're NOT on localhost (e.g. deployed) but no DATABASE_URL is set,
// fail loudly with a clear message instead of timing out on localhost.
const isCloud = process.env.PORT && process.env.PORT !== '4000' && process.env.DB_HOST === 'localhost';
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is NOT set. Set it in Render → Settings → Environment Variables (a Neon connection string).');
    console.error('   The app will be unable to reach the database. Do NOT rely on DB_USER/DB_HOST defaults on Render.');
}

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        console.error(`${usingLocalVars ? 'LOCAL' : 'REMOTE'} ❌ Error connecting to database:`, err.stack);
        console.log('\n⚠️  Please check:');
        console.log('1. Is PostgreSQL running?');
        console.log('2. Is the password correct?');
        console.log('3. Does the database "' + (process.env.DB_NAME || 'mychessgame_db') + '" exist?');
        console.log('4. Is the port correct (5432)?');
        console.log('5. If deployed, is DATABASE_URL set in Render Environment Variables?\n');
    } else {
        console.log(`✅ Connected to PostgreSQL database: ${usingLocalVars ? (process.env.DB_NAME || 'mychessgame_db') : 'cloud (via DATABASE_URL)'}`);
        release();
    }
});

module.exports = { pool };