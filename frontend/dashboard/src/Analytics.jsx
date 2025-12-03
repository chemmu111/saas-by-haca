import React, { useState, useEffect, useMemo, useRef } from 'react';
// import { useOutletContext } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Loader2, AlertCircle } from 'lucide-react';
import Layout from './Layout';

// Import existing modular components
import AnalyticsHeader from './components/analytics/AnalyticsHeader';
import OverviewCards from './components/analytics/OverviewCards';
import ChartsSection from './components/analytics/ChartsSection';
import ContentBreakdown from './components/analytics/ContentBreakdown';
import TopContent from './components/analytics/TopContent';

import ProfileActivity from './components/analytics/ProfileActivity';
import PostingHeatmap from './components/analytics/PostingHeatmap';

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

const Analytics = () => {
  // const { user } = useOutletContext(); // Removed to fix crash - context not available here
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('all');
  const [dateRange, setDateRange] = useState('last30');
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
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
          setClients(data.data);
        }
      } catch (err) {
        console.error('Error fetching clients:', err);
      }
    };
    fetchClients();
  }, []);

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

  // Initial Fetch & Filter Change
  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientFilter]);

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
    const past = new Date();

    if (dateRange === 'last7') past.setDate(now.getDate() - 7);
    if (dateRange === 'last30') past.setDate(now.getDate() - 30);
    if (dateRange === 'custom' && customStartDate) {
      past.setTime(new Date(customStartDate).getTime());
    }

    if (dateRange !== 'all') {
      filteredPosts = filteredPosts.filter(post => new Date(post.timestamp) >= past);
    }

    if (dateRange === 'custom' && customEndDate) {
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59);
      filteredPosts = filteredPosts.filter(post => new Date(post.timestamp) <= end);
    }

    // Recalculate aggregates based on filtered posts if needed
    // For now, we use the backend aggregates which are mostly 30-day based or total
    // Ideally, backend should accept date range params for all metrics

    return {
      ...analytics,
      detailedPosts: filteredPosts
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



  // Main render
  return (
    <Layout>
      <div className="max-w-[1600px] mx-auto" ref={dashboardRef}>
        <AnalyticsHeader
          version="v3.0"
          lastUpdated={lastUpdated}
          clientFilter={clientFilter}
          setClientFilter={setClientFilter}
          clientOptions={clients}
          dateRange={dateRange}
          setDateRange={setDateRange}
          refreshing={refreshing}
          timeLeft={timeLeft}
          handleRefresh={handleRefresh}
          handleExportPDF={handleExportPDF}
          exportingPDF={exportingPDF}
          tokenStatus={tokenStatus}
          autoRefreshEnabled={autoRefreshEnabled}
          setAutoRefreshEnabled={setAutoRefreshEnabled}
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
          <VideoViewsChart posts={filteredAnalytics?.detailedPosts} />
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

        <div className="mb-8">
          <PostingHeatmap analytics={filteredAnalytics} />
        </div>

        <TokenExpiredModal
          show={showTokenExpiredModal}
          onClose={() => setShowTokenExpiredModal(false)}
          onReconnect={handleReconnect}
        />
      </div>
    </Layout>
  );
};

export default Analytics;
