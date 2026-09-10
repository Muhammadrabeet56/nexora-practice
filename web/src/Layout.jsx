import { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from './auth.jsx';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/products', label: 'Products' },
  { to: '/pos', label: 'New Sale' },
  { to: '/sales', label: 'Sales', roles: ['admin', 'manager'] },
  { to: '/ledger', label: 'Stock Ledger', roles: ['admin', 'manager'] },
  { to: '/users', label: 'Users', roles: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const nav = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">⚡ NexoraPOS</div>
        <nav>
          {links
            .filter((l) => !l.roles || l.roles.includes(user?.role))
            .map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-foot">
          {user && (
            <>
              <div className="who">
                {user.name}
                <span className={'role role-' + user.role}>{user.role}</span>
              </div>
              <button onClick={() => { logout(); nav('/login'); }}>Sign out</button>
            </>
          )}
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
