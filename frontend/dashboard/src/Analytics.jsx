import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, FileText, Calendar, BarChart2, Instagram, Facebook, Users, 
  ArrowUp, Heart, Eye, Download, TrendingDown, MessageCircle, Share2, 
  Bookmark, Calendar as CalendarIcon, X, RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './Layout.jsx';
import { getBackendUrl } from './config/api.js';

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const dashboardRef = useRef(null);

  useEffect(() => {
    if (!refreshing) {
      fetchAnalytics();
    }
  }, [selectedClient, dateRange, customStartDate, customEndDate]);

  const getDateRangeParams = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    if (dateRange === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      startDate = todayStart.toISOString().split('T')[0];
    } else if (dateRange === 'last7') {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      last7Days.setHours(0, 0, 0, 0);
      startDate = last7Days.toISOString().split('T')[0];
    } else if (dateRange === 'last30') {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      last30Days.setHours(0, 0, 0, 0);
      startDate = last30Days.toISOString().split('T')[0];
    } else if (dateRange === 'custom') {
      startDate = customStartDate;
      endDate = customEndDate || endDate;
    }

    return { startDate, endDate };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Please login to view analytics');
        setLoading(false);
        return;
      }

      const backendUrl = getBackendUrl();
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch real Instagram analytics from new endpoints
      const [overviewRes, trendsRes, postsRes, clientPerfRes, mainRes] = await Promise.all([
        fetch(`${backendUrl}/api/analytics/overview${refreshing ? '?refresh=true' : ''}`, { headers }),
        fetch(`${backendUrl}/api/analytics/trends`, { headers }),
        fetch(`${backendUrl}/api/analytics/posts?limit=10`, { headers }),
        fetch(`${backendUrl}/api/analytics/client-performance`, { headers }),
        // Also fetch main analytics for scheduled/draft counts
        fetch(`${backendUrl}/api/analytics`, { headers })
      ]);

      const [overview, trends, posts, clientPerf, main] = await Promise.all([
        overviewRes.json(),
        trendsRes.json(),
        postsRes.json(),
        clientPerfRes.json(),
        mainRes.json()
      ]);

      // Merge real Instagram data with existing analytics
      if (overview.success && main.success) {
        const mergedAnalytics = {
          ...main.data,
          // Override with real Instagram data
          totalPosts: overview.data.totalPosts || main.data.totalPosts || 0,
          publishedPosts: overview.data.publishedPosts || main.data.publishedPosts || 0,
          scheduledPosts: overview.data.scheduledPosts || main.data.scheduledPosts || 0,
          draftPosts: overview.data.draftPosts || main.data.draftPosts || 0,
          totalFollowers: overview.data.totalFollowers || main.data.totalFollowers || 0,
          totalViews: overview.data.totalViews || main.data.totalViews || 0,
          totalEngagements: overview.data.totalEngagements || main.data.totalEngagements || 0,
          engagementRate: overview.data.engagementRate || main.data.engagementRate || '0.00',
          followerGrowth: overview.data.followerGrowth || 0,
          // Use real trends
          engagementTrend: trends.success ? trends.data.engagementTrend : (main.data.engagementTrend || []),
          followersTrend: trends.success ? trends.data.followerTrend : (main.data.followersTrend || []),
          // Use real recent posts
          recentPosts: posts.success ? posts.data : (main.data.recentPosts || []),
          // Client performance
          clientAnalytics: clientPerf.success ? clientPerf.data : (main.data.clientAnalytics || [])
        };

        setAnalytics(mergedAnalytics);
      } else if (main.success) {
        // Fallback to main analytics if new endpoints fail
        setAnalytics(main.data);
      } else {
        setError('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      setExportingPDF(true);
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Calculate percentages
  let totalPlatformPosts = 0;
  let instagramPercent = 0;
  let facebookPercent = 0;
  let maxTypeValue = 0;
  
  // Calculate maxTypeValue including Instagram media types
  if (analytics?.postsByType) {
    maxTypeValue = Math.max(
      analytics.postsByType.post || 0,
      analytics.postsByType.story || 0,
      analytics.postsByType.reel || 0,
      analytics.postsByType.IMAGE || 0,
      analytics.postsByType.VIDEO || 0,
      analytics.postsByType.REELS || 0,
      analytics.postsByType.CAROUSEL_ALBUM || 0
    );
  }

  if (analytics) {
    totalPlatformPosts = (analytics.postsByPlatform?.instagram || 0) + (analytics.postsByPlatform?.facebook || 0);
    instagramPercent = totalPlatformPosts > 0 ? ((analytics.postsByPlatform?.instagram || 0) / totalPlatformPosts) * 100 : 0;
    facebookPercent = totalPlatformPosts > 0 ? ((analytics.postsByPlatform?.facebook || 0) / totalPlatformPosts) * 100 : 0;
  }

  // Format chart data
  const engagementTrendData = analytics?.engagementTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagements: item.engagements || 0,
    views: item.views || 0
  })) || [];

  const followerTrendData = analytics?.followersTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    followers: item.followers || 0
  })) || [];

  // Empty State
  if (!analytics && !loading) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">View your social media performance metrics</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <BarChart2 className="mx-auto text-slate-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No analytics data available</h3>
              <p className="text-slate-600 mb-6">Start creating posts to see your analytics here</p>
              <a
                href="/dashboard/posts"
                className="inline-block px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                Create Your First Post
              </a>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Analytics</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={fetchAnalytics}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 lg:p-6 bg-slate-50" ref={dashboardRef}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header with Date Range Picker and Export Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Analytics Dashboard</h1>
              <p className="text-sm text-slate-600">View your social media performance metrics</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Date Range Picker */}
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    if (e.target.value !== 'custom') {
                      setShowCustomDatePicker(false);
                    } else {
                      setShowCustomDatePicker(true);
                    }
                  }}
                  className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white text-slate-900 text-sm shadow-sm hover:border-slate-400 transition-colors"
                >
                  <option value="today">Today</option>
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {showCustomDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-10">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                Refresh Data
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="px-4 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download size={16} />
                Export PDF Report
              </button>
            </div>
          </div>

          {/* Client Filter */}
          {analytics.clientAnalytics && analytics.clientAnalytics.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Filter By Client</label>
              <select
                value={selectedClient || ''}
                onChange={(e) => setSelectedClient(e.target.value || null)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 text-sm"
              >
                <option value="">All Clients</option>
                {analytics.clientAnalytics.map(client => (
                  <option key={client.clientId} value={client.clientId}>
                    {client.clientName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stats Cards - 8 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            {/* Total Posts Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <FileText className="text-blue-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Posts</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalPosts || 0}</p>
            </div>

            {/* Published Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                  <TrendingUp className="text-emerald-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Published</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.publishedPosts || 0}</p>
            </div>

            {/* Scheduled Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors">
                  <Calendar className="text-amber-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Scheduled</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.scheduledPosts || 0}</p>
            </div>

            {/* Draft Posts Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-50 rounded-xl group-hover:bg-violet-100 transition-colors">
                  <BarChart2 className="text-violet-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Draft Posts</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.draftPosts || 0}</p>
            </div>

            {/* Total Views Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-50 rounded-xl group-hover:bg-cyan-100 transition-colors">
                  <Eye className="text-cyan-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Views</h3>
              <p className="text-3xl font-bold text-slate-900">
                {(analytics.totalViews || 0).toLocaleString()}
              </p>
            </div>

            {/* Total Followers Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                  <Users className="text-indigo-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Followers</h3>
              <p className="text-3xl font-bold text-slate-900">
                {(analytics.totalFollowers || 0).toLocaleString()}
              </p>
            </div>

            {/* Engagement Rate Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                  <Heart className="text-rose-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Engagement Rate</h3>
              <p className="text-3xl font-bold text-slate-900">
                {analytics.engagementRate ? `${parseFloat(analytics.engagementRate).toFixed(1)}%` : '0.0%'}
              </p>
            </div>

            {/* Follower Growth Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl transition-colors ${
                  (analytics.followerGrowth || 0) >= 0 
                    ? 'bg-green-50 group-hover:bg-green-100' 
                    : 'bg-red-50 group-hover:bg-red-100'
                }`}>
                  {(analytics.followerGrowth || 0) >= 0 ? (
                    <TrendingUp className="text-green-600" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600" size={24} />
                  )}
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Follower Growth</h3>
              <p className="text-3xl font-bold text-slate-900">
                {(analytics.followerGrowth || 0) >= 0 ? '+' : ''}{analytics.followerGrowth || 0}
              </p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Engagement Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Daily Engagement Trend</h2>
              {engagementTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="engagements" stroke="#3b82f6" strokeWidth={2} name="Engagements" />
                    <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={2} name="Views" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <BarChart2 className="mx-auto text-slate-400 mb-2" size={32} />
                    <p>No engagement data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Followers Growth Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Followers Growth Trend</h2>
              {followerTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={followerTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                      labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="followers" stroke="#8b5cf6" strokeWidth={2} name="Followers" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Users className="mx-auto text-slate-400 mb-2" size={32} />
                    <p>No follower data available</p>
                    <p className="text-sm text-slate-400 mt-1">Follower metrics will appear here when available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Platform Distribution</h2>
              <div className="space-y-5">
                {/* Instagram Bar */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Instagram</span>
                    <span className="text-sm font-bold text-slate-900">{analytics.postsByPlatform?.instagram || 0}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-purple-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${Math.max(instagramPercent, 2)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs font-medium text-slate-500">{instagramPercent.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Facebook Bar */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700">Facebook</span>
                    <span className="text-sm font-bold text-slate-900">{analytics.postsByPlatform?.facebook || 0}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                      style={{ width: `${Math.max(facebookPercent, 2)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs font-medium text-slate-500">{facebookPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Type Distribution Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Post Type Distribution</h2>
              <div className="space-y-5">
                {/* Use Instagram media types if available, otherwise use DB post types */}
                {(analytics.postsByType?.IMAGE || analytics.postsByType?.VIDEO || analytics.postsByType?.REELS || analytics.postsByType?.CAROUSEL_ALBUM) ? (
                  <>
                    {/* IMAGE Bar */}
                    {(analytics.postsByType?.IMAGE || 0) > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Image Posts</span>
                          <span className="text-sm font-bold text-slate-900">{analytics.postsByType.IMAGE || 0}</span>
                        </div>
                        <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType.IMAGE || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {/* VIDEO Bar */}
                    {(analytics.postsByType?.VIDEO || 0) > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Video Posts</span>
                          <span className="text-sm font-bold text-slate-900">{analytics.postsByType.VIDEO || 0}</span>
                        </div>
                        <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-red-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType.VIDEO || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {/* REELS Bar */}
                    {(analytics.postsByType?.REELS || 0) > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Reels</span>
                          <span className="text-sm font-bold text-slate-900">{analytics.postsByType.REELS || 0}</span>
                        </div>
                        <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-pink-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType.REELS || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {/* CAROUSEL Bar */}
                    {(analytics.postsByType?.CAROUSEL_ALBUM || 0) > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-slate-700">Carousel Posts</span>
                          <span className="text-sm font-bold text-slate-900">{analytics.postsByType.CAROUSEL_ALBUM || 0}</span>
                        </div>
                        <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="absolute top-0 left-0 h-full bg-purple-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                            style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType.CAROUSEL_ALBUM || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Posts Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700">Posts</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.postsByType?.post || 0}</span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType?.post || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                        ></div>
                      </div>
                    </div>
                    {/* Stories Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700">Stories</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.postsByType?.story || 0}</span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-violet-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType?.story || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                        ></div>
                      </div>
                    </div>
                    {/* Reels Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-700">Reels</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.postsByType?.reel || 0}</span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-pink-600 rounded-full transition-all duration-700 ease-out shadow-sm"
                          style={{ width: maxTypeValue > 0 ? `${Math.max(((analytics.postsByType?.reel || 0) / maxTypeValue) * 100, 2)}%` : '2%' }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Client Performance Table */}
          {analytics.clientAnalytics && analytics.clientAnalytics.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Client Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Client Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Platform</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total Posts</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Published</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Scheduled</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.clientAnalytics.map((client) => (
                      <tr key={client.clientId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-900">{client.clientName}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 capitalize">{client.platform}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right">{client.totalPosts || 0}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right">{client.publishedPosts || 0}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right">{client.scheduledPosts || 0}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 text-right font-semibold">
                          {client.engagementRate ? `${parseFloat(client.engagementRate).toFixed(1)}%` : '0.0%'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Posts */}
          {analytics.recentPosts && analytics.recentPosts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-5">Recent Posts</h2>
              <div className="space-y-3">
                {analytics.recentPosts.map((post) => (
                  <div key={post.id || post._id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-200">
                    {/* Thumbnail */}
                    {(post.thumbnail_url || (post.mediaUrls && post.mediaUrls[0])) && (
                      <div className="flex-shrink-0">
                        <img
                          src={post.thumbnail_url || post.mediaUrls[0]}
                          alt="Post thumbnail"
                          className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 mb-3 line-clamp-2">{post.caption || 'No caption'}</p>
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                          <Users size={12} className="text-slate-400" /> {post.clientName || 'Unknown'}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                          {post.platform === 'instagram' || post.media_type ? (
                            <Instagram size={12} className="text-purple-600" />
                          ) : (
                            <Facebook size={12} className="text-blue-600" />
                          )}
                          <span className="capitalize">{post.platform || 'instagram'}</span>
                        </span>
                        <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md capitalize">
                          {post.postType || post.media_type || 'Post'}
                        </span>
                        {post.timestamp && (
                          <span className="text-xs text-slate-500">
                            {new Date(post.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {/* Instagram Metrics */}
                      {post.metrics && (
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                          {post.metrics.likes > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Heart size={14} className="text-rose-500" />
                              {post.metrics.likes.toLocaleString()}
                            </span>
                          )}
                          {post.metrics.comments > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <MessageCircle size={14} className="text-blue-500" />
                              {post.metrics.comments.toLocaleString()}
                            </span>
                          )}
                          {post.metrics.reach > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Eye size={14} className="text-cyan-500" />
                              {post.metrics.reach.toLocaleString()} reach
                            </span>
                          )}
                          {post.metrics.video_views > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <Eye size={14} className="text-purple-500" />
                              {post.metrics.video_views.toLocaleString()} video views
                            </span>
                          )}
                        </div>
                      )}
                      {post.permalink && (
                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2 inline-block"
                        >
                          View on Instagram →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
