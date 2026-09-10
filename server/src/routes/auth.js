import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

const sign = (u) =>
  jwt.sign(
    { id: u._id, name: u.name, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

r.post('/register', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'name, email, password required' });
    if (!User.schema.statics.ROLES.includes(role || 'cashier'))
      return res.status(400).json({ error: 'invalid role' });
    const passwordHash = await bcrypt.hash(password, 10);
    const u = await User.create({ name, email, passwordHash, role: role || 'cashier' });
    res.status(201).json({ id: u._id, name: u.name, email: u.email, role: u.role });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    next(e);
  }
});

r.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const u = await User.findOne({ email: (email || '').toLowerCase() });
    if (!u || !(await bcrypt.compare(password || '', u.passwordHash)))
      return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ token: sign(u), user: { id: u._id, name: u.name, role: u.role } });
  } catch (e) { next(e); }
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.get('/users', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: 1 });
    res.json({ users });
  } catch (e) { next(e); }
});

export default r;
