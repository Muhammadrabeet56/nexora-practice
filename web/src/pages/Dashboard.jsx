import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../auth.jsx';
import { api } from '../api.js';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setStats(r.data))
      .catch((e) => setErr(e.response?.data?.error || 'Failed to load dashboard'));
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted">Welcome back, {user?.name}.</p>
      {err && <div className="alert error">{err}</div>}
      {stats ? (
        <>
          <div className="stat-grid">
            <div className="stat"><span>Today's revenue</span><b>${stats.todayRevenue.toFixed(2)}</b></div>
            <div className="stat"><span>Sales today</span><b>{stats.salesToday}</b></div>
            <div className="stat"><span>Products</span><b>{stats.productCount}</b></div>
            <div className="stat"><span>Low stock</span><b className={stats.lowStock.length ? 'bad' : ''}>{stats.lowStock.length}</b></div>
          </div>
          {stats.lowStock.length > 0 && (
            <div className="card">
              <h2>⚠️ Low stock</h2>
              <table>
                <thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Reorder at</th></tr></thead>
                <tbody>
                  {stats.lowStock.map((p) => (
                    <tr key={p._id}><td>{p.sku}</td><td>{p.name}</td><td className="bad">{p.qty}</td><td>{p.reorderLevel}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : !err && <p className="muted">Loading…</p>}
    </div>
  );
}
