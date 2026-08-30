'use strict';

const { pool } = require('./connection');

async function migrate() {
    console.log('Running migration for homepage features (puzzles, recent matches, stats)...');

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_puzzles (
                id SERIAL PRIMARY KEY,
                puzzle_date DATE NOT NULL UNIQUE,
                fen VARCHAR(200) NOT NULL,
                solution_moves TEXT[] NOT NULL,
                difficulty VARCHAR(20) DEFAULT 'medium',
                description TEXT,
                hint TEXT,
                reward_elo INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('daily_puzzles table ready');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS puzzle_attempts (
                id SERIAL PRIMARY KEY,
                account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
                puzzle_id INTEGER REFERENCES daily_puzzles(id) ON DELETE CASCADE,
                solved BOOLEAN DEFAULT FALSE,
                attempts INTEGER DEFAULT 0,
                solved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, puzzle_id)
            );
        `);
        console.log('puzzle_attempts table ready');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_account ON puzzle_attempts(account_id);
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_puzzle ON puzzle_attempts(puzzle_id);
        `);
        console.log('Puzzle indexes ready');

        const today = new Date().toISOString().slice(0, 10);
        const seedResult = await pool.query(
            `SELECT id FROM daily_puzzles WHERE puzzle_date = $1`,
            [today]
        );
        if (seedResult.rows.length === 0) {
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', ARRAY['h5f7'], 'easy', 'Scholar''s Mate! Find the winning checkmate.', 'The queen can deliver checkmate in one move.', 10)
            `, [today]);

            const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3', ARRAY['f3f7'], 'easy', 'Fool''s Mate pattern. White can checkmate immediately!', 'Look at the f7 square — it''s weak.', 10)
                ON CONFLICT (puzzle_date) DO NOTHING
            `, [yesterday]);

            const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ARRAY['d1b3', 'b3b7'], 'medium', 'White wins material with a fork on b7.', 'The queen attacks both rooks.', 15)
                ON CONFLICT (puzzle_date) DO NOTHING
            `, [twoDaysAgo]);

            const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r2qk2r/ppp2ppp/2n1bn2/3pp3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6', ARRAY['c4d5', 'd5e6'], 'hard', 'White wins a piece with a tactical sequence.', 'Capture the pawn, then fork king and queen.', 20)
                ON CONFLICT (puzzle_date) DO NOTHING
            `, [threeDaysAgo]);

            const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', ARRAY['f3g5'], 'medium', 'Pin the knight with a knight outpost.', 'The knight on g5 threatens f7.', 15)
                ON CONFLICT (puzzle_date) DO NOTHING
            `, [fourDaysAgo]);

            const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo) VALUES
                ($1, 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 3', ARRAY['b5c6', 'c6d7'], 'hard', 'Win material by forking the king and rook.', 'After capturing, the bishop forks two pieces.', 20)
                ON CONFLICT (puzzle_date) DO NOTHING
            `, [fiveDaysAgo]);

            console.log('Seeded 6 daily puzzles');
        }

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
