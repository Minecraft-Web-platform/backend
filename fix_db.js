const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5433,
  username: 'minecraft',
  password: 'minecraft_secret',
  database: 'minecraft_db',
});
ds.initialize().then(async () => {
  await ds.query('UPDATE territories SET "ownerType" = \'settlement\' WHERE "ownerType" = \'city\'');
  console.log("DB updated!");
  process.exit(0);
}).catch(console.error);
