import request from 'supertest';
import { app, makeUser, auth } from './helpers.js';
import StockMovement from '../src/models/StockMovement.js';

const productData = () => ({
  sku: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: 'Test Product',
  price: 9.99,
  cost: 4.5,
  qty: 10,
  reorderLevel: 3,
});

describe('products', () => {
  it('manager can create product; initial stock lands in ledger', async () => {
    const mgr = await makeUser('manager');
    const res = await request(app).post('/api/products').set(auth(mgr.token)).send(productData());
    expect(res.status).toBe(201);
    const movs = await StockMovement.find({ product: res.body.product._id });
    expect(movs.length).toBe(1);
    expect(movs[0].kind).toBe('RECEIVE');
    expect(movs[0].delta).toBe(10);
  });

  it('cashier cannot create products', async () => {
    const cashier = await makeUser('cashier');
    const res = await request(app).post('/api/products').set(auth(cashier.token)).send(productData());
    expect(res.status).toBe(403);
  });

  it('duplicate SKU rejected with 409', async () => {
    const mgr = await makeUser('manager');
    const d = productData();
    await request(app).post('/api/products').set(auth(mgr.token)).send(d);
    const res = await request(app).post('/api/products').set(auth(mgr.token)).send(d);
    expect(res.status).toBe(409);
  });

  it('cashier can list and search products', async () => {
    const mgr = await makeUser('manager');
    const cashier = await makeUser('cashier');
    const d = productData(); d.name = 'Coca Cola Zero';
    await request(app).post('/api/products').set(auth(mgr.token)).send(d);
    const res = await request(app).get('/api/products?q=coca').set(auth(cashier.token));
    expect(res.status).toBe(200);
    expect(res.body.products.some(p => p.name === 'Coca Cola Zero')).toBe(true);
  });

  it('unauthenticated requests rejected', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('adjust changes qty and ALWAYS writes ledger', async () => {
    const mgr = await makeUser('manager');
    const p = (await request(app).post('/api/products').set(auth(mgr.token)).send(productData())).body.product;
    const res = await request(app).post(`/api/products/${p._id}/adjust`).set(auth(mgr.token))
      .send({ delta: -4, note: 'damaged in storage' });
    expect(res.status).toBe(200);
    expect(res.body.product.qty).toBe(6);
    const movs = await StockMovement.find({ product: p._id, kind: 'ADJUST' });
    expect(movs.length).toBe(1);
    expect(movs[0].delta).toBe(-4);
    expect(movs[0].note).toBe('damaged in storage');
  });

  it('adjust to negative stock rejected', async () => {
    const mgr = await makeUser('manager');
    const p = (await request(app).post('/api/products').set(auth(mgr.token)).send(productData())).body.product;
    const res = await request(app).post(`/api/products/${p._id}/adjust`).set(auth(mgr.token))
      .send({ delta: -99 });
    expect(res.status).toBe(400);
  });

  it('put ignores qty (ledger is the only stock door)', async () => {
    const mgr = await makeUser('manager');
    const p = (await request(app).post('/api/products').set(auth(mgr.token)).send(productData())).body.product;
    const res = await request(app).put(`/api/products/${p._id}`).set(auth(mgr.token))
      .send({ qty: 999, price: 12.5 });
    expect(res.status).toBe(200);
    expect(res.body.product.qty).toBe(10);   // unchanged
    expect(res.body.product.price).toBe(12.5);
  });

  it('low stock filter works', async () => {
    const mgr = await makeUser('manager');
    const d = productData(); d.qty = 1; d.reorderLevel = 5;
    const low = (await request(app).post('/api/products').set(auth(mgr.token)).send(d)).body.product;
    const res = await request(app).get('/api/products?low=true').set(auth(mgr.token));
    expect(res.body.products.some(p => String(p._id) === String(low._id))).toBe(true);
  });
});
