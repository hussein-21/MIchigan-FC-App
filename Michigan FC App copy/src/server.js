const app = require('./app');
const config = require('./config');
const { getPool } = require('./db/pool');
const { initFirebase } = require('./services/fcm.service');

async function start() {
  try {
    await getPool();
    console.log(`[DB] Connected to ${config.db.database} on ${config.db.server}`);
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    console.error('    → Check your .env file (DB_SERVER, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1);
  }

  initFirebase();

  app.listen(config.port, () => {
    console.log(`[Server] Michigan FC API running on :${config.port} (${config.nodeEnv})`);
  });
}

start();
