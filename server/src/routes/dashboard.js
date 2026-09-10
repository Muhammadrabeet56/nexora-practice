import { Router } from 'express';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

r.get('/', requireAuth, async (_req, res, next) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const [revAgg] = await Sale.aggregate([
      { $match: { status: 'COMPLETED', createdAt: { $gte: start } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);
    const lowStock = await Product.find({ $expr: { $lte: ['$qty', '$reorderLevel'] } }).sort({ qty: 1 }).limit(10);
    const productCount = await Product.countDocuments();

    res.json({
      todayRevenue: revAgg?.revenue || 0,
      salesToday: revAgg?.count || 0,
      productCount,
      lowStock,
    });
  } catch (e) { next(e); }
});

export default r;
