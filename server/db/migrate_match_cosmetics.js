const { pool } = require('./connection');

async function migrate() {
    console.log('Running meme sounds migration (equipable in-match soundboard)...');

    // Remove the retired entrance banner feature entirely
    await pool.query(`
        DROP TABLE IF EXISTS user_entrance_theme;
        DROP TABLE IF EXISTS entrance_themes;
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS meme_sounds (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            emoji VARCHAR(20) DEFAULT '🔊',
            audio_file TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS user_meme_sound (
            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
            meme_sound_id INT NOT NULL REFERENCES meme_sounds(id) ON DELETE CASCADE,
            equipped_at TIMESTAMPTZ DEFAULT NOW(),
            PRIMARY KEY (account_id, meme_sound_id)
        );
    `);

    await pool.query(`
        INSERT INTO meme_sounds (name, emoji, audio_file) VALUES
            ('Airhorn Blast', '📢', '/assets/audio/my-intro-sound.mp3'),
            ('Oof Moment', '🫢', '/assets/audio/h2h-styles.mp3'),
            ('Fatality', '💥', '/assets/audio/my-custom-kill-ori.mp3'),
            ('Let''s Gooo', '🚀', '/assets/audio/cortis-go.mp3'),
            ('Red Card', '🔴', '/assets/audio/my-intro-sound.mp3'),
            ('Moonwalk', '🕺', '/assets/audio/lngshot-moonwalkin.mp3'),
            ('Styled Out', '🕶️', '/assets/audio/my-intro-sound-fashion.mp3'),
            ('Hype Check', '🔥', '/assets/audio/my-intro-sound.mp3'),
            ('Silence', '🤫', '/assets/audio/h2h-styles.mp3'),
            ('Sick Play', '🫠', '/assets/audio/cortis-go.mp3'),
            ('GG EZ', '🎮', '/assets/audio/lngshot-moonwalkin.mp3'),
            ('Plot Twist', '🌀', '/assets/audio/my-custom-kill-ori.mp3')
        ON CONFLICT (name) DO UPDATE SET emoji = EXCLUDED.emoji, audio_file = EXCLUDED.audio_file, is_active = TRUE;
    `);

    const counts = await pool.query(`
        SELECT
            (SELECT COUNT(*) FROM meme_sounds) AS meme_sounds,
            (SELECT COUNT(*) FROM user_meme_sound) AS equipped
    `);
    console.log('Seeded counts:', counts.rows[0]);
    console.log('Meme sounds migration complete.');
}

migrate()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error('Meme sounds migration failed:', e);
        process.exit(1);
    });