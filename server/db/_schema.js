const { Pool } = require('pg');
const remote = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
(async () => {
    const r = await remote.query("SELECT column_name FROM information_schema.columns WHERE table_name='accounts' ORDER BY ordinal_position");
    console.log('accounts columns:', r.rows.map(x=>x.column_name).join(', '));
    const s = await remote.query("SELECT column_name FROM information_schema.columns WHERE table_name='sessions' ORDER BY ordinal_position");
    console.log('sessions columns:', s.rows.map(x=>x.column_name).join(', '));
    const c = await remote.query("SELECT count(*) n FROM public.accounts");
    console.log('accounts count:', c.rows[0].n);
    process.exit(0);
})().catch(e=>{console.log('ERR',e.message);process.exit(1);});
