const { z } = require('zod');
const { query, sql } = require('../db/pool');
const { asyncHandler } = require('../utils/asyncHandler');

const deviceTokenSchema = z.object({
  token:    z.string().min(1).max(500),
  platform: z.enum(['android', 'ios']).default('android'),
});

// ── POST /api/devices/token ───────────────────────────────
const upsertToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;
  const userId = req.user.id;

  await query(
    `MERGE dbo.DeviceTokens AS tgt
     USING (SELECT @token AS token) AS src ON tgt.token = src.token
     WHEN MATCHED THEN
       UPDATE SET userId = @userId, platform = @platform, updatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (userId, token, platform) VALUES (@userId, @token, @platform);`,
    {
      userId:   { type: sql.UniqueIdentifier, value: userId },
      token:    { type: sql.NVarChar(500),    value: token },
      platform: { type: sql.NVarChar(20),     value: platform },
    }
  );

  res.json({ success: true, message: 'Device token saved' });
});

module.exports = { upsertToken, deviceTokenSchema };
