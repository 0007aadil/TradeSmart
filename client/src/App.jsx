import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Portfolio from './pages/Portfolio.jsx';
import OrderHistory from './pages/OrderHistory.jsx';
import MobileDashboard from './pages/mobile/MobileDashboard.jsx';
import MobilePortfolio from './pages/mobile/MobilePortfolio.jsx';
import MobileOrders from './pages/mobile/MobileOrders.jsx';
import MobileProfile from './pages/mobile/MobileProfile.jsx';
import { useAuth } from './lib/auth.jsx';
import { useIsMobile } from './lib/useMediaQuery.js';

function Protected({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Responsive({ desktop, mobile }) {
  const isMobile = useIsMobile();
  return isMobile ? mobile : desktop;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/dashboard"
        element={<Protected><Responsive desktop={<Dashboard />} mobile={<MobileDashboard />} /></Protected>}
      />
      <Route
        path="/portfolio"
        element={<Protected><Responsive desktop={<Portfolio />} mobile={<MobilePortfolio />} /></Protected>}
      />
      <Route
        path="/orders"
        element={<Protected><Responsive desktop={<OrderHistory />} mobile={<MobileOrders />} /></Protected>}
      />
      <Route
        path="/profile"
        element={<Protected><MobileProfile /></Protected>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
