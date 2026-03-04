const { app, request, authed, uid } = require('./setup');

describe('Device Tokens', () => {
  it('stores a device token for an authenticated user', async () => {
    const email = `dev_${uid()}@test.michiganfc`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Device User',
      email,
      password: 'StrongPass1!',
      language: 'en',
    });
    const { token } = reg.body.data;

    const res = await authed(token)
      .post('/api/devices/token')
      .send({ token: `fcm-${uid()}`, platform: 'android' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('upserts when the same FCM token is sent twice', async () => {
    const email = `dev_up_${uid()}@test.michiganfc`;
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Upsert User',
      email,
      password: 'StrongPass1!',
      language: 'en',
    });
    const { token } = reg.body.data;
    const fcm = `fcm-up-${uid()}`;

    await authed(token)
      .post('/api/devices/token')
      .send({ token: fcm, platform: 'android' })
      .expect(200);

    // Same FCM token, different platform → should MERGE-update, not crash
    await authed(token)
      .post('/api/devices/token')
      .send({ token: fcm, platform: 'ios' })
      .expect(200);
  });

  it('rejects unauthenticated requests with 401', async () => {
    await request(app)
      .post('/api/devices/token')
      .send({ token: 'abc', platform: 'ios' })
      .expect(401);
  });
});
