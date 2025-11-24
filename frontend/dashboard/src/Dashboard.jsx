import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Calendar, Clock, BarChart2, Plus, Users,
  ArrowRight, TrendingUp, Activity, Zap, Layout as LayoutIcon,
  FileText, Send
} from 'lucide-react';
import Layout from './Layout.jsx';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('User');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPosts: 0,
    totalViews: 0,
    totalReach: 0,
    engagementRate: 0,
    recentPosts: [],
    recentClients: [],
    upcomingPosts: []
  });

  useEffect(() => {
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

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const getBackendUrl = () => {
          if (window.location.port === '3000') {
            const savedPort = localStorage.getItem('backend_port');
            if (savedPort) {
              return `http://localhost:${savedPort}`;
            }
            return 'http://localhost:5000';
          }
          return window.location.origin;
        };

        const backendUrl = getBackendUrl();
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [clientsRes, analyticsRes, clientsListRes, postsRes] = await Promise.all([
          fetch(`${backendUrl}/api/clients/count`, { headers }),
          fetch(`${backendUrl}/api/analytics?startDate=&endDate=`, { headers }),
          fetch(`${backendUrl}/api/clients`, { headers }),
          fetch(`${backendUrl}/api/posts?status=scheduled`, { headers })
        ]);

        const newStats = { ...stats };

        if (clientsRes.ok) {
          const data = await clientsRes.json();
          if (data.success) newStats.totalClients = data.count || 0;
        }

        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          if (data.success && data.data) {
            newStats.totalPosts = data.data.totalPosts || 0;
            newStats.totalViews = data.data.totalViews || 0;
            newStats.totalReach = data.data.totalReach || data.data.totalViews || 0;
            newStats.engagementRate = data.data.engagementRate || 0;
            const posts = data.data.detailedPosts || data.data.recentPosts || [];
            newStats.recentPosts = posts.slice(0, 5);
          }
        }

        if (clientsListRes.ok) {
          const data = await clientsListRes.json();
          if (data.success && data.data) {
            newStats.recentClients = data.data.slice(0, 5);
          }
        }

        if (postsRes.ok) {
          const data = await postsRes.json();
          if (data.success && data.data) {
            newStats.upcomingPosts = data.data.slice(0, 5);
          }
        }

        setStats(newStats);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.totalClients,
      subtext: 'Active Accounts',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      shadow: 'shadow-blue-200',
      onClick: () => navigate('/dashboard/clients')
    },
    {
      label: 'Total Posts',
      value: stats.totalPosts,
      subtext: 'Published Content',
      icon: LayoutIcon,
      gradient: 'from-violet-500 to-violet-600',
      shadow: 'shadow-violet-200',
      onClick: () => navigate('/dashboard/posts')
    },
    {
      label: 'Total Reach',
      value: stats.totalReach.toLocaleString(),
      subtext: 'Lifetime Reach',
      icon: Activity,
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-200',
      onClick: () => navigate('/dashboard/analytics')
    },
    {
      label: 'Avg Engagement',
      value: `${parseFloat(stats.engagementRate).toFixed(1)}%`,
      subtext: 'Performance Score',
      icon: Zap,
      gradient: 'from-rose-500 to-rose-600',
      shadow: 'shadow-rose-200',
      onClick: () => navigate('/dashboard/analytics')
    },
  ];

  const quickActions = [
    { label: 'New Post', icon: Plus, path: '/dashboard/posts', color: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' },
    { label: 'Add Client', icon: Users, path: '/dashboard/clients', color: 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black' },
    { label: 'View Analytics', icon: BarChart2, path: '/dashboard/analytics', color: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' },
  ];

  return (
    <Layout>
      <div className="p-4 lg:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-slate-500 font-medium mb-1">{formatDate()}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                {getGreeting()}, {userName}! 👋
              </h1>
              <p className="text-slate-600 mt-2 max-w-2xl">
                Here's what's happening with your social media empire today. You have <span className="font-semibold text-blue-600">{stats.totalClients} active clients</span> and <span className="font-semibold text-violet-600">{stats.totalPosts} posts</span> managed.
              </p>
            </div>
            <div className="flex gap-3">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(action.path)}
                  className={`${action.color} text-white px-4 py-2.5 rounded-xl font-medium shadow-lg flex items-center gap-2 transition-all hover:scale-105 hover:shadow-xl active:scale-95`}
                >
                  <action.icon size={18} />
                  <span className="hidden sm:inline">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  onClick={card.onClick}
                  className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />

                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg ${card.shadow}`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex items-center text-slate-400 group-hover:text-slate-600 transition-colors">
                      <ArrowRight size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-slate-500 text-sm font-medium mb-1">{card.label}</h3>
                    <p className="text-3xl font-bold text-slate-900 tracking-tight">{loading ? '-' : card.value}</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{card.subtext}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Recent Activity Feed */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock size={20} className="text-blue-500" />
                  Recent Activity
                </h2>
                <button
                  onClick={() => navigate('/dashboard/posts')}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">Loading activity...</div>
                ) : stats.recentPosts.length > 0 ? (
                  stats.recentPosts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4 group">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                        {post.thumbnail_url ? (
                          <img src={post.thumbnail_url} alt="Post" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <LayoutIcon size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {post.caption || 'Untitled Post'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(post.timestamp).toLocaleDateString()}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                            {post.media_type}
                          </span>
                        </div>
                      </div>
                      <div className="text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-bold text-slate-900 block">{post.metrics?.engagement || 0}</span>
                        <span className="text-xs text-slate-500">Engagements</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-slate-500 font-medium">No recent posts</p>
                    <p className="text-sm text-slate-400 mt-1">Create your first post to see activity here</p>
                    <button
                      onClick={() => navigate('/dashboard/posts')}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
                    >
                      <Plus size={16} />
                      Create Post
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Sidebar */}
            <div className="space-y-6">
              {/* Recent Clients Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-purple-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Recent Clients
                  </h3>
                </div>
                <div className="p-4">
                  {stats.recentClients.length > 0 ? (
                    <div className="space-y-3">
                      {stats.recentClients.map((client) => (
                        <div key={client._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('/dashboard/clients')}>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {client.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{client.name}</p>
                            <p className="text-xs text-slate-500 truncate">{client.instagramUsername || 'No username'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Users className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-sm text-slate-500">No clients yet</p>
                      <button
                        onClick={() => navigate('/dashboard/clients')}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Add your first client
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Scheduled Posts */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Clock size={18} className="text-yellow-600" />
                    Upcoming Posts
                  </h3>
                </div>
                <div className="p-4">
                  {stats.upcomingPosts.length > 0 ? (
                    <div className="space-y-3">
                      {stats.upcomingPosts.map((post) => (
                        <div key={post._id} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all cursor-pointer" onClick={() => navigate('/dashboard/posts')}>
                          <p className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">
                            {post.caption || post.content || 'Untitled Post'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock size={12} />
                            <span>{new Date(post.scheduledTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-sm text-slate-500">No scheduled posts</p>
                      <button
                        onClick={() => navigate('/dashboard/posts')}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Schedule a post
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/dashboard/posts')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <FileText size={18} className="text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Create New Post</span>
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/clients')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Users size={18} className="text-green-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Add New Client</span>
                  </button>
                  <button
                    onClick={() => navigate('/dashboard/analytics')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors text-left group"
                  >
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <BarChart2 size={18} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">View Analytics</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
