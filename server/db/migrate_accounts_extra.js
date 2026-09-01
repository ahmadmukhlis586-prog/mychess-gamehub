'use strict';

/*
 * ACCOUNTS EXTRA MIGRATION (ADDITIVE)
 * -----------------------------------
 * Adds:
 *   1. `avatar` column on accounts (nullable text) for profile pictures.
 *   2. `password_reset_tokens` table for secure password-reset links.
 *
 * Safe to run multiple times (all idempotent).
 * Run once: node db/migrate_accounts_extra.js
 */

const { pool } = require('./connection');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1) avatar column on accounts
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE accounts ADD COLUMN avatar TEXT;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END $$;
        `);
        console.log('[OK] accounts.avatar column ensured.');

        // 2) password_reset_tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id BIGSERIAL PRIMARY KEY,
                account_id UUID NOT NULL,
                token TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                used BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT fk_reset_account FOREIGN KEY (account_id)
                    REFERENCES accounts(id) ON DELETE CASCADE
            )
        `);
        console.log('[OK] password_reset_tokens table ensured.');

        await client.query('COMMIT');
        console.log('[DONE] Accounts-extra migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[ERROR] Migration failed:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
