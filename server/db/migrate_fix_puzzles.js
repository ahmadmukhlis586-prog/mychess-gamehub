'use strict';

const { pool } = require('./connection');

async function migrate() {
    console.log('Running migration to fix daily_puzzle FENs...');

    try {
        // Delete all existing puzzles and re-seed with valid FENs
        await pool.query(`DELETE FROM puzzle_attempts`);
        await pool.query(`DELETE FROM daily_puzzles`);

        const today = new Date().toISOString().slice(0, 10);

        const puzzles = [
            // Puzzle 1 - Scholar's Mate (today)
            { date: today, fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', moves: ['e8f7'], diff: 'easy', desc: "Scholar's Mate completed! The queen delivers checkmate on f7.", hint: "The queen captures on f7 — the king has no escape.", elo: 10 },
            // Puzzle 2 - Back rank mate pattern
            { date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1', moves: ['e1e8'], diff: 'easy', desc: 'Back rank checkmate! The rook delivers the final blow.', hint: 'The rook goes to the back rank — the pawns block the king.', elo: 10 },
            // Puzzle 3 - Fork
            { date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), fen: 'r3k2r/ppp2ppp/2n1b3/3N4/8/8/PPP2PPP/R3K2R w KQkq - 0 1', moves: ['d5c7'], diff: 'medium', desc: 'Knight fork! The knight attacks both king and rook.', hint: 'The knight can fork the king on e8 and rook on a8.', elo: 15 },
            // Puzzle 4 - Pin and win
            { date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1', moves: ['f3g5'], diff: 'medium', desc: 'Pin the f7 pawn! The knight threatens a devastating attack.', hint: 'Ng5 targets the weak f7 square.', elo: 15 },
            // Puzzle 5 - Discovered attack
            { date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10), fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P4/PPP2PPP/RNBQK1NR w KQkq - 0 1', moves: ['d1g4'], diff: 'hard', desc: 'Queen swings to g4 — targeting g7 and the kingside.', hint: 'The queen on g4 puts pressure on the dark squares.', elo: 20 },
            // Puzzle 6 - Skewer
            { date: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), fen: '4k3/8/8/8/8/8/4R3/4K3 w - - 0 1', moves: ['e2e8'], diff: 'easy', desc: 'Rook skewer! Drive the king away and control the file.', hint: 'Check the king on the back rank.', elo: 10 },
        ];

        for (const p of puzzles) {
            await pool.query(`
                INSERT INTO daily_puzzles (puzzle_date, fen, solution_moves, difficulty, description, hint, reward_elo)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [p.date, p.fen, p.moves, p.diff, p.desc, p.hint, p.elo]);
        }

        console.log(`Seeded ${puzzles.length} daily puzzles with valid FENs`);
        console.log('FEN fix migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
}

migrate();
