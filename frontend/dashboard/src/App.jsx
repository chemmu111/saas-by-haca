import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary.jsx';
import Dashboard from './Dashboard.jsx';
import Clients from './Clients.jsx';
import ClientDashboard from './ClientDashboard.jsx';
import Posts from './Posts.jsx';
import Calendar from './Calendar.jsx';
import Analytics from './Analytics.jsx';
import Reports from './Reports.jsx';
import Settings from './Settings.jsx';
import AdminTokenMonitor from './AdminTokenMonitor.jsx';
import NotFound from './NotFound.jsx';

// Helper function to get backend URL
const getBackendUrl = () => {
  // 1. Force correct backend for custom domain (socialhac.com)
  if (window.location.hostname.includes('socialhac.com')) {
    return 'https://haca-social-x-backend.onrender.com';
  }

  // 2. Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }

  // 3. Development mode - Vite dev server
  if (window.location.port === '3000' || window.location.hostname === 'localhost') {
    const savedPort = localStorage.getItem('backend_port') || '5000';
    return `http://localhost:${savedPort}`;
  }

  // 4. Fallback
  return 'https://haca-social-x-backend.onrender.com';
};

import Login from './components/auth/Login.jsx';
import Signup from './components/auth/Signup.jsx';

// Helper to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
};

// Component to handle authentication check
const AuthGuard = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');
  const publicPaths = ['/login', '/signup'];

  useEffect(() => {
    // Initial check (only runs once on mount)
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }

    // Periodic check every minute
    const intervalId = setInterval(() => {
      const currentToken = localStorage.getItem('auth_token');
      // If token exists and is expired (and we're not already on login page)
      if (currentToken && isTokenExpired(currentToken)) {
        console.log('Token expired, logging out...');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }, 60000); // Check every 1 minute

    return () => clearInterval(intervalId);
  }, [token]); // dependency on token is enough, location not needed for interval

  if (!token && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but it's expired (and useEffect hasn't fired yet), don't render children
  if (token && isTokenExpired(token)) {
    return null;
  }

  // If authenticated and trying to access login/signup, redirect to dashboard
  if (token && publicPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  console.log('App component rendering, current path:', window.location.pathname);

  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  );
};

// Separate component to use router hooks - MUST be inside BrowserRouter
const AppRoutes = () => {
  return (
    <AuthGuard>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/clients" element={<Clients />} />
        <Route path="/dashboard/clients/:clientId" element={<ClientDashboard />} />
        <Route path="/dashboard/posts" element={<Posts />} />
        <Route path="/dashboard/calendar" element={<Calendar />} />
        <Route path="/dashboard/analytics" element={<Analytics />} />
        <Route path="/dashboard/reports" element={<Reports />} />
        <Route path="/dashboard/settings" element={<Settings />} />
        <Route path="/dashboard/admin/tokens" element={<AdminTokenMonitor />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {/* Catch-all route - show custom 404 page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGuard>
  );
};

export default App;
