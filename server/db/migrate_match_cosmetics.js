const { pool } = require('./connection');

async function migrate() {
    console.log('Running entrance banners migration (visual-only banners, 20 options)...');

    // Remove the retired feature tables (move trails + emote wheel)
    await pool.query(`
      DROP TABLE IF EXISTS user_emote_inventory;
      DROP TABLE IF EXISTS emotes;
      DROP TABLE IF EXISTS user_move_trail;
      DROP TABLE IF EXISTS move_trails;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS entrance_themes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            tagline VARCHAR(160) DEFAULT '',
            emoji VARCHAR(20) DEFAULT '⚡',
            audio_file TEXT DEFAULT '',
            glow_hex TEXT DEFAULT '#a855f7',
            rarity VARCHAR(30) DEFAULT 'common',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_entrance_theme (
            account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
            theme_id INT REFERENCES entrance_themes(id) ON DELETE CASCADE,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE entrance_themes ADD COLUMN IF NOT EXISTS glow_hex TEXT DEFAULT '#a855f7';
        ALTER TABLE entrance_themes ALTER COLUMN audio_file DROP NOT NULL;
        ALTER TABLE entrance_themes ALTER COLUMN audio_file SET DEFAULT '';
    `);

    await pool.query(`
        INSERT INTO entrance_themes (name, tagline, emoji, glow_hex, rarity) VALUES
            ('Neon Star', 'Walk in like a main character', '✨', '#facc15', 'common'),
            ('Fashion Flex', 'Style on them before move one', '🕶️', '#a855f7', 'rare'),
            ('Hype Build', 'Turn the lobby up', '🔥', '#ef4444', 'epic'),
            ('Royal Crown', 'Bow down, this is royalty', '👑', '#f59e0b', 'epic'),
            ('Dragon Roar', 'Rawr. Checkmate incoming', '🐉', '#22c55e', 'legendary'),
            ('Ice King', 'Zero degrees of mercy', '🧊', '#38bdf8', 'rare'),
            ('Bubble Pop', 'Light as a bubble, sharp as a bishop', '🫧', '#e879f9', 'common'),
            ('Galaxy Waver', 'From a galaxy far, far away', '🌌', '#818cf8', 'rare'),
            ('Phantom Glide', 'Sneaky. Spooky. Mate.', '👻', '#94a3b8', 'uncommon'),
            ('Diamond Hands', 'Never fold under pressure', '💎', '#a5f3fc', 'legendary'),
            ('Aim Bot', 'Locked on target', '🎯', '#fb923c', 'uncommon'),
            ('Thunder Clap', 'That move hit like lightning', '⚡', '#fde047', 'epic'),
            ('Moon Lord', 'By the light of the night', '🌙', '#c4b5fd', 'rare'),
            ('Lion Heart', 'Fearless in the endgame', '🦁', '#f97316', 'epic'),
            ('Ninja Sneak', 'You never saw it coming', '🥷', '#475569', 'legendary'),
            ('Robo Flex', 'Calculated. Beep boop, checkmate', '🤖', '#22d3ee', 'uncommon'),
            ('Lucky Four', 'A little luck never hurt', '🍀', '#4ade80', 'common'),
            ('Dunk King', 'Slam dunk on the king', '🏀', '#ef9235', 'epic'),
            ('Rocket Launch', 'To the moon, then to the mate', '🚀', '#f43f5e', 'legendary'),
            ('Sassy Win', 'Served, slayed, checkmated', '💅', '#f472b6', 'uncommon')
        ON CONFLICT (name) DO NOTHING;
    `);

    const counts = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM entrance_themes) AS entrance_themes,
            (SELECT COUNT(*) FROM user_entrance_theme) AS equipped
    `);
    console.log('Banner counts:', counts.rows[0]);
    console.log('Entrance banners migration complete.');
}

migrate()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error('Entrance banners migration failed:', e);
        process.exit(1);
    });