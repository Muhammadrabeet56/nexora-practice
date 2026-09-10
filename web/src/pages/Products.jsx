import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../auth.jsx';
import { api } from '../api.js';

const blank = { sku: '', name: '', category: '', price: '', cost: '', qty: '', reorderLevel: '', supplier: '' };
const canEdit = (r) => r === 'admin' || r === 'manager';

export default function Products() {
  const { user } = useContext(AuthContext);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const params = {};
    if (q) params.q = q;
    if (lowOnly) params.low = 'true';
    const r = await api.get('/products', { params });
    setRows(r.data.products);
  }
  useEffect(() => { load().catch(() => {}); }, [q, lowOnly]); // eslint-disable-line

  async function save(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      if (editing) {
        await api.put(`/products/${editing}`, { ...form, price: +form.price, cost: +form.cost, reorderLevel: +form.reorderLevel });
        setMsg('Product updated');
      } else {
        await api.post('/products', { ...form, price: +form.price, cost: +form.cost, qty: +form.qty, reorderLevel: +form.reorderLevel });
        setMsg('Product created');
      }
      setForm(blank); setEditing(null);
      load();
    } catch (e2) { setErr(e2.response?.data?.error || 'Save failed'); }
  }

  async function adjust(id, delta) {
    await api.post(`/products/${id}/adjust`, { delta, note: delta > 0 ? 'received stock' : 'stock removed' });
    load();
  }

  async function remove(id) {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    load();
  }

  function edit(p) {
    setEditing(p._id);
    setForm({ sku: p.sku, name: p.name, category: p.category, price: p.price, cost: p.cost, qty: p.qty, reorderLevel: p.reorderLevel, supplier: p.supplier });
  }

  return (
    <div>
      <h1>Products</h1>
      {canEdit(user.role) && (
        <form className="card form-grid" onSubmit={save}>
          <h2>{editing ? 'Edit product' : 'New product'}</h2>
          {err && <div className="alert error">{err}</div>}
          {msg && <div className="alert ok">{msg}</div>}
          <input placeholder="SKU *" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} disabled={!!editing} required />
          <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input placeholder="Price *" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <input placeholder="Cost" type="number" step="0.01" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          {!editing && <input placeholder="Opening qty" type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} />}
          <input placeholder="Reorder level" type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
          <input placeholder="Supplier" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <div className="row">
            <button>{editing ? 'Update' : 'Create'}</button>
            {editing && <button type="button" className="ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>}
          </div>
        </form>
      )}

      <div className="toolbar">
        <input placeholder="Search name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="check"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} /> low stock only</label>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Cost</th><th>Qty</th><th>Reorder</th>{canEdit(user.role) && <th>Actions</th>}</tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id} className={p.qty <= p.reorderLevel ? 'row-low' : ''}>
                <td>{p.sku}</td><td>{p.name}</td><td>{p.category}</td>
                <td>${p.price.toFixed(2)}</td><td>${p.cost.toFixed(2)}</td>
                <td className={p.qty <= p.reorderLevel ? 'bad' : ''}>{p.qty}</td><td>{p.reorderLevel}</td>
                {canEdit(user.role) && (
                  <td className="row-actions">
                    <button className="mini" onClick={() => adjust(p._id, 1)}>+1</button>
                    <button className="mini" onClick={() => adjust(p._id, -1)}>−1</button>
                    <button className="mini" onClick={() => edit(p)}>Edit</button>
                    {user.role === 'admin' && <button className="mini danger" onClick={() => remove(p._id)}>Del</button>}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="8" className="muted">No products found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
