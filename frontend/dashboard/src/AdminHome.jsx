import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminHome = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Verify user role
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = parts[1];
        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        if (decoded.role !== 'admin') {
          // Redirect to appropriate home based on role
          if (decoded.role === 'social media manager') {
            navigate('/dashboard');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (e) {
      console.error('Error decoding token:', e);
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-right mb-6">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Admin! 👋
            <span className="ml-3 inline-block px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
              ADMIN
            </span>
          </h1>
          <p className="text-gray-600 mb-8">You have successfully logged in as an administrator.</p>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-600 mb-3">Admin Dashboard</h3>
            <p className="text-gray-600 mb-4">Manage users, settings, and system configuration.</p>
            <ul className="text-gray-600 space-y-2 list-disc list-inside">
              <li>User Management</li>
              <li>System Settings</li>
              <li>Analytics & Reports</li>
              <li>Role Management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHome;

