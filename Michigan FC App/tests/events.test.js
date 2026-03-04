const { app, request, authed, createTestUser, query, sql } = require('./setup');

describe('Events', () => {
  let directorToken;

  beforeAll(async () => {
    // DIRECTOR must exist in dbo.Users so Events.createdBy FK is satisfied
    const d = await createTestUser({ roles: ['DIRECTOR'] });
    directorToken = d.token;
  });

  it('DIRECTOR can create an event', async () => {
    const res = await authed(directorToken)
      .post('/api/events')
      .send({
        title: 'Practice',
        type: 'PRACTICE',
        startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(201);

    expect(res.body.data.eventId).toBeDefined();
  });

  it('PARENT cannot create an event (403)', async () => {
    const p = await createTestUser({ roles: ['PARENT'] });
    await authed(p.token)
      .post('/api/events')
      .send({
        title: 'Nope',
        type: 'PRACTICE',
        startsAt: new Date().toISOString(),
      })
      .expect(403);
  });

  it('authenticated user can list events', async () => {
    const p = await createTestUser({ roles: ['PARENT'] });
    const res = await authed(p.token).get('/api/events').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('creating an event inserts localised Notification rows for parents', async () => {
    // Create an Arabic parent so we can verify localisation
    const parent = await createTestUser({ roles: ['PARENT'], language: 'ar' });

    const res = await authed(directorToken)
      .post('/api/events')
      .send({
        title: 'Team Dinner',
        type: 'OTHER',
        startsAt: new Date(Date.now() + 172_800_000).toISOString(),
      })
      .expect(201);

    const eventId = res.body.data.eventId;

    // Verify a notification row was created for the Arabic parent
    const n = await query(
      `SELECT * FROM dbo.Notifications WHERE userId = @uid AND eventId = @eid`,
      {
        uid: { type: sql.UniqueIdentifier, value: parent.userId },
        eid: { type: sql.UniqueIdentifier, value: eventId },
      }
    );

    expect(n.recordset.length).toBe(1);
    expect(n.recordset[0].title).toContain('حدث جديد');
  });
});
