import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { NotificationsProvider } from './lib/notifications.jsx';
import Toasts from './components/Toasts.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <NotificationsProvider>
        <App />
        <Toasts />
      </NotificationsProvider>
    </AuthProvider>
  </BrowserRouter>
);
