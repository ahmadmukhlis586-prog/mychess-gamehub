'use strict';

const { pool } = require('./connection');

async function migrate() {
    console.log('Running migration for new features...');

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS player_notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                type VARCHAR(30) NOT NULL,
                title VARCHAR(100) NOT NULL,
                message TEXT,
                data JSONB,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('player_notifications table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_account ON player_notifications(account_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_notifications_unread ON player_notifications(account_id, is_read);
        `);
        console.log('Notification indexes ready');

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
