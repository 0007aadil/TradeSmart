import { useNavigate } from 'react-router-dom';
import MobileNav from '../../components/mobile/MobileNav.jsx';
import MobileHeader from '../../components/mobile/MobileHeader.jsx';
import { useAuth } from '../../lib/auth.jsx';
import { disconnectSocket } from '../../lib/socket.js';

export default function MobileProfile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  function doLogout() {
    disconnectSocket(); logout(); nav('/');
  }

  return (
    <div className="mshell">
      <MobileHeader title="Profile" />
      <div className="mbody">
        <div className="mprof-hero">
          <div className="mprof-avatar">{initial}</div>
          <div className="mprof-name">{user?.name}</div>
          <div className="mprof-email">{user?.email}</div>
        </div>
        <div className="mlist-section">Account</div>
        <div className="mprof-row">
          <span>Virtual cash</span>
          <strong>$100,000 starting</strong>
        </div>
        <div className="mprof-row">
          <span>Mode</span>
          <strong>Simulated trading</strong>
        </div>
        <div className="mlist-section">Session</div>
        <button className="mprof-action danger" onClick={doLogout}>Log out</button>
      </div>
      <MobileNav />
    </div>
  );
}
