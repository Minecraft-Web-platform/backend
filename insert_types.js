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
  try {
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    console.log(res.rows.map(r => r.tablename));
    
    // Check if city_types exists and we should rename it to settlement_types
    if (res.rows.find(r => r.tablename === 'city_types') && !res.rows.find(r => r.tablename === 'settlement_types')) {
        console.log("Renaming city_types to settlement_types");
        await client.query("ALTER TABLE city_types RENAME TO settlement_types");
    }

    const typesRes = await client.query('SELECT * FROM settlement_types');
    if (typesRes.rows.length === 0) {
      await client.query("INSERT INTO settlement_types (id, name, \"isApproved\") VALUES (gen_random_uuid(), 'Деревня', true)");
      await client.query("INSERT INTO settlement_types (id, name, \"isApproved\") VALUES (gen_random_uuid(), 'Село', true)");
      await client.query("INSERT INTO settlement_types (id, name, \"isApproved\") VALUES (gen_random_uuid(), 'Поселок', true)");
      console.log('Inserted default types');
    } else {
      console.log('Types already exist:', typesRes.rows);
    }
  } catch (e) {
    console.error(e);
  }
  await client.end();
}
run();
