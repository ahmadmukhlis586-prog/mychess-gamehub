const { pool } = require('./connection');

// ============================================
// ACCOUNT HELPERS
// ============================================

async function findAccountByEmail(email) {
    try {
        const result = await pool.query(
            'SELECT * FROM accounts WHERE email = $1',
            [email.toLowerCase()]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('findAccountByEmail error:', error);
        throw error;
    }
}

async function findAccountByUsername(username) {
    try {
        const result = await pool.query(
            'SELECT * FROM accounts WHERE username = $1',
            [username]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('findAccountByUsername error:', error);
        throw error;
    }
}

async function findAccountById(id) {
    try {
        const result = await pool.query(
            'SELECT * FROM accounts WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('findAccountById error:', error);
        throw error;
    }
}

async function createAccount({ id, username, email, passwordHash, passwordSalt }) {
    try {
        const result = await pool.query(
            `INSERT INTO accounts (id, username, email, password_hash, password_salt)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, username, email, elo, games, wins, draws, losses, created_at`,
            [id, username, email.toLowerCase(), passwordHash, passwordSalt]
        );
        return result.rows[0];
    } catch (error) {
        console.error('createAccount error:', error);
        throw error;
    }
}

async function updateAccountStats(accountId, result) {
    try {
        let updateQuery = '';
        let params = [];

        if (result === 'win') {
            updateQuery = `
                UPDATE accounts 
                SET elo = elo + 10, 
                    games = games + 1, 
                    wins = wins + 1
                WHERE id = $1
                RETURNING id, username, email, elo, games, wins, draws, losses, created_at
            `;
            params = [accountId];
        } else if (result === 'loss') {
            updateQuery = `
                UPDATE accounts 
                SET elo = GREATEST(0, elo - 5), 
                    games = games + 1, 
                    losses = losses + 1
                WHERE id = $1
                RETURNING id, username, email, elo, games, wins, draws, losses, created_at
            `;
            params = [accountId];
        } else if (result === 'draw') {
            updateQuery = `
                UPDATE accounts 
                SET elo = elo + 3, 
                    games = games + 1, 
                    draws = draws + 1
                WHERE id = $1
                RETURNING id, username, email, elo, games, wins, draws, losses, created_at
            `;
            params = [accountId];
        }

        if (updateQuery) {
            const result = await pool.query(updateQuery, params);
            return result.rows[0] || null;
        }
        return null;
    } catch (error) {
        console.error('updateAccountStats error:', error);
        throw error;
    }
}

// ============================================
// SESSION HELPERS
// ============================================

async function createSession(token, accountId) {
    try {
        const result = await pool.query(
            `INSERT INTO sessions (token, account_id)
             VALUES ($1, $2)
             RETURNING *`,
            [token, accountId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('createSession error:', error);
        throw error;
    }
}

async function findSessionByToken(token) {
    try {
        const result = await pool.query(
            `SELECT s.*, a.id as account_id, a.username, a.email, a.role, a.elo, a.games, a.wins, a.draws, a.losses
             FROM sessions s 
             JOIN accounts a ON s.account_id = a.id 
             WHERE s.token = $1 AND s.expires_at > CURRENT_TIMESTAMP`,
            [token]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('findSessionByToken error:', error);
        throw error;
    }
}

async function deleteSession(token) {
    try {
        await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
        return true;
    } catch (error) {
        console.error('deleteSession error:', error);
        throw error;
    }
}

async function cleanupExpiredSessions() {
    try {
        const result = await pool.query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
        return result.rowCount;
    } catch (error) {
        console.error('cleanupExpiredSessions error:', error);
        throw error;
    }
}

// ============================================
// GAME HELPERS
// ============================================

async function saveGame(gameRecord) {
    try {
        const result = await pool.query(
            `INSERT INTO games (
                id, room_id, white_player_id, black_player_id,
                white_username, black_username, moves, result,
                result_type, winner, started_at, finished_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                gameRecord.id,
                gameRecord.roomId,
                gameRecord.white.playerId,
                gameRecord.black.playerId,
                gameRecord.white.username,
                gameRecord.black.username,
                JSON.stringify(gameRecord.moves),
                gameRecord.result,
                gameRecord.resultType,
                gameRecord.winner,
                gameRecord.startedAt,
                gameRecord.finishedAt
            ]
        );
        return result.rows[0];
    } catch (error) {
        console.error('saveGame error:', error);
        throw error;
    }
}

async function getGameHistory(accountId, limit = 50) {
    try {
        const result = await pool.query(
            `SELECT * FROM games 
             WHERE white_player_id = $1 OR black_player_id = $1
             ORDER BY finished_at DESC
             LIMIT $2`,
            [accountId, limit]
        );
        return result.rows;
    } catch (error) {
        console.error('getGameHistory error:', error);
        throw error;
    }
}

async function getGameByRoomId(roomId) {
    try {
        const result = await pool.query(
            'SELECT * FROM games WHERE room_id = $1 ORDER BY finished_at DESC LIMIT 1',
            [roomId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getGameByRoomId error:', error);
        throw error;
    }
}

// ============================================
// STATISTICS HELPERS
// ============================================

async function getLeaderboard(limit = 10) {
    try {
        const result = await pool.query(
            `SELECT username, elo, games, wins, draws, losses
             FROM accounts
             ORDER BY elo DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('getLeaderboard error:', error);
        throw error;
    }
}

async function getTotalPlayerCount() {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM accounts');
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error('getTotalPlayerCount error:', error);
        throw error;
    }
}

async function getTotalGamesPlayed() {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM games');
        return parseInt(result.rows[0].count);
    } catch (error) {
        console.error('getTotalGamesPlayed error:', error);
        throw error;
    }
}

// ============================================
// CURRENCY HELPERS (ELO BASED)
// ============================================

async function getUserElo(accountId) {
    const result = await pool.query(
        `SELECT elo FROM accounts WHERE id = $1`,
        [accountId]
    );
    return result.rows[0] || { elo: 0 };
}

async function spendElo(accountId, amount) {
    const result = await pool.query(
        `UPDATE accounts SET elo = elo - $1 WHERE id = $2 AND elo >= $1 RETURNING elo`,
        [amount, accountId]
    );
    return result.rows[0] || null;
}

async function addElo(accountId, amount) {
    await pool.query(
        `UPDATE accounts SET elo = elo + $1 WHERE id = $2`,
        [amount, accountId]
    );
}

// ============================================
// SHOP HELPERS
// ============================================

async function getShopItems(category = null) {
    let query = 'SELECT * FROM shop_items';
    const params = [];

    if (category && category !== 'all') {
        query += ' WHERE category = $1';
        params.push(category);
    }

    query += ' ORDER BY price ASC';

    try {
        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error fetching shop items:', error);
        return [];
    }
}

async function getShopItem(itemId) {
    try {
        const result = await pool.query(
            'SELECT * FROM shop_items WHERE id = $1',
            [itemId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getShopItem error:', error);
        throw error;
    }
}

async function addToInventory(accountId, itemId) {
    try {
        const result = await pool.query(
            `INSERT INTO user_inventory (account_id, item_id)
             VALUES ($1, $2)
             RETURNING *`,
            [accountId, itemId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('addToInventory error:', error);
        throw error;
    }
}

async function getUserInventory(accountId) {
    try {
        const result = await pool.query(
            `SELECT ui.*, si.*, ui.id as inventory_id
             FROM user_inventory ui
             JOIN shop_items si ON ui.item_id = si.id
             WHERE ui.account_id = $1
             ORDER BY si.category, si.price`,
            [accountId]
        );
        return result.rows;
    } catch (error) {
        console.error('getUserInventory error:', error);
        throw error;
    }
}

async function equipItem(accountId, inventoryId) {
    try {
        // 1. Find the item in inventory by trying the actual inventory 'id' OR the 'item_id'
        const item = await pool.query(
            `SELECT * FROM user_inventory WHERE (id = $1 OR item_id = $1) AND account_id = $2`,
            [inventoryId, accountId]
        );

        if (item.rows.length === 0) {
            throw new Error('Item not found in inventory');
        }

        // Get the actual inventory primary key (id)
        const actualId = item.rows[0].id;

        // 2. Verify the linked shop item actually exists
        const shopItem = await getShopItem(item.rows[0].item_id);
        if (!shopItem) {
            throw new Error('The item associated with this inventory entry does not exist');
        }

        // 3. Disable all other equipped items in this category
        await pool.query(
            `UPDATE user_inventory SET is_equipped = FALSE 
             WHERE account_id = $1 AND item_id IN (
                SELECT id FROM shop_items WHERE category = $2
             )`,
            [accountId, shopItem.category]
        );

        // 4. Equip this specific item
        await pool.query(
            `UPDATE user_inventory SET is_equipped = TRUE WHERE id = $1`,
            [actualId]
        );

        return { success: true, item: shopItem };
    } catch (error) {
        console.error('equipItem error:', error);
        throw error;
    }
}

// ============================================
// RESET EQUIPPED ITEMS
// ============================================

async function resetEquippedItems(accountId) {
    try {
        const result = await pool.query(
            `UPDATE user_inventory SET is_equipped = FALSE WHERE account_id = $1`,
            [accountId]
        );
        return result.rowCount;
    } catch (error) {
        console.error('resetEquippedItems error:', error);
        throw error;
    }
}

// ============================================
// QUEST HELPERS
// ============================================

async function getQuests() {
    const result = await pool.query('SELECT * FROM quests ORDER BY id ASC');
    return result.rows;
}

async function getUserQuests(userId) {
    const result = await pool.query(`
        SELECT q.*, uq.progress, uq.completed, uq.claimed
        FROM quests q
        LEFT JOIN user_quests uq ON q.id = uq.quest_id AND uq.user_id = $1
        ORDER BY q.id ASC
    `, [userId]);
    return result.rows;
}

async function updateQuestProgress(userId, questType, progressAmount) {
    const quest = await pool.query('SELECT * FROM quests WHERE quest_type = $1', [questType]);
    if (quest.rows.length === 0) return;

    const questId = quest.rows[0].id;
    const goal = quest.rows[0].goal;

    const existing = await pool.query(
        'SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2',
        [userId, questId]
    );

    if (existing.rows.length === 0) {
        await pool.query(
            `INSERT INTO user_quests (user_id, quest_id, progress)
             VALUES ($1, $2, $3)`,
            [userId, questId, progressAmount]
        );
    } else {
        const currentProgress = existing.rows[0].progress;
        const newProgress = Math.min(currentProgress + progressAmount, goal);
        const isCompleted = newProgress >= goal;

        await pool.query(
            `UPDATE user_quests 
             SET progress = $1, completed = $2, updated_at = NOW()
             WHERE user_id = $3 AND quest_id = $4`,
            [newProgress, isCompleted, userId, questId]
        );
    }
}

async function claimQuestReward(userId, questId) {
    const quest = await pool.query('SELECT * FROM quests WHERE id = $1', [questId]);
    if (quest.rows.length === 0) throw new Error('Quest not found');
    
    const reward = quest.rows[0].reward_elo;

    const userQuest = await pool.query(
        'SELECT * FROM user_quests WHERE user_id = $1 AND quest_id = $2',
        [userId, questId]
    );

    if (userQuest.rows.length === 0) throw new Error('Quest not started');
    if (!userQuest.rows[0].completed) throw new Error('Quest not completed');
    if (userQuest.rows[0].claimed) throw new Error('Reward already claimed');

    await pool.query(
        `UPDATE accounts SET elo = elo + $1 WHERE id = $2`,
        [reward, userId]
    );

    await pool.query(
        `UPDATE user_quests SET claimed = TRUE WHERE user_id = $1 AND quest_id = $2`,
        [userId, questId]
    );

    return { reward };
}

// ============================================
// NOTIFICATION HELPERS
// ============================================

async function createNotification(accountId, type, title, message, data = null) {
    try {
        const result = await pool.query(
            `INSERT INTO player_notifications (account_id, type, title, message, data)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [accountId, type, title, message, data ? JSON.stringify(data) : null]
        );
        return result.rows[0];
    } catch (error) {
        console.error('createNotification error:', error);
        throw error;
    }
}

async function getNotifications(accountId, limit = 20) {
    try {
        const result = await pool.query(
            `SELECT * FROM player_notifications WHERE account_id = $1
             ORDER BY created_at DESC LIMIT $2`,
            [accountId, limit]
        );
        return result.rows;
    } catch (error) {
        console.error('getNotifications error:', error);
        throw error;
    }
}

async function markNotificationRead(id, accountId) {
    try {
        await pool.query(
            `UPDATE player_notifications SET is_read = TRUE WHERE id = $1 AND account_id = $2`,
            [id, accountId]
        );
        return true;
    } catch (error) {
        console.error('markNotificationRead error:', error);
        throw error;
    }
}

async function markAllNotificationsRead(accountId) {
    try {
        await pool.query(
            `UPDATE player_notifications SET is_read = TRUE WHERE account_id = $1 AND is_read = FALSE`,
            [accountId]
        );
        return true;
    } catch (error) {
        console.error('markAllNotificationsRead error:', error);
        throw error;
    }
}

async function getUnreadCount(accountId) {
    try {
        const result = await pool.query(
            `SELECT COUNT(*) as count FROM player_notifications WHERE account_id = $1 AND is_read = FALSE`,
            [accountId]
        );
        return parseInt(result.rows[0].count) || 0;
    } catch (error) {
        console.error('getUnreadCount error:', error);
        return 0;
    }
}

// ============================================
// ACHIEVEMENT HELPERS
// ============================================

async function getAllAchievements() {
    try {
        const result = await pool.query(`SELECT * FROM achievements ORDER BY category, requirement_value`);
        return result.rows;
    } catch (error) {
        console.error('getAllAchievements error:', error);
        throw error;
    }
}

async function getUserAchievements(accountId) {
    try {
        const result = await pool.query(
            `SELECT a.*, ua.unlocked_at, ua.claimed
             FROM achievements a
             LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.account_id = $1
             ORDER BY a.category, a.requirement_value`,
            [accountId]
        );
        return result.rows;
    } catch (error) {
        console.error('getUserAchievements error:', error);
        throw error;
    }
}

async function unlockAchievement(accountId, achievementId) {
    try {
        await pool.query(
            `INSERT INTO user_achievements (account_id, achievement_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [accountId, achievementId]
        );
        return true;
    } catch (error) {
        console.error('unlockAchievement error:', error);
        throw error;
    }
}

async function claimAchievementReward(accountId, achievementId) {
    try {
        const result = await pool.query(
            `UPDATE user_achievements SET claimed = TRUE
             WHERE account_id = $1 AND achievement_id = $2 AND claimed = FALSE
             RETURNING *`,
            [accountId, achievementId]
        );
        if (result.rows.length === 0) return null;

        const achResult = await pool.query(
            `SELECT elo_reward FROM achievements WHERE id = $1`, [achievementId]
        );
        const elo = achResult.rows[0]?.elo_reward || 0;

        if (elo > 0) {
            await pool.query(
                `UPDATE accounts SET elo = elo + $1 WHERE id = $2`,
                [elo, accountId]
            );
        }
        return { elo };
    } catch (error) {
        console.error('claimAchievementReward error:', error);
        throw error;
    }
}

// ============================================
// STREAK HELPERS (uses user_currency table)
// ============================================

async function getStreakInfo(accountId) {
    try {
        const result = await pool.query(
            `SELECT login_streak, last_daily_login, gems
             FROM user_currency WHERE account_id = $1`,
            [accountId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getStreakInfo error:', error);
        throw error;
    }
}

async function updateStreak(accountId) {
    try {
        const info = await getStreakInfo(accountId);
        if (!info) return { claimed: false, streak: 0 };

        const now = new Date();
        const last = info.last_daily_login ? new Date(info.last_daily_login) : null;
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let streak = info.login_streak || 0;

        if (last) {
            const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
            const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) return { claimed: false, streak, gems: info.gems };
            if (diffDays === 1) streak += 1;
            else streak = 1;
        } else {
            streak = 1;
        }

        const reward = Math.min(streak * 5, 50);
        await pool.query(
            `UPDATE user_currency SET login_streak = $1, last_daily_login = NOW(), gems = gems + $2 WHERE account_id = $3`,
            [streak, reward, accountId]
        );
        return { claimed: true, streak, reward, gems: (info.gems || 0) + reward };
    } catch (error) {
        console.error('updateStreak error:', error);
        throw error;
    }
}

// ============================================
// PROFILE HELPERS
// ============================================

async function getPublicProfile(accountId) {
    try {
        const result = await pool.query(
            `SELECT id, username, elo, games, wins, draws, losses, created_at
             FROM accounts WHERE id = $1`,
            [accountId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getPublicProfile error:', error);
        throw error;
    }
}

async function getMatchTimeline(accountId, limit = 20) {
    try {
        const result = await pool.query(
            `SELECT * FROM games
             WHERE white_player_id = $1 OR black_player_id = $1
             ORDER BY finished_at DESC LIMIT $2`,
            [accountId, limit]
        );
        return result.rows;
    } catch (error) {
        console.error('getMatchTimeline error:', error);
        throw error;
    }
}

// ============================================
// THEME HELPERS (ADDITIVE)
// Returns the theme the account currently has equipped for their public profile
// and for the animated board, since Profiles/Themes tab system is separate from
// the shop_items based "Items" board system.
// ============================================

async function getEquippedProfileTheme(accountId) {
    try {
        const result = await pool.query(
            `SELECT pt.* FROM profile_themes pt
             JOIN user_profile_theme up ON up.theme_id = pt.id
             WHERE up.account_id = $1`,
            [accountId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getEquippedProfileTheme error:', error);
        return null;
    }
}

async function getEquippedBoardTheme(accountId) {
    try {
        const result = await pool.query(
            `SELECT bt.* FROM animated_board_themes bt
             JOIN user_board_theme ub ON ub.board_theme_id = bt.id
             WHERE ub.account_id = $1`,
            [accountId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getEquippedBoardTheme error:', error);
        return null;
    }
}

// ============================================
// DAILY PUZZLE HELPERS
// ============================================

async function getTodayPuzzle() {
    try {
        const result = await pool.query(
            `SELECT * FROM daily_puzzles
             WHERE puzzle_date = CURRENT_DATE
             ORDER BY id DESC LIMIT 1`
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getTodayPuzzle error:', error);
        throw error;
    }
}

async function getPuzzleAttempt(accountId, puzzleId) {
    try {
        const result = await pool.query(
            `SELECT * FROM puzzle_attempts
             WHERE account_id = $1 AND puzzle_id = $2`,
            [accountId, puzzleId]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('getPuzzleAttempt error:', error);
        throw error;
    }
}

async function recordPuzzleAttempt(accountId, puzzleId, solved) {
    try {
        const existing = await getPuzzleAttempt(accountId, puzzleId);
        if (existing) {
            if (existing.solved) return existing;
            const newAttempts = existing.attempts + 1;
            const result = await pool.query(
                `UPDATE puzzle_attempts
                 SET attempts = $1, solved = $2, solved_at = CASE WHEN $2 THEN NOW() ELSE NULL END
                 WHERE account_id = $3 AND puzzle_id = $4
                 RETURNING *`,
                [newAttempts, solved, accountId, puzzleId]
            );
            return result.rows[0];
        } else {
            const result = await pool.query(
                `INSERT INTO puzzle_attempts (account_id, puzzle_id, solved, attempts, solved_at)
                 VALUES ($1, $2, $3, 1, CASE WHEN $3 THEN NOW() ELSE NULL END)
                 RETURNING *`,
                [accountId, puzzleId, solved]
            );
            return result.rows[0];
        }
    } catch (error) {
        console.error('recordPuzzleAttempt error:', error);
        throw error;
    }
}

// ============================================
// RECENT MATCHES FEED
// ============================================

async function getRecentMatches(limit = 10) {
    try {
        const result = await pool.query(
            `SELECT id, white_username, black_username, winner, result, result_type, finished_at
             FROM games
             WHERE finished_at IS NOT NULL
             ORDER BY finished_at DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    } catch (error) {
        console.error('getRecentMatches error:', error);
        throw error;
    }
}

// ============================================
// GAME STATS
// ============================================

async function getGameStats() {
    try {
        const [totalGames, totalPlayers, todayGames, avgElo] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM games WHERE finished_at IS NOT NULL'),
            pool.query('SELECT COUNT(*)::int AS count FROM accounts'),
            pool.query(`SELECT COUNT(*)::int AS count FROM games WHERE finished_at >= CURRENT_DATE`),
            pool.query('SELECT COALESCE(AVG(elo), 0)::int AS avg FROM accounts WHERE games > 0'),
        ]);
        return {
            totalGames: totalGames.rows[0].count,
            totalPlayers: totalPlayers.rows[0].count,
            todayGames: todayGames.rows[0].count,
            avgElo: avgElo.rows[0].avg,
        };
    } catch (error) {
        console.error('getGameStats error:', error);
        throw error;
    }
}

module.exports = {
    // ... existing exports
    getQuests,
    getUserQuests,
    updateQuestProgress,
    claimQuestReward,
};

// ============================================
// CHESS QUIZ HELPERS
// ============================================

async function getQuizQuestions() {
    try {
        const result = await pool.query(
            'SELECT id, question, option_a, option_b, option_c, option_d, correct_option FROM chess_quiz_questions ORDER BY RANDOM()'
        );
        return result.rows;
    } catch (error) {
        console.error('getQuizQuestions error:', error);
        throw error;
    }
}

async function checkQuizAnswer(questionId, answer) {
    try {
        const result = await pool.query(
            'SELECT correct_option FROM chess_quiz_questions WHERE id = $1',
            [questionId]
        );
        if (result.rows.length === 0) return null;
        const correct = result.rows[0].correct_option === answer;
        return { correct, correctAnswer: result.rows[0].correct_option };
    } catch (error) {
        console.error('checkQuizAnswer error:', error);
        throw error;
    }
}

// ============================================
// ✅ SINGLE EXPORT - ALL FUNCTIONS
// ============================================

module.exports = {
    // Account helpers
    findAccountByEmail,
    findAccountByUsername,
    findAccountById,
    createAccount,
    updateAccountStats,
    
    // Session helpers
    createSession,
    findSessionByToken,
    deleteSession,
    cleanupExpiredSessions,
    
    // Game helpers
    saveGame,
    getGameHistory,
    getGameByRoomId,
    
    // Statistics helpers
    getLeaderboard,
    getTotalPlayerCount,
    getTotalGamesPlayed,
    
    // Currency helpers
    getUserElo,
    spendElo,
    addElo,

    // Quest helpers
    getQuests,
    getUserQuests,
    updateQuestProgress,
    claimQuestReward,
    
    // Shop helpers
    getShopItems,
    getShopItem,
    addToInventory,
    getUserInventory,
    equipItem,
    resetEquippedItems,

    // Notification helpers
    createNotification,
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    getUnreadCount,

    // Achievement helpers
    getAllAchievements,
    getUserAchievements,
    unlockAchievement,
    claimAchievementReward,

    // Streak helpers
    getStreakInfo,
    updateStreak,

    // Profile helpers
    getPublicProfile,
    getMatchTimeline,

    // Theme helpers (additive)
    getEquippedProfileTheme,
    getEquippedBoardTheme,

    // Daily Puzzle helpers
    getTodayPuzzle,
    getPuzzleAttempt,
    recordPuzzleAttempt,

    // Recent Matches Feed
    getRecentMatches,

    // Game Stats
    getGameStats,

    // Chess Quiz
    getQuizQuestions,
    checkQuizAnswer,
};