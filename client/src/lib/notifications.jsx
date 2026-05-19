import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSocket } from './socket.js';
import { useAuth } from './auth.jsx';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [toasts, setToasts] = useState([]);

  const push = useCallback((n) => {
    const note = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: n.ts || Date.now(),
      kind: n.kind || 'info',
      message: n.message,
    };
    setItems((cur) => [note, ...cur].slice(0, 50));
    setUnread((u) => u + 1);
    setToasts((cur) => [...cur, note]);
    setTimeout(() => setToasts((cur) => cur.filter((t) => t.id !== note.id)), 4500);
  }, []);

  useEffect(() => {
    if (!token) return;
    const s = getSocket(token);
    const onNote = (n) => push(n);
    s.on('user-notification', onNote);
    return () => { s.off('user-notification', onNote); };
  }, [token, push]);

  const value = {
    items, unread, toasts, push,
    markRead: () => setUnread(0),
    clear: () => { setItems([]); setUnread(0); },
    dismissToast: (id) => setToasts((cur) => cur.filter((t) => t.id !== id)),
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export const useNotifications = () => useContext(NotificationsContext);
