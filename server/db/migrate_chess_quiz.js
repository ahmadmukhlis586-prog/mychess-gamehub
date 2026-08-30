const { pool } = require('./connection');

async function migrate() {
    console.log('Creating chess_quiz_questions table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chess_quiz_questions (
            id SERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
            category TEXT DEFAULT 'general'
        )
    `);

    console.log('Seeding 20 chess quiz questions...');
    const questions = [
        { q: 'How many squares are on a standard chess board?', a: '32', b: '48', c: '64', d: '100', ans: 'c' },
        { q: 'How many pawns does each player start with?', a: '6', b: '7', c: '8', d: '10', ans: 'c' },
        { q: 'Which piece can only move diagonally?', a: 'Rook', b: 'Bishop', c: 'Knight', d: 'Queen', ans: 'b' },
        { q: 'Which is the only piece that can jump over others?', a: 'Bishop', b: 'Queen', c: 'Knight', d: 'Rook', ans: 'c' },
        { q: 'How many points is a Queen typically worth?', a: '5', b: '7', c: '9', d: '12', ans: 'c' },
        { q: 'What is it called when the King is under direct attack?', a: 'Check', b: 'Checkmate', c: 'Stalemate', d: 'Blockade', ans: 'a' },
        { q: 'What special move involves the King and a Rook?', a: 'Promotion', b: 'En passant', c: 'Castling', d: 'Sacrifice', ans: 'c' },
        { q: 'What is it called when the King is in check with no escape?', a: 'Stalemate', b: 'Draw', c: 'Checkmate', d: 'Fork', ans: 'c' },
        { q: 'Which piece is worth the least in point value?', a: 'Knight', b: 'Bishop', c: 'Pawn', d: 'Rook', ans: 'c' },
        { q: 'Where does the white Queen start on the board?', a: 'd1', b: 'e1', c: 'd8', d: 'e8', ans: 'a' },
        { q: 'What is "en passant"?', a: 'A type of checkmate', b: 'A special pawn capture', c: 'A castling variant', d: 'An opening trap', ans: 'b' },
        { q: 'What is a stalemate?', a: 'The King is checkmated', b: 'No legal move and King is NOT in check', c: 'Threefold repetition', d: '50-move rule', ans: 'b' },
        { q: 'What happens when a pawn reaches the opposite end?', a: 'It stays there', b: 'It is removed', c: 'It promotes to another piece', d: 'It becomes a King', ans: 'c' },
        { q: 'How many legal opening moves does White have?', a: '16', b: '20', c: '24', d: '32', ans: 'b' },
        { q: 'What is "Scholar\'s Mate"?', a: 'A 4-move checkmate pattern', b: 'A 2-move checkmate', c: 'A stalemate trap', d: 'An opening gambit', ans: 'a' },
        { q: 'Which opening starts with 1.e4 e5 2.Nf3 Nc6 3.Bb5?', a: 'Sicilian Defense', b: 'French Defense', c: 'Ruy Lopez', d: 'Italian Game', ans: 'c' },
        { q: 'What does "O-O" mean in algebraic notation?', a: 'Queenside castling', b: 'Kingside castling', c: 'En passant', d: 'Promotion', ans: 'b' },
        { q: 'How many squares can a King move from the center?', a: '4', b: '6', c: '8', d: '10', ans: 'c' },
        { q: 'What is "Zugzwang"?', a: 'A forced checkmate', b: 'A position where any move worsens your position', c: 'A type of opening', d: 'A draw condition', ans: 'b' },
        { q: 'How many times must a position repeat to claim a draw?', a: '2', b: '3', c: '4', d: '5', ans: 'b' },
    ];

    const existing = await pool.query('SELECT COUNT(*) FROM chess_quiz_questions');
    if (parseInt(existing.rows[0].count) >= 20) {
        console.log('Questions already seeded, skipping.');
        pool.end();
        return;
    }

    await pool.query('DELETE FROM chess_quiz_questions');
    for (const q of questions) {
        await pool.query(
            'INSERT INTO chess_quiz_questions (question, option_a, option_b, option_c, option_d, correct_option) VALUES ($1,$2,$3,$4,$5,$6)',
            [q.q, q.a, q.b, q.c, q.d, q.ans]
        );
    }
    console.log('Seeded 20 chess quiz questions successfully!');
    pool.end();
}

migrate().catch(e => { console.error('Migration error:', e); pool.end(); });
