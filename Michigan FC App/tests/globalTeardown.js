module.exports = async function globalTeardown() {
  try {
    const { closePool } = require('../src/db/pool');
    await closePool();
  } catch {
    // pool may not have been opened
  }
};
