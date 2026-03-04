const { query, sql } = require('../db/pool');
const { sendPush } = require('./fcm.service');
const { localise } = require('../utils/localise');

/**
 * For each recipient: insert a Notifications row, then best-effort FCM push.
 *
 * GUARANTEE: The DB row is always written, even if FCM fails.
 *
 * @param {{ userId: string, language: string }[]} recipients
 * @param {'newEvent'|'manual'} key   – localisation template key
 * @param {any[]} args                – forwarded to localise()
 * @param {string|null} eventId       – optional FK to Events
 */
async function notifyUsers(recipients, key, args, eventId = null) {
  for (const { userId, language } of recipients) {
    const { title, message } = localise(language, key, ...args);

    // 1. Always insert notification record
    await query(
      `INSERT INTO dbo.Notifications (userId, eventId, title, message)
       VALUES (@userId, @eventId, @title, @message)`,
      {
        userId:  { type: sql.UniqueIdentifier, value: userId },
        eventId: { type: sql.UniqueIdentifier, value: eventId },
        title:   { type: sql.NVarChar(255),    value: title },
        message: { type: sql.NVarChar(sql.MAX), value: message },
      }
    );

    // 2. Best-effort FCM push – never let a push failure skip remaining users
    try {
      const tkRes = await query(
        'SELECT token FROM dbo.DeviceTokens WHERE userId = @userId',
        { userId: { type: sql.UniqueIdentifier, value: userId } }
      );
      const tokens = tkRes.recordset.map((r) => r.token);
      if (tokens.length) {
        await sendPush(tokens, { title, message });
      }
    } catch (err) {
      console.error(`[Notify] FCM failed for user ${userId}:`, err.message);
    }
  }
}

module.exports = { notifyUsers };
