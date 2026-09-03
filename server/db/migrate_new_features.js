const { pool } = require('./connection');

async function migrate() {
    console.log('Running new features migration...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tournaments (
            id SERIAL PRIMARY KEY,
            creator_id UUID NOT NULL REFERENCES accounts(id),
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            max_players INT NOT NULL DEFAULT 10,
            points_per_win INT NOT NULL DEFAULT 10,
            entry_cost INT NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'waiting',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS tournament_players (
            id SERIAL PRIMARY KEY,
            tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            account_id UUID NOT NULL REFERENCES accounts(id),
            points INT NOT NULL DEFAULT 0,
            games_played INT NOT NULL DEFAULT 0,
            joined_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(tournament_id, account_id)
        );

        CREATE TABLE IF NOT EXISTS tournament_duels (
            id SERIAL PRIMARY KEY,
            tournament_id INT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
            challenger_id UUID NOT NULL REFERENCES accounts(id),
            opponent_id UUID NOT NULL REFERENCES accounts(id),
            status TEXT NOT NULL DEFAULT 'pending',
            result TEXT,
            winner_id UUID REFERENCES accounts(id),
            game_id INT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS daily_calendar (
            id SERIAL PRIMARY KEY,
            day_number INT NOT NULL UNIQUE,
            reward_type TEXT NOT NULL,
            reward_amount INT NOT NULL,
            description TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_calendar_claims (
            id SERIAL PRIMARY KEY,
            account_id UUID NOT NULL REFERENCES accounts(id),
            claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
            reward_type TEXT NOT NULL,
            reward_amount INT NOT NULL,
            UNIQUE(account_id, claim_date)
        );

        CREATE TABLE IF NOT EXISTS loot_boxes (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            rarity TEXT NOT NULL DEFAULT 'common',
            cost_elo INT NOT NULL,
            icon TEXT DEFAULT '📦'
        );

        CREATE TABLE IF NOT EXISTS loot_box_rewards (
            id SERIAL PRIMARY KEY,
            loot_box_id INT NOT NULL REFERENCES loot_boxes(id) ON DELETE CASCADE,
            reward_type TEXT NOT NULL,
            reward_name TEXT NOT NULL,
            reward_value INT NOT NULL DEFAULT 1,
            rarity TEXT NOT NULL DEFAULT 'common',
            drop_chance NUMERIC(5,2) NOT NULL DEFAULT 25.00
        );

        CREATE TABLE IF NOT EXISTS user_loot_boxes (
            id SERIAL PRIMARY KEY,
            account_id UUID NOT NULL REFERENCES accounts(id),
            loot_box_id INT NOT NULL REFERENCES loot_boxes(id),
            opened BOOLEAN DEFAULT FALSE,
            reward_type TEXT,
            reward_name TEXT,
            reward_value INT,
            opened_at TIMESTAMPTZ,
            received_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS emoji_reactions (
            id SERIAL PRIMARY KEY,
            emoji TEXT NOT NULL,
            name TEXT NOT NULL,
            cost_elo INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS user_emoji_inventory (
            id SERIAL PRIMARY KEY,
            account_id UUID NOT NULL REFERENCES accounts(id),
            emoji_id INT NOT NULL REFERENCES emoji_reactions(id),
            UNIQUE(account_id, emoji_id)
        );

        CREATE TABLE IF NOT EXISTS game_reactions (
            id SERIAL PRIMARY KEY,
            game_room_id TEXT NOT NULL,
            sender_id UUID NOT NULL REFERENCES accounts(id),
            receiver_id UUID REFERENCES accounts(id),
            emoji TEXT NOT NULL,
            sent_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS profile_themes (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            css_class TEXT NOT NULL,
            gradient TEXT NOT NULL,
            preview_url TEXT,
            cost_elo INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS animated_board_themes (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            css_class TEXT NOT NULL,
            animation_css TEXT NOT NULL,
            light_sq TEXT NOT NULL DEFAULT '#f0d9b5',
            dark_sq TEXT NOT NULL DEFAULT '#b58863',
            cost_elo INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS user_profile_theme (
            account_id UUID PRIMARY KEY REFERENCES accounts(id),
            theme_id INT REFERENCES profile_themes(id),
            banner_id INT REFERENCES profile_themes(id)
        );

        CREATE TABLE IF NOT EXISTS user_board_theme (
            account_id UUID PRIMARY KEY REFERENCES accounts(id),
            board_theme_id INT REFERENCES animated_board_themes(id)
        );
    `);

    await pool.query(`ALTER TABLE tournament_duels ADD COLUMN IF NOT EXISTS room_id VARCHAR(6)`);

    // Seed calendar rewards (31 days)
    const calExisting = await pool.query('SELECT COUNT(*) FROM daily_calendar');
    if (parseInt(calExisting.rows[0].count) === 0) {
        console.log('Seeding daily calendar rewards...');
        const calendarRewards = [
            [1,'elo',10,'Start of streak!'],[2,'elo',15,'Day 2 bonus'],[3,'elo',10,'Hat trick!'],
            [4,'elo',20,'On fire!'],[5,'elo',15,'High five!'],[6,'elo',10,'Streak master!'],
            [7,'loot_box',1,'Weekly chest!'],[8,'elo',15,'Day 8'],[9,'elo',20,'Day 9'],
            [10,'elo',15,'Double digits!'],[11,'elo',25,'Day 11'],[12,'elo',20,'Lucky 12!'],
            [13,'elo',15,'Unlucky? No way!'],[14,'loot_box',1,'Bi-weekly chest!'],[15,'elo',20,'Day 15'],
            [16,'elo',25,'Day 16'],[17,'elo',20,'Day 17'],[18,'elo',30,'Day 18'],
            [19,'elo',25,'Day 19'],[20,'elo',20,'20 days strong!'],[21,'loot_box',2,'Mid-month loot!'],
            [22,'elo',25,'Day 22'],[23,'elo',30,'Day 23'],[24,'elo',25,'Day 24'],
            [25,'elo',35,'Christmas day bonus!'],[26,'elo',30,'Day 26'],[27,'elo',25,'Day 27'],
            [28,'loot_box',2,'Almost there!'],[29,'elo',30,'Day 29'],[30,'elo',40,'Monthly champion!'],
            [31,'loot_box',3,'Mega monthly reward!'],
        ];
        for (const r of calendarRewards) {
            await pool.query('INSERT INTO daily_calendar (day_number, reward_type, reward_amount, description) VALUES ($1,$2,$3,$4)', r);
        }
    }

    // Seed loot boxes
    const lbExisting = await pool.query('SELECT COUNT(*) FROM loot_boxes');
    if (parseInt(lbExisting.rows[0].count) === 0) {
        console.log('Seeding loot boxes...');
        await pool.query(`INSERT INTO loot_boxes (name, description, rarity, cost_elo, icon) VALUES
            ('Bronze Crate', 'Basic rewards inside', 'common', 50, '📦'),
            ('Silver Crate', 'Better odds for rare items', 'rare', 150, '🎁'),
            ('Gold Crate', 'Premium rewards with high chance', 'epic', 400, '🏆'),
            ('Diamond Crate', 'Legendary rewards await', 'legendary', 1000, '💎')`);

        // Rewards for each box
        const boxes = await pool.query('SELECT id FROM loot_boxes ORDER BY id');
        const boxIds = boxes.rows.map(r => r.id);

        const bronzeRewards = [
            ['elo', 'Bonus ELO', 10, 'common', 40],
            ['elo', 'Bonus ELO', 20, 'common', 30],
            ['elo', 'Bonus ELO', 30, 'rare', 20],
            ['title', 'Newcomer', 1, 'rare', 10],
        ];
        const silverRewards = [
            ['elo', 'Bonus ELO', 20, 'common', 25],
            ['elo', 'Bonus ELO', 40, 'rare', 30],
            ['elo', 'Bonus ELO', 60, 'epic', 20],
            ['title', 'Rising Star', 1, 'epic', 15],
            ['loot_box', 'Bronze Crate', 1, 'rare', 10],
        ];
        const goldRewards = [
            ['elo', 'Bonus ELO', 50, 'rare', 20],
            ['elo', 'Bonus ELO', 100, 'epic', 30],
            ['elo', 'Bonus ELO', 150, 'epic', 20],
            ['title', 'Champion', 1, 'epic', 15],
            ['loot_box', 'Silver Crate', 1, 'epic', 15],
        ];
        const diamondRewards = [
            ['elo', 'Bonus ELO', 100, 'epic', 15],
            ['elo', 'Bonus ELO', 200, 'legendary', 25],
            ['elo', 'Bonus ELO', 500, 'legendary', 20],
            ['title', 'Legend', 1, 'legendary', 20],
            ['loot_box', 'Gold Crate', 1, 'epic', 20],
        ];
        const allRewards = [bronzeRewards, silverRewards, goldRewards, diamondRewards];
        for (let i = 0; i < 4; i++) {
            for (const r of allRewards[i]) {
                await pool.query('INSERT INTO loot_box_rewards (loot_box_id, reward_type, reward_name, reward_value, rarity, drop_chance) VALUES ($1,$2,$3,$4,$5,$6)', [boxIds[i], ...r]);
            }
        }
    }

    // Seed emoji reactions
    const emojiExisting = await pool.query('SELECT COUNT(*) FROM emoji_reactions');
    if (parseInt(emojiExisting.rows[0].count) === 0) {
        console.log('Seeding emoji reactions...');
        await pool.query(`INSERT INTO emoji_reactions (emoji, name, cost_elo) VALUES
            ('👍','Thumbs Up',0),('👏','Clap',0),('😂','Laugh',0),('😱','Shocked',0),
            ('🔥','Fire',10),('💀','Skull',10),('🎯','Bullseye',10),('👑','Crown',20),
            ('😈','Devil',20),('🧠','Big Brain',30),('🏆','Trophy',50),('💎','Diamond',100)`);
    }

    // Seed profile themes
    const ptExisting = await pool.query('SELECT COUNT(*) FROM profile_themes');
    if (parseInt(ptExisting.rows[0].count) === 0) {
        console.log('Seeding profile themes...');
        await pool.query(`INSERT INTO profile_themes (name, css_class, gradient, cost_elo) VALUES
            ('Default','pt-default','linear-gradient(135deg,#1a1a2e,#16213e)',0),
            ('Crimson','pt-crimson','linear-gradient(135deg,#dc2626,#991b1b)',50),
            ('Ocean','pt-ocean','linear-gradient(135deg,#0ea5e9,#1e3a5f)',50),
            ('Forest','pt-forest','linear-gradient(135deg,#16a34a,#14532d)',50),
            ('Gold','pt-gold','linear-gradient(135deg,#f59e0b,#92400e)',100),
            ('Neon Purple','pt-neon','linear-gradient(135deg,#a855f7,#6b21a8)',100),
            ('Cyberpunk','pt-cyber','linear-gradient(135deg,#ec4899,#06b6d4)',200),
            ('Galaxy','pt-galaxy','linear-gradient(135deg,#7c3aed,#1e1b4b,#0ea5e9)',300)`);
    }

    // Seed animated board themes
    const abExisting = await pool.query('SELECT COUNT(*) FROM animated_board_themes');
    if (parseInt(abExisting.rows[0].count) === 0) {
        console.log('Seeding animated board themes...');
        await pool.query(`INSERT INTO animated_board_themes (name, css_class, animation_css, light_sq, dark_sq, cost_elo) VALUES
            ('Classic','abt-classic','none','#f0d9b5','#b58863',0),
            ('Neon Glow','abt-neon','abt-neon-anim','#1a1a2e','#0d1117',100),
            ('Ember Fire','abt-ember','abt-ember-anim','#fbbf24','#92400e',150),
            ('Ice Crystal','abt-ice','abt-ice-anim','#dbeafe','#1e40af',150),
            ('Toxic Slime','abt-toxic','abt-toxic-anim','#4ade80','#14532d',200),
            ('Lava Flow','abt-lava','abt-lava-anim','#f97316','#450a0a',250),
            ('Galaxy','abt-galaxy','abt-galaxy-anim','#c084fc','#1e1b4b',300)`);
    }

    console.log('New features migration complete!');
    pool.end();
}

migrate().catch(e => { console.error('Migration error:', e); pool.end(); });
