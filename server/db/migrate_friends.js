'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS FRIENDS & CHALLENGE migration
|--------------------------------------------------------------------------
| Adds a friends table to support sending friend requests, accepting,
| removing friends, and challenging friends to a match.
| Run once:  node server/db/migrate_friends.js
|--------------------------------------------------------------------------
*/

const { pool } = require('./connection');

async function migrate() {
    console.log('Running migration for friends & challenges...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS friends (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                friend_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending',
                requester_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, friend_id)
            );
        `);
        console.log('friends table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);
        `);
        console.log('friends indexes ready');

        console.log('Friends migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
