'use strict';

/*
 * SECURITY FIX MIGRATION
 * ----------------------
 * This script fixes the 3 critical security issues:
 * 1. Adds the missing 'role' column to the accounts table
 * 2. Properly hashes the admin password (previously stored as plaintext)
 * 3. Sets the admin account's role to 'admin' in the database
 *
 * Run once: node db/migrate_security_fix.js
 */

const crypto = require('crypto');
const { pool } = require('./connection');

const ADMIN_EMAIL = 'admin123@mychess.com';
const ADMIN_PASSWORD = 'admin123';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Step 1: Add role column (safe even if it already exists)
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE accounts ADD COLUMN role VARCHAR(10) DEFAULT 'user';
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END $$;
        `);
        console.log('[OK] role column ensured on accounts table.');

        // Step 2: Hash the admin password properly
        const { salt, hash } = hashPassword(ADMIN_PASSWORD);

        // Step 3: Create or update the admin account with proper hash and role
        const existing = await client.query(
            'SELECT id FROM accounts WHERE email = $1',
            [ADMIN_EMAIL.toLowerCase()]
        );

        if (existing.rows.length > 0) {
            await client.query(
                'UPDATE accounts SET password_hash = $1, password_salt = $2, role = $3 WHERE email = $4',
                [hash, salt, 'admin', ADMIN_EMAIL.toLowerCase()]
            );
            console.log('[OK] Admin account updated with hashed password and role=admin.');
        } else {
            await client.query(
                'INSERT INTO accounts (username, email, password_hash, password_salt, role) VALUES ($1, $2, $3, $4, $5)',
                ['Admin', ADMIN_EMAIL.toLowerCase(), hash, salt, 'admin']
            );
            console.log('[OK] Admin account created with hashed password and role=admin.');
        }

        await client.query('COMMIT');
        console.log('[DONE] Security migration completed successfully.');
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
