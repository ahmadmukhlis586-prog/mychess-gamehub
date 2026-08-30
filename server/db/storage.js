'use strict';

/*
|--------------------------------------------------------------------------
| MYCHESS CLOUD FILE STORAGE (Supabase Storage)
|--------------------------------------------------------------------------
| Uploads files to Supabase Storage so they persist across redeploys
| (Render's free-plan disk is ephemeral). Falls back to local disk if
| Supabase is not configured, so local dev and non-Supabase deploys
| keep working exactly as before.
|
| Env vars (add to Render / server/.env):
|   SUPABASE_URL      = your project URL, e.g. https://xxxx.supabase.co
|   SUPABASE_ANON_KEY = your anon/public key
|   SUPABASE_BUCKET   = bucket name (default "mychess")
|--------------------------------------------------------------------------
*/

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let supabase = null;
const isConfigured = () => !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;

// Lazily init supabase client only when needed
function getSupabase() {
    if (supabase) return supabase;
    if (!isConfigured()) return null;
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    return supabase;
}

const BUCKET = process.env.SUPABASE_BUCKET || 'mychess';

// Map common file extensions to MIME types (used when mimetype is unavailable)
function contentTypeFromExt(filename = '') {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
        webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
        mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain', json: 'application/json',
        pdf: 'application/pdf',
    };
    return map[ext] || 'application/octet-stream';
}

// Local dirs (existing behavior)
const assetsDir = path.join(__dirname, '../public/assets');
const imagesDir = path.join(assetsDir, 'images');
const audioDir = path.join(assetsDir, 'audio');

/**
 * Upload a buffered file to Supabase Storage (and locally as fallback).
 * @param {Object} obj { filename, buffer, mimetype, subfolder }
 * @returns {Promise<string|null>} public URL if cloud success, else null
 */
async function uploadToCloud({ filename, buffer, mimetype, subfolder = 'files' }) {
    if (!isConfigured() || !getSupabase()) return null;

    const bucket = BUCKET;
    const pathInBucket = `${subfolder}/${filename}`;
    try {
        // Infer content type from extension if not provided (handles migration)
        const contentType = mimetype || contentTypeFromExt(filename);
        // Upsert so re-uploads overwrite cleanly
        const { error } = await getSupabase()
            .storage
            .from(bucket)
            .upload(pathInBucket, buffer, { contentType, upsert: true });
        if (error) {
            console.error('Supabase upload error:', error.message);
            return null;
        }
        // Build the public URL (works when bucket is public)
        const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${pathInBucket}`;
        return url;
    } catch (e) {
        console.error('Supabase upload exception:', e.message);
        return null;
    }
}

/**
 * Save an uploaded file (from multer diskStorage) to both local disk and
 * Supabase. Returns the best URL to store in the DB:
 *   - cloud public URL if cloud upload succeeded
 *   - local /assets path otherwise (existing behavior)
 * @param {Object} file multer file object (written to disk by multer)
 * @param {string} subfolder e.g. 'images' | 'audio'
 */
async function saveUploadedFile(file, subfolder = 'files') {
    let finalUrl = null;
    let localDir;
    if (subfolder === 'images') localDir = imagesDir;
    else if (subfolder === 'audio') localDir = audioDir;
    else localDir = assetsDir;

    // The file's absolute path where multer diskStorage wrote it.
    const localAbsPath = file.path;

    // 1) Try cloud first (read bytes from the disk-written file)
    try {
        if (localAbsPath && fs.existsSync(localAbsPath)) {
            const buffer = fs.readFileSync(localAbsPath);
            const cloudUrl = await uploadToCloud({
                filename: file.filename,
                buffer,
                mimetype: file.mimetype,
                subfolder,
            });
            if (cloudUrl) finalUrl = cloudUrl;
        }
    } catch (e) {
        console.error('Cloud upload from disk error:', e.message);
    }

    // 2) Ensure local serving dir exists (keeps local + fallback working)
    try {
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    } catch (e) {
        console.error('Local dir ensure error:', e.message);
    }

    // 3) If cloud failed, return local path so nothing breaks
    if (!finalUrl) {
        finalUrl = subfolder === 'audio'
            ? `/assets/audio/${file.filename}`
            : subfolder === 'images'
                ? `/assets/images/${file.filename}`
                : `/assets/${file.filename}`;
    }

    return finalUrl;
}

module.exports = {
    isConfigured,
    saveUploadedFile,
    uploadToCloud,
    BUCKET,
};
