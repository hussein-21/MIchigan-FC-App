/**
 * Shared test helpers for Jest + Supertest.
 *
 * IMPORTANT: These tests run against a REAL Azure SQL test database.
 * Set DB_NAME_TEST in your .env and run sql/schema.sql against it first.
 */
process.env.NODE_ENV = 'test';

const crypto = require('crypto');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('../src/config');
const app = require('../src/app');
const { query, sql, closePool } = require('../src/db/pool');

const request = supertest;

/** 12-char hex string for unique test identifiers */
function uid() {
  return crypto.randomBytes(6).toString('hex');
}

/** Sign a JWT with the app's secret */
function signToken(payload) {
  return jwt.sign(
    { id: payload.id, email: payload.email, roles: payload.roles },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

/**
 * Insert a real user + roles into the test DB and return { userId, email, token }.
 * This satisfies FK constraints that reference dbo.Users(id).
 */
async function createTestUser(opts = {}) {
  const roles = opts.roles || ['PARENT'];
  const language = opts.language || 'en';
  const userId = crypto.randomUUID();
  const email = `t_${uid()}@test.michiganfc`;
  const hash = await bcrypt.hash('TestPass1!', 4); // low cost for speed

  await query(
    `INSERT INTO dbo.Users (id, name, email, passwordHash, language)
     VALUES (@id, @name, @email, @hash, @lang)`,
    {
      id:    { type: sql.UniqueIdentifier, value: userId },
      name:  { type: sql.NVarChar(200),    value: 'Test User' },
      email: { type: sql.NVarChar(255),    value: email },
      hash:  { type: sql.NVarChar(255),    value: hash },
      lang:  { type: sql.NVarChar(5),      value: language },
    }
  );

  for (const role of roles) {
    await query(
      `INSERT INTO dbo.UserRoles (userId, role) VALUES (@uid, @role)`,
      {
        uid:  { type: sql.UniqueIdentifier, value: userId },
        role: { type: sql.NVarChar(20),     value: role },
      }
    );
  }

  const token = signToken({ id: userId, email, roles });
  return { userId, email, token };
}

/** Supertest agent that injects the Authorization header */
function authed(token) {
  return {
    get:    (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post:   (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put:    (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

module.exports = { app, request, signToken, authed, createTestUser, uid, closePool, query, sql };
