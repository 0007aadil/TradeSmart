import { NavLink } from 'react-router-dom';

function Icon({ name }) {
  const c = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return (<svg {...c}><path d="M3 12l9-9 9 9" /><path d="M5 10v11h14V10" /></svg>);
    case 'portfolio':
      return (<svg {...c}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></svg>);
    case 'orders':
      return (<svg {...c}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>);
    case 'profile':
      return (<svg {...c}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>);
    default: return null;
  }
}

export default function MobileNav() {
  return (
    <nav className="mnav">
      <NavLink to="/dashboard" className={({ isActive }) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Icon name="home" />
        <span>Markets</span>
      </NavLink>
      <NavLink to="/portfolio" className={({ isActive }) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Icon name="portfolio" />
        <span>Portfolio</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Icon name="orders" />
        <span>Orders</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `mnav-item ${isActive ? 'active' : ''}`}>
        <Icon name="profile" />
        <span>Profile</span>
      </NavLink>
    </nav>
  );
}
