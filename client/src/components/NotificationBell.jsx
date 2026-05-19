import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../lib/notifications.jsx';

export default function NotificationBell() {
  const { items, unread, markRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function click(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', click);
    return () => document.removeEventListener('mousedown', click);
  }, []);

  function toggle() {
    setOpen((o) => {
      if (!o) markRead();
      return !o;
    });
  }

  return (
    <div className="bell" ref={ref}>
      <button className="bell-btn" onClick={toggle} aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-dropdown">
          <div className="bell-head">
            <strong>Notifications</strong>
            {items.length > 0 && <button className="bell-clear" onClick={clear}>Clear</button>}
          </div>
          {items.length === 0 && <div className="bell-empty">No notifications yet.</div>}
          {items.slice(0, 10).map((n) => (
            <div key={n.id} className={`bell-item ${n.kind || ''}`}>
              <div className="bell-msg">{n.message}</div>
              <div className="bell-time">{new Date(n.ts).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
