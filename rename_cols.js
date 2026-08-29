const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'minecraft',
  password: 'minecraft_secret',
  database: 'minecraft_db',
});
async function run() {
  await client.connect();
  const queries = [
    "ALTER TABLE users RENAME COLUMN city_id TO settlement_id;",
    "ALTER TABLE economy_companies RENAME COLUMN city_id TO settlement_id;",
    "ALTER TABLE territories RENAME COLUMN city_id TO settlement_id;",
    "ALTER TABLE citizenship_requests RENAME COLUMN city_id TO settlement_id;",
    "ALTER TABLE states RENAME COLUMN capital_city_id TO capital_settlement_id;"
  ];
  for (const q of queries) {
    try { await client.query(q); console.log('OK:', q); } catch(e) { console.error('ERR:', e.message); }
  }
  await client.end();
}
run();
