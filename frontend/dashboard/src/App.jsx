import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
  // Check for environment variable first (production)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Development mode - Vite dev server
  if (window.location.port === '3000') {
    // Check localStorage for saved port, otherwise default to 5000
    const savedPort = localStorage.getItem('backend_port');
    if (savedPort) {
      return `http://localhost:${savedPort}`;
    }
    // Default to 5000 (your backend port)
    return 'http://localhost:5000';
  }
  // Fallback to same origin
  return window.location.origin;
};

// LAZY LOAD auth components to ensure Router is ready
const Login = lazy(() => import('../../auth/Login.jsx'));
const Signup = lazy(() => import('../../auth/Signup.jsx'));

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
    if (token && isTokenExpired(token)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_info');
      // Use replace to prevent back button and cleanly destroy Router context
      window.location.replace('/login');
    }
  }, [token, location]);

  if (!token && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but it's expired (and useEffect hasn't fired yet), don't render children
  if (token && isTokenExpired(token)) {
    return null; // or loading spinner
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
    <AuthGuard>
      <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary><Signup /></ErrorBoundary>} />
          <Route path="/dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
          <Route path="/dashboard/clients" element={<ErrorBoundary><Clients /></ErrorBoundary>} />
          <Route path="/dashboard/clients/:clientId" element={<ErrorBoundary><ClientDashboard /></ErrorBoundary>} />
          <Route path="/dashboard/posts" element={<ErrorBoundary><Posts /></ErrorBoundary>} />
          <Route path="/dashboard/calendar" element={<ErrorBoundary><Calendar /></ErrorBoundary>} />
          <Route path="/dashboard/analytics" element={<ErrorBoundary><Analytics /></ErrorBoundary>} />
          <Route path="/dashboard/reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
          <Route path="/dashboard/settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
          <Route path="/dashboard/admin/tokens" element={<ErrorBoundary><AdminTokenMonitor /></ErrorBoundary>} />
          <Route path="/clients" element={<ErrorBoundary><Clients /></ErrorBoundary>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<ErrorBoundary><NotFound /></ErrorBoundary>} />
        </Routes>
      </Suspense>
    </AuthGuard>
  );
};

export default App;

