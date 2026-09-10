import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/sales').then((r) => setSales(r.data.sales)).catch((e) => setErr(e.response?.data?.error || 'Load failed'));
  }, []);

  async function refund(id) {
    if (!confirm('Return this entire sale and restock items?')) return;
    try {
      await api.post(`/sales/${id}/return`, { reason: 'customer return' });
      const r = await api.get('/sales');
      setSales(r.data.sales);
    } catch (e2) { setErr(e2.response?.data?.error || 'Return failed'); }
  }

  return (
    <div>
      <h1>Sales</h1>
      {err && <div className="alert error">{err}</div>}
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>When</th><th>Items</th><th>Total</th><th>Payment</th><th>Cashier</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s._id} className={s.status === 'RETURNED' ? 'row-muted' : ''}>
                <td>{String(s.number).padStart(5, '0')}</td>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.lineItems.reduce((a, l) => a + l.qty, 0)}</td>
                <td>${s.total.toFixed(2)}</td>
                <td>{s.paymentMethod}</td>
                <td>{s.cashier?.name || '—'}</td>
                <td>{s.status === 'RETURNED' ? '↩️ returned' : '✓ completed'}</td>
                <td>{s.status !== 'RETURNED' && <button className="mini" onClick={() => refund(s._id)}>Return</button>}</td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan="8" className="muted">No sales yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
