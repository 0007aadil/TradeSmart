import NotificationBell from '../NotificationBell.jsx';

export default function MobileHeader({ title, leading, trailing }) {
  return (
    <header className="mhead">
      <div className="mhead-leading">
        {leading || <div className="mhead-logo">TradeSmart</div>}
      </div>
      <div className="mhead-title">{title}</div>
      <div className="mhead-trailing">
        {trailing || <NotificationBell />}
      </div>
    </header>
  );
}
