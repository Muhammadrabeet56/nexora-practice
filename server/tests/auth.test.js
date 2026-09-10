import request from 'supertest';
import { app, makeUser, auth } from './helpers.js';

describe('auth', () => {
  it('health works', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('login returns token for seeded admin', async () => {
    const { token } = await makeUser('admin');
    expect(token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const { user } = await makeUser('admin');
    const res = await request(app).post('/api/auth/login').send({ email: 'nope@nope.com', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('register blocked without admin token', async () => {
    const cashier = await makeUser('cashier');
    const res = await request(app)
      .post('/api/auth/register')
      .set(auth(cashier.token))
      .send({ name: 'X', email: 'x@x.com', password: 'Passw0rd!' });
    expect(res.status).toBe(403);
  });

  it('admin can register a manager', async () => {
    const admin = await makeUser('admin');
    const res = await request(app)
      .post('/api/auth/register')
      .set(auth(admin.token))
      .send({ name: 'Mgr', email: `mgr-${Date.now()}@t.com`, password: 'Passw0rd!', role: 'manager' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('manager');
  });

  it('duplicate email rejected', async () => {
    const admin = await makeUser('admin');
    const email = `dup-${Date.now()}@t.com`;
    await request(app).post('/api/auth/register').set(auth(admin.token))
      .send({ name: 'A', email, password: 'Passw0rd!' });
    const res = await request(app).post('/api/auth/register').set(auth(admin.token))
      .send({ name: 'B', email, password: 'Passw0rd!' });
    expect(res.status).toBe(409); // duplicate email is a conflict, not a crash
  });

  it('me returns payload from token', async () => {
    const { token } = await makeUser('manager');
    const res = await request(app).get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('manager');
  });
});
