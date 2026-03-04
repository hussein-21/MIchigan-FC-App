const crypto = require('crypto');
const { z } = require('zod');
const { query, sql } = require('../db/pool');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const createPlayerSchema = z.object({
  name:     z.string().min(1).max(200),
  parentId: z.string().uuid(),
  teamId:   z.string().uuid().optional(),
  ageGroup: z.string().max(20).optional(),
});

// ── POST /api/players ─────────────────────────────────────
const createPlayer = asyncHandler(async (req, res) => {
  const { name, parentId, teamId, ageGroup } = req.body;
  const isDirector = req.user.roles.includes('DIRECTOR');
  const isSelf = req.user.id === parentId;
  if (!isDirector && !isSelf) {
    throw new AppError('Forbidden – you can only add players to your own account', 403);
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO dbo.Players (id, parentId, teamId, name, ageGroup)
     VALUES (@id, @parentId, @teamId, @name, @ag)`,
    {
      id:       { type: sql.UniqueIdentifier, value: id },
      parentId: { type: sql.UniqueIdentifier, value: parentId },
      teamId:   { type: sql.UniqueIdentifier, value: teamId || null },
      name:     { type: sql.NVarChar(200),    value: name },
      ag:       { type: sql.NVarChar(20),     value: ageGroup || null },
    }
  );
  res.status(201).json({ success: true, data: { playerId: id } });
});

// ── GET /api/players/:id ──────────────────────────────────
const getPlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await query(
    `SELECT p.*, t.name AS teamName
     FROM dbo.Players p
     LEFT JOIN dbo.Teams t ON t.id = p.teamId
     WHERE p.id = @id`,
    { id: { type: sql.UniqueIdentifier, value: id } }
  );
  if (!result.recordset.length) throw new AppError('Player not found', 404);

  const player = result.recordset[0];
  const isDirector = req.user.roles.includes('DIRECTOR');
  const isCoach    = req.user.roles.includes('COACH');
  const isParent   = req.user.id === player.parentId;
  if (!isDirector && !isCoach && !isParent) {
    throw new AppError('Forbidden', 403);
  }
  res.json({ success: true, data: player });
});

// ── GET /api/players/parent/:parentId ─────────────────────
const getPlayersByParent = asyncHandler(async (req, res) => {
  const { parentId } = req.params;
  const isDirector = req.user.roles.includes('DIRECTOR');
  const isSelf = req.user.id === parentId;
  if (!isDirector && !isSelf) throw new AppError('Forbidden', 403);

  const result = await query(
    `SELECT p.*, t.name AS teamName
     FROM dbo.Players p
     LEFT JOIN dbo.Teams t ON t.id = p.teamId
     WHERE p.parentId = @parentId`,
    { parentId: { type: sql.UniqueIdentifier, value: parentId } }
  );
  res.json({ success: true, data: result.recordset });
});

module.exports = { createPlayer, getPlayer, getPlayersByParent, createPlayerSchema };
