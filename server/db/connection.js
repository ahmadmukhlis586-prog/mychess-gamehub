const { Pool } = require('pg');
require('dotenv').config();

// Database configuration
// If a single DATABASE_URL is provided (e.g. on Render/Neon), use it.
// Otherwise fall back to the individual DB_* vars for local development.
const pool = process.env.DATABASE_URL
    ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
      })
    : new Pool({
          user: process.env.DB_USER || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          database: process.env.DB_NAME || 'mychessgame_db',
          password: process.env.DB_PASSWORD || 'mychess123',
          port: process.env.DB_PORT || 5432,
          max: 20, // Maximum number of clients in the pool
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
      });

// Test the connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.stack);
        console.log('\n⚠️  Please check:');
        console.log('1. Is PostgreSQL running?');
        console.log('2. Is the password correct?');
        console.log('3. Does the database "mychessgame_db" exist?');
        console.log('4. Is the port correct (5432)?\n');
    } else {
        console.log('✅ Connected to PostgreSQL database: mychessgame_db');
        release();
    }
});

module.exports = { pool };