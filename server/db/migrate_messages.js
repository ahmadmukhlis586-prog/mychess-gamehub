'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS FRIEND MESSAGES migration
|--------------------------------------------------------------------------
| Adds a friend_messages table to store private friend-to-friend chat
| messages. Purely additive - does not modify any existing tables.
| Run once:  node server/db/migrate_messages.js
|--------------------------------------------------------------------------
*/

const { pool } = require('./connection');

async function migrate() {
    console.log('Running migration for friend messages...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS friend_messages (
                id SERIAL PRIMARY KEY,
                sender_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                receiver_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                body TEXT NOT NULL,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('friend_messages table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_friend_messages_pair
            ON friend_messages(sender_id, receiver_id, created_at);
        `);
        console.log('friend_messages indexes ready');

        console.log('Friend messages migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
