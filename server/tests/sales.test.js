import request from 'supertest';
import { app, makeUser, auth } from './helpers.js';
import StockMovement from '../src/models/StockMovement.js';
import Product from '../src/models/Product.js';

async function seedProducts(token, n = 3) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const r = await request(app).post('/api/products').set(auth(token)).send({
      sku: `S-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      name: `Item ${i}`, price: 10, cost: 4, qty: 100, reorderLevel: 5,
    });
    out.push(r.body.product);
  }
  return out;
}

describe('sales — the accountability core', () => {
  it('cashier checkout: number assigned, stock decremented, ledger written', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a, b] = await seedProducts(mgr.token, 2);

    const res = await request(app).post('/api/sales').set(auth(cashier.token)).send({
      lines: [
        { product: a._id, qty: 2 },
        { product: b._id, qty: 1 },
      ],
      discount: 1,
      paymentMethod: 'cash',
    });
    expect(res.status).toBe(201);
    const sale = res.body.sale;
    expect(sale.number).toBeGreaterThanOrEqual(1);
    expect(sale.total).toBe(29);            // 2*10 + 10 - 1
    expect(sale.status).toBe('COMPLETED');
    expect(sale.cashier.name).toBe(cashier.user.name);

    const p1 = (await request(app).get(`/api/products/${a._id}`).set(auth(mgr.token))).body.product;
    const p2 = (await request(app).get(`/api/products/${b._id}`).set(auth(mgr.token))).body.product;
    expect(p1.qty).toBe(98);
    expect(p2.qty).toBe(99);

    const movs = await StockMovement.find({ kind: 'SALE' });
    const saleMoves = movs.filter((m) => m.ref === String(sale.number));
    expect(saleMoves.length).toBe(2);
    expect(saleMoves.every((m) => String(m.by) === String(cashier.id))).toBe(true);
  });

  it('rejects selling more than stock', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a] = await seedProducts(mgr.token, 1);
    const res = await request(app).post('/api/sales').set(auth(cashier.token)).send({
      lines: [{ product: a._id, qty: 999 }],
    });
    expect(res.status).toBe(409);
    const p = (await request(app).get(`/api/products/${a._id}`).set(auth(mgr.token))).body.product;
    expect(p.qty).toBe(100); // nothing moved
  });

  it('discount above subtotal rejected', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a] = await seedProducts(mgr.token, 1);
    const res = await request(app).post('/api/sales').set(auth(cashier.token)).send({
      lines: [{ product: a._id, qty: 1 }], discount: 999,
    });
    expect(res.status).toBe(400);
  });

  it('full return: restocks, marks RETURNED, second return rejected', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a] = await seedProducts(mgr.token, 1);
    const sale = (await request(app).post('/api/sales').set(auth(cashier.token)).send({
      lines: [{ product: a._id, qty: 5 }],
    })).body.sale;
    expect((await Product.findById(a._id)).qty).toBe(95);

    const ret = await request(app).post(`/api/sales/${sale._id}/return`).set(auth(mgr.token))
      .send({ reason: 'damaged' });
    expect(ret.status).toBe(200);
    expect(ret.body.sale.status).toBe('RETURNED');
    expect((await Product.findById(a._id)).qty).toBe(100);

    const again = await request(app).post(`/api/sales/${sale._id}/return`).set(auth(mgr.token)).send({});
    expect(again.status).toBe(409);

    const returnMoves = await StockMovement.find({ kind: 'RETURN', ref: String(sale.number) });
    expect(returnMoves.length).toBe(1);
    expect(returnMoves[0].delta).toBe(5);
  });

  it('cashier cannot read sales history', async () => {
    const cashier = await makeUser('cashier');
    const res = await request(app).get('/api/sales').set(auth(cashier.token));
    expect(res.status).toBe(403);
  });

  it('dashboard shows today revenue', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a] = await seedProducts(mgr.token, 1);
    await request(app).post('/api/sales').set(auth(cashier.token)).send({
      lines: [{ product: a._id, qty: 3 }],
    });
    const res = await request(app).get('/api/dashboard').set(auth(mgr.token));
    expect(res.status).toBe(200);
    expect(res.body.todayRevenue).toBeGreaterThanOrEqual(30);
    expect(res.body.salesToday).toBeGreaterThanOrEqual(1);
  });

  it('parallel sales: unique numbers, no stock corruption', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const [a, b] = await seedProducts(mgr.token, 2);
    const sales = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app).post('/api/sales').set(auth(cashier.token)).send({
          lines: [{ product: a._id, qty: 1 }, { product: b._id, qty: 1 }],
        })
      )
    );
    expect(sales.every((s) => s.status === 201)).toBe(true);
    const numbers = sales.map((s) => s.body.sale.number);
    expect(new Set(numbers).size).toBe(8);
    const p1 = (await request(app).get(`/api/products/${a._id}`).set(auth(mgr.token))).body.product;
    expect(p1.qty).toBe(92);
  });
});
