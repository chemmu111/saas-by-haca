import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { useOutletContext } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from './Layout';
import PageTitle from './components/PageTitle';

// Import existing modular components
import AnalyticsHeader from './components/analytics/AnalyticsHeader';
import OverviewCards from './components/analytics/OverviewCards';
import ChartsSection from './components/analytics/ChartsSection';
import ContentBreakdown from './components/analytics/ContentBreakdown';
import TopContent from './components/analytics/TopContent';

import ProfileActivity from './components/analytics/ProfileActivity';

// Import new enhanced components
import ProfileGrowthCard from './components/analytics/ProfileGrowthCard';
import AudienceMetricsCard from './components/analytics/AudienceMetricsCard';
import EngagementBreakdownCard from './components/analytics/EngagementBreakdownCard';
import PostsPerformanceTable from './components/analytics/PostsPerformanceTable';
import PlatformComparisonCard from './components/analytics/PlatformComparisonCard';

import BestPostingTimeCard from './components/analytics/BestPostingTimeCard';
import ContentTypeEngagementCard from './components/analytics/ContentTypeEngagementCard';
import VideoViewsChart from './components/analytics/VideoViewsChart';

// Helper for token expiry modal
const TokenExpiredModal = ({ show, onClose, onReconnect }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex items-center gap-3 mb-4 text-orange-600">
          <AlertCircle size={28} />
          <h3 className="text-xl font-bold text-slate-900">Connection Expired</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Your Instagram connection has expired. To continue seeing real-time analytics, please reconnect your account.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onReconnect}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
          >
            Reconnect Now
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const Analytics = ({ embedded = false, clientId = null }) => {
  // const { user } = useOutletContext(); // Removed to fix crash - context not available here
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState(clientId || 'all');
  const [dateRange, setDateRange] = useState('all_time');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [tokenStatus, setTokenStatus] = useState(null);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(5 * 60 * 1000); // 5 minutes

  const dashboardRef = useRef(null);
  const autoRefreshTimerRef = useRef(null);
  const getBaseBackendUrl = () => {
    if (window.location.hostname.includes('socialhac.com')) return 'https://haca-social-x-backend.onrender.com';
    return (import.meta.env.VITE_API_URL || 'https://haca-social-x-backend.onrender.com').replace(/\/$/, '');
  };
  const API_URL = getBaseBackendUrl();
  console.log('📊 Analytics API URL:', API_URL);

  // Update client filter if prop changes
  useEffect(() => {
    if (clientId) {
      setClientFilter(clientId);
    }
  }, [clientId]);

  // Helper to build URL with auth
  const buildUrl = (path) => {
    const token = localStorage.getItem('auth_token');
    const url = new URL(`${API_URL}${path}`);
    return { url: url.toString(), headers: { 'Authorization': `Bearer ${token}` } };
  };

  // Fetch Clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const { url, headers } = buildUrl('/api/clients');
        const response = await fetch(url, { headers });
        const data = await response.json();
        if (data.success) {
          // Map clients to ensure each has an 'id' property for dropdown compatibility
          const mappedClients = data.data.map(client => ({
            ...client,
            id: client._id // Add id field for dropdown
          }));
          setClients(mappedClients);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    fetchClients();
  }, []);

  // Helper to calculate date range
  const getDateRangeParams = () => {
    const now = new Date();
    let startDate = null;
    let endDate = now.toISOString();

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        endDate = new Date().toISOString();
        break;
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'all_time':
        // Set to 1 year ago or null? API needs a range usually, or we can just send null to get everything available
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate).toISOString();
        if (customEndDate) endDate = new Date(customEndDate).toISOString();
        break;
      default:
        // No date filter
        startDate = null;
        endDate = null;
    }
    return { startDate, endDate };
  };

  // Fetch Analytics
  const fetchAnalytics = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const { url, headers } = buildUrl('/api/analytics');
      const fetchUrl = new URL(url);
      if (forceRefresh) fetchUrl.searchParams.append('refresh', 'true');
      if (clientFilter !== 'all') fetchUrl.searchParams.append('clientId', clientFilter);

      // Add date range parameters
      const { startDate, endDate } = getDateRangeParams();
      if (startDate) fetchUrl.searchParams.append('startDate', startDate);
      if (endDate) fetchUrl.searchParams.append('endDate', endDate);

      const response = await fetch(fetchUrl.toString(), { headers });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
      }

      const result = await response.json();

      if (!result.success) throw new Error(result.error || 'Failed to fetch analytics');

      // Check token status
      if (result.tokenStatus) {
        setTokenStatus(result.tokenStatus);
        if (result.tokenStatus.isExpired) {
          setShowTokenExpiredModal(true);
        }
      }

      setAnalytics(result.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial Fetch & Filter Change (including date range)
  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFilter, dateRange, customStartDate, customEndDate]);

  // Timer for refresh button
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      return;
    }

    // Set up auto-refresh interval
    autoRefreshTimerRef.current = setInterval(() => {
      console.log('🔄 Auto-refreshing analytics data...');
      fetchAnalytics(true);
    }, autoRefreshInterval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };
  }, [autoRefreshEnabled, autoRefreshInterval]);

  const handleRefresh = () => {
    if (timeLeft > 0) return;
    fetchAnalytics(true);
    setTimeLeft(60); // 1 minute cooldown
  };

  const handleReconnect = () => {
    window.location.href = '/dashboard/settings';
  };

  // PDF Export Logic
  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExportingPDF(true);

    try {
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC' // Match dashboard background
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
      pdf.save(`Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  // Filter Logic for Date Range (Client-side filtering of posts)
  const filteredAnalytics = useMemo(() => {
    if (!analytics) return null;

    // Filter detailed posts based on date range
    let filteredPosts = analytics.detailedPosts || [];
    const now = new Date();
    let startDate = null;
    let endDate = null;

    console.log('📅 Date filter triggered:', { dateRange, totalPosts: filteredPosts.length });

    // Calculate start date based on date range selection
    switch (dateRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0); // Start of today
        endDate = new Date(now); // End is now
        break;
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all_time':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate) startDate = new Date(customStartDate);
        if (customEndDate) {
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // End of the selected day
        }
        break;
      default:
        // 'all' or unrecognized - no filtering
        break;
    }

    console.log('📅 Date range calculated:', { startDate, endDate });

    // Apply date filtering
    const originalCount = filteredPosts.length;
    if (startDate) {
      filteredPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate >= startDate;
      });
    }

    if (endDate) {
      filteredPosts = filteredPosts.filter(post => {
        const postDate = new Date(post.timestamp);
        return postDate <= endDate;
      });
    }

    console.log('📅 Posts filtered:', { original: originalCount, filtered: filteredPosts.length });

    // Also filter viewsTrend if present
    let filteredViewsTrend = analytics.viewsTrend || [];
    if (startDate && filteredViewsTrend.length > 0) {
      filteredViewsTrend = filteredViewsTrend.filter(day => {
        const dayDate = new Date(day.date);
        const inRange = dayDate >= startDate;
        return endDate ? inRange && dayDate <= endDate : inRange;
      });
    }

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

    filteredPosts.forEach(post => {
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
    console.log('   Total Posts:', filteredPosts.length);
    console.log('   Total Views:', totalViews);
    console.log('   Total Reach:', totalReach);
    console.log('   Total Interactions:', totalInteractions);

    return {
      ...analytics,
      totalPosts: filteredPosts.length,
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
      detailedPosts: filteredPosts,
      viewsTrend: filteredViewsTrend
    };
  }, [analytics, dateRange, customStartDate, customEndDate]);

  // Render loading state
  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-500 font-medium">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <AlertCircle className="text-red-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Failed to load analytics</h3>
        <p className="text-slate-500 mb-6">{error}</p>
        <button
          onClick={() => fetchAnalytics(true)}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const Content = () => (
    <div className="max-w-[1600px] mx-auto" ref={dashboardRef}>
      <AnalyticsHeader
        version="v3.0"
        lastUpdated={lastUpdated}
        clientFilter={clientFilter}
        setClientFilter={setClientFilter}
        clientOptions={clients}
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        refreshing={refreshing}
        timeLeft={timeLeft}
        handleRefresh={handleRefresh}
        handleExportPDF={handleExportPDF}
        exportingPDF={exportingPDF}
        tokenStatus={tokenStatus}
        autoRefreshEnabled={autoRefreshEnabled}
        setAutoRefreshEnabled={setAutoRefreshEnabled}
        hideClientSelector={embedded} // New prop to hide selector
      />

      {/* Overview Cards */}
      <OverviewCards analytics={filteredAnalytics} />

      {/* Profile Growth & Audience Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ProfileGrowthCard analytics={filteredAnalytics} />
        <AudienceMetricsCard analytics={filteredAnalytics} />
      </div>

      {/* Engagement Breakdown */}
      <div className="mb-8">
        <EngagementBreakdownCard analytics={filteredAnalytics} />
      </div>

      {/* Charts Section - Enhanced */}
      <ChartsSection analytics={filteredAnalytics} />

      {/* Video Views Chart */}
      <div className="mb-8">
        <VideoViewsChart
          posts={filteredAnalytics?.detailedPosts}
          viewsTrend={filteredAnalytics?.viewsTrend}
        />
      </div>

      {/* Platform Comparison & Content Type Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <PlatformComparisonCard
          analytics={filteredAnalytics}
          posts={filteredAnalytics?.detailedPosts}
        />
        <ContentTypeEngagementCard posts={filteredAnalytics?.detailedPosts} />
      </div>

      {/* Content Breakdown & Top Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <ContentBreakdown analytics={filteredAnalytics} />
        <div className="lg:col-span-2">
          <TopContent posts={filteredAnalytics?.detailedPosts} />
        </div>
      </div>

      {/* Best Posting Times */}
      <div className="mb-8">
        <BestPostingTimeCard posts={filteredAnalytics?.detailedPosts} />
      </div>

      {/* Posts Performance Table */}
      <div className="mb-8">
        <PostsPerformanceTable posts={filteredAnalytics?.detailedPosts} />
      </div>

      {/* Profile Activity */}
      <div className="mb-8">
        <ProfileActivity analytics={filteredAnalytics} />
      </div>

      <TokenExpiredModal
        show={showTokenExpiredModal}
        onClose={() => setShowTokenExpiredModal(false)}
        onReconnect={handleReconnect}
      />
    </div>
  );

  if (embedded) {
    return <Content />;
  }

  return (
    <Layout>
      <PageTitle title="Analytics Dashboard" />
      <Content />
    </Layout>
  );
};

export default Analytics;
