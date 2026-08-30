'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS CLOUD FILE MIGRATION (local -> Supabase Storage)
|--------------------------------------------------------------------------
| After configuring SUPABASE_URL / SUPABASE_ANON_KEY, run this once on your
| LOCAL machine to copy every file already in server/public/assets up to
| Supabase Storage AND update the database rows so announcements/music
| point to the durable cloud URLs.
|
|   node server/db/sync-cloud.js
|
| It is idempotent: re-running is safe (upserts overwrite + updates rows).
|--------------------------------------------------------------------------
*/

const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');
const storage = require('./storage');

const assetsDir = path.join(__dirname, '../public/assets');
const imagesDir = path.join(assetsDir, 'images');
const audioDir = path.join(assetsDir, 'audio');

async function uploadDir(folder, subfolder) {
    if (!fs.existsSync(folder)) return [];
    const files = fs.readdirSync(folder).filter(f => !f.startsWith('.'));
    const uploaded = [];
    for (const f of files) {
        const full = path.join(folder, f);
        if (!fs.statSync(full).isFile()) continue;
        try {
            const buffer = fs.readFileSync(full);
            const url = await storage.uploadToCloud({ filename: f, buffer, subfolder });
            if (url) uploaded.push({ filename: f, url });
            else console.log(`  ! skipped (cloud off or error): ${f}`);
        } catch (e) {
            console.log(`  ! error ${f}: ${e.message}`);
        }
    }
    return uploaded;
}

(async () => {
    console.log('Cloud upload :', storage.isConfigured() ? 'ENABLED' : 'DISABLED (set SUPABASE_URL/ANON_KEY)');
    if (!storage.isConfigured()) {
        console.log('Aborting: Supabase not configured.');
        process.exit(1);
    }

    console.log('\nUploading images...');
    const images = await uploadDir(imagesDir, 'images');
    console.log(`Uploaded ${images.length} image(s).`);

    console.log('Uploading audio...');
    const audio = await uploadDir(audioDir, 'audio');
    console.log(`Uploaded ${audio.length} audio file(s).`);

    const byFilename = {};
    images.forEach(x => byFilename[`/assets/images/${x.filename}`] = x.url);
    audio.forEach(x => byFilename[`/assets/audio/${x.filename}`] = x.url);

    let updated = 0;

    if (images.length || audio.length) {
        const ann = await pool.query('SELECT announcement_id, image_url FROM announcements');
        for (const row of ann.rows) {
            const newUrl = byFilename[row.image_url];
            if (newUrl && newUrl !== row.image_url) {
                await pool.query('UPDATE announcements SET image_url = $1 WHERE announcement_id = $2', [newUrl, row.announcement_id]);
                updated++;
            }
        }

        const mus = await pool.query('SELECT id, cover_image, audio_file FROM music_albums');
        for (const row of mus.rows) {
            const newCover = byFilename[row.cover_image];
            const newAudio = byFilename[row.audio_file];
            if ((newCover && newCover !== row.cover_image) || (newAudio && newAudio !== row.audio_file)) {
                await pool.query('UPDATE music_albums SET cover_image = $1, audio_file = $2 WHERE id = $3',
                    [newCover || row.cover_image, newAudio || row.audio_file, row.id]);
                updated++;
            }
        }
    }

    console.log(`\nUpdated ${updated} database row(s) to cloud URLs.`);
    console.log('Done. Re-deploy / restart for changes to take effect.');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
