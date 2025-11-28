import { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp, FileText, Calendar, BarChart2, Instagram, Facebook, Users,
  ArrowUp, Heart, Eye, Download, TrendingDown, X, RefreshCw, AlertTriangle,
  MessageSquare, Share2, Save, Clock, Hash, Activity, Zap, Award, LayoutGrid
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Scatter
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Layout from './Layout.jsx';
import TokenCountdown from './components/TokenCountdown.jsx';

const ANALYTICS_VERSION = 'vPRO-2025-11-22';

// Token Expired Modal Component
const TokenExpiredModal = ({ show, onClose, onReconnect }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="text-red-600" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Instagram Token Expired</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your Instagram access token has expired. Please reconnect your Instagram account to continue.
            </p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Why?</strong> Instagram tokens expire after 60 days for security. Reconnecting takes only 30 seconds!
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
  const [tokenStatus, setTokenStatus] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [postSortOption, setPostSortOption] = useState('recent');
  const [clientFilter, setClientFilter] = useState('all');
  const [lastManualRefresh, setLastManualRefresh] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const dashboardRef = useRef(null);

  useEffect(() => {
    console.log(`📊 Analytics Dashboard - Version: ${ANALYTICS_VERSION}`);
    const cacheKeys = Object.keys(localStorage).filter(k =>
      k.includes('analytics') || k.includes('dummy') || k.includes('cache')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
    console.log('✅ Old cache cleared');
  }, []);

  useEffect(() => {
    if (!refreshing) {
      fetchAnalytics();
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Auto-refresh analytics every 10 minutes
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing analytics data...');
      fetchAnalytics();
    }, 600000); // 10 minutes

    return () => clearInterval(autoRefreshInterval);
  }, [dateRange, customStartDate, customEndDate]);

  // Countdown timer for manual refresh cooldown
  useEffect(() => {
    if (lastManualRefresh > 0) {
      // Initial check
      const checkTime = () => {
        const now = Date.now();
        const diff = 60000 - (now - lastManualRefresh);
        if (diff <= 0) {
          setTimeLeft(0);
        } else {
          setTimeLeft(Math.ceil(diff / 1000));
        }
      };

      checkTime(); // Run immediately

      const interval = setInterval(checkTime, 1000);
      return () => clearInterval(interval);
    }
  }, [lastManualRefresh]);

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

  // Check token status before fetching analytics
  const checkTokenStatus = async (clientId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;

      const response = await fetch(`${backendUrl}/api/auth/token/check/${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const status = await response.json();
        setTokenStatus(status);

        if (status.isExpired) {
          setShowTokenExpiredModal(true);
          return false;
        }
        return true;
      }
    } catch (err) {
      console.error('Error checking token status:', err);
    }
    return true; // Continue if check fails
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      setLastUpdated(new Date());
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Please login to view analytics');
        setLoading(false);
        return;
      }
      // Auto-refresh client data every 100 seconds
      const backendUrl = window.location.port === '3000' ? 'http://localhost:5000' : window.location.origin;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const dateParams = getDateRangeParams();
      const buildUrl = (endpoint) => {
        const params = new URLSearchParams({ _t: Date.now(), refresh: refreshing ? 'true' : 'false' });
        if (dateParams.startDate) params.append('startDate', dateParams.startDate);
        if (dateParams.endDate) params.append('endDate', dateParams.endDate);
        return `${backendUrl}${endpoint}?${params.toString()}`;
      };
      const response = await fetch(buildUrl('/api/analytics'), { headers, cache: 'no-store' });
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
      if (result.needReLogin || result.error === 'instagram_token_expired') {
        setShowTokenExpiredModal(true);
        setError('Instagram token expired');
        return;
      }
      if (!result.success || !result.data) {
        throw new Error('Invalid API response');
      }
      const data = result.data;
      const meta = result.metadata || {};
      setAnalytics({
        totalPosts: data.totalPosts || 0,
        totalFollowers: data.totalFollowers || 0,
        totalViews: data.totalViews || 0,
        totalReach: data.totalReach || 0,
        totalInteractions: data.totalInteractions || 0,
        avgWatchTime: data.avgWatchTime || 0,
        reelWatchTimeTotal: data.reelWatchTimeTotal || data.totalWatchTime || 0,
        totalEngagements: data.totalEngagements || 0,
        engagementRate: data.engagementRate || 0,
        followerGrowth: data.followerGrowth || 0,
        totalLikes: data.totalLikes || 0,
        totalComments: data.totalComments || 0,
        totalShares: data.totalShares || 0,
        totalSaves: data.totalSaves || 0,
        publishedPosts: data.publishedPosts || 0,
        scheduledPosts: data.scheduledPosts || 0,
        draftPosts: data.draftPosts || 0,
        postsByPlatform: data.postsByPlatform || {},
        postsByType: data.postsByType || {},
        engagementTrend: data.engagementTrend || [],
        followersTrend: data.followersTrend || [],
        topPost: data.topPost,
        recentPosts: data.recentPosts || [],
        detailedPosts: data.detailedPosts || []
      });
      setMetadata(meta);
    } catch (err) {
      console.error('❌ Error fetching analytics:', err);
      setError(err.message || 'Failed to fetch analytics');
      console.error('Debug - Analytics Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log('Debug - Analytics Fetch Complete. Loading: false, Error:', error, 'Analytics:', analytics);
    }
  };

  const handleRefresh = async () => {
    // Double check just in case
    const now = Date.now();
    if (now - lastManualRefresh < 60000) {
      return;
    }

    setRefreshing(true);
    try {
      await fetchAnalytics();
      setLastManualRefresh(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
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

  const getChartData = () => {
    if (!analytics) return { engagement: [], followers: [] };
    return {
      engagement: (analytics.engagementTrend || []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagements: item.engagements || 0,
        views: item.views || 0
      })),
      followers: (analytics.followersTrend || []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        followers: item.followers || 0
      }))
    };
  };

  const chartData = getChartData();

  const clientOptions = useMemo(() => {
    // Use clients from API response (all database clients)
    if (!analytics?.clients) return [];
    return analytics.clients.map(client => ({
      id: client.id,
      name: client.name || 'Unnamed Client'
    }));
  }, [analytics?.clients]);

  const sortedDetailedPosts = useMemo(() => {
    if (!analytics?.detailedPosts) return [];

    console.log('🔍 Client Filter Debug:');
    console.log('   Selected filter:', clientFilter);
    console.log('   Total posts:', analytics.detailedPosts.length);
    if (analytics.detailedPosts.length > 0) {
      console.log('   Sample post clientId:', analytics.detailedPosts[0].clientId, 'type:', typeof analytics.detailedPosts[0].clientId);
    }


    // Get date range for filtering
    const dateParams = getDateRangeParams();

    // Normalize dates to timestamps (milliseconds since epoch)
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return date.getTime();
    };

    const startTimestamp = dateParams.startDate ? normalizeDate(dateParams.startDate) : null;
    const endTimestamp = dateParams.endDate ? normalizeDate(dateParams.endDate) : null;

    // Set end timestamp to end of day (add 24 hours minus 1ms)
    const endOfDayTimestamp = endTimestamp ? endTimestamp + (24 * 60 * 60 * 1000) - 1 : null;

    console.log('🔍 Client Filter Debug:');
    console.log('   Selected filter:', clientFilter);
    console.log('   Total posts:', analytics.detailedPosts.length);
    if (analytics.detailedPosts.length > 0) {
      console.log('   Sample post clientId:', analytics.detailedPosts[0].clientId, 'type:', typeof analytics.detailedPosts[0].clientId);
      console.log('   Sample post timestamp:', analytics.detailedPosts[0].timestamp);
    }
    console.log('   Date range:', {
      startDate: dateParams.startDate,
      endDate: dateParams.endDate,
      startTimestamp,
      endOfDayTimestamp
    });

    // Filter by client
    const clientFiltered = analytics.detailedPosts.filter(post =>
      clientFilter === 'all' ? true : post.clientId === clientFilter
    );

    // Filter by date range using timestamp comparison
    const dateFiltered = clientFiltered.filter(post => {
      if (!post.timestamp) return false; // Exclude posts without timestamp

      const postTimestamp = new Date(post.timestamp).getTime();

      // Validate the timestamp
      if (isNaN(postTimestamp)) {
        console.warn('⚠️ Invalid timestamp for post:', post.id, post.timestamp);
        return false; // Exclude posts with invalid timestamps
      }

      // If no date range selected, include all posts
      if (!startTimestamp || !endOfDayTimestamp) return true;

      // Check if post timestamp is within range
      return postTimestamp >= startTimestamp && postTimestamp <= endOfDayTimestamp;
    });

    console.log('   Filtered posts:', dateFiltered.length, '(after client + date filtering)');

    const posts = [...dateFiltered];
    const metric = (post, key) => post.metrics?.[key] || 0;

    switch (postSortOption) {
      case 'oldest':
        return posts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      case 'views_desc':
        return posts.sort((a, b) => metric(b, 'views') - metric(a, 'views'));
      case 'likes_desc':
        return posts.sort((a, b) => metric(b, 'likes') - metric(a, 'likes'));
      case 'comments_desc':
        return posts.sort((a, b) => metric(b, 'comments') - metric(a, 'comments'));
      case 'engagement_desc':
        return posts.sort((a, b) => metric(b, 'engagement') - metric(a, 'engagement'));
      case 'recent':
      default:
        return posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  }, [analytics?.detailedPosts, clientFilter, postSortOption, dateRange, customStartDate, customEndDate]);

  // Recalculate analytics metrics from filtered posts
  const computedAnalytics = useMemo(() => {
    if (!analytics) return null; // Only return null if no analytics data at all

    // Even if sortedDetailedPosts is empty, we should return computed values (all zeros)
    const postsToProcess = sortedDetailedPosts || [];

    // Calculate totals from filtered posts
    let totalViews = 0;
    let totalReach = 0;
    let totalInteractions = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalEngagements = 0;
    let totalWatchTime = 0;
    let watchTimeCount = 0;

    const postsByType = {
      IMAGE: 0,
      VIDEO: 0,
      REELS: 0,
      CAROUSEL_ALBUM: 0
    };

    postsToProcess.forEach(post => {
      const metrics = post.metrics || {};

      totalViews += metrics.views || 0;
      totalReach += metrics.reach || 0;
      totalInteractions += metrics.engagement || 0;
      totalLikes += metrics.likes || 0;
      totalComments += metrics.comments || 0;
      totalSaves += metrics.saved || 0;
      totalShares += metrics.shares || 0;
      totalEngagements += metrics.engagement || 0;

      if (metrics.watchTimeTotal) {
        totalWatchTime += metrics.watchTimeTotal;
        watchTimeCount++;
      }

      // Count by type
      const type = post.media_type;
      if (postsByType.hasOwnProperty(type)) {
        postsByType[type]++;
      }
    });

    const avgWatchTime = watchTimeCount > 0 ? totalWatchTime / watchTimeCount : 0;

    // Calculate engagement rate
    const engagementRate = totalReach > 0
      ? ((totalEngagements / totalReach) * 100).toFixed(2)
      : analytics.engagementRate || 0;

    console.log('📊 Computed Analytics from filtered posts:');
    console.log('   Total Posts:', postsToProcess.length);
    console.log('   Total Views:', totalViews);
    console.log('   Total Reach:', totalReach);
    console.log('   Total Interactions:', totalInteractions);

    return {
      ...analytics,
      totalPosts: postsToProcess.length,
      totalViews,
      totalReach,
      totalInteractions,
      totalLikes,
      totalComments,
      totalSaves,
      totalShares,
      totalEngagements,
      avgWatchTime,
      reelWatchTimeTotal: totalWatchTime,
      engagementRate,
      postsByType: {
        ...analytics.postsByType,
        ...postsByType
      },
      detailedPosts: sortedDetailedPosts || []
    };
  }, [analytics, sortedDetailedPosts]);

  // PRO Analytics Calculations
  const proInsights = useMemo(() => {
    if (!analytics) return null;

    const posts = analytics.detailedPosts || [];

    // DEBUG: Log the posts data
    console.log('🔍 ProInsights Calculation:');
    console.log('   Total posts:', posts.length);
    if (posts.length > 0) {
      console.log('   Sample post:', {
        id: posts[0].id,
        media_type: posts[0].media_type,
        metrics: posts[0].metrics
      });
    }

    // 1. Best & Worst Performing Posts
    const sortedByEngagement = [...posts].sort((a, b) =>
      (b.metrics?.engagement || 0) - (a.metrics?.engagement || 0)
    );
    const bestPost = sortedByEngagement[0] || null;
    const worstPost = sortedByEngagement[sortedByEngagement.length - 1] || null;

    console.log('   Best post engagement:', bestPost?.metrics?.engagement || 0);
    console.log('   Worst post engagement:', worstPost?.metrics?.engagement || 0);

    // 2. Average Engagement
    const totalEngagement = posts.reduce((sum, p) => sum + (p.metrics?.engagement || 0), 0);
    const avgEngagement = posts.length > 0 ? Math.round(totalEngagement / posts.length) : 0;

    console.log('   Total engagement:', totalEngagement);
    console.log('   Average engagement:', avgEngagement);

    // 3. Most Active Posting Day
    const dayCounts = {};
    posts.forEach(p => {
      const day = new Date(p.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });
    const mostActiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // 4. Top Post Type
    const typeCounts = {};
    const typeEngagement = {};
    posts.forEach(p => {
      const type = p.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : p.media_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      typeEngagement[type] = (typeEngagement[type] || 0) + (p.metrics?.engagement || 0);
    });
    const topType = Object.entries(typeEngagement).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    // 5. Content Quality Insights
    let totalCaptionLength = 0;
    let totalHashtags = 0;
    const hashtagStats = {};

    posts.forEach(p => {
      const caption = p.caption || '';
      totalCaptionLength += caption.length;

      const hashtags = caption.match(/#[a-z0-9_]+/gi) || [];
      totalHashtags += hashtags.length;

      hashtags.forEach(tag => {
        const t = tag.toLowerCase();
        if (!hashtagStats[t]) hashtagStats[t] = { count: 0, engagement: 0 };
        hashtagStats[t].count++;
        hashtagStats[t].engagement += (p.metrics?.engagement || 0);
      });
    });

    const avgCaptionLength = posts.length > 0 ? Math.round(totalCaptionLength / posts.length) : 0;
    const avgHashtagCount = posts.length > 0 ? Math.round(totalHashtags / posts.length) : 0;

    const sortedHashtags = Object.entries(hashtagStats)
      .map(([tag, stats]) => ({ tag, ...stats, avgEng: Math.round(stats.engagement / stats.count) }))
      .sort((a, b) => b.avgEng - a.avgEng);

    // 6. Posting Frequency Heatmap (Day vs Hour)
    const heatmapData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    // Initialize grid
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        heatmapData.push({ day: days[d], hour: h, count: 0 });
      }
    }
    posts.forEach(p => {
      const date = new Date(p.timestamp);
      const dayIndex = date.getDay();
      const hour = date.getHours();
      const entry = heatmapData.find(d => d.day === days[dayIndex] && d.hour === hour);
      if (entry) entry.count++;
    });

    // 7. Post Type Performance
    const postTypePerformance = Object.keys(typeCounts).map(type => ({
      name: type,
      count: typeCounts[type],
      engagement: Math.round(typeEngagement[type] / typeCounts[type]),
      totalEng: typeEngagement[type]
    }));

    // 8. Engagement Distribution
    const engagementDist = [
      { name: 'Likes', value: analytics.totalLikes, color: '#F43F5E' }, // Rose 500
      { name: 'Comments', value: analytics.totalComments, color: '#3B82F6' }, // Blue 500
      { name: 'Saves', value: analytics.totalSaves, color: '#EAB308' }, // Yellow 500
      { name: 'Shares', value: analytics.totalShares, color: '#10B981' } // Emerald 500
    ].filter(d => d.value > 0);

    return {
      bestPost,
      worstPost,
      avgEngagement,
      mostActiveDay,
      topType,
      avgCaptionLength,
      avgHashtagCount,
      bestHashtags: sortedHashtags.slice(0, 5),
      worstHashtags: sortedHashtags.slice(-5).reverse(),
      heatmapData: heatmapData.filter(d => d.count > 0), // Optimization for scatter chart
      postTypePerformance,
      engagementDist
    };
  }, [analytics]);

  // Calculate views by media type
  const viewsByMediaType = useMemo(() => {
    if (!analytics?.detailedPosts) return { IMAGE: 0, VIDEO: 0, REELS: 0, REEL: 0, CAROUSEL_ALBUM: 0 };

    const viewsMap = {
      IMAGE: 0,
      VIDEO: 0,
      REELS: 0,
      REEL: 0,
      CAROUSEL_ALBUM: 0
    };

    analytics.detailedPosts.forEach(post => {
      const type = post.media_type;
      const views = post.metrics?.views || 0;
      if (viewsMap.hasOwnProperty(type)) {
        viewsMap[type] += views;
      }
    });

    // Combine REEL and REELS
    viewsMap.REELS = (viewsMap.REELS || 0) + (viewsMap.REEL || 0);

    return viewsMap;
  }, [analytics?.detailedPosts]);


  // Loading State
  if (loading) {
    return (
      <Layout>
        <div className="p-6 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-slate-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error State
  if (error && !showTokenExpiredModal) {
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

              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Analytics
              </button>

              <div className="mt-8 p-4 bg-slate-100 rounded-lg text-left text-xs font-mono text-slate-600 overflow-auto max-h-40">
                <p className="font-bold mb-2">Debug Info:</p>
                <p>Loading: {loading ? 'true' : 'false'}</p>
                <p>Error: {error ? error : 'null'}</p>
                <p>Analytics: {analytics ? 'Object' : 'null'}</p>
                <p>Token Expired Modal: {showTokenExpiredModal ? 'true' : 'false'}</p>
                <p>Date Range: {dateRange}</p>
              </div>
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
          {/* Header */}
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">Template Version: {ANALYTICS_VERSION}</p>
                {lastUpdated && (
                  <>
                    <span className="text-gray-400">•</span>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Auto-refresh: Last updated {new Date(lastUpdated).toLocaleTimeString()}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
                  <label htmlFor="clientFilterTop" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</label>
                  <select
                    id="clientFilterTop"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md bg-transparent"
                  >
                    <option value="all">All Clients</option>
                    {clientOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
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
              </div>
              <div className="flex items-center gap-3">
                {tokenStatus && tokenStatus.isExpiringSoon && !tokenStatus.isExpired && (
                  <div className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>Token expires in {tokenStatus.expiresInDays} days. Reconnect soon.</span>
                  </div>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || timeLeft > 0}
                  className={`px-4 py-2.5 rounded-lg transition-colors font-medium shadow-sm flex items-center gap-2 ${timeLeft > 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Fetching...' : timeLeft > 0 ? `Wait ${timeLeft}s` : 'Refresh'}
                </button>
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

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Row 1 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Eye size={80} className="text-blue-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Eye className="text-blue-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-full">Visibility</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Views</h3>
              <p className="text-3xl font-bold text-slate-900">{computedAnalytics.totalViews.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users size={80} className="text-emerald-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="text-emerald-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-full">Reach</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Reach</h3>
              <p className="text-3xl font-bold text-slate-900">{computedAnalytics.totalReach.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={80} className="text-purple-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Activity className="text-purple-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded-full">Interactions</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Interactions</h3>
              <p className="text-3xl font-bold text-slate-900">{computedAnalytics.totalInteractions.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Clock size={80} className="text-rose-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-rose-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Clock className="text-rose-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-rose-600 uppercase bg-rose-50 px-2 py-1 rounded-full">Watch Time</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Avg Watch Time</h3>
              <p className="text-3xl font-bold text-slate-900">
                {computedAnalytics.avgWatchTime ? `${Math.round(computedAnalytics.avgWatchTime)}s` : 'N/A'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Total: {computedAnalytics.reelWatchTimeTotal ? `${Math.round(computedAnalytics.reelWatchTimeTotal)}s` : 'N/A'}
              </p>
            </div>

            {/* Row 2 - Secondary Metrics */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FileText size={80} className="text-slate-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform">
                  <FileText className="text-slate-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-slate-600 uppercase bg-slate-50 px-2 py-1 rounded-full">Content</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Posts</h3>
              <p className="text-3xl font-bold text-slate-900">{computedAnalytics.totalPosts}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users size={80} className="text-indigo-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="text-indigo-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-full">Community</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Total Followers</h3>
              <p className="text-3xl font-bold text-slate-900">{analytics.totalFollowers.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap size={80} className="text-yellow-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-yellow-50 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap className="text-yellow-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-yellow-600 uppercase bg-yellow-50 px-2 py-1 rounded-full">Engagement</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Engagement Rate</h3>
              <p className="text-3xl font-bold text-slate-900">{parseFloat(computedAnalytics.engagementRate).toFixed(1)}%</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp size={80} className="text-green-600" />
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <span className="text-xs font-bold tracking-wider text-green-600 uppercase bg-green-50 px-2 py-1 rounded-full">Growth</span>
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Follower Growth</h3>
              <p className="text-3xl font-bold text-slate-900">
                {analytics.followerGrowth > 0 ? '+' : ''}{analytics.followerGrowth}
              </p>
            </div>
          </div>

          {/* Media Type Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-lg">
                <LayoutGrid className="text-slate-700" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Content Type Breakdown</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Images */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Images</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{computedAnalytics.postsByType?.IMAGE || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {computedAnalytics.totalPosts > 0 ? Math.round(((computedAnalytics.postsByType?.IMAGE || 0) / computedAnalytics.totalPosts) * 100) : 0}% of total
                </p>
                <p className="text-xs text-blue-700 font-medium mt-1">
                  {(viewsByMediaType.IMAGE || 0).toLocaleString()} views
                </p>
              </div>

              {/* Videos (Combined VIDEO + REELS) */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Videos</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {(computedAnalytics.postsByType?.VIDEO || 0) + (computedAnalytics.postsByType?.REELS || 0)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {computedAnalytics.totalPosts > 0 ? Math.round((((computedAnalytics.postsByType?.VIDEO || 0) + (computedAnalytics.postsByType?.REELS || 0)) / computedAnalytics.totalPosts) * 100) : 0}% of total
                </p>
                <p className="text-xs text-purple-700 font-medium mt-1">
                  {((viewsByMediaType.VIDEO || 0) + (viewsByMediaType.REELS || 0)).toLocaleString()} views
                </p>
              </div>

              {/* Carousels */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Carousels</span>
                </div>
                <p className="text-2xl font-bold text-emerald-900">{computedAnalytics.postsByType?.CAROUSEL_ALBUM || 0}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {computedAnalytics.totalPosts > 0 ? Math.round(((computedAnalytics.postsByType?.CAROUSEL_ALBUM || 0) / computedAnalytics.totalPosts) * 100) : 0}% of total
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1">
                  {(viewsByMediaType.CAROUSEL_ALBUM || 0).toLocaleString()} views
                </p>
              </div>
            </div>
          </div>

          {/* --- PRO SECTION: DEEP INSIGHTS --- */}
          {proInsights && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Best Performing Post */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Award size={64} className="text-yellow-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Best Performing Post</h3>
                  {proInsights.bestPost ? (
                    <div className="flex gap-4">
                      {proInsights.bestPost.thumbnail_url && (
                        <img
                          src={proInsights.bestPost.thumbnail_url}
                          alt="Best Post"
                          className="w-20 h-20 object-cover rounded-lg shadow-sm"
                        />
                      )}
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{proInsights.bestPost.metrics?.engagement}</div>
                        <div className="text-xs text-slate-500 mb-1">Total Engagements</div>
                        <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit">
                          <Heart size={12} /> {proInsights.bestPost.metrics?.likes}
                          <MessageSquare size={12} className="ml-1" /> {proInsights.bestPost.metrics?.comments}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm">No data available</div>
                  )}
                </div>

                {/* Worst Performing Post */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingDown size={64} className="text-red-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Needs Improvement</h3>
                  {proInsights.worstPost ? (
                    <div className="flex gap-4">
                      {proInsights.worstPost.thumbnail_url && (
                        <img
                          src={proInsights.worstPost.thumbnail_url}
                          alt="Worst Post"
                          className="w-20 h-20 object-cover rounded-lg shadow-sm grayscale opacity-80"
                        />
                      )}
                      <div>
                        <div className="text-2xl font-bold text-slate-900">{proInsights.worstPost.metrics?.engagement}</div>
                        <div className="text-xs text-slate-500 mb-1">Total Engagements</div>
                        <div className="text-xs text-slate-400">
                          Consider archiving or analyzing why this didn't resonate.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-sm">No data available</div>
                  )}
                </div>

                {/* Average Engagement */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl">
                      <Activity className="text-indigo-600" size={24} />
                    </div>
                    <span className="text-xs font-medium text-slate-400">PER POST</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Avg. Engagement</h3>
                  <p className="text-3xl font-bold text-slate-900">{proInsights.avgEngagement}</p>
                  <p className="text-xs text-slate-500 mt-1">Based on last {analytics.detailedPosts?.length || 0} posts</p>
                </div>

                {/* Most Active Day */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-50 rounded-xl">
                      <Calendar className="text-orange-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Best Posting Day</h3>
                  <p className="text-3xl font-bold text-slate-900">{proInsights.mostActiveDay}</p>
                  <p className="text-xs text-slate-500 mt-1">When you are most consistent</p>
                </div>

                {/* Top Post Type */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-pink-50 rounded-xl">
                      <LayoutGrid className="text-pink-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Top Format</h3>
                  <p className="text-3xl font-bold text-slate-900">{proInsights.topType}</p>
                  <p className="text-xs text-slate-500 mt-1">Format with highest engagement</p>
                </div>

                {/* Content Quality Score (Calculated) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-teal-50 rounded-xl">
                      <Zap className="text-teal-600" size={24} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Avg Caption Length</h3>
                  <p className="text-3xl font-bold text-slate-900">{proInsights.avgCaptionLength} <span className="text-sm font-normal text-slate-500">chars</span></p>
                  <p className="text-xs text-slate-500 mt-1">Hashtags per post: {proInsights.avgHashtagCount}</p>
                </div>
              </div>

              {/* --- CHARTS SECTION --- */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement vs Followers */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <TrendingUp size={20} className="text-blue-600" />
                    Engagement vs Reach
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData.engagement}>
                      <defs>
                        <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorView" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="engagements" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEng)" name="Engagements" />
                      <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorView)" name="Reach/Views" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Post Type Performance */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart2 size={20} className="text-purple-600" />
                    Performance by Format
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={proInsights.postTypePerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={80} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend />
                      <Bar dataKey="engagement" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Avg Engagement" barSize={20} />
                      <Bar dataKey="count" fill="#cbd5e1" radius={[0, 4, 4, 0]} name="Post Count" barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Engagement Distribution (Donut) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Heart size={20} className="text-rose-500" />
                    Engagement Mix
                  </h2>
                  <div className="flex items-center justify-center" style={{ minHeight: '300px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={proInsights.engagementDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {proInsights.engagementDist.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Hashtag Performance */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Hash size={20} className="text-slate-600" />
                    Top Hashtags
                  </h2>
                  <div className="space-y-4">
                    {proInsights.bestHashtags.map((tag, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-xs font-bold text-slate-500 border border-slate-200">
                            {i + 1}
                          </span>
                          <span className="font-medium text-slate-700">#{tag.tag}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{tag.avgEng} avg. eng</div>
                          <div className="text-xs text-slate-500">Used {tag.count} times</div>
                        </div>
                      </div>
                    ))}
                    {proInsights.bestHashtags.length === 0 && (
                      <div className="text-center text-slate-500 py-8">No hashtags found in recent posts</div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- POST METRICS TABLE --- */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <BarChart2 className="text-white" size={20} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Recent Post Performance</h2>
                      <p className="text-xs text-slate-500">Detailed breakdown of your latest Instagram posts.</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200">
                        <th className="p-4 font-bold text-center text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-center gap-1">
                            <span>#</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <FileText size={14} />
                            <span>Post</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>Date</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center gap-2">
                            <LayoutGrid size={14} />
                            <span>Type</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Heart size={14} className="text-rose-500" />
                            <span>Likes</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <MessageSquare size={14} className="text-blue-500" />
                            <span>Comments</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Save size={14} className="text-yellow-500" />
                            <span>Saves</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Eye size={14} className="text-purple-500" />
                            <span>Views</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Users size={14} className="text-emerald-500" />
                            <span>Reach</span>
                          </div>
                        </th>
                        <th className="p-4 font-bold text-right text-slate-700 text-xs uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-2">
                            <Activity size={14} className="text-indigo-500" />
                            <span>Engagement</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedDetailedPosts.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-sm text-slate-500">
                            {clientFilter === 'all'
                              ? 'No posts available yet.'
                              : 'No posts available for the selected client.'}
                          </td>
                        </tr>
                      ) : sortedDetailedPosts.map((post, index) => {
                        const getPostTypeColor = (type) => {
                          const typeMap = {
                            'IMAGE': 'bg-blue-100 text-blue-700 border-blue-200',
                            'VIDEO': 'bg-purple-100 text-purple-700 border-purple-200',
                            'REELS': 'bg-pink-100 text-pink-700 border-pink-200',
                            'CAROUSEL_ALBUM': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                            'STORY': 'bg-orange-100 text-orange-700 border-orange-200'
                          };
                          return typeMap[type] || 'bg-slate-100 text-slate-700 border-slate-200';
                        };

                        return (
                          <tr
                            key={post.id}
                            className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-200 group border-b border-slate-100 last:border-b-0"
                          >
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center">
                                <span className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                  {index + 1}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {post.thumbnail_url ? (
                                  <div className="relative group/img">
                                    <img
                                      src={post.thumbnail_url}
                                      alt="Post"
                                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200"
                                    />
                                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-200 flex items-center justify-center">
                                    <FileText className="text-slate-400" size={20} />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="max-w-[250px] truncate text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {post.caption || 'No caption'}
                                  </div>
                                  {post.caption && post.caption.length > 30 && (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                      {post.caption.substring(0, 30)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-700">
                                  {new Date(post.timestamp).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-3 py-1.5 ${getPostTypeColor(post.media_type)} text-xs font-bold rounded-lg border shadow-sm inline-block`}>
                                {post.media_type}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Heart size={16} className="text-rose-400" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {(post.metrics?.likes || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <MessageSquare size={16} className="text-blue-400" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {(post.metrics?.comments || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Save size={16} className="text-yellow-400" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {(post.metrics?.saved || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Eye size={16} className="text-purple-400" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {(post.metrics?.views || 0).toLocaleString()}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Users size={16} className="text-emerald-400" />
                                <span className="text-sm font-semibold text-slate-900">
                                  {post.metrics?.reach ? post.metrics.reach.toLocaleString() : '-'}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-lg shadow-sm">
                                  {(post.metrics?.engagement || 0).toLocaleString()}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(!analytics.detailedPosts || analytics.detailedPosts.length === 0) && (
                    <div className="p-12 text-center">
                      <BarChart2 className="mx-auto text-slate-300 mb-3" size={48} />
                      <p className="text-slate-500 font-medium">No posts found</p>
                      <p className="text-sm text-slate-400 mt-1">Posts will appear here once published</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Token Expired Modal */}
      <TokenExpiredModal
        show={showTokenExpiredModal}
        onClose={() => setShowTokenExpiredModal(false)}
        onReconnect={() => {
          setShowTokenExpiredModal(false);
          window.location.href = '/dashboard/clients';
        }}
      />
    </Layout >
  );
};

export default Analytics;
