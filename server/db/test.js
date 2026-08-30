const { pool } = require('./connection');

async function testConnection() {
    try {
        // Test connection
        const result = await pool.query('SELECT NOW() as current_time');
        console.log('✅ Database connected!');
        console.log('📅 Current time:', result.rows[0].current_time);

        // Check tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📊 Tables in database:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });

        // Check account count
        const count = await pool.query('SELECT COUNT(*) as count FROM accounts');
        console.log(`\n👤 Total accounts: ${count.rows[0].count}`);

        console.log('\n✅ All tests passed! Database is ready.');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n⚠️  Troubleshooting:');
        console.log('1. Check if PostgreSQL is running');
        console.log('2. Verify database credentials in .env');
        console.log('3. Confirm database "mychessgame_db" exists');
        console.log('4. Check if the schema was properly applied');
    } finally {
        pool.end();
    }
}

testConnection();