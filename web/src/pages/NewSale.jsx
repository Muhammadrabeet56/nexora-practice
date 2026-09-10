import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

export default function NewSale() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); // [{_id, sku, name, price, qty}]
  const [q, setQ] = useState('');
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('cash');
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    api.get('/products').then((r) => setProducts(r.data.products)).catch(() => {});
  }, []);

  const matches = useMemo(() => {
    if (!q) return products.slice(0, 8);
    const lower = q.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)).slice(0, 8);
  }, [q, products]);

  function add(p) {
    setErr('');
    setCart((c) => {
      const found = c.find((i) => i._id === p._id);
      if (found) {
        if (found.qty + 1 > p.qty) { setErr(`Only ${p.qty} in stock`); return c; }
        return c.map((i) => (i._id === p._id ? { ...i, qty: i.qty + 1 } : i));
      }
      if (p.qty < 1) { setErr('Out of stock'); return c; }
      return [...c, { _id: p._id, sku: p.sku, name: p.name, price: p.price, qty: 1, stock: p.qty }];
    });
  }

  function setQty(id, qty) {
    setCart((c) => c.map((i) => {
      if (i._id !== id) return i;
      if (qty < 1) return i;
      if (qty > i.stock) { setErr(`Only ${i.stock} in stock`); return i; }
      return { ...i, qty };
    }));
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const total = Math.max(0, subtotal - (discount || 0));

  async function checkout() {
    if (!cart.length) return;
    setErr('');
    try {
      const res = await api.post('/sales', {
        lines: cart.map((i) => ({ product: i._id, qty: i.qty })),
        discount: +discount || 0,
        paymentMethod: method,
      });
      setReceipt(res.data.sale);
      setCart([]); setDiscount(0); setQ('');
      api.get('/products').then((r) => setProducts(r.data.products));
    } catch (e2) {
      setErr(e2.response?.data?.error || 'Checkout failed');
    }
  }

  if (receipt) {
    return (
      <div className="pos-receipt card">
        <h1>✅ Sale #{String(receipt.number).padStart(5, '0')}</h1>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Sum</th></tr></thead>
          <tbody>
            {receipt.lineItems.map((l, i) => (
              <tr key={i}><td>{l.name}</td><td>{l.qty}</td><td>${l.unitPrice.toFixed(2)}</td><td>${(l.qty * l.unitPrice).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="totals">
          <div>Subtotal: ${receipt.subtotal.toFixed(2)}</div>
          <div>Discount: −${receipt.discount.toFixed(2)}</div>
          <div className="grand">Total: ${receipt.total.toFixed(2)} ({receipt.paymentMethod})</div>
        </div>
        <button onClick={() => setReceipt(null)}>New sale</button>
      </div>
    );
  }

  return (
    <div className="pos-grid">
      <div>
        <h1>New Sale</h1>
        <input className="pos-search" autoFocus placeholder="Scan or search product…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="pos-list">
          {matches.map((p) => (
            <button key={p._id} className="pos-item" onClick={() => add(p)} disabled={p.qty < 1}>
              <b>{p.name}</b>
              <span className="muted">{p.sku} · {p.qty} in stock</span>
              <span className="price">${p.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
        {err && <div className="alert error">{err}</div>}
      </div>

      <div className="pos-cart card">
        <h2>Cart</h2>
        {cart.length === 0 && <p className="muted">Tap products to add.</p>}
        {cart.map((i) => (
          <div key={i._id} className="cart-line">
            <span>{i.name}</span>
            <input type="number" min="1" max={i.stock} value={i.qty} onChange={(e) => setQty(i._id, +e.target.value)} />
            <span>${(i.price * i.qty).toFixed(2)}</span>
            <button className="mini danger" onClick={() => setCart(cart.filter((x) => x._id !== i._id))}>×</button>
          </div>
        ))}
        <div className="totals">
          <label>Discount $
            <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </label>
          <div>Subtotal: ${subtotal.toFixed(2)}</div>
          <div className="grand">Total: ${total.toFixed(2)}</div>
        </div>
        <div className="row">
          {['cash', 'card', 'mobile'].map((m) => (
            <label key={m} className={'pay ' + (method === m ? 'on' : '')}>
              <input type="radio" name="pay" checked={method === m} onChange={() => setMethod(m)} /> {m}
            </label>
          ))}
        </div>
        <button className="big" disabled={!cart.length} onClick={checkout}>Charge ${total.toFixed(2)}</button>
      </div>
    </div>
  );
}
