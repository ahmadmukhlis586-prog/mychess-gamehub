'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS DEPLOY DB HELPER
|--------------------------------------------------------------------------
| Transfers your local PostgreSQL data into the cloud database (Neon/Render).
|
| How it works:
|   1. Dumps your LOCAL database (schema + data) to a backup file with pg_dump.
|   2. Restores that backup into the TARGET database (set via DATABASE_URL env).
|
| Usage:
|   node server/db/deploy.js --backup            # backup local DB to ./db-backups
|   node server/db/deploy.js --restore           # restore latest backup into DATABASE_URL
|   node server/db/deploy.js --push              # backup + restore (backup -> cloud)
|
| Requirements:
|   - PostgreSQL command-line tools (pg_dump, psql) installed.
|   - For --restore / --push: set DATABASE_URL to your cloud database.
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });

const BACKUP_DIR = path.join(__dirname, '../db-backups');

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function localEnv() {
    return {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD || 'mukhlis123',
    };
}

function dumpFile() {
    ensureDir(BACKUP_DIR);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(BACKUP_DIR, `mychess-backup-${stamp}.dump`);
}

function backup() {
    const user = process.env.DB_USER || 'postgres';
    const host = process.env.DB_HOST || 'localhost';
    const db = process.env.DB_NAME || 'mychessgame_db';
    const port = process.env.DB_PORT || 5432;
    const out = dumpFile();

    console.log(`📦 Backing up local DB "${db}" -> ${out}`);
    execSync(
        `pg_dump -U ${user} -h ${host} -p ${port} -d ${db} --no-owner --no-privileges -F custom -f "${out}"`,
        { env: localEnv(), stdio: 'inherit' }
    );
    console.log(`✅ Backup complete: ${out}`);
    return out;
}

function latestBackup() {
    if (!fs.existsSync(BACKUP_DIR)) {
        throw new Error('No backups found. Run "node server/db/deploy.js --backup" first.');
    }
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.dump'));
    if (files.length === 0) throw new Error('No backups found.');
    files.sort();
    return path.join(BACKUP_DIR, files[files.length - 1]);
}

function restore(source) {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not set. Please set it to your cloud database connection string.');
    }
    console.log(`🔄 Restoring "${source}" into target cloud DB...`);
    // Drop public schema cleanly, then recreate from backup.
    console.log('   Clearing target database...');
    // Note: needs a valid psql connection. We rely on DATABASE_URL.
    execSync(
        `psql "${process.env.DATABASE_URL}" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`,
        { stdio: 'inherit' }
    );
    console.log('   Restoring schema + data...');
    execSync(
        `pg_restore --no-owner --no-privileges -d "${process.env.DATABASE_URL}" "${source}"`,
        { stdio: 'inherit' }
    );
    console.log('✅ Restore complete! Your cloud DB now mirrors your local data.');
}

const flag = process.argv[2];

try {
    if (flag === '--backup') {
        backup();
    } else if (flag === '--restore') {
        restore(latestBackup());
    } else if (flag === '--push') {
        const source = backup();
        restore(source);
    } else {
        console.log('Usage:');
        console.log('  node server/db/deploy.js --backup    (local DB -> backup file)');
        console.log('  node server/db/deploy.js --restore   (backup file -> cloud DATABASE_URL)');
        console.log('  node server/db/deploy.js --push       (backup then push to cloud)');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Deploy DB error:', error.message);
    process.exit(1);
}
