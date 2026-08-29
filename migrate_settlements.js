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
    await client.query("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'city'");
    await client.query("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS center_x INT DEFAULT 0");
    await client.query("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS center_z INT DEFAULT 0");
    await client.query("ALTER TABLE settlements ADD COLUMN IF NOT EXISTS rural_sub_type_id UUID");
    
    await client.query('UPDATE settlements SET status = \'capital\' WHERE "isCapital" = true');
    await client.query('UPDATE settlements SET status = \'city\' WHERE "isCapital" = false OR "isCapital" IS NULL');
    
    console.log('Migration completed');
  } catch (e) {
    console.error(e);
  }
  await client.end();
}
run();
