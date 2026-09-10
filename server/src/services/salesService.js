import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Counter from '../models/Counter.js';
import ReturnSale from '../models/ReturnSale.js';

// One place that knows how a sale touches stock — the ONLY door.
export async function createSale({ lines, discount = 0, paymentMethod, cashier }) {
  discount = Number(discount) || 0;

  // validate + snapshot inside the transaction
  const session = await mongoose.startSession();
  try {
    let sale;
    await session.withTransaction(async () => {
      const ids = lines.map((l) => l.product);
      const products = await Product.find({ _id: { $in: ids } }).session(session);
      const byId = new Map(products.map((p) => [String(p._id), p]));

      const lineItems = [];
      const movements = [];
      let subtotal = 0;

      for (const l of lines) {
        const p = byId.get(String(l.product));
        if (!p) throw Object.assign(new Error(`Product ${l.product} not found`), { status: 400 });
        const qty = Number(l.qty);
        if (!Number.isInteger(qty) || qty < 1)
          throw Object.assign(new Error('qty must be a positive integer'), { status: 400 });
        if (p.qty < qty)
          throw Object.assign(new Error(`Insufficient stock for ${p.name} (have ${p.qty}, want ${qty})`), { status: 409 });
        subtotal += p.price * qty;
        lineItems.push({
          product: p._id, sku: p.sku, name: p.name,
          qty, unitPrice: p.price, unitCost: p.cost,
        });
        movements.push({ product: p._id, delta: -qty, kind: 'SALE', by: cashier });
      }

      if (discount < 0 || discount > subtotal)
        throw Object.assign(new Error('discount cannot exceed subtotal'), { status: 400 });

      const number = await Counter.next('saleNumber');

      [sale] = await Sale.create([{
        number, lineItems,
        subtotal, discount,
        total: subtotal - discount,
        paymentMethod, cashier,
      }], { session });

      for (const m of movements) {
        await StockMovement.create([{ ...m, ref: String(number) }], { session });
      }

      // decrement cached qty atomically per line
      for (const li of lineItems) {
        const p = byId.get(String(li.product));
        await Product.updateOne(
          { _id: li.product, qty: { $gte: li.qty } },
          { $inc: { qty: -li.qty } }
        ).session(session);
      }
    });
    return sale;
  } finally {
    session.endSession();
  }
}

export async function returnSale({ saleId, by, reason }) {
  const session = await mongoose.startSession();
  try {
    let sale, ret;
    await session.withTransaction(async () => {
      sale = await Sale.findById(saleId).session(session);
      if (!sale) throw Object.assign(new Error('Sale not found'), { status: 404 });
      if (sale.status === 'RETURNED')
        throw Object.assign(new Error('Sale already returned'), { status: 409 });

      for (const li of sale.lineItems) {
        await Product.updateOne({ _id: li.product }, { $inc: { qty: li.qty } }).session(session);
        await StockMovement.create([{
          product: li.product, delta: li.qty, kind: 'RETURN',
          ref: String(sale.number), by, note: reason || 'sale return',
        }], { session });
      }
      sale.status = 'RETURNED';
      await sale.save({ session });
      [ret] = await ReturnSale.create([{ sale: sale._id, lines: sale.lineItems.map((l) => ({ product: l.product, qty: l.qty })), by, reason }], { session });
    });
    return { sale, ret };
  } finally {
    session.endSession();
  }
}

