import request from 'supertest';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import { createApp } from '../src/app.js';

export const app = createApp();

export async function makeUser(role = 'cashier') {
  const u = await User.create({
    name: `Test ${role}`,
    email: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`,
    passwordHash: await bcrypt.hash('Passw0rd!', 10),
    role,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: u.email, password: 'Passw0rd!' });
  return { token: res.body.token, user: res.body.user, id: u._id };
}

export const auth = (token) => ({ Authorization: `Bearer ${token}` });
