'use strict';

const { pool } = require('./connection');

async function migrate() {
    console.log('Migrating achievements to use elo_reward...');

    try {
        await pool.query(`
            DO $$ BEGIN
                ALTER TABLE achievements ADD COLUMN elo_reward INTEGER DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END $$;
        `);
        console.log('elo_reward column ready');

        // Copy gems_reward values to elo_reward for existing data
        await pool.query(`UPDATE achievements SET elo_reward = gems_reward WHERE elo_reward = 0 AND gems_reward > 0`);
        console.log('Copied existing reward values to elo_reward');

        console.log('Achievement migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
