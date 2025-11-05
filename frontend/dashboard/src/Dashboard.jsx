import { useState, useEffect } from 'react';
import { User, Calendar, Clock, BarChart } from 'lucide-react';
import Layout from './Layout.jsx';

const Dashboard = () => {
  const [userName, setUserName] = useState('User');
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPosts: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
  });

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

    // Fetch real client count from API
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        // Fetch client count
        const clientResponse = await fetch('/api/clients/count', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (clientResponse.ok) {
          const clientResult = await clientResponse.json();
          if (clientResult.success) {
            setStats(prev => ({
              ...prev,
              totalClients: clientResult.count || 0
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    // Listen for client updates
    const handleClientUpdate = () => {
      fetchStats();
    };

    window.addEventListener('clientAdded', handleClientUpdate);
    return () => {
      window.removeEventListener('clientAdded', handleClientUpdate);
    };
  }, []);

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.totalClients,
      icon: User,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Total Posts',
      value: stats.totalPosts,
      icon: Calendar,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      label: 'Scheduled Posts',
      value: stats.scheduledPosts,
      icon: Clock,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
    },
    {
      label: 'Published Posts',
      value: stats.publishedPosts,
      icon: BarChart,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
  ];

  return (
    <Layout>
      <div className="p-4 lg:p-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-gray-600">
              Here's what's happening with your social media management.
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`${card.bgColor} border ${card.borderColor} rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${card.bgColor} border ${card.borderColor}`}>
                      <Icon className={card.iconColor} size={24} />
                    </div>
                  </div>
                  <h3 className="text-gray-600 text-sm font-medium mb-1">{card.label}</h3>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
              );
            })}
          </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

