-- ============================================
-- MYCHESS DATABASE SCHEMA
-- Database: mychessgame_db
-- ============================================

-- Create the database (run this separately first if needed)
-- CREATE DATABASE mychessgame_db;

-- Connect to the database
-- \c mychessgame_db;

-- ============================================
-- ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(24) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(128) NOT NULL,
    password_salt VARCHAR(32) NOT NULL,
    role VARCHAR(10) DEFAULT 'user',
    elo INTEGER DEFAULT 0,
    games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id VARCHAR(6) NOT NULL,
    white_player_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    black_player_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    white_username VARCHAR(24),
    black_username VARCHAR(24),
    moves JSONB DEFAULT '[]',
    result VARCHAR(10),
    result_type VARCHAR(20),
    winner VARCHAR(24),
    started_at TIMESTAMP,
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- ============================================
-- INDEXES (Primary Tables)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_games_room_id ON games(room_id);
CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_sessions_account_id ON sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- CURRENCY & SHOP TABLES
-- ============================================

-- User currency table
CREATE TABLE IF NOT EXISTS user_currency (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    gems INTEGER DEFAULT 0,
    total_gems_earned INTEGER DEFAULT 0,
    total_gems_spent INTEGER DEFAULT 0,
    last_daily_login TIMESTAMP,
    login_streak INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop items table
CREATE TABLE IF NOT EXISTS shop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(30) NOT NULL, -- 'piece', 'board', 'effect', 'avatar', 'name_color'
    price INTEGER NOT NULL,
    rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
    preview_data JSONB, -- Store preview image or CSS
    is_limited BOOLEAN DEFAULT FALSE,
    limited_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User inventory table
CREATE TABLE IF NOT EXISTS user_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_equipped BOOLEAN DEFAULT FALSE,
    UNIQUE(account_id, item_id)
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    category VARCHAR(30), -- 'games', 'streak', 'elo', 'social'
    requirement_type VARCHAR(30), -- 'wins', 'games', 'streak', 'elo'
    requirement_value INTEGER,
    gems_reward INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed BOOLEAN DEFAULT FALSE,
    UNIQUE(account_id, achievement_id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    announcement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quests table
CREATE TABLE IF NOT EXISTS quests (
    id SERIAL PRIMARY KEY,
    quest_type VARCHAR(50) NOT NULL,
    quest_name VARCHAR(100) NOT NULL,
    description TEXT,
    goal INTEGER DEFAULT 1,
    reward_elo INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Quests progress table
CREATE TABLE IF NOT EXISTS user_quests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    quest_id INTEGER REFERENCES quests(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    claimed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, quest_id)
);

-- Music Albums table
CREATE TABLE IF NOT EXISTS music_albums (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    artist VARCHAR(150),
    cover_image TEXT,
    audio_file TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Music Selection
CREATE TABLE IF NOT EXISTS user_music_selection (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    album_id INTEGER REFERENCES music_albums(id) ON DELETE CASCADE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES (Shop & Currency)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_currency_account ON user_currency(account_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_account ON user_inventory(account_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_price ON shop_items(price);

-- ============================================
-- AUTOMATIC CURRENCY TRIGGER (Crucial!)
-- Ensures every new user gets a currency row automatically
-- ============================================
CREATE OR REPLACE FUNCTION create_user_currency()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_currency (account_id, gems) VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_user_currency ON accounts;

CREATE TRIGGER trigger_create_user_currency
AFTER INSERT ON accounts
FOR EACH ROW
EXECUTE FUNCTION create_user_currency();

-- ============================================
-- SAMPLE DATA (Test Account & Shop Items)
-- ============================================

-- Insert a test account
-- Note: This is a pre-hashed password (test12345) for testing only
INSERT INTO accounts (username, email, password_hash, password_salt, elo)
VALUES (
    'TestPlayer',
    'test@mychess.local',
    'f06efede7271c1a74bb149c8882ac33b65cea9c32b1051686b29e600af8cfc6666bc411774090e56df290213687d17730d4d5a8545b4943d7c2c98f5aee7a3e4',
    '95c69957f217b20445e60e3e9f18bbfe',
    1200
) ON CONFLICT (username) DO NOTHING;

-- Give the test player 500 starter gems.
-- Because of the trigger above, a row exists, so we just update it.
UPDATE user_currency 
SET gems = 500 
WHERE account_id = (SELECT id FROM accounts WHERE username = 'TestPlayer');

-- Insert Shop Items
INSERT INTO shop_items (name, description, category, price, rarity, preview_data) VALUES
-- Piece Skins
('Classic Ivory', 'Traditional ivory chess pieces', 'piece', 100, 'common', '{"color": "#f5f0e8", "style": "classic"}'),
('Obsidian Black', 'Sleek black obsidian pieces', 'piece', 150, 'uncommon', '{"color": "#1a1a2e", "style": "modern"}'),
('Golden Royal', 'Luxurious gold-plated pieces', 'piece', 350, 'rare', '{"color": "#ffd700", "style": "royal", "glow": true}'),
('Emerald Queen', 'Beautiful emerald green pieces', 'piece', 400, 'epic', '{"color": "#50c878", "style": "crystal", "glow": true}'),
('Diamond Sparkle', 'Sparkling diamond-encrusted pieces', 'piece', 500, 'legendary', '{"color": "#b9f2ff", "style": "diamond", "particles": true}'),
('Neon Cyber', 'Cyberpunk neon themed pieces', 'piece', 300, 'rare', '{"color": "#ff00ff", "style": "cyber", "glow": true}'),
('Steampunk Brass', 'Steampunk style brass pieces', 'piece', 350, 'rare', '{"color": "#cd7f32", "style": "steampunk", "gear": true}'),

-- Board Themes
('Wooden Classic', 'Traditional wooden board', 'board', 150, 'common', '{"theme": "wood", "light": "#f0d9b5", "dark": "#b58863"}'),
('Marble Elegance', 'Elegant marble board', 'board', 250, 'uncommon', '{"theme": "marble", "light": "#e8e0d8", "dark": "#8a8078"}'),
('Galaxy Night', 'Starry galaxy themed board', 'board', 400, 'epic', '{"theme": "galaxy", "light": "#1a0533", "dark": "#0d0221", "stars": true}'),
('Rose Gold', 'Luxurious rose gold board', 'board', 350, 'rare', '{"theme": "rosegold", "light": "#f7e7d4", "dark": "#b76e79"}'),
('Neon Grid', 'Cyberpunk neon grid board', 'board', 450, 'epic', '{"theme": "neon", "light": "#0a0a1a", "dark": "#1a0a2e", "grid": true}'),
('Underwater', 'Underwater themed board', 'board', 300, 'rare', '{"theme": "underwater", "light": "#1a5276", "dark": "#0e2f44", "bubbles": true}'),

-- Effects
('Sparkle Trail', 'Pieces leave sparkle trail', 'effect', 250, 'uncommon', '{"effect": "sparkle", "duration": 1.5}'),
('Fire Glow', 'Burning fire effect on moves', 'effect', 300, 'rare', '{"effect": "fire", "duration": 2}'),
('Rainbow Dash', 'Rainbow effect on pieces', 'effect', 450, 'epic', '{"effect": "rainbow", "duration": 2.5}'),
('Shadow Mist', 'Mysterious shadow mist effect', 'effect', 350, 'rare', '{"effect": "shadow", "duration": 2}'),

-- Name Colors
('Royal Purple', 'Purple name color', 'name_color', 100, 'common', '{"color": "#9b59b6"}'),
('Fiery Red', 'Red name color', 'name_color', 150, 'uncommon', '{"color": "#e74c3c"}'),
('Golden Glow', 'Glowing gold name', 'name_color', 200, 'rare', '{"color": "#f1c40f", "glow": true}'),
('Rainbow Gradient', 'Rainbow gradient name', 'name_color', 300, 'epic', '{"color": "rainbow", "gradient": true}'),

-- Avatar Frames
('Gold Frame', 'Gold avatar border', 'avatar_frame', 150, 'uncommon', '{"frame": "gold", "style": "border"}'),
('Crystal Frame', 'Crystal avatar border', 'avatar_frame', 300, 'rare', '{"frame": "crystal", "style": "border"}'),
('Diamond Frame', 'Diamond avatar border', 'avatar_frame', 450, 'epic', '{"frame": "diamond", "style": "border"}'),
('Crown Frame', 'Royal crown avatar border', 'avatar_frame', 500, 'legendary', '{"frame": "crown", "style": "border"}')
ON CONFLICT DO NOTHING;

-- Sample Achievements
INSERT INTO achievements (name, description, category, requirement_type, requirement_value, gems_reward) VALUES
('First Victory', 'Win your first game', 'games', 'wins', 1, 10),
('Five Wins', 'Win 5 games', 'games', 'wins', 5, 25),
('Ten Wins', 'Win 10 games', 'games', 'wins', 10, 50),
('Fifty Wins', 'Win 50 games', 'games', 'wins', 50, 100),
('Century Club', 'Win 100 games', 'games', 'wins', 100, 200),
('Bronze Streak', 'Win 3 games in a row', 'streak', 'streak', 3, 15),
('Silver Streak', 'Win 5 games in a row', 'streak', 'streak', 5, 30),
('Gold Streak', 'Win 10 games in a row', 'streak', 'streak', 10, 75),
('ELO Beginner', 'Reach 1000 ELO', 'elo', 'elo', 1000, 25),
('ELO Intermediate', 'Reach 1500 ELO', 'elo', 'elo', 1500, 50),
('ELO Advanced', 'Reach 2000 ELO', 'elo', 'elo', 2000, 100),
('Dedicated Player', 'Play 50 games', 'games', 'games', 50, 50),
('True Champion', 'Play 200 games', 'games', 'games', 200, 150),
('Social Butterfly', 'Send 50 chat messages', 'social', 'messages', 50, 25)
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION: Add role column (safe for existing DBs)
-- Run this if the accounts table already exists
-- without the role column.
-- ============================================
DO $$ BEGIN
    ALTER TABLE accounts ADD COLUMN role VARCHAR(10) DEFAULT 'user';
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- ============================================
-- PLAYER NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS player_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES (Notifications)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_account ON player_notifications(account_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON player_notifications(account_id, is_read);

-- ============================================
-- VERIFICATION QUERIES (For testing)
-- ============================================
-- SELECT * FROM accounts;
-- SELECT * FROM user_currency;
-- SELECT * FROM shop_items;