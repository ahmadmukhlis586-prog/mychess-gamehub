'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS SAFE CLOUD-URL SYNC (local -> Live Neon, non-destructive)
|--------------------------------------------------------------------------
| Unlike deploy.js --push (which REPLACES the whole cloud DB), this script
| only updates music_albums + announcements rows that still point at local
| /assets/... paths, replacing them with the durable Supabase cloud URL.
| It reads the URL mapping from your LOCAL DB (which already has cloud URLs)
| and applies ONLY those two columns. Accounts / shop / quests / other data
| are left completely untouched.
|
|   node server/db/sync-live-urls.js
|
| Requires: DATABASE_URL set to your live Neon connection string.
|--------------------------------------------------------------------------
*/

const { Pool } = require('pg');

// LOCAL pool: explicitly target localhost DB_* (independent of DATABASE_URL,
// because connection.js switches to remote whenever DATABASE_URL is set).
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const localPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mychessgame_db',
    password: process.env.DB_PASSWORD || 'mychess123',
    port: process.env.DB_PORT || 5432,
    max: 5,
    connectionTimeoutMillis: 5000,
});

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Set it to your live Neon connection string.');
    process.exit(1);
}

const remotePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    connectionTimeoutMillis: 15000,
});

(async () => {
    // 1) Read the authoritative cloud-URL map from the LOCAL db.
    const map = {}; // local_asset_path -> cloud_url

    const albums = await localPool.query('SELECT id, cover_image, audio_file FROM music_albums');
    for (const r of albums.rows) {
        if (r.cover_image && r.cover_image.startsWith('http')) map[r.cover_image] = undefined; // no-op guard
    }

    let updated = 0;

    // --- Update music_albums on REMOTE by matching local asset paths ---
    const remAlbums = await remotePool.query('SELECT id, cover_image, audio_file FROM public.music_albums');
    for (const r of remAlbums.rows) {
        // find the local row with the SAME asset path (to get its cloud URL)
        let cloudCover = null, cloudAudio = null;
        const match = await localPool.query(
            'SELECT cover_image, audio_file FROM music_albums WHERE cover_image = $1 OR audio_file = $2 OR cover_image = $3 OR audio_file = $4 LIMIT 1',
            [r.cover_image, r.cover_image, r.audio_file, r.audio_file]
        );
        if (match.rows.length) {
            const m = match.rows[0];
            if (r.cover_image && r.cover_image.startsWith('/assets/')) cloudCover = m.cover_image;
            if (r.audio_file && r.audio_file.startsWith('/assets/')) cloudAudio = m.audio_file;
            if (cloudCover || cloudAudio) {
                await remotePool.query(
                    'UPDATE public.music_albums SET cover_image = $1, audio_file = $2 WHERE id = $3',
                    [cloudCover || r.cover_image, cloudAudio || r.audio_file, r.id]
                );
                updated++;
                console.log(`  ✔ album #${r.id} -> ${cloudCover ? 'cover+audio' : cloudAudio ? 'audio' : ''}`);
            }
        }
    }

    // --- Update announcements on REMOTE by matching local asset paths ---
    const remAnn = await remotePool.query('SELECT announcement_id, image_url FROM public.announcements');
    for (const r of remAnn.rows) {
        if (r.image_url && r.image_url.startsWith('/assets/')) {
            const match = await localPool.query(
                'SELECT image_url FROM announcements WHERE image_url = $1 LIMIT 1', [r.image_url]
            );
            if (match.rows.length && match.rows[0].image_url.startsWith('http')) {
                await remotePool.query(
                    'UPDATE public.announcements SET image_url = $1 WHERE announcement_id = $2',
                    [match.rows[0].image_url, r.announcement_id]
                );
                updated++;
                console.log(`  ✔ announcement #${String(r.announcement_id).slice(0,8)} -> cloud`);
            }
        }
    }

    console.log(`\nDone. Updated ${updated} row(s) on the live DB to cloud URLs.`);
    console.log('Live data (accounts, shop, quests, etc.) untouched.');
    process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
