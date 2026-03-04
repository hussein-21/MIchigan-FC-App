const { app, request, authed, createTestUser, uid } = require('./setup');

describe('Notifications', () => {
  it('PARENT cannot POST /api/notifications/send (403)', async () => {
    const p = await createTestUser({ roles: ['PARENT'] });
    await authed(p.token)
      .post('/api/notifications/send')
      .send({ title: 'Hi', body: 'World', userIds: [p.userId] })
      .expect(403);
  });

  it('DIRECTOR can send a localised notification', async () => {
    // Arabic parent
    const email = `notif_${uid()}@test.michiganfc`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Arabic Parent',
      email,
      password: 'StrongPass1!',
      language: 'ar',
    });
    const targetId = reg.body.data.userId;

    const director = await createTestUser({ roles: ['DIRECTOR'] });

    const res = await authed(director.token)
      .post('/api/notifications/send')
      .send({
        title: 'English Title',
        titleAr: 'عنوان عربي',
        body: 'English body',
        bodyAr: 'نص عربي',
        userIds: [targetId],
      })
      .expect(200);

    expect(res.body.data.sent).toBe(1);

    // Verify stored notification is in Arabic
    const list = await authed(director.token)
      .get(`/api/notifications/user/${targetId}`)
      .expect(200);

    expect(list.body.data.length).toBeGreaterThanOrEqual(1);
    expect(list.body.data[0].title).toBe('عنوان عربي');
    expect(list.body.data[0].message).toBe('نص عربي');
  });

  it('user can fetch own notifications', async () => {
    const email = `nread_${uid()}@test.michiganfc`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Reader',
      email,
      password: 'StrongPass1!',
      language: 'en',
    });
    const { userId, token } = reg.body.data;

    const res = await authed(token)
      .get(`/api/notifications/user/${userId}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
