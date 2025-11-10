import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, FileText, Calendar, BarChart2, Instagram, Facebook, Users, 
  ArrowUp, Heart, Eye, Download, TrendingDown, MessageCircle, Share2, 
  Bookmark, Calendar as CalendarIcon, X
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './Layout.jsx';

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

      const { startDate, endDate } = getDateRangeParams();
      const backendUrl = window.location.origin;
      let url = selectedClient 
        ? `${backendUrl}/api/analytics/client/${selectedClient}`
        : `${backendUrl}/api/analytics`;

      // Add date range parameters and refresh flag
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (refreshing) params.append('refresh', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setAnalytics(result.data);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
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

  if (analytics) {
    totalPlatformPosts = (analytics.postsByPlatform?.instagram || 0) + (analytics.postsByPlatform?.facebook || 0);
    instagramPercent = totalPlatformPosts > 0 ? ((analytics.postsByPlatform?.instagram || 0) / totalPlatformPosts) * 100 : 0;
    facebookPercent = totalPlatformPosts > 0 ? ((analytics.postsByPlatform?.facebook || 0) / totalPlatformPosts) * 100 : 0;
    maxTypeValue = Math.max(
      analytics.postsByType?.post || 0,
      analytics.postsByType?.story || 0,
      analytics.postsByType?.reel || 0
    );
  }

  // Format chart data
  const engagementTrendData = analytics?.engagementTrend?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagements: item.engagements || 0,
    views: item.views || 0
  })) || [];

  // Format followers trend data (empty if no data available)
  const followersTrendData = analytics?.followersTrend && analytics.followersTrend.length > 0
    ? analytics.followersTrend.reduce((acc, item, index) => {
        const previousCumulativeGained = index > 0 ? acc[index - 1].cumulativeGained : 0;
        const previousCumulativeLost = index > 0 ? acc[index - 1].cumulativeLost : 0;
        
        const cumulativeGained = previousCumulativeGained + (item.gained || 0);
        const cumulativeLost = previousCumulativeLost + (item.lost || 0);
        
        acc.push({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          gained: item.gained || 0,
          lost: item.lost || 0,
          net: (item.gained || 0) - (item.lost || 0),
          cumulativeGained,
          cumulativeLost,
          cumulativeNet: cumulativeGained - cumulativeLost
        });
        
        return acc;
      }, [])
    : [];

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">View your social media performance metrics</p>
            </div>
            <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Loading analytics...</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
              <p className="text-slate-600">View your social media performance metrics</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-12 text-center">
              <BarChart2 className="mx-auto text-red-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Analytics</h3>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchAnalytics();
                }}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Empty State
  if (!analytics) {
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
                  <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Select Date Range</h3>
                      <button
                        onClick={() => {
                          setShowCustomDatePicker(false);
                          setDateRange('last30');
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (customStartDate) {
                            setDateRange('custom');
                            setShowCustomDatePicker(false);
                          }
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Data Button */}
              <button
                onClick={() => {
                  setRefreshing(true);
                  fetchAnalytics().finally(() => setRefreshing(false));
                }}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp size={18} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                <span>{exportingPDF ? 'Exporting...' : 'Export PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Client Filter */}
          {analytics.clientAnalytics && analytics.clientAnalytics.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <label htmlFor="client-filter" className="block text-sm font-semibold text-slate-700 mb-3">
                Filter By Client
              </label>
              <select
                id="client-filter"
                value={selectedClient || ''}
                onChange={(e) => setSelectedClient(e.target.value || null)}
                className="w-full max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white text-slate-900 text-sm shadow-sm hover:border-slate-400 transition-colors"
              >
                <option value="">All Clients</option>
                {analytics.clientAnalytics.map((client) => (
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
              <p className={`text-3xl font-bold ${
                (analytics.followerGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(analytics.followerGrowth || 0) >= 0 ? '+' : ''}{analytics.followerGrowth || 0}
              </p>
            </div>
          </div>

          {/* Charts Section - Line Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Engagement Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Daily Engagement Trend</h2>
                <Eye className="text-slate-400" size={20} />
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={engagementTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="engagements" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="Engagements"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Followers Growth Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Followers Growth Trend</h2>
                <Users className="text-slate-400" size={20} />
              </div>
              {followersTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={followersTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="gained" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                      name="Gained"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lost" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', r: 4 }}
                      name="Lost"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="net" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      name="Net Growth"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-center">
                  <div>
                    <Users className="mx-auto text-slate-300 mb-3" size={48} />
                    <p className="text-sm text-slate-500 font-medium">No follower data available</p>
                    <p className="text-xs text-slate-400 mt-1">Follower metrics will appear here when available</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform and Post Type Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Platform Distribution Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Platform Distribution</h2>
              <div className="space-y-5">
                {/* Instagram Bar */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-sm">
                        <Instagram className="text-white" size={16} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Instagram</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{analytics.postsByPlatform?.instagram || 0}</span>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 via-purple-600 to-pink-500 rounded-full transition-all duration-700 ease-out shadow-sm"
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
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm">
                        <Facebook className="text-white" size={16} />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Facebook</span>
                    </div>
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
              </div>
            </div>
          </div>

          {/* Top Performing Post */}
          {analytics.topPost && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-6">Top Performing Post</h2>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {analytics.topPost.mediaUrls && analytics.topPost.mediaUrls.length > 0 ? (
                    <img
                      src={analytics.topPost.mediaUrls[0]}
                      alt="Top post thumbnail"
                      className="w-full md:w-64 h-64 object-cover rounded-lg border border-slate-200"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/256x256?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full md:w-64 h-64 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <FileText className="text-slate-400" size={48} />
                    </div>
                  )}
                </div>
                
                {/* Post Details */}
                <div className="flex-1">
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-900 mb-2 line-clamp-2">
                      {analytics.topPost.caption || 'No caption'}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        <Users size={12} /> {analytics.topPost.clientName}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {analytics.topPost.platform === 'instagram' ? (
                          <><Instagram size={12} className="text-purple-600" /> Instagram</>
                        ) : (
                          <><Facebook size={12} className="text-blue-600" /> Facebook</>
                        )}
                      </span>
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                        {analytics.topPost.postType}
                      </span>
                    </div>
                  </div>

                  {/* Engagement Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <Heart className="mx-auto text-rose-500 mb-2" size={20} />
                      <p className="text-2xl font-bold text-slate-900">
                        {analytics.topPost.engagement?.likes?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Likes</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <MessageCircle className="mx-auto text-blue-500 mb-2" size={20} />
                      <p className="text-2xl font-bold text-slate-900">
                        {analytics.topPost.engagement?.comments?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Comments</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <Share2 className="mx-auto text-emerald-500 mb-2" size={20} />
                      <p className="text-2xl font-bold text-slate-900">
                        {analytics.topPost.engagement?.shares?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Shares</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <Bookmark className="mx-auto text-amber-500 mb-2" size={20} />
                      <p className="text-2xl font-bold text-slate-900">
                        {analytics.topPost.engagement?.saves?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Saves</p>
                    </div>
                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                      <Eye className="mx-auto text-purple-500 mb-2" size={20} />
                      <p className="text-2xl font-bold text-slate-900">
                        {analytics.topPost.engagement?.views?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">Views</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Performance Table */}
          {analytics.clientAnalytics && analytics.clientAnalytics.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900">Client Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Client Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Total Posts
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Published
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Scheduled
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Engagement Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {analytics.clientAnalytics.map((client) => {
                      const engagementRate = client.totalPosts > 0 
                        ? ((client.publishedPosts / client.totalPosts) * 100).toFixed(1) 
                        : '0.0';
                      
                      return (
                        <tr key={client.clientId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Users className="text-slate-600" size={14} />
                              </div>
                              <span className="text-sm font-semibold text-slate-900">{client.clientName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {client.platform === 'instagram' ? (
                                <><Instagram size={12} className="text-purple-600" /> Instagram</>
                              ) : client.platform === 'facebook' ? (
                                <><Facebook size={12} className="text-blue-600" /> Facebook</>
                              ) : (
                                client.platform
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-slate-900">{client.totalPosts}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600">{client.publishedPosts}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-slate-600">{client.scheduledPosts}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-emerald-600">{engagementRate}%</span>
                              <ArrowUp className="text-emerald-500" size={14} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
                  <div key={post.id} className="flex items-start justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50/50 hover:border-slate-300 transition-all duration-200">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 mb-3 line-clamp-2">{post.caption || 'No caption'}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                          <Users size={12} className="text-slate-400" /> {post.clientName}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md">
                          {post.platform === 'instagram' ? (
                            <Instagram size={12} className="text-purple-600" />
                          ) : (
                            <Facebook size={12} className="text-blue-600" />
                          )}
                          <span className="capitalize">{post.platform}</span>
                        </span>
                        <span className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md capitalize">{post.postType}</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                          post.status === 'published' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          post.status === 'scheduled' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {post.status}
                        </span>
                      </div>
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
