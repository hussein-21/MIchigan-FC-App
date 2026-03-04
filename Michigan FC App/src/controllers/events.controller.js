const crypto = require('crypto');
const { z } = require('zod');
const { query, sql } = require('../db/pool');
const { asyncHandler } = require('../utils/asyncHandler');
const { notifyUsers } = require('../services/notification.service');

const createEventSchema = z.object({
  title:    z.string().min(1).max(255),
  titleAr:  z.string().max(255).optional(),
  type:     z.enum(['PRACTICE', 'GAME', 'MEETING', 'OTHER']),
  startsAt: z.string(),          // ISO-8601 datetime
  location: z.string().max(255).optional(),
  teamId:   z.string().uuid().nullable().optional(),
});

// ── POST /api/events  (DIRECTOR) ──────────────────────────
const createEvent = asyncHandler(async (req, res) => {
  const { title, titleAr, type, startsAt, location, teamId } = req.body;
  const eventId = crypto.randomUUID();

  // 1. Insert event row
  await query(
    `INSERT INTO dbo.Events (id, teamId, type, title, titleAr, startsAt, location, createdBy)
     VALUES (@id, @teamId, @type, @title, @titleAr, @startsAt, @loc, @createdBy)`,
    {
      id:        { type: sql.UniqueIdentifier, value: eventId },
      teamId:    { type: sql.UniqueIdentifier, value: teamId || null },
      type:      { type: sql.NVarChar(50),     value: type },
      title:     { type: sql.NVarChar(255),    value: title },
      titleAr:   { type: sql.NVarChar(255),    value: titleAr || null },
      startsAt:  { type: sql.DateTime2,        value: startsAt },
      loc:       { type: sql.NVarChar(255),    value: location || null },
      createdBy: { type: sql.UniqueIdentifier, value: req.user.id },
    }
  );

  // 2. Find affected parents
  let rq, rp = {};
  if (teamId) {
    rq = `SELECT DISTINCT u.id AS userId, u.language
          FROM dbo.Users u
          JOIN dbo.Players p ON p.parentId = u.id
          WHERE p.teamId = @teamId`;
    rp = { teamId: { type: sql.UniqueIdentifier, value: teamId } };
  } else {
    // Club-wide: all parents
    rq = `SELECT DISTINCT u.id AS userId, u.language
          FROM dbo.Users u
          JOIN dbo.UserRoles ur ON ur.userId = u.id
          WHERE ur.role = 'PARENT'`;
  }
  const recipientRes = await query(rq, rp);

  // 3-5. Insert notification rows + FCM push (DB insert guaranteed even if push fails)
  try {
    await notifyUsers(recipientRes.recordset, 'newEvent', [title], eventId);
  } catch (err) {
    console.error('[Event] Notification pipeline error:', err.message);
  }

  res.status(201).json({ success: true, data: { eventId } });
});

// ── GET /api/events ───────────────────────────────────────
const listEvents = asyncHandler(async (_req, res) => {
  const result = await query(
    `SELECT e.*, t.name AS teamName
     FROM dbo.Events e
     LEFT JOIN dbo.Teams t ON t.id = e.teamId
     ORDER BY e.startsAt DESC`
  );
  res.json({ success: true, data: result.recordset });
});

// ── GET /api/events/team/:teamId ──────────────────────────
const listEventsByTeam = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const result = await query(
    `SELECT e.*, t.name AS teamName
     FROM dbo.Events e
     LEFT JOIN dbo.Teams t ON t.id = e.teamId
     WHERE e.teamId = @teamId
     ORDER BY e.startsAt DESC`,
    { teamId: { type: sql.UniqueIdentifier, value: teamId } }
  );
  res.json({ success: true, data: result.recordset });
});

module.exports = { createEvent, listEvents, listEventsByTeam, createEventSchema };
