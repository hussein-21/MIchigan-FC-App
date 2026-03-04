const { app, request } = require('./setup');

describe('Health & 404', () => {
  it('GET /health → 200 ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/nope → 404', async () => {
    await request(app).get('/api/nope').expect(404);
  });
});
