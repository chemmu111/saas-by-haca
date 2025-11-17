import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary.jsx';
import Dashboard from './Dashboard.jsx';
import Clients from './Clients.jsx';
import Posts from './Posts.jsx';
import Analytics from './Analytics.jsx';
import Reports from './Reports.jsx';
import Login from './Login.jsx';
import Signup from './Signup.jsx';
import ResetPassword from './ResetPassword.jsx';
import AdminHome from './AdminHome.jsx';
import ManagerHome from './ManagerHome.jsx';

// Helper function to get backend URL
const getBackendUrl = () => {
  // In production, use the same origin
  // In development, try to detect the backend port
  if (window.location.port === '3000') {
    // Vite dev server - try backend ports 5000 (standard) or 5001 (fallback)
    // Check localStorage for saved port, otherwise default to 5000
    const savedPort = localStorage.getItem('backend_port');
    if (savedPort) {
      return `http://localhost:${savedPort}`;
    }
    // Default to 5000 (backend standard port)
    return 'http://localhost:5000';
  }
  // Production or already on backend server
  return window.location.origin;
};

// Component to handle authentication check
const AuthGuard = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    // Normalize pathname (remove /dashboard prefix if present)
    const normalizedPath = location.pathname.replace(/^\/dashboard/, '') || '/';
    const publicRoutes = ['/login', '/signup', '/reset-password'];
    const isPublicRoute = publicRoutes.includes(normalizedPath);
    
    // If no token and trying to access protected routes, redirect to login
    if (!token && !isPublicRoute && (normalizedPath.startsWith('/dashboard') || normalizedPath === '/')) {
      window.location.href = '/login';
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
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Role-specific home pages */}
            <Route path="/admin-home" element={<AdminHome />} />
            <Route path="/social-media-manager-home" element={<ManagerHome />} />
            
            {/* Dashboard routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/clients" element={<Clients />} />
            <Route path="/dashboard/posts" element={<Posts />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
            <Route path="/dashboard/reports" element={<Reports />} />
            <Route path="/clients" element={<Clients />} />
            
            {/* Default route */}
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

