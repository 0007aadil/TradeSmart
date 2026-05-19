import { useNotifications } from '../lib/notifications.jsx';

export default function Toasts() {
  const ctx = useNotifications();
  if (!ctx) return null;
  const { toasts, dismissToast } = ctx;
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`} onClick={() => dismissToast(t.id)}>
          <div className="toast-msg">{t.message}</div>
        </div>
      ))}
    </div>
  );
}
