const { Pool } = require('pg');
const pool = new Pool({
  user: 'minecraft',
  host: 'localhost',
  database: 'minecraft_db',
  password: 'minecraft_secret',
  port: 5433,
});

async function run() {
  const { rows: currencies } = await pool.query('SELECT * FROM currency');
  for (const cur of currencies) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // find oldest in last 24h
    let res = await pool.query(`SELECT rate FROM currency_rate_history WHERE "currencyId" = $1 AND "createdAt" >= $2 ORDER BY "createdAt" ASC LIMIT 1`, [cur.id, oneDayAgo]);
    
    if (res.rows.length === 0) {
      res = await pool.query(`SELECT rate FROM currency_rate_history WHERE "currencyId" = $1 ORDER BY "createdAt" DESC LIMIT 1`, [cur.id]);
    }
    
    let baseRate = res.rows.length > 0 ? res.rows[0].rate : cur.exchangeRate;
    let rateChange24h = 0;
    if (baseRate > 0) {
      rateChange24h = Number((((cur.exchangeRate - baseRate) / baseRate) * 100).toFixed(2));
    }
    
    await pool.query(`UPDATE currency SET "rateChange24h" = $1 WHERE id = $2`, [rateChange24h, cur.id]);
    console.log(`Updated currency ${cur.code}: baseRate=${baseRate}, current=${cur.exchangeRate}, change=${rateChange24h}%`);
  }
  await pool.end();
}
run().catch(console.error);
