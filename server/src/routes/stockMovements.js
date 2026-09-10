import { Router } from 'express';
import StockMovement from '../models/StockMovement.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const r = Router();

/**
 * GET /api/stock-movements — the accountability ledger.
 * Manager+ only. Every stock change, attributed: who, what, when, why.
 * Filters: ?kind=SALE|RETURN|ADJUST|RECEIVE, ?ref=NNNNN (sale number), ?limit=
 */
r.get('/', requireAuth, requireRole('admin', 'manager'), async (req, res, next) => {
  try {
    const { kind, ref } = req.query;
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const filter = {};
    if (kind) filter.kind = kind.toUpperCase();
    if (ref) filter.ref = String(ref);

    const movements = await StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('product', 'sku name')
      .populate('by', 'name');

    res.json({
      movements: movements.map((m) => ({
        id: m._id,
        date: m.createdAt,
        product: m.product ? { id: m.product._id, sku: m.product.sku, name: m.product.name } : null,
        delta: m.delta,
        kind: m.kind,
        ref: m.ref,
        by: m.by ? m.by.name : '—',
        note: m.note,
      })),
    });
  } catch (e) { next(e); }
});

export default r;