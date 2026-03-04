// Re-export pool utilities so controllers can  require('../db/queries')
// and get query + sql + closePool in one import.
const { query, sql, closePool, getPool } = require('./pool');

module.exports = { query, sql, closePool, getPool };
