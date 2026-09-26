const { Rcon } = require('rcon-client');

async function test() {
  const rcon = await Rcon.connect({
    host: 'localhost',
    port: 25984,
    password: 'amogus228'
  });
  const res = await rcon.send('list');
  console.log("RCON RESPONSE:", res);
  await rcon.end();
}
test().catch(console.error);
