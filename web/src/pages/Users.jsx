import { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../auth.jsx';
import { api } from '../api.js';

const blank = { name: '', email: '', password: '', role: 'cashier' };

export default function Users() {
  const { user: me } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const r = await api.get('/auth/users');
    setUsers(r.data.users);
  }
  useEffect(() => { load().catch((e) => setErr(e.response?.data?.error || 'Load failed')); }, []);

  async function create(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    try {
      await api.post('/auth/register', form);
      setMsg(`${form.name} added as ${form.role}`);
      setForm(blank);
      load();
    } catch (e2) { setErr(e2.response?.data?.error || 'Create failed'); }
  }

  return (
    <div>
      <h1>Users</h1>
      <form className="card form-grid" onSubmit={create}>
        <h2>Add user</h2>
        {err && <div className="alert error">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="cashier">Cashier</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <button>Create</button>
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className={u._id === me.id ? 'row-muted' : ''}>
                <td>{u.name}{u._id === me.id ? ' (you)' : ''}</td><td>{u.email}</td><td><span className={'role role-' + u.role}>{u.role}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
