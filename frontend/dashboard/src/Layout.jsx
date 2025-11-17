import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Users, FileText, TrendingUp, FileCheck } from 'lucide-react';

const Layout = ({ children }) => {
  const [userName, setUserName] = useState('User');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 1024;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get user name from token
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          setUserName(payload.name || 'User');
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }
    }

    // Handle window resize for responsive sidebar
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const handleSignOut = () => {
    localStorage.removeItem('auth_token');
    // Redirect to login page (outside React Router) on backend server
    const backendUrl = getBackendUrl();
    window.location.href = `${backendUrl}/login.html`;
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
    { icon: Users, label: 'Clients', path: '/dashboard/clients' },
    { icon: FileText, label: 'Posts', path: '/dashboard/posts' },
    { icon: TrendingUp, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: FileCheck, label: 'Reports', path: '/dashboard/reports' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-64'
        } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 lg:flex lg:flex-col fixed lg:static inset-y-0 left-0 z-50 lg:z-auto`}
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Social Manager</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={index}
                onClick={() => {
                  if (item.external) {
                    window.location.href = item.path;
                  } else {
                    navigate(item.path);
                  }
                  if (window.innerWidth < 1024) {
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-gray-700 font-medium hidden sm:block">{userName}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-4 lg:px-6 py-4">
          <div className="flex justify-end">
            <p className="text-sm text-gray-500">Made in Bolt</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;

