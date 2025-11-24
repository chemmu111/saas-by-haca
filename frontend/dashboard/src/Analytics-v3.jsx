import { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, FileText, Calendar, BarChart2, Instagram, Facebook, Users, 
  ArrowUp, Heart, Eye, Download, TrendingDown, X, RefreshCw, AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './Layout.jsx';

/**
 * Analytics Dashboard v3.0.0 - REAL DATA ONLY
 * - NO dummy values
 * - NO fallback fake data
 * - Uses ONLY backend API responses
 * - Proper date range filtering
 * - Token expiration handling
 * - Cache busting
 */

const ANALYTICS_VERSION = 'v3.0.0';

// Utility: Normalize media URLs (fix old ngrok URLs and paths)
const normalizeMediaUrl = (url) => {
  if (!url) return url;
  
  const backendUrl = window.location.origin;
  
  // If it's a full URL with old ngrok domain
  if (url.includes('.ngrok-free.dev') || url.includes('.ngrok.io')) {
    // Extract path part
    const match = url.match(/\/uploads\/[^\s?]+/);
    if (match) {
      return `${backendUrl}${match[0]}`;
    }
  }
  
  // Replace deprecated /api/images/ with /uploads/
  if (url.includes('/api/images/')) {
    return url.replace('/api/images/', '/uploads/');
  }
  
  // If relative path
  if (url.startsWith('/')) {
    return `${backendUrl}${url}`;
  }
  
  // If just filename
  if (!url.startsWith('http')) {
    return `${backendUrl}/uploads/${url}`;
  }
  
  return url;
};

// Data Source Badge Component
const DataSourceBadge = ({ source, cached }) => {
  const badgeConfig = {
    fresh: { color: 'bg-green-500', text: 'text-green-700', label: 'Live from Instagram API' },
    cached: { color: 'bg-amber-400', text: 'text-amber-700', label: 'Cached (5 min)' },
    database: { color: 'bg-blue-500', text: 'text-blue-700', label: 'Live from Database' },
    calculated: { color: 'bg-purple-500', text: 'text-purple-700', label: 'Calculated' }
  };
  
  let config;
  if (cached) {
    config = badgeConfig.cached;
  } else if (source === 'database') {
    config = badgeConfig.database;
  } else if (source === 'calculated') {
    config = badgeConfig.calculated;
  } else {
    config = badgeConfig.fresh;
  }
  
  return (
    <div className="flex items-center gap-1 mt-2">
      <div className={`w-2 h-2 rounded-full ${config.color} ${cached ? 'animate-pulse' : ''}`}></div>
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
    </div>
  );
};

// Token Expired Modal Component
const TokenExpiredModal = ({ show, onClose, onReconnect }) => {
  if (!show) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Instagram Token Expired
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your Instagram access token has expired. Please reconnect your Instagram account to continue.
            </p>
          </div>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Why?</strong> Instagram tokens expire after 60 days for security.
            Reconnecting takes only 30 seconds!
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReconnect}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
          >
            Reconnect Instagram
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Analytics = () => {
  // State management
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const dashboardRef = useRef(null);

  // Initialize and clear old cache
  useEffect(() => {
    console.log(`📊 REAL ANALYTICS DATA LOADED`);
    console.log(`📌 Version: ${ANALYTICS_VERSION}`);
    
    // Clear old cached data
    const cacheKeys = Object.keys(localStorage).filter(k => 
      k.includes('analytics') || k.includes('dummy') || k.includes('cache')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
    
    console.log('✅ Old cache cleared');
  }, []);

  // Fetch analytics when dependencies change
  useEffect(() => {
    if (!refreshing) {
      fetchAnalytics();
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Get date range parameters
  const getDateRangeParams = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    let startDate = '';
    let endDate = today.toISOString().split('T')[0];

    switch (dateRange) {
      case 'today':
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        startDate = todayStart.toISOString().split('T')[0];
        break;
      case 'last7':
        const last7 = new Date();
        last7.setDate(last7.getDate() - 7);
        last7.setHours(0, 0, 0, 0);
        startDate = last7.toISOString().split('T')[0];
        break;
      case 'last30':
        const last30 = new Date();
        last30.setDate(last30.getDate() - 30);
        last30.setHours(0, 0, 0, 0);
        startDate = last30.toISOString().split('T')[0];
        break;
      case 'custom':
        startDate = customStartDate;
        endDate = customEndDate || endDate;
        break;
    }

    return { startDate, endDate };
  };

  // Fetch analytics from backend
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

      const backendUrl = window.location.origin;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get date range
      const dateParams = getDateRangeParams();
      console.log('📅 Date Range:', dateRange, dateParams);

      // Build URL with query params
      const buildUrl = (endpoint) => {
        const params = new URLSearchParams({
          _t: Date.now(), // Cache busting
          refresh: refreshing ? 'true' : 'false'
        });
        
        if (dateParams.startDate) params.append('startDate', dateParams.startDate);
        if (dateParams.endDate) params.append('endDate', dateParams.endDate);
        
        return `${backendUrl}${endpoint}?${params.toString()}`;
      };

      console.log('📡 Fetching REAL analytics from backend...');

      // Fetch from main analytics endpoint
      const response = await fetch(buildUrl('/api/analytics'), {
        headers,
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json();
          if (data.needReLogin) {
            setShowTokenExpiredModal(true);
            setError('Instagram token expired');
            return;
          }
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      // Check for token expiration
      if (result.needReLogin || result.error === 'instagram_token_expired') {
        console.error('❌ Instagram token expired');
        setShowTokenExpiredModal(true);
        setError('Instagram token expired');
        return;
      }

      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }

      // Extract real data (NO FALLBACKS TO DUMMY VALUES)
      const data = result.data;
      const meta = result.metadata || {};

      console.log('📊 REAL ANALYTICS DATA LOADED');
      console.log(`📌 Version: ${ANALYTICS_VERSION}`);
      console.log(`📌 TOTAL POSTS: ${data.totalPosts}`);
      console.log(`📌 Published: ${data.publishedPosts}`);
      console.log(`📌 Source: ${meta.source || 'api'}`);
      console.log(`📌 Cached: ${meta.cached || false}`);

      // Store analytics (EXACT values from API)
      setAnalytics({
        // Instagram API data
        totalPosts: data.totalPosts,
        totalFollowers: data.totalFollowers,
        totalViews: data.totalViews,
        totalEngagements: data.totalEngagements,
        engagementRate: data.engagementRate,
        followerGrowth: data.followerGrowth,
        totalLikes: data.totalLikes,
        totalComments: data.totalComments,
        totalShares: data.totalShares,
        totalSaves: data.totalSaves,
        // Database data
        publishedPosts: data.publishedPosts,
        scheduledPosts: data.scheduledPosts,
        draftPosts: data.draftPosts,
        failedPosts: data.failedPosts,
        // Aggregated data
        postsByPlatform: data.postsByPlatform || { instagram: 0, facebook: 0 },
        postsByType: data.postsByType || {},
        // Trends (use ?? for empty arrays)
        engagementTrend: data.engagementTrend ?? [],
        followersTrend: data.followersTrend ?? [],
        // Recent posts with normalized URLs
        recentPosts: (data.recentPosts ?? []).map(post => ({
          ...post,
          mediaUrls: (post.mediaUrls || []).map(normalizeMediaUrl)
        })),
        // Client analytics
        clientAnalytics: data.clientAnalytics ?? [],
        topPost: data.topPost ? {
          ...data.topPost,
          mediaUrls: (data.topPost.mediaUrls || []).map(normalizeMediaUrl)
        } : null
      });

      setMetadata(meta);

    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      setError(error.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh button
  const handleRefresh = () => {
    console.log('🔄 Manual refresh - bypassing cache');
    setRefreshing(true);
    fetchAnalytics();
  };

  // Handle token expired modal actions
  const handleReconnect = () => {
    window.location.href = '/dashboard/clients';
  };

  const handleCloseModal = () => {
    setShowTokenExpiredModal(false);
  };

  // Export to PDF
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const element = dashboardRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Analytics-Report-${new Date().toISOString().split('T')[0]}.pdf`);
      
      console.log('✅ PDF exported successfully');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      setError('Failed to export PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  // Calculate chart data
  const getChartData = () => {
    if (!analytics) return { engagement: [], followers: [] };
    
    return {
      engagement: (analytics.engagementTrend ?? []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagements: item.engagements,
        views: item.views
      })),
      followers: (analytics.followersTrend ?? []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        followers: item.followers
      }))
    };
  };

  const chartData = getChartData();

  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Skeleton Loading */}
            <div className="flex justify-between items-center mb-6">
              <div className="h-10 w-64 bg-slate-200 rounded animate-pulse"></div>
              <div className="flex gap-3">
                <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-10 w-40 bg-slate-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="h-10 w-10 bg-slate-200 rounded-xl animate-pulse mb-4"></div>
                  <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-2"></div>
                  <div className="h-8 w-16 bg-slate-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-slate-600">Loading real Instagram analytics...</p>
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

  // Empty State
  if (!analytics) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
              <BarChart2 className="mx-auto text-slate-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No analytics data available</h3>
              <p className="text-slate-600 mb-6">Start creating posts to see your analytics here</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Version Indicator (Top-Right, Always Visible) */}
      <div className="fixed top-4 right-4 z-50">
        <div className={`${metadata?.cached ? 'bg-amber-500' : 'bg-emerald-500'} text-white px-4 py-2 rounded-lg shadow-lg text-xs font-mono font-bold ${!metadata?.cached ? 'animate-pulse' : ''}`}>
          ✓ REAL DATA {ANALYTICS_VERSION}
        </div>
      </div>

      <div className="p-4 lg:p-6 bg-slate-50" ref={dashboardRef}>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                Analytics Dashboard
                <span className="text-xs font-mono bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-300">
                  {ANALYTICS_VERSION}
                </span>
              </h1>
              <p className="text-sm text-slate-600">All data is REAL from Instagram API & Database</p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  setShowCustomDatePicker(e.target.value === 'custom');
                }}
                className="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 text-sm"
              >
                <option value="today">Today</option>
                <option value="last7">Last 7 days</option>
                <option value="last30">Last 30 days</option>
                <option value="custom">Custom Range</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Fetching...' : 'Refresh Data'}
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Download size={16} />
                {exportingPDF ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          </div>

          {/* Custom Date Picker */}
          {showCustomDatePicker && (
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex gap-3 items-center">
              <label className="text-sm font-medium text-slate-700">Start:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <label className="text-sm font-medium text-slate-700">End:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Real Data Banner */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-500 rounded-xl shadow-sm">
                <BarChart2 className="text-white" size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-emerald-900 mb-2">
                  ✅ REAL INSTAGRAM DATA - NO DUMMY VALUES
                </h3>
                <p className="text-sm text-emerald-800 mb-3">
                  All metrics are live from Instagram API and your database.{' '}
                  {metadata?.cached ? (
                    <span className="text-amber-700 font-semibold">Cached data (refreshes every 5 min)</span>
                  ) : (
                    <span className="text-green-700 font-semibold">Fresh from API</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Instagram: {analytics.totalPosts} posts
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Database: {analytics.publishedPosts} published
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    Engagements: {analytics.totalEngagements} real
                  </span>
                  {analytics.totalFollowers === 0 && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      New account
                    </span>
                  )}
                </div>
                {metadata && (
                  <div className="mt-3 text-xs text-slate-600">
                    <span className="font-semibold">Data Source:</span> {metadata.source || 'API'} |{' '}
                    <span className="font-semibold">Timestamp:</span> {new Date(metadata.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            {/* Total Posts Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <FileText className="text-blue-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Posts</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalPosts}</p>
              <DataSourceBadge source="instagram_api" cached={metadata?.cached} />
            </div>

            {/* Published Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <TrendingUp className="text-emerald-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Published</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.publishedPosts}</p>
              <DataSourceBadge source="database" cached={false} />
            </div>

            {/* Scheduled Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-amber-50 rounded-xl">
                  <Calendar className="text-amber-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Scheduled</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.scheduledPosts}</p>
              <DataSourceBadge source="database" cached={false} />
            </div>

            {/* Draft Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-violet-50 rounded-xl">
                  <BarChart2 className="text-violet-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Draft Posts</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.draftPosts}</p>
              <DataSourceBadge source="database" cached={false} />
            </div>

            {/* Total Views Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-cyan-50 rounded-xl">
                  <Eye className="text-cyan-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Views</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalViews.toLocaleString()}</p>
              <DataSourceBadge source="instagram_api" cached={metadata?.cached} />
              {analytics.totalViews === 0 && (
                <p className="text-xs text-slate-500 italic mt-1">Only Reels have views</p>
              )}
            </div>

            {/* Total Followers Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl">
                  <Users className="text-indigo-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Total Followers</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalFollowers.toLocaleString()}</p>
              <DataSourceBadge source="instagram_api" cached={metadata?.cached} />
              {analytics.totalFollowers === 0 && (
                <p className="text-xs text-slate-500 italic mt-1">New account</p>
              )}
            </div>

            {/* Engagement Rate Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-rose-50 rounded-xl">
                  <Heart className="text-rose-600" size={24} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Engagement Rate</h3>
              <p className="text-3xl font-bold text-slate-900">
                {parseFloat(analytics.engagementRate).toFixed(1)}%
              </p>
              <DataSourceBadge source="calculated" cached={false} />
              {analytics.totalEngagements > 0 && (
                <p className="text-xs text-slate-600 italic mt-1">
                  {analytics.totalEngagements} total engagement{analytics.totalEngagements !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Follower Growth Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${analytics.followerGrowth >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  {analytics.followerGrowth >= 0 ? (
                    <TrendingUp className="text-green-600" size={24} />
                  ) : (
                    <TrendingDown className="text-red-600" size={24} />
                  )}
                </div>
              </div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Follower Growth</h3>
              <p className="text-3xl font-bold text-slate-900">
                {analytics.followerGrowth >= 0 ? '+' : ''}{analytics.followerGrowth}
              </p>
              <DataSourceBadge source="instagram_api" cached={metadata?.cached} />
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Engagement Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Daily Engagement Trend</h3>
              </div>
              {chartData.engagement.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData.engagement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="engagements" stroke="#3b82f6" strokeWidth={2} name="Engagements" />
                    <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} name="Views" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <BarChart2 size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No engagement data for selected period</p>
                  </div>
                </div>
              )}
            </div>

            {/* Followers Growth Trend */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Followers Growth Trend</h3>
              </div>
              {chartData.followers.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData.followers}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={2} name="Followers" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <Users size={48} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No follower data available</p>
                    <p className="text-xs mt-1">Follower metrics appear once your account gains followers</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Platform Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="text-pink-500" size={20} />
                    <span className="text-sm font-medium text-slate-700">Instagram</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 w-64">
                      <div 
                        className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${analytics.postsByPlatform?.instagram > 0 ? ((analytics.postsByPlatform.instagram / analytics.totalPosts) * 100) : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                      {analytics.postsByPlatform?.instagram || 0}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Facebook className="text-blue-500" size={20} />
                    <span className="text-sm font-medium text-slate-700">Facebook</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-2 w-64">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${analytics.postsByPlatform?.facebook > 0 ? ((analytics.postsByPlatform.facebook / analytics.totalPosts) * 100) : 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">
                      {analytics.postsByPlatform?.facebook || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Post Type Distribution */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Post Type Distribution</h3>
              <div className="space-y-3">
                {Object.entries(analytics.postsByType || {}).map(([type, count]) => {
                  if (count === 0) return null;
                  const total = Object.values(analytics.postsByType || {}).reduce((sum, c) => sum + c, 0);
                  const percentage = total > 0 ? (count / total) * 100 : 0;
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700 capitalize">{type.toLowerCase()}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 w-48">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Client Performance Table */}
          {analytics.clientAnalytics && analytics.clientAnalytics.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Client Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Platform</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total Posts</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Published</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Scheduled</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Engagement Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {analytics.clientAnalytics.map((client) => (
                      <tr key={client.clientId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{client.clientName}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs font-medium">
                            {client.platform === 'instagram' && <Instagram size={12} />}
                            {client.platform === 'facebook' && <Facebook size={12} />}
                            {client.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-slate-900">{client.totalPosts}</td>
                        <td className="px-6 py-4 text-right text-sm text-emerald-600 font-semibold">{client.publishedPosts}</td>
                        <td className="px-6 py-4 text-right text-sm text-amber-600 font-semibold">{client.scheduledPosts}</td>
                        <td className="px-6 py-4 text-right text-sm text-slate-900 font-semibold">{client.engagementRate || '0.00'}%</td>
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
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Posts</h3>
              <div className="space-y-3">
                {analytics.recentPosts.slice(0, 10).map((post) => (
                  <div key={post.id} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                    {post.mediaUrls && post.mediaUrls[0] && (
                      <img 
                        src={post.mediaUrls[0]} 
                        alt={post.caption || 'Post'}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          console.warn('Image load error:', post.mediaUrls[0]);
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {post.caption || 'No caption'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                          post.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {post.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {post.postType || 'post'}
                        </span>
                        {post.createdAt && (
                          <span className="text-xs text-slate-500">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token Expired Modal */}
      <TokenExpiredModal 
        show={showTokenExpiredModal}
        onClose={handleCloseModal}
        onReconnect={handleReconnect}
      />
    </Layout>
  );
};

export default Analytics;

