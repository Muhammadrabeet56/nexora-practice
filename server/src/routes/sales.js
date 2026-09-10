import { Router } from 'express';
import Sale from '../models/Sale.js';
import { createSale, returnSale } from '../services/salesService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// cashiers can create sales
r.post('/', requireAuth, async (req, res, next) => {
  try {
    const { lines, discount, paymentMethod } = req.body;
    if (!Array.isArray(lines) || lines.length === 0)
      return res.status(400).json({ error: 'lines required' });
    const sale = await createSale({ lines, discount, paymentMethod, cashier: req.user.id });
    res.status(201).json({ sale: await sale.populate('cashier', 'name') });
  } catch (e) { next(e); }
});

// history — manager+
r.get('/', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(200).populate('cashier', 'name');
    res.json({ sales });
  } catch (e) { next(e); }
});

r.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('cashier', 'name');
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json({ sale });
  } catch (e) { next(e); }
});

// full return — manager+
r.post('/:id/return', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { sale, ret } = await returnSale({ saleId: req.params.id, by: req.user.id, reason: req.body.reason });
    res.json({ sale: await sale.populate('cashier', 'name'), return: ret });
  } catch (e) { next(e); }
});

export default r;
