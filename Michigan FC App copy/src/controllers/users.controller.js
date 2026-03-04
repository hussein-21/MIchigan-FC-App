const { z } = require('zod');
const { query, sql } = require('../db/pool');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const updateUserSchema = z.object({
  name:     z.string().min(1).max(200).optional(),
  phone:    z.string().max(30).optional(),
  language: z.enum(['en', 'ar']).optional(),
});

// ── GET /api/users  (DIRECTOR) ────────────────────────────
const listUsers = asyncHandler(async (_req, res) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.language, u.createdAt,
            STRING_AGG(ur.role, ',') AS roles
     FROM dbo.Users u
     LEFT JOIN dbo.UserRoles ur ON ur.userId = u.id
     GROUP BY u.id, u.name, u.email, u.phone, u.language, u.createdAt
     ORDER BY u.createdAt DESC`
  );
  const data = result.recordset.map((r) => ({
    ...r,
    roles: r.roles ? r.roles.split(',') : [],
  }));
  res.json({ success: true, data });
});

// ── GET /api/users/:id  (DIRECTOR or self) ────────────────
const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id && !req.user.roles.includes('DIRECTOR')) {
    throw new AppError('Forbidden', 403);
  }
  const result = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.language, u.createdAt,
            STRING_AGG(ur.role, ',') AS roles
     FROM dbo.Users u
     LEFT JOIN dbo.UserRoles ur ON ur.userId = u.id
     WHERE u.id = @id
     GROUP BY u.id, u.name, u.email, u.phone, u.language, u.createdAt`,
    { id: { type: sql.UniqueIdentifier, value: id } }
  );
  if (!result.recordset.length) throw new AppError('User not found', 404);
  const user = result.recordset[0];
  user.roles = user.roles ? user.roles.split(',') : [];
  res.json({ success: true, data: user });
});

// ── PUT /api/users/:id  (DIRECTOR or self) ────────────────
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id && !req.user.roles.includes('DIRECTOR')) {
    throw new AppError('Forbidden', 403);
  }
  const { name, phone, language } = req.body;
  const sets = [];
  const params = { id: { type: sql.UniqueIdentifier, value: id } };

  if (name !== undefined)     { sets.push('name = @name');     params.name  = { type: sql.NVarChar(200), value: name }; }
  if (phone !== undefined)    { sets.push('phone = @phone');   params.phone = { type: sql.NVarChar(30),  value: phone }; }
  if (language !== undefined) { sets.push('language = @lang'); params.lang  = { type: sql.NVarChar(5),   value: language }; }

  if (!sets.length) throw new AppError('No fields to update', 400);

  await query(`UPDATE dbo.Users SET ${sets.join(', ')} WHERE id = @id`, params);
  res.json({ success: true, message: 'User updated' });
});

module.exports = { listUsers, getUser, updateUser, updateUserSchema };
