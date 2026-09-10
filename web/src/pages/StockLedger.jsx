import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function StockLedger() {
  const [rows, setRows] = useState([]);
  const [kind, setKind] = useState('');
  const [err, setErr] = useState('');

  async function load() {
    setErr('');
    try {
      const params = {};
      if (kind) params.kind = kind;
      const r = await api.get('/stock-movements', { params });
      setRows(r.data.movements);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to load ledger'); }
  }
  useEffect(() => { load().catch((e) => setErr(e.response?.data?.error || 'Load failed')); }, [kind]); // eslint-disable-line

  const kindClass = (k) => (k === 'SALE' ? 'bad' : k === 'RETURN' ? 'ok' : 'muted');

  return (
    <div>
      <h1>Stock Ledger</h1>
      <p className="muted">Every stock change, attributed — who, what, when, why. The accountability record.</p>
      <div className="toolbar">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All kinds</option>
          <option value="SALE">Sales</option>
          <option value="RETURN">Returns</option>
          <option value="ADJUST">Adjustments</option>
          <option value="RECEIVE">Receives</option>
        </select>
      </div>
      {err && <div className="alert error">{err}</div>}
      <div className="card">
        <table>
          <thead><tr><th>When</th><th>Product</th><th>Kind</th><th>Δ</th><th>Ref</th><th>By</th><th>Note</th></tr></thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.date).toLocaleString()}</td>
                <td>{m.product ? `${m.product.sku} — ${m.product.name}` : '—'}</td>
                <td><span className={`role ${kindClass(m.kind)}`}>{m.kind}</span></td>
                <td className={m.delta < 0 ? 'bad' : ''}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                <td>{m.ref || '—'}</td>
                <td>{m.by}</td>
                <td className="muted">{m.note || '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="7" className="muted">No movements yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}