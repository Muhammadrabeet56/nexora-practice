import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './auth.jsx';
import Layout from './Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import NewSale from './pages/NewSale.jsx';
import Sales from './pages/Sales.jsx';
import StockLedger from './pages/StockLedger.jsx';
import Users from './pages/Users.jsx';

function Guard({ roles, children }) {
  const { user } = useContext(AuthContext);
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Guard><Dashboard /></Guard>} />
        <Route path="/products" element={<Guard><Products /></Guard>} />
        <Route path="/pos" element={<Guard><NewSale /></Guard>} />
        <Route path="/sales" element={<Guard roles={['admin','manager']}><Sales /></Guard>} />
        <Route path="/ledger" element={<Guard roles={['admin','manager']}><StockLedger /></Guard>} />
        <Route path="/users" element={<Guard roles={['admin']}><Users /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
