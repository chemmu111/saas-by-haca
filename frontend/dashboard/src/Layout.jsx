import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard, Users, FileText, TrendingUp, FileCheck, Calendar, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import logoWhite from './assets/social_x_logo_white.svg';
import ConfirmationModal from './components/ConfirmationModal.jsx';

const Layout = ({ children }) => {
  const [userName, setUserName] = useState('User');
  const [userAvatar, setUserAvatar] = useState('');
  const [userRole, setUserRole] = useState('Social Manager');
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('sidebar_expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const updateUserInfo = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        // Try to get info from localStorage first as it has the avatar
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        const parts = token.split('.');
        let payload = {};

        if (parts.length === 3) {
          payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        } else {
          // Fallback if token invalid but userInfo exists
          if (userInfo.name) payload = userInfo;
        }

        setUserName(userInfo.name || payload.name || 'User');
        setUserAvatar(userInfo.avatar || '');
        setUserRole(userInfo.role || payload.role || 'Social Manager');
      } catch (e) {
        console.error('Error decoding user info:', e);
      }
    }
  };

  useEffect(() => {
    updateUserInfo();
    window.addEventListener('user-info-updated', updateUserInfo);
    return () => window.removeEventListener('user-info-updated', updateUserInfo);
  }, []);

  // Helper function to get backend URL
  const getBackendUrl = () => {
    // In production, use the same origin
    // In development, try to detect the backend port
    if (window.location.port === '3000' || window.location.port === '5173') {
      // Vite dev server - try backend ports 5001 (common fallback) or 5000
      // Check localStorage for saved port, otherwise default to 5001
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      // Default to 5001 (common when 5000 is busy)
      return 'http://localhost:5000';
    }
    // Production fallback - use actual backend URL
    return 'https://haca-social-x-backend.onrender.com';
  };

  const [defaultTabLabel, setDefaultTabLabel] = useState('Main Dashboard');

  // Fetch user's default tab preference
  useEffect(() => {
    const fetchDefaultTab = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const backendUrl = getBackendUrl();

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
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_info');
    setShowLogoutConfirm(false);
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

  // Determine if sidebar should be expanded (desktop hover or mobile open)
  const isSidebarExpanded = isExpanded || mobileSidebarOpen;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-gray-50 flex">
      {/* Sidebar - Desktop: consistent width, Mobile: toggle */}
      <aside
        className={`${mobileSidebarOpen ? 'w-64' : 'w-0 lg:w-16'
          } ${isSidebarExpanded ? 'lg:w-64' : 'lg:w-16'
          } bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 lg:flex lg:flex-col fixed lg:static inset-y-0 left-0 z-50 lg:z-auto shadow-2xl h-full`}
      >
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-center bg-black/20">
          <img
            src={logoWhite}
            alt="Social X"
            className={`h-10 w-auto object-contain transition-all duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-0 lg:opacity-0 lg:w-0'}`}
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
                    setMobileSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center ${isSidebarExpanded ? 'justify-start gap-3' : 'justify-center'} px-4 py-3 rounded-lg transition-all duration-200 ${active
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium shadow-lg shadow-blue-500/50'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white hover:shadow-md'
                  }`}
                title={!isSidebarExpanded ? item.label : ''}
              >
                <Icon size={20} className="flex-shrink-0" />
                {isSidebarExpanded && <span className="transition-opacity duration-300">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <div className="hidden lg:flex justify-end px-2 py-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors border border-gray-700"
          >
            {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* User & Logout Section - Bottom of Sidebar */}
        <div className="p-4 border-t border-gray-700/50 bg-black/20">
          <div className={`flex items-center ${isSidebarExpanded ? 'justify-between' : 'justify-center'} gap-2`}>
            {isSidebarExpanded && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-500 overflow-hidden flex items-center justify-center border border-gray-600 shadow-sm">
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`text-white text-xs font-bold ${userAvatar ? 'hidden' : 'flex'} items-center justify-center w-full h-full`}>
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-medium text-white truncate">{userName}</span>
                  <span className="text-xs text-gray-400 capitalize">{userRole}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5 ${!isSidebarExpanded ? 'w-full flex justify-center' : ''}`}
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside >

      {/* Main Content */}
      < div className="flex-1 flex flex-col min-w-0 lg:h-full lg:overflow-hidden" >
        {/* Header */}
        < header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-40" >
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1 lg:flex-none"></div>
          <div className="flex-1 lg:flex-none"></div>
          <div className="flex items-center gap-4">
            {/* User info moved to sidebar */}
          </div>
        </header >

        {/* Page Content */}
        < main className="flex-1 p-4 md:p-6 lg:overflow-y-auto" >
          <div className="animate-scale-in">
            {children}
          </div>
        </main >
      </div >

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmText="Logout"
        confirmStyle="danger"
      />

      {/* Mobile Sidebar Overlay */}
      {
        mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          ></div>
        )
      }
    </div >
  );
};

export default Layout;

