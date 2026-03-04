const sql = require('mssql');
const config = require('../config');

let pool = null;

// ── GUID normalisation ───────────────────────────────────────
// mssql returns UNIQUEIDENTIFIER values in UPPERCASE.
// Our JWTs store user ids in lowercase (from crypto.randomUUID()).
// Without normalisation every  req.user.id === row.parentId  check fails.
const GUID_RE = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;

function normaliseRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'string' && GUID_RE.test(v) ? v.toLowerCase() : v;
  }
  return out;
}

function normaliseRecordset(rs) {
  if (!rs || !rs.length) return rs;
  return rs.map(normaliseRow);
}

// ── Pool management ──────────────────────────────────────────

async function getPool() {
  if (pool) return pool;

  if (!config.db.server) {
    throw new Error(
      '[DB] DB_SERVER is not set. Copy .env.example to .env and fill in your Azure SQL credentials.'
    );
  }

  const cfg = {
    server:   config.db.server,
    database: config.db.database,
    user:     config.db.user,
    password: config.db.password,
    port:     config.db.port,
    options:  config.db.options,
    pool:     config.db.pool,
  };

  pool = await new sql.ConnectionPool(cfg).connect();
  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
    pool = null;
  });
  return pool;
}

/**
 * Run a parameterised query.
 * @param {string} text  – SQL with @param placeholders
 * @param {Record<string, {type: any, value: any}>} params
 */
async function query(text, params = {}) {
  const p = await getPool();
  const req = p.request();
  for (const [name, { type, value }] of Object.entries(params)) {
    req.input(name, type, value);
  }
  const result = await req.query(text);
  result.recordset = normaliseRecordset(result.recordset);
  return result;
}

async function closePool() {
  if (pool) { await pool.close(); pool = null; }
}

module.exports = { getPool, query, closePool, sql };
