import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Users, FileText, TrendingUp, FileCheck, Calendar, Image, FileType, Settings } from 'lucide-react';

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
      // Vite dev server - try backend ports 5001 (common fallback) or 5000
      // Check localStorage for saved port, otherwise default to 5001
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      // Default to 5001 (common when 5000 is busy)
      return 'http://localhost:5000';
    }
    // Production or already on backend server
    return window.location.origin;
  };

  const [defaultTabLabel, setDefaultTabLabel] = useState('Main Dashboard');

  // Fetch user's default tab preference
  useEffect(() => {
    const fetchDefaultTab = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const backendUrl = window.location.port === '3000'
          ? `http://localhost:${localStorage.getItem('backend_port') || '5000'}`
          : window.location.origin;

        const response = await fetch(`${backendUrl}/api/settings/preferences`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data.defaultTab) {
            // Map defaultTab value to display label
            const tabLabels = {
              'overview': 'Main Dashboard',
              'posts': 'Posts',
              'calendar': 'Calendar',
              'analytics': 'Analytics',
              'reports': 'Reports',
              'clients': 'Clients'
            };
            setDefaultTabLabel(tabLabels[result.data.defaultTab] || 'Main Dashboard');
          }
        }
      } catch (error) {
        console.error('Error fetching default tab:', error);
      }
    };

    fetchDefaultTab();
  }, [location.pathname]); // Re-fetch when route changes

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: defaultTabLabel, path: '/dashboard' },
    { icon: Users, label: 'Clients', path: '/dashboard/clients' },
    { icon: FileText, label: 'Posts', path: '/dashboard/posts' },
    { icon: Calendar, label: 'Calendar', path: '/dashboard/calendar' },
    { icon: TrendingUp, label: 'Analytics', path: '/dashboard/analytics' },
    { icon: FileCheck, label: 'Reports', path: '/dashboard/reports' },
    { icon: Settings, label: 'Settings', path: '/dashboard/settings' },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-64' : 'w-0 lg:w-64'
          } bg-white border-r border-gray-200 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 lg:flex lg:flex-col fixed lg:static inset-y-0 left-0 z-50 lg:z-auto`}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-center">
          <img
            src="/dashboard/assets/logo.png"
            alt="HarisandCo"
            className="h-12 w-auto object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://harisand.co/static/media/NewLogo.fc59d5f2c088d6861458.png';
            }}
          />
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
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
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1 lg:flex-none"></div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{userName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors border border-red-200"
              title="Logout"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline text-sm">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;
