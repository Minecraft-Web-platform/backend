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
  const res = await ds.query('SELECT * FROM territories');
  console.log(res);
  process.exit(0);
}).catch(console.error);
