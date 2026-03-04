const { app, request, uid } = require('./setup');

describe('Auth', () => {
  describe('POST /api/auth/register', () => {
    const email = `reg_${uid()}@test.michiganfc`;

    it('registers a parent with a player and returns a token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Doe',
          email,
          password: 'StrongPass1!',
          language: 'en',
          player: { name: 'Kid Doe', ageGroup: 'U10' },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.userId).toBeDefined();
    });

    it('rejects duplicate email with 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dup', email, password: 'StrongPass1!' })
        .expect(409);
    });

    it('rejects invalid body with 400', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'bad' })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    const email = `login_${uid()}@test.michiganfc`;
    const password = 'StrongPass1!';

    beforeAll(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Login User', email, password, language: 'en' });
    });

    it('returns token + roles on valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.roles).toContain('PARENT');
    });

    it('rejects wrong password with 401', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'wrong' })
        .expect(401);
    });
  });
});
