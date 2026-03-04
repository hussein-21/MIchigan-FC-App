const { z } = require('zod');
const { query, sql } = require('../db/pool');
const { AppError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendPush } = require('../services/fcm.service');

const sendNotificationSchema = z.object({
  title:   z.string().min(1).max(255),
  titleAr: z.string().max(255).optional(),
  body:    z.string().min(1),
  bodyAr:  z.string().optional(),
  teamId:  z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

// ── POST /api/notifications/send  (DIRECTOR) ─────────────
const sendNotification = asyncHandler(async (req, res) => {
  const { title, titleAr, body, bodyAr, teamId, userIds } = req.body;

  let recipients = [];

  if (userIds && userIds.length) {
    const ph = userIds.map((_, i) => `@uid${i}`).join(',');
    const params = {};
    userIds.forEach((uid, i) => {
      params[`uid${i}`] = { type: sql.UniqueIdentifier, value: uid };
    });
    const r = await query(
      `SELECT id AS userId, language FROM dbo.Users WHERE id IN (${ph})`, params
    );
    recipients = r.recordset;
  } else if (teamId) {
    const r = await query(
      `SELECT DISTINCT u.id AS userId, u.language
       FROM dbo.Users u JOIN dbo.Players p ON p.parentId = u.id
       WHERE p.teamId = @teamId`,
      { teamId: { type: sql.UniqueIdentifier, value: teamId } }
    );
    recipients = r.recordset;
  } else {
    throw new AppError('Provide teamId or userIds', 400);
  }

  if (!recipients.length) {
    return res.json({ success: true, data: { sent: 0 } });
  }

  for (const r of recipients) {
    const locTitle = r.language === 'ar' && titleAr ? titleAr : title;
    const locBody  = r.language === 'ar' && bodyAr  ? bodyAr  : body;

    // 1. Always insert DB record
    await query(
      `INSERT INTO dbo.Notifications (userId, title, message)
       VALUES (@userId, @title, @msg)`,
      {
        userId: { type: sql.UniqueIdentifier, value: r.userId },
        title:  { type: sql.NVarChar(255),    value: locTitle },
        msg:    { type: sql.NVarChar(sql.MAX), value: locBody },
      }
    );

    // 2. Best-effort FCM
    try {
      const tkRes = await query(
        'SELECT token FROM dbo.DeviceTokens WHERE userId = @userId',
        { userId: { type: sql.UniqueIdentifier, value: r.userId } }
      );
      const tokens = tkRes.recordset.map((t) => t.token);
      if (tokens.length) await sendPush(tokens, { title: locTitle, message: locBody });
    } catch (err) {
      console.error(`[Notify] FCM failed for ${r.userId}:`, err.message);
    }
  }

  res.json({ success: true, data: { sent: recipients.length } });
});

// ── GET /api/notifications/user/:id ───────────────────────
const getUserNotifications = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (req.user.id !== id && !req.user.roles.includes('DIRECTOR')) {
    throw new AppError('Forbidden', 403);
  }
  const result = await query(
    `SELECT * FROM dbo.Notifications WHERE userId = @userId ORDER BY createdAt DESC`,
    { userId: { type: sql.UniqueIdentifier, value: id } }
  );
  res.json({ success: true, data: result.recordset });
});

module.exports = { sendNotification, getUserNotifications, sendNotificationSchema };
