const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const config = require('../config');
const { query, sql } = require('../db/pool');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const SALT_ROUNDS = 12;

// ── Zod schemas ───────────────────────────────────────────
const registerSchema = z.object({
  name:     z.string().min(1).max(200),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  phone:    z.string().max(30).optional(),
  language: z.enum(['en', 'ar']).default('en'),
  player: z.object({
    name:     z.string().min(1).max(200),
    ageGroup: z.string().max(20).optional(),
  }).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ── POST /api/auth/register ───────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, language, player } = req.body;

  // duplicate check
  const dup = await query(
    'SELECT 1 FROM dbo.Users WHERE email = @email',
    { email: { type: sql.NVarChar(255), value: email } }
  );
  if (dup.recordset.length) throw new AppError('Email already registered', 409);

  const userId = crypto.randomUUID();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  await query(
    `INSERT INTO dbo.Users (id, name, email, phone, passwordHash, language)
     VALUES (@id, @name, @email, @phone, @hash, @lang)`,
    {
      id:    { type: sql.UniqueIdentifier, value: userId },
      name:  { type: sql.NVarChar(200),    value: name },
      email: { type: sql.NVarChar(255),    value: email },
      phone: { type: sql.NVarChar(30),     value: phone || null },
      hash:  { type: sql.NVarChar(255),    value: hash },
      lang:  { type: sql.NVarChar(5),      value: language },
    }
  );

  // Assign PARENT role
  await query(
    `INSERT INTO dbo.UserRoles (userId, role) VALUES (@uid, 'PARENT')`,
    { uid: { type: sql.UniqueIdentifier, value: userId } }
  );

  // Optionally create the first player
  if (player) {
    const playerId = crypto.randomUUID();
    await query(
      `INSERT INTO dbo.Players (id, parentId, name, ageGroup)
       VALUES (@pid, @uid, @pname, @ag)`,
      {
        pid:   { type: sql.UniqueIdentifier, value: playerId },
        uid:   { type: sql.UniqueIdentifier, value: userId },
        pname: { type: sql.NVarChar(200),    value: player.name },
        ag:    { type: sql.NVarChar(20),     value: player.ageGroup || null },
      }
    );
  }

  const token = jwt.sign(
    { id: userId, email, roles: ['PARENT'] },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.status(201).json({ success: true, data: { userId, token } });
});

// ── POST /api/auth/login ──────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    'SELECT id, email, passwordHash FROM dbo.Users WHERE email = @email',
    { email: { type: sql.NVarChar(255), value: email } }
  );
  if (!result.recordset.length) throw new AppError('Invalid email or password', 401);

  const user = result.recordset[0];
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('Invalid email or password', 401);

  const rolesRes = await query(
    'SELECT role FROM dbo.UserRoles WHERE userId = @uid',
    { uid: { type: sql.UniqueIdentifier, value: user.id } }
  );
  const roles = rolesRes.recordset.map((r) => r.role);

  const token = jwt.sign(
    { id: user.id, email: user.email, roles },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  res.json({ success: true, data: { userId: user.id, token, roles } });
});

module.exports = { register, login, registerSchema, loginSchema };
