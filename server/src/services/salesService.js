import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Counter from '../models/Counter.js';
import ReturnSale from '../models/ReturnSale.js';

// One place that knows how a sale touches stock — the ONLY door.

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

async function supportsTransactions() {
  try {
    const info = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(info.setName); // replica set / mongos => transactions OK
  } catch {
    return false;
  }
}

let txCapable; // memoized per process

// Validate + snapshot lines, shared by both execution paths.
async function buildLines(lines, cashier) {
  const ids = lines.map((l) => l.product);
  const products = await Product.find({ _id: { $in: ids } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lineItems = [];
  let subtotal = 0;
  for (const l of lines) {
    const p = byId.get(String(l.product));
    if (!p) throw httpError(400, `Product ${l.product} not found`);
    const qty = Number(l.qty);
    if (!Number.isInteger(qty) || qty < 1)
      throw httpError(400, 'qty must be a positive integer');
    if (p.qty < qty)
      throw httpError(409, `Insufficient stock for ${p.name} (have ${p.qty}, want ${qty})`);
    subtotal += p.price * qty;
    lineItems.push({
      product: p._id, sku: p.sku, name: p.name,
      qty, unitPrice: p.price, unitCost: p.cost,
    });
  }
  return { lineItems, subtotal };
}

export async function createSale({ lines, discount = 0, paymentMethod, cashier }) {
  discount = Number(discount) || 0;
  if (!Array.isArray(lines) || lines.length === 0)
    throw httpError(400, 'lines required');

  if (txCapable === undefined) txCapable = await supportsTransactions();

  if (txCapable) {
    const session = await mongoose.startSession();
    try {
      let sale;
      await session.withTransaction(async () => {
        const { lineItems, subtotal } = await buildLines(lines, cashier);
        if (discount < 0 || discount > subtotal)
          throw httpError(400, 'discount cannot exceed subtotal');
        const number = await Counter.next('saleNumber');
        [sale] = await Sale.create([{
          number, lineItems, subtotal, discount,
          total: subtotal - discount, paymentMethod, cashier,
        }], { session });
        for (const li of lineItems) {
          await Product.updateOne(
            { _id: li.product, qty: { $gte: li.qty } },
            { $inc: { qty: -li.qty } }
          ).session(session);
          await StockMovement.create([{
            product: li.product, delta: -li.qty, kind: 'SALE',
            ref: String(number), by: cashier,
          }], { session });
        }
      });
      return sale;
    } finally {
      session.endSession();
    }
  }

  // Fallback path (single-node dev without RS): validate, then write with
  // guarded atomic $inc — same contract, no cross-doc transaction.
  const { lineItems, subtotal } = await buildLines(lines, cashier);
  if (discount < 0 || discount > subtotal)
    throw httpError(400, 'discount cannot exceed subtotal');
  const number = await Counter.next('saleNumber');
  for (const li of lineItems) {
    // guarded decrement: fails if stock moved underneath us
    const r = await Product.updateOne(
      { _id: li.product, qty: { $gte: li.qty } },
      { $inc: { qty: -li.qty } }
    );
    if (r.matchedCount !== 1)
      throw httpError(409, `Insufficient stock for ${li.name}`);
    await StockMovement.create({
      product: li.product, delta: -li.qty, kind: 'SALE',
      ref: String(number), by: cashier,
    });
  }
  const [sale] = await Sale.create([{
    number, lineItems, subtotal, discount,
    total: subtotal - discount, paymentMethod, cashier,
  }]);
  return sale;
}

export async function returnSale({ saleId, by, reason }) {
  if (txCapable === undefined) txCapable = await supportsTransactions();

  if (txCapable) {
    const session = await mongoose.startSession();
    try {
      let sale, ret;
      await session.withTransaction(async () => {
        sale = await Sale.findById(saleId).session(session);
        if (!sale) throw httpError(404, 'Sale not found');
        if (sale.status === 'RETURNED') throw httpError(409, 'Sale already returned');
        for (const li of sale.lineItems) {
          await Product.updateOne({ _id: li.product }, { $inc: { qty: li.qty } }).session(session);
          await StockMovement.create([{
            product: li.product, delta: li.qty, kind: 'RETURN',
            ref: String(sale.number), by, note: reason || 'sale return',
          }], { session });
        }
        sale.status = 'RETURNED';
        await sale.save({ session });
        [ret] = await ReturnSale.create([{
          sale: sale._id,
          lines: sale.lineItems.map((l) => ({ product: l.product, qty: l.qty })),
          by, reason,
        }], { session });
      });
      return { sale, ret };
    } finally {
      session.endSession();
    }
  }

  // Fallback path
  const sale = await Sale.findById(saleId);
  if (!sale) throw httpError(404, 'Sale not found');
  if (sale.status === 'RETURNED') throw httpError(409, 'Sale already returned');
  for (const li of sale.lineItems) {
    await Product.updateOne({ _id: li.product }, { $inc: { qty: li.qty } });
    await StockMovement.create({
      product: li.product, delta: li.qty, kind: 'RETURN',
      ref: String(sale.number), by, note: reason || 'sale return',
    });
  }
  sale.status = 'RETURNED';
  await sale.save();
  const [ret] = await ReturnSale.create([{
    sale: sale._id,
    lines: sale.lineItems.map((l) => ({ product: l.product, qty: l.qty })),
    by, reason,
  }]);
  return { sale, ret };
}
