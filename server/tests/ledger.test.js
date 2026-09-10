import request from 'supertest';
import mongoose from 'mongoose';
import { app, makeUser, auth } from './helpers.js';
import Product from '../src/models/Product.js';
import Sale from '../src/models/Sale.js';
import StockMovement from '../src/models/StockMovement.js';

// The accountability requirement: every stock change is attributed,
// visible in the ledger, and matches reality after sales + returns.

describe('Stock Ledger', () => {
  let mgr, cashier, product;

  beforeEach(async () => {
    mgr = await makeUser('manager');
    cashier = await makeUser('cashier');
    await mongoose.connection.db.dropDatabase();
    await mongoose.syncIndexes();

    // need a fresh manager token — dropDatabase invalidated it
    mgr = await makeUser('manager');
    cashier = await makeUser('cashier');

    product = await Product.create({
      sku: 'L-TEST-1', name: 'Ledger Tester', category: 'Test',
      price: 10, cost: 4, qty: 100, reorderLevel: 5,
    });
  });

  it('records a SALE movement attributed to the cashier', async () => {
    const saleRes = await request(app)
      .post('/api/sales')
      .set(auth(cashier.token))
      .send({ lines: [{ product: product._id, qty: 2 }], paymentMethod: 'cash' });
    expect(saleRes.status).toBe(201);
    const num = saleRes.body.sale.number;

    const mv = await StockMovement.findOne({ kind: 'SALE' }).populate('by', 'name');
    expect(mv).toBeTruthy();
    expect(mv.delta).toBe(-2);
    expect(mv.ref).toBe(String(num));
    expect(mv.by.name).toBe(cashier.user.name);
  });

  it('GET /api/stock-movements lists movements for manager+ (not cashier)', async () => {
    // create one movement via a sale first
    await request(app)
      .post('/api/sales')
      .set(auth(cashier.token))
      .send({ lines: [{ product: product._id, qty: 1 }], paymentMethod: 'card' });

    const okRes = await request(app)
      .get('/api/stock-movements')
      .set(auth(mgr.token));
    expect(okRes.status).toBe(200);
    expect(Array.isArray(okRes.body.movements)).toBe(true);
    expect(okRes.body.movements.length).toBe(1);
    expect(okRes.body.movements[0].kind).toBe('SALE');
    expect(okRes.body.movements[0].delta).toBe(-1);
    expect(okRes.body.movements[0].product.sku).toBe('L-TEST-1');
    expect(okRes.body.movements[0].by).toBe(cashier.user.name); // attribution: who did it

    // cashiers cannot see the ledger
    const denied = await request(app)
      .get('/api/stock-movements')
      .set(auth(cashier.token));
    expect(denied.status).toBe(403);
  });

  it('filters by kind and ref', async () => {
    await request(app)
      .post('/api/sales')
      .set(auth(cashier.token))
      .send({ lines: [{ product: product._id, qty: 3 }], paymentMethod: 'mobile' });

    const saleDoc = await Sale.findOne().sort({ number: -1 });
    const ref = String(saleDoc.number);

    const byRef = await request(app)
      .get(`/api/stock-movements?ref=${ref}`)
      .set(auth(mgr.token));
    expect(byRef.status).toBe(200);
    expect(byRef.body.movements.every((m) => m.ref === ref)).toBe(true);

    const byKind = await request(app)
      .get('/api/stock-movements?kind=RETURN')
      .set(auth(mgr.token));
    expect(byKind.body.movements).toHaveLength(0);
  });
});