import { Router } from 'express';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

// anyone authenticated may read products
r.get('/', requireAuth, async (req, res, next) => {
  try {
    const { q, low } = req.query;
    const filter = {};
    if (q) filter.$or = [
      { name: new RegExp(q, 'i') },
      { sku: new RegExp(q, 'i') },
    ];
    if (low === 'true') filter.$expr = { $lte: ['$qty', '$reorderLevel'] };
    res.json({ products: await Product.find(filter).sort({ name: 1 }) });
  } catch (e) { next(e); }
});

r.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: p });
  } catch (e) { next(e); }
});

// create — manager+
r.post('/', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const p = await Product.create(req.body);
    if (p.qty > 0) {
      await StockMovement.create({
        product: p._id, delta: p.qty, kind: 'RECEIVE',
        ref: 'initial', by: req.user.id, note: 'initial stock',
      });
    }
    res.status(201).json({ product: p });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'SKU already exists' });
    next(e);
  }
});

// update — manager+ (price/name/etc., not direct qty: use /adjust)
r.put('/:id', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { qty, ...safe } = req.body;
    delete safe.sku; // sku is identity; changes go through delete+create
    const p = await Product.findByIdAndUpdate(req.params.id, safe, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: p });
  } catch (e) { next(e); }
});

// stock adjust — manager+; emits ledger movement ALWAYS
r.post('/:id/adjust', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { delta, note } = req.body;
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    if (Number.isNaN(Number(delta)) || Number(delta) === 0)
      return res.status(400).json({ error: 'delta must be a non-zero number' });
    if (p.qty + Number(delta) < 0)
      return res.status(400).json({ error: 'adjustment would make stock negative' });
    p.qty += Number(delta);
    await p.save();
    await StockMovement.create({
      product: p._id, delta: Number(delta), kind: 'ADJUST',
      ref: '', by: req.user.id, note: note || 'manual adjust',
    });
    res.json({ product: p });
  } catch (e) { next(e); }
});

r.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

export default r;
