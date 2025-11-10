import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary.jsx';
import Dashboard from './Dashboard.jsx';
import Clients from './Clients.jsx';
import Posts from './Posts.jsx';
import Analytics from './Analytics.jsx';
import Reports from './Reports.jsx';

// Helper function to get backend URL
const getBackendUrl = () => {
  // In production, use the same origin
  // In development, try to detect the backend port
  if (window.location.port === '3000') {
    // Vite dev server - try backend ports 5001 (common fallback) or 5000
    // Check localStorage for saved port, otherwise default to 5001
    const savedPort = localStorage.getItem('backend_port');
    if (savedPort) {
      return `http://localhost:${savedPort}`;
    }
    // Default to 5001 (common when 5000 is busy)
    return 'http://localhost:5001';
  }
  // Production or already on backend server
  return window.location.origin;
};

// Component to handle authentication check
const AuthGuard = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    // If no token and trying to access dashboard routes, redirect to login
    if (!token && location.pathname.startsWith('/dashboard')) {
      const backendUrl = getBackendUrl();
      window.location.href = `${backendUrl}/login.html`;
    }
  }, [location]);

  return children;
};

const App = () => {
  console.log('App component rendering, current path:', window.location.pathname);
  
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthGuard>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/clients" element={<Clients />} />
            <Route path="/dashboard/posts" element={<Posts />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Catch-all route - redirect unmatched routes to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

