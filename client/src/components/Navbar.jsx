import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { disconnectSocket } from '../lib/socket.js';
import SymbolSearch from './SymbolSearch.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar({ onSearchSelect }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function click(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  function doLogout() {
    disconnectSocket();
    logout();
    nav('/');
  }

  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  return (
    <div className="navbar">
      <div className="logo">TradeSmart</div>
      <div className="nav-links">
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
        <NavLink to="/portfolio" className={({ isActive }) => (isActive ? 'active' : '')}>Portfolio</NavLink>
        <NavLink to="/orders" className={({ isActive }) => (isActive ? 'active' : '')}>Orders</NavLink>
      </div>
      <div className="spacer" />
      {onSearchSelect && <SymbolSearch onSelect={onSearchSelect} />}
      <NotificationBell />
      <div className="profile" ref={menuRef}>
        <button className="avatar" onClick={() => setMenu((m) => !m)} aria-label="Account menu">{initial}</button>
        {menu && (
          <div className="profile-menu">
            <div className="profile-info">
              <div className="profile-name">{user?.name}</div>
              <div className="profile-email">{user?.email}</div>
            </div>
            <button className="profile-action" onClick={doLogout}>Logout</button>
          </div>
        )}
      </div>
    </div>
  );
}
