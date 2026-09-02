const { pool } = require('./connection');

async function migrate() {
    console.log('Running match cosmetics migration (move trails, entrance themes, emotes)...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS move_trails (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            trail_key VARCHAR(50) NOT NULL UNIQUE,
            color_hex VARCHAR(20) DEFAULT '#c084fc',
            glow_hex VARCHAR(20) DEFAULT '#7c3aed',
            rarity VARCHAR(30) DEFAULT 'common',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_move_trail (
            account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
            trail_id INT REFERENCES move_trails(id) ON DELETE CASCADE,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS entrance_themes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            tagline VARCHAR(160) DEFAULT '',
            emoji VARCHAR(20) DEFAULT '⚡',
            audio_file TEXT NOT NULL,
            rarity VARCHAR(30) DEFAULT 'common',
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_entrance_theme (
            account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
            theme_id INT REFERENCES entrance_themes(id) ON DELETE CASCADE,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS emotes (
            id SERIAL PRIMARY KEY,
            emoji TEXT NOT NULL,
            label VARCHAR(80) NOT NULL UNIQUE,
            tag VARCHAR(40) DEFAULT 'generic',
            cost_elo INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_emote_inventory (
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            emote_id INT NOT NULL REFERENCES emotes(id) ON DELETE CASCADE,
            PRIMARY KEY (account_id, emote_id)
        );
    `);

    await pool.query(`
        INSERT INTO move_trails (name, trail_key, color_hex, glow_hex, rarity) VALUES
            ('Comet', 'comet', '#c084fc', '#7c3aed', 'common'),
            ('Ember', 'ember', '#fb923c', '#ef4444', 'uncommon'),
            ('Lightning', 'lightning', '#22d3ee', '#0ea5e9', 'rare'),
            ('Phantom', 'phantom', '#a3e635', '#65a30d', 'rare'),
            ('Royal Gold', 'royal', '#fbbf24', '#f59e0b', 'epic'),
            ('Galaxy Pearl', 'pearl', '#e879f9', '#d946ef', 'legendary')
        ON CONFLICT (trail_key) DO NOTHING;
    `);

    await pool.query(`
        INSERT INTO entrance_themes (name, tagline, emoji, audio_file, rarity) VALUES
            ('Neon Star', 'Walk in like a main character', '✨', '/assets/audio/my-intro-sound.mp3', 'common'),
            ('Fashion Flex', 'Style on them before move one', '🕶️', '/assets/audio/my-intro-sound-fashion.mp3', 'rare'),
            ('Hype Build', 'Turn the lobby up', '🔥', '/assets/audio/h2h-styles.mp3', 'epic')
        ON CONFLICT (name) DO NOTHING;
    `);

    await pool.query(`
        INSERT INTO emotes (emoji, label, tag, cost_elo) VALUES
            ('⚡', 'Check!', 'check', 0),
            ('😱', 'In check!', 'check', 0),
            ('👀', 'Watch it!', 'check', 0),
            ('💀', 'Bruh.', 'blunder', 0),
            ('🤡', 'Clown move', 'blunder', 0),
            ('🤯', 'Brain exploded', 'blunder', 20),
            ('👑', 'King move', 'win', 0),
            ('🎉', 'EZ clap', 'win', 0),
            ('🔥', 'On fire!', 'win', 10),
            ('🥶', 'Ice cold', 'win', 20),
            ('💎', 'Diamond clutch', 'win', 100),
            ('😎', 'GG', 'generic', 0),
            ('🧠', '5 head', 'generic', 0),
            ('🚀', 'Boosted', 'generic', 0),
            ('💅', 'Slay', 'generic', 0)
        ON CONFLICT (label) DO NOTHING;
    `);

    const counts = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM move_trails) AS move_trails,
            (SELECT COUNT(*) FROM entrance_themes) AS entrance_themes,
            (SELECT COUNT(*) FROM emotes) AS emotes
    `);
    console.log('Seeded counts:', counts.rows[0]);
    console.log('Match cosmetics migration complete.');
}

migrate()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error('Match cosmetics migration failed:', e);
        process.exit(1);
    });