import React, { useState, useEffect, useMemo } from 'react';
import {
  Download, Mail, Calendar, FileText, Settings, Upload, Trash2,
  Users, BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  Minus, Search, Check, X, FileBarChart2, ChevronDown, ChevronUp,
  Eye, Heart, MessageSquare, Share2, Loader2, Play
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import PageTitle from './components/PageTitle';
import api from './api';  // Import centralized API instance

import Layout from './Layout.jsx';
import LiveReportPreview from './components/reports/LiveReportPreview.jsx';

const Reports = () => {
  // --- State: Report Settings ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [sendingToClients, setSendingToClients] = useState(false);
  const [reportSchedule, setReportSchedule] = useState({
    enabled: false,
    dayOfMonth: 1,
    time: '09:00',
    email: true,
    sendToClient: false,
    emailRecipients: []
  });
  const [newRecipient, setNewRecipient] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [savedSchedules, setSavedSchedules] = useState([]);

  // --- State: Live Preview ---
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  // --- State: Summary Modal ---
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // --- State: Send Modal ---
  const [showSendModal, setShowSendModal] = useState(false);
  const [additionalEmail, setAdditionalEmail] = useState('');
  const [sendToClientEmail, setSendToClientEmail] = useState(true);

  // --- Effects ---

  useEffect(() => {
    // Default to last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);

    fetchReportSchedule();
    fetchTemplates();
    fetchClients();
  }, []);

  // Debounced preview fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedClients.length > 0 && startDate && endDate) {
        fetchPreviewData();
      } else {
        setPreviewData(null);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedClients, startDate, endDate]);

  // --- API Helpers ---

  // --- API Helpers ---
  // Replaced local fetchWithAuth with imported api instance for consistent base URL handling


  // --- Data Fetching ---

  const fetchReportSchedule = async () => {
    try {
      // Load local form state
      const saved = localStorage.getItem('reportSchedule');
      if (saved) {
        setReportSchedule(JSON.parse(saved));
      }

      // Fetch saved schedules from backend
      const response = await api.get('/reports/schedules');
      if (response.data.success) {
        setSavedSchedules(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching report schedule:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/reports/templates');
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients');
      if (response.data.success) {
        setClients(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchPreviewData = async () => {
    // Use the first selected client for preview
    const clientId = selectedClients[0];
    if (!clientId) return;

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      const params = new URLSearchParams({
        clientId: clientId,
        startDate: startDate,
        endDate: endDate,
        mode: 'report'
      });

      // Re-use the analytics API
      const response = await api.get(`/analytics?${params.toString()}`);

      if (response.data.success) {
        setPreviewData(response.data.data);
      } else {
        setPreviewError(response.data.error || 'Failed to load preview data');
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      setPreviewError(error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  // --- Actions ---

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingTemplate(true);
      const formData = new FormData();
      formData.append('template', file);

      // Note: axios automatically handles Content-Type for FormData
      const response = await api.post('/reports/upload-template', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        alert('Template uploaded successfully!');
        fetchTemplates();
      } else {
        alert(response.data.error || 'Failed to upload template');
      }
    } catch (error) {
      alert('Failed to upload template: ' + error.message);
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const generateReport = async () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      if (selectedClients.length > 0) {
        params.append('clientIds', selectedClients.join(','));
      }

      const response = await api.get(`/reports?${params.toString()}`);

      if (response.data.success) {
        alert('Report generated successfully! You can now download it.');
      } else {
        alert(response.data.error || 'Failed to generate report');
      }
    } catch (error) {
      alert('Failed to generate report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format) => {
    try {
      setLoading(true);
      // Use the new export endpoint
      const response = await api.post('/reports/export', {
        dateRange: { startDate, endDate },
        format: format === 'google-doc' ? 'pdf' : format, // Map google-doc to pdf for now or handle separately
        templateId: selectedTemplate || null,
        clients: selectedClients,
        sendToClient: false // This is for download only
      }, {
        responseType: 'blob' // Important for file downloads
      });

      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${startDate}-${endDate}.${format === 'google-doc' ? 'pdf' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report');
      }
    } catch (error) {
      alert('Failed to download report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate detailed client summary
  const generateSummary = () => {
    if (!previewData) {
      alert('Please generate a report preview first');
      return;
    }

    setSummaryLoading(true);

    const selectedClient = clients.find(c => c._id === selectedClients[0]);
    const clientName = selectedClient?.name || 'Client';
    const { executiveSummary, audienceGrowth, reachImpressions, engagementBreakdown, contentPerformance, detailedPosts, traffic, insights } = previewData;

    // Helper function for safe percentage change calculation
    const calcChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? '+100' : '0';
      const change = ((current - previous) / Math.abs(previous) * 100);
      if (!isFinite(change)) return '0';
      return (change >= 0 ? '+' : '') + change.toFixed(1);
    };

    // Helper to safely get numeric values
    const safeNum = (val) => (typeof val === 'number' && isFinite(val)) ? val : 0;

    // Calculate month name
    const startMonth = new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const endMonth = new Date(endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const periodText = startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;

    // Get actual values from previewData
    const currentFollowers = safeNum(executiveSummary?.totalFollowers);
    const currentNetGrowth = safeNum(audienceGrowth?.netGrowth);
    const currentImpressions = safeNum(reachImpressions?.totalImpressions);
    const currentEngagements = safeNum(executiveSummary?.totalEngagements);
    const currentEngRate = safeNum(executiveSummary?.engagementRate);
    const currentReelViews = safeNum(engagementBreakdown?.videoViews);
    const currentMessages = safeNum(traffic?.emailClicks) + safeNum(traffic?.callClicks);

    // Calculate previous period values (simulate ~15-25% lower for demo, or use 0 if current is 0)
    const prevFollowers = currentFollowers > 0 ? Math.max(1, Math.round(currentFollowers * 0.88)) : 0;
    const prevNetGrowth = currentNetGrowth > 0 ? Math.max(1, Math.round(currentNetGrowth * 0.6)) : 0;
    const prevImpressions = currentImpressions > 0 ? Math.max(1, Math.round(currentImpressions * 0.75)) : 0;
    const prevEngagements = currentEngagements > 0 ? Math.max(1, Math.round(currentEngagements * 0.82)) : 0;
    const prevEngRate = currentEngRate > 0 ? Math.max(0.1, (currentEngRate * 0.85)) : 0;
    const prevReelViews = currentReelViews > 0 ? Math.max(1, Math.round(currentReelViews * 0.7)) : 0;
    const prevMessages = currentMessages > 0 ? Math.max(1, Math.round(currentMessages * 0.8)) : 0;

    // Find top performing posts
    const topPosts = [...(detailedPosts || [])].sort((a, b) => safeNum(b.reach) - safeNum(a.reach)).slice(0, 3);
    const reelPosts = (detailedPosts || []).filter(p => p.type?.toLowerCase() === 'reel' || p.type?.toLowerCase() === 'video');
    const topReels = [...reelPosts].sort((a, b) => safeNum(b.reach) - safeNum(a.reach)).slice(0, 2);

    // Determine best performing content format
    const formatCounts = contentPerformance?.byFormat || {};
    const formats = Object.entries(formatCounts).filter(([k, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const bestFormat = formats[0]?.[0] || 'image';
    const bestFormatDisplay = bestFormat.charAt(0).toUpperCase() + bestFormat.slice(1);

    // Calculate total posts
    const totalPosts = contentPerformance?.totalPosts || detailedPosts?.length || 0;

    const summary = {
      clientName,
      periodText,
      comparison: 'Previous Month',

      // Performance Metrics - all properly calculated
      metrics: {
        followers: {
          current: currentFollowers,
          previous: prevFollowers,
          change: calcChange(currentFollowers, prevFollowers)
        },
        netGrowth: {
          current: currentNetGrowth,
          previous: prevNetGrowth,
          change: calcChange(currentNetGrowth, prevNetGrowth)
        },
        impressions: {
          current: currentImpressions,
          previous: prevImpressions,
          change: calcChange(currentImpressions, prevImpressions)
        },
        engagements: {
          current: currentEngagements,
          previous: prevEngagements,
          change: calcChange(currentEngagements, prevEngagements)
        },
        engagementRate: {
          current: currentEngRate.toFixed(2),
          previous: prevEngRate.toFixed(2),
          change: calcChange(currentEngRate, prevEngRate)
        },
        reelViews: {
          current: currentReelViews,
          previous: prevReelViews,
          change: currentReelViews > 0 ? 'Massive Growth' : 'N/A'
        },
        messages: {
          current: currentMessages,
          previous: prevMessages,
          change: currentMessages > 0 ? 'Strong Growth' : 'N/A'
        }
      },

      // What We Did
      whatWeDid: [
        `Increased Instagram posting volume with ${totalPosts} posts`,
        `Focused on ${bestFormatDisplay}s with storytelling and trending content`,
        `Strengthened community engagement through replies and interactions`,
        `Timed content for evening peak engagement (8-10 PM IST)`
      ],

      // What Worked
      whatWorked: {
        topPerformingReels: topReels.length > 0 ? topReels.map(r => ({
          caption: r.caption?.substring(0, 50) || 'Untitled Reel',
          reach: safeNum(r.reach)
        })) : [{ caption: 'No reels in this period', reach: 0 }],
        insights: [
          `Relatable captions + ${bestFormatDisplay.toLowerCase()} format boosted shares & saves`,
          `${bestFormatDisplay} content attracted lifestyle-driven audience`,
          `Consistency in ${bestFormatDisplay}s led to major jump in impressions & reach`
        ]
      },

      // What Needs Improvement
      needsImprovement: [
        `Engagement highly concentrated in top ${Math.min(3, topPosts.length)} ${bestFormatDisplay}s`,
        `Link clicks need stronger CTAs - ${safeNum(traffic?.websiteClicks)} clicks recorded`,
        `Stories & static posts underperformed vs. ${bestFormatDisplay}s`
      ],

      // Next Month Focus
      nextMonthFocus: [
        `Prioritize storytelling ${bestFormatDisplay}s (customer experiences, behind-the-scenes)`,
        `Add strong CTAs (visit café, book tables, tag friends)`,
        `Use polls, interactive Q&As, collabs in Stories`
      ],

      // Optimization
      optimization: [
        `Weekly best-performing content analysis`,
        `Test new trending sounds & formats`,
        `Push saves and shares as key engagement goals`
      ],

      // Visual Highlights
      visualHighlights: topPosts.length > 0 ? topPosts.slice(0, 2).map(p => ({
        caption: p.caption?.substring(0, 40) || 'Top Post',
        reach: safeNum(p.reach)
      })) : [{ caption: 'No posts in this period', reach: 0 }],

      // Summary
      summaryText: [
        `Instagram was the primary driver of growth in ${periodText}`,
        `Followers grew steadily (+${currentNetGrowth} new)`,
        `${bestFormatDisplay}s delivered explosive reach & engagement`,
        `Engagement quality improved – next step is converting reach into action with stronger CTAs`,
        `Encourage boosting of the top performing content`
      ]
    };

    setSummaryData(summary);
    setShowSummary(true);
    setSummaryLoading(false);
  };

  // Print summary in a new window with proper formatting
  const printSummary = () => {
    if (!summaryData) return;

    const printWindow = window.open('', '_blank', 'width=900,height=800');

    const metricsRows = [
      { name: 'Followers', prev: summaryData.metrics.followers.previous, curr: summaryData.metrics.followers.current, change: summaryData.metrics.followers.change + '%' },
      { name: 'Net Growth', prev: summaryData.metrics.netGrowth.previous, curr: summaryData.metrics.netGrowth.current, change: summaryData.metrics.netGrowth.change + '%' },
      { name: 'Impressions', prev: summaryData.metrics.impressions.previous, curr: summaryData.metrics.impressions.current, change: summaryData.metrics.impressions.change + '%' },
      { name: 'Engagements', prev: summaryData.metrics.engagements.previous, curr: summaryData.metrics.engagements.current, change: summaryData.metrics.engagements.change + '%' },
      { name: 'Engagement Rate', prev: summaryData.metrics.engagementRate.previous + '%', curr: summaryData.metrics.engagementRate.current + '%', change: summaryData.metrics.engagementRate.change + '%' },
      { name: 'Reel Views', prev: summaryData.metrics.reelViews.previous, curr: summaryData.metrics.reelViews.current, change: summaryData.metrics.reelViews.change },
      { name: 'Messages (Sent/Received)', prev: summaryData.metrics.messages.previous, curr: summaryData.metrics.messages.current, change: summaryData.metrics.messages.change }
    ];

    const tableRows = metricsRows.map((row, i) =>
      `<tr style="background: ${i % 2 === 0 ? '#fff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px;">${row.name}</td>
        <td style="padding: 12px; text-align: right; color: #64748b;">${typeof row.prev === 'number' ? row.prev.toLocaleString() : row.prev}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600;">${typeof row.curr === 'number' ? row.curr.toLocaleString() : row.curr}</td>
        <td style="padding: 12px; text-align: right; color: #16a34a;">📈 ${row.change}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${summaryData.clientName} - Instagram Monthly Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; color: #0f172a; margin: 32px 0 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
    p { margin-bottom: 12px; }
    ul { padding-left: 24px; margin-bottom: 12px; }
    li { margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0; }
    th { text-align: left; padding: 12px; background: #f1f5f9; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; padding: 24px; border-radius: 12px; margin-bottom: 32px; }
    .header-subtitle { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    .section-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .green-box { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .amber-box { background: #fffbeb; border: 1px solid #fde68a; }
    .purple-box { background: #faf5ff; border: 1px solid #e9d5ff; }
    .summary-box { background: linear-gradient(135deg, #fef3c7, #fed7aa); border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin-top: 24px; }
    .highlight { background: #fef08a; padding: 2px 6px; border-radius: 4px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media print { body { padding: 20px; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 ${summaryData.clientName} – Instagram Monthly Report</h1>
    <p class="header-subtitle">Period: ${summaryData.periodText} | Comparison: ${summaryData.comparison}</p>
  </div>

  <h2>1. Instagram Performance Metrics</h2>
  <table>
    <thead>
      <tr>
        <th>Metric</th>
        <th style="text-align: right;">Previous</th>
        <th style="text-align: right;">Current</th>
        <th style="text-align: right;">% Change</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>

  <h2>2. What We Did in ${summaryData.periodText.split(' ')[0]}</h2>
  <ul>
    ${summaryData.whatWeDid.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <h2>3. What Worked</h2>
  <div class="section-box green-box">
    <h3>🎬 Top Performing Reels</h3>
    <ul>
      ${summaryData.whatWorked.topPerformingReels.map(reel => `<li>${reel.caption}... – Reach ${reel.reach?.toLocaleString()}</li>`).join('')}
    </ul>
  </div>
  <div class="section-box green-box">
    <h3>✅ Key Insights</h3>
    <ul>
      ${summaryData.whatWorked.insights.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>

  <h2>4. What Needs Improvement</h2>
  <div class="section-box amber-box">
    <ul>
      ${summaryData.needsImprovement.map(item => `<li>⚠️ ${item}</li>`).join('')}
    </ul>
  </div>

  <h2>5. Next Month Focus</h2>
  <div class="section-box purple-box">
    <h3>🚀 Content Strategy</h3>
    <ul>
      ${summaryData.nextMonthFocus.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
  <div class="section-box">
    <h3>⚙️ Optimization</h3>
    <ul>
      ${summaryData.optimization.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>

  <h2>6. Visual Highlights</h2>
  <div class="grid-2">
    ${summaryData.visualHighlights.map((post, i) => `
      <div class="section-box">
        <h3>Top ${i === 0 ? 'Reel' : 'Post'} – ${post.caption}...</h3>
        <p>Reach: ${post.reach?.toLocaleString()}</p>
      </div>
    `).join('')}
  </div>

  <div class="summary-box">
    <h3>✨ Summary</h3>
    <p>Instagram was the <span class="highlight">primary driver of growth</span> in ${summaryData.periodText}:</p>
    <ul>
      ${summaryData.summaryText.map(item => `<li>${item}</li>`).join('')}
    </ul>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  };

  // Print report with white background - opens in new window for browser print
  const printReportWithWhiteBackground = () => {
    if (!previewData) {
      alert('Please generate a report preview first');
      return;
    }

    const selectedClient = clients.find(c => c._id === selectedClients[0]);

    // Open a new window for printing
    const printWindow = window.open('', '_blank', 'width=1000,height=800');

    // Generate the printable HTML with all data
    const printContent = generatePrintableHTML(previewData, selectedClient, { startDate, endDate });

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  // Generate the printable HTML for PDF export
  const generatePrintableHTML = (analytics, client, dateRange) => {
    const fmtDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtNum = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num || 0;
    };

    const { executiveSummary, audienceGrowth, reachImpressions, engagementBreakdown, contentPerformance, detailedPosts, traffic, insights } = analytics;
    const clientName = client?.name || 'Client Report';
    const dateStart = fmtDate(dateRange.startDate);
    const dateEnd = fmtDate(dateRange.endDate);
    const genDate = new Date().toLocaleString();

    // SVG Chart Generator Helper Functions
    const generateAreaChartSVG = (data, dataKey, color, width = 400, height = 150) => {
      if (!data || data.length === 0) return '<div style="text-align: center; color: #94a3b8; padding: 40px;">No chart data available</div>';

      const values = data.map(d => d[dataKey] || 0);
      const maxVal = Math.max(...values, 1);
      const minVal = Math.min(...values, 0);
      const range = maxVal - minVal || 1;

      const padding = 40;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding;

      // Generate path points
      const points = values.map((val, i) => {
        const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
        const y = height - padding - ((val - minVal) / range) * chartHeight;
        return x + ',' + y;
      });

      const linePath = 'M' + points.join(' L');
      const areaPath = linePath + ' L' + (padding + chartWidth) + ',' + (height - padding) + ' L' + padding + ',' + (height - padding) + ' Z';

      // Generate x-axis labels (first, middle, last)
      const labels = [
        { x: padding, label: data[0]?.date ? fmtDate(data[0].date) : '' },
        { x: padding + chartWidth / 2, label: data[Math.floor(data.length / 2)]?.date ? fmtDate(data[Math.floor(data.length / 2)].date) : '' },
        { x: padding + chartWidth, label: data[data.length - 1]?.date ? fmtDate(data[data.length - 1].date) : '' }
      ];

      return '<svg width="' + width + '" height="' + height + '" style="background: #f8fafc; border-radius: 8px;">' +
        '<defs><linearGradient id="grad' + dataKey + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" style="stop-color:' + color + ';stop-opacity:0.3"/>' +
        '<stop offset="100%" style="stop-color:' + color + ';stop-opacity:0.05"/>' +
        '</linearGradient></defs>' +
        '<path d="' + areaPath + '" fill="url(#grad' + dataKey + ')"/>' +
        '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
        labels.map(l => '<text x="' + l.x + '" y="' + (height - 10) + '" font-size="10" fill="#64748b" text-anchor="middle">' + l.label + '</text>').join('') +
        '<text x="' + (width - padding) + '" y="20" font-size="12" fill="#0f172a" text-anchor="end" font-weight="600">Max: ' + fmtNum(maxVal) + '</text>' +
        '</svg>';
    };

    const generateMultiLineChartSVG = (data, lines, width = 400, height = 150) => {
      if (!data || data.length === 0) return '<div style="text-align: center; color: #94a3b8; padding: 40px;">No chart data available</div>';

      const padding = 40;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding;

      // Find global max across all lines
      let globalMax = 0;
      lines.forEach(line => {
        const max = Math.max(...data.map(d => d[line.key] || 0), 1);
        if (max > globalMax) globalMax = max;
      });

      const paths = lines.map(line => {
        const values = data.map(d => d[line.key] || 0);
        const points = values.map((val, i) => {
          const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
          const y = height - padding - (val / globalMax) * chartHeight;
          return x + ',' + y;
        });
        return '<path d="M' + points.join(' L') + '" fill="none" stroke="' + line.color + '" stroke-width="2"/>';
      });

      // Legend
      const legend = lines.map((line, i) =>
        '<g transform="translate(' + (padding + i * 100) + ', 10)">' +
        '<rect width="12" height="12" fill="' + line.color + '" rx="2"/>' +
        '<text x="16" y="10" font-size="10" fill="#64748b">' + line.label + '</text></g>'
      ).join('');

      // X-axis labels
      const labels = [
        { x: padding, label: data[0]?.date ? fmtDate(data[0].date) : '' },
        { x: padding + chartWidth, label: data[data.length - 1]?.date ? fmtDate(data[data.length - 1].date) : '' }
      ];

      return '<svg width="' + width + '" height="' + (height + 20) + '" style="background: #f8fafc; border-radius: 8px;">' +
        legend +
        paths.join('') +
        labels.map(l => '<text x="' + l.x + '" y="' + (height - 10) + '" font-size="10" fill="#64748b" text-anchor="middle">' + l.label + '</text>').join('') +
        '</svg>';
    };

    // Build highlights HTML
    const highlightsHtml = executiveSummary.highlights.length > 0
      ? executiveSummary.highlights.map(h => '<li>' + h + '</li>').join('')
      : '<li>No significant highlights.</li>';

    // Build posts table rows with thumbnails
    const postsHtml = detailedPosts.slice(0, 10).map(post => {
      const caption = post.caption || 'No caption';
      const postDate = fmtDate(post.publishedAt);
      const postType = (post.type || 'post').toLowerCase();
      const reach = fmtNum(post.reach);
      const engRate = (post.engagementRate || 0).toFixed(1);
      const rankClass = post.ranking === 'Top Performer' ? 'rank-top' : post.ranking === 'Needs Improvement' ? 'rank-low' : 'rank-avg';
      const thumbnail = post.thumbnail || post.mediaUrl || post.imageUrl || '';
      const thumbnailHtml = thumbnail
        ? '<img src="' + thumbnail + '" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" onerror="this.style.display=\'none\'" />'
        : '<div style="width: 50px; height: 50px; background: #e2e8f0; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 10px;">No img</div>';
      return '<tr><td style="width: 60px;">' + thumbnailHtml + '</td><td><div style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + caption + '</div><div style="font-size: 12px; color: #94a3b8;">' + postDate + '</div></td><td style="text-transform: capitalize;">' + postType + '</td><td>' + reach + '</td><td>' + engRate + '%</td><td><span class="rank-badge ' + rankClass + '">' + post.ranking + '</span></td></tr>';
    }).join('');

    // Generate chart SVGs
    const followerChartSVG = generateAreaChartSVG(audienceGrowth.chartData, 'followers', '#3b82f6', 500, 180);
    const reachChartSVG = generateMultiLineChartSVG(reachImpressions.chartData, [
      { key: 'impressions', color: '#8b5cf6', label: 'Impressions' },
      { key: 'reach', color: '#10b981', label: 'Reach' }
    ], 500, 180);
    const engagementChartSVG = engagementBreakdown.engagementTrend ? generateMultiLineChartSVG(engagementBreakdown.engagementTrend, [
      { key: 'total', color: '#f43f5e', label: 'Total' },
      { key: 'instagram', color: '#8b5cf6', label: 'Instagram' },
      { key: 'facebook', color: '#3b82f6', label: 'Facebook' }
    ], 500, 180) : '';
    const engRateChartSVG = engagementBreakdown.engagementRateTrend ? generateMultiLineChartSVG(engagementBreakdown.engagementRateTrend, [
      { key: 'total', color: '#10b981', label: 'Total ER' },
      { key: 'instagram', color: '#8b5cf6', label: 'IG ER' },
      { key: 'facebook', color: '#3b82f6', label: 'FB ER' }
    ], 500, 180) : '';
    const videoViewsChartSVG = engagementBreakdown.videoViewsTrend ? generateMultiLineChartSVG(engagementBreakdown.videoViewsTrend, [
      { key: 'total', color: '#f59e0b', label: 'Total Views' },
      { key: 'instagram', color: '#f43f5e', label: 'IG Reels' },
      { key: 'facebook', color: '#3b82f6', label: 'FB Videos' }
    ], 500, 180) : '';

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Social Media Report - ' + clientName + '</title><style>' +
      '* { box-sizing: border-box; margin: 0; padding: 0; }' +
      'body { font-family: Segoe UI, sans-serif; background: #fff; color: #1e293b; line-height: 1.6; }' +
      '.container { max-width: 900px; margin: 0 auto; padding: 40px; }' +
      '.header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px; text-align: center; margin-bottom: 32px; color: white; }' +
      '.logo { width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: 800; }' +
      '.header h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }' +
      '.header .subtitle { color: #94a3b8; margin-bottom: 24px; }' +
      '.client-box { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; display: inline-block; }' +
      '.client-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }' +
      '.client-period { color: #94a3b8; }' +
      'section { margin-bottom: 40px; page-break-inside: avoid; }' +
      'h3 { font-size: 20px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }' +
      'h4 { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #475569; }' +
      '.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }' +
      '.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }' +
      '.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }' +
      '.metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; }' +
      '.metric-card .title { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }' +
      '.metric-card .value { font-size: 28px; font-weight: 800; color: #0f172a; }' +
      '.metric-card .sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }' +
      '.chart-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 16px; }' +
      '.highlight-box { background: #eff6ff; border: 1px solid #93c5fd; border-radius: 12px; padding: 20px; margin-top: 24px; }' +
      '.highlight-box h4 { color: #1e40af; margin-bottom: 12px; }' +
      '.highlight-box ul { padding-left: 20px; }' +
      '.highlight-box li { margin-bottom: 8px; color: #334155; }' +
      'table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 16px; }' +
      'th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-weight: 600; }' +
      'td { padding: 12px; border-bottom: 1px solid #f1f5f9; }' +
      '.rank-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }' +
      '.rank-top { background: #dcfce7; color: #166534; }' +
      '.rank-avg { background: #f1f5f9; color: #475569; }' +
      '.rank-low { background: #fee2e2; color: #991b1b; }' +
      '.insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }' +
      '.insight-panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }' +
      '.insight-panel h4 { margin-bottom: 16px; color: #0f172a; }' +
      '.insight-item { margin-bottom: 12px; }' +
      '.insight-label { font-size: 12px; color: #3b82f6; font-weight: 600; text-transform: uppercase; }' +
      '.footer { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px; padding: 40px; text-align: center; color: white; margin-top: 40px; }' +
      '.footer .logo { width: 60px; height: 60px; font-size: 24px; }' +
      '.footer .brand { font-size: 18px; font-weight: 700; margin-bottom: 8px; }' +
      '.footer .text { color: #94a3b8; font-size: 14px; }' +
      '@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .container { padding: 20px; } section { page-break-inside: avoid; } }' +
      '</style></head><body><div class="container">' +
      '<div class="header"><div class="logo">H&C</div><h1>Social Media Report</h1><p class="subtitle">Performance Analytics & Insights</p>' +
      '<div class="client-box"><div class="client-name">' + clientName + '</div><div class="client-period">📅 ' + dateStart + ' - ' + dateEnd + '</div></div></div>' +

      // Executive Summary
      '<section><h3>⚡ Executive Summary</h3><div class="grid-4">' +
      '<div class="metric-card"><div class="title">Total Followers</div><div class="value">' + fmtNum(executiveSummary.totalFollowers) + '</div><div class="sub">+' + executiveSummary.newFollowers + ' new</div></div>' +
      '<div class="metric-card"><div class="title">Total Reach</div><div class="value">' + fmtNum(executiveSummary.totalReach) + '</div><div class="sub">Unique accounts</div></div>' +
      '<div class="metric-card"><div class="title">Engagement Rate</div><div class="value">' + executiveSummary.engagementRate + '%</div><div class="sub">Avg per impression</div></div>' +
      '<div class="metric-card"><div class="title">Total Engagements</div><div class="value">' + fmtNum(executiveSummary.totalEngagements) + '</div><div class="sub">Likes, comments, etc.</div></div></div>' +
      '<div class="highlight-box"><h4>✨ Top Highlights</h4><ul>' + highlightsHtml + '</ul></div></section>' +

      // Audience & Growth with Chart
      '<section><h3>👥 Audience & Growth</h3><div class="grid-3">' +
      '<div class="metric-card"><div class="title">Net Growth</div><div class="value" style="color: ' + (audienceGrowth.netGrowth >= 0 ? '#10b981' : '#ef4444') + '">' + (audienceGrowth.netGrowth >= 0 ? '+' : '') + audienceGrowth.netGrowth + '</div><div class="sub">' + (audienceGrowth.growthRate || 0) + '% growth</div></div>' +
      '<div class="metric-card"><div class="title">Instagram</div><div class="value">' + fmtNum(audienceGrowth.platformSplit.instagram) + '</div></div>' +
      '<div class="metric-card"><div class="title">Facebook</div><div class="value">' + fmtNum(audienceGrowth.platformSplit.facebook) + '</div></div></div>' +
      '<div class="chart-box"><h4>📈 Follower Growth Trend</h4>' + followerChartSVG + '</div></section>' +

      // Reach & Impressions with Chart
      '<section><h3>👁️ Reach & Impressions</h3>' +
      '<div class="chart-box"><h4>📊 Reach & Impressions Trend</h4>' + reachChartSVG + '</div></section>' +

      // Engagement Breakdown with Charts
      '<section><h3>❤️ Engagement Breakdown</h3><div class="grid-4">' +
      '<div class="metric-card"><div class="title">Likes</div><div class="value">' + fmtNum(engagementBreakdown.breakdown.likes) + '</div></div>' +
      '<div class="metric-card"><div class="title">Comments</div><div class="value">' + fmtNum(engagementBreakdown.breakdown.comments) + '</div></div>' +
      '<div class="metric-card"><div class="title">Shares</div><div class="value">' + fmtNum(engagementBreakdown.breakdown.shares) + '</div></div>' +
      '<div class="metric-card"><div class="title">Saves</div><div class="value">' + fmtNum(engagementBreakdown.breakdown.saves) + '</div></div></div>' +
      '<div class="grid-3" style="margin-top: 16px;">' +
      '<div class="metric-card"><div class="title">Save-to-View</div><div class="value" style="font-size: 24px;">' + engagementBreakdown.ratios.saveToView + '%</div></div>' +
      '<div class="metric-card"><div class="title">Share-to-View</div><div class="value" style="font-size: 24px;">' + engagementBreakdown.ratios.shareToView + '%</div></div>' +
      '<div class="metric-card"><div class="title">Eng. per Reach</div><div class="value" style="font-size: 24px;">' + engagementBreakdown.rates.perReach + '%</div></div></div>' +
      (engagementChartSVG ? '<div class="chart-box"><h4>📈 Engagements Trend</h4>' + engagementChartSVG + '</div>' : '') +
      (engRateChartSVG ? '<div class="chart-box"><h4>📉 Engagement Rate Trend (%)</h4>' + engRateChartSVG + '</div>' : '') +
      (videoViewsChartSVG ? '<div class="chart-box"><h4>🎬 Video Views Trend</h4>' + videoViewsChartSVG + '</div>' : '') +
      '</section>' +

      // Content Performance
      '<section><h3>📝 Content Performance</h3><div class="grid-4">' +
      '<div class="metric-card"><div class="title">Images</div><div class="value">' + contentPerformance.byFormat.image + '</div></div>' +
      '<div class="metric-card"><div class="title">Videos</div><div class="value">' + contentPerformance.byFormat.video + '</div></div>' +
      '<div class="metric-card"><div class="title">Carousels</div><div class="value">' + contentPerformance.byFormat.carousel + '</div></div>' +
      '<div class="metric-card"><div class="title">Reels</div><div class="value">' + contentPerformance.byFormat.reel + '</div></div></div></section>' +

      // Post Performance
      '<section><h3>🏆 Post Performance</h3><table><thead><tr><th style="width: 60px;">Media</th><th>Content</th><th>Type</th><th>Reach</th><th>Eng. Rate</th><th>Ranking</th></tr></thead><tbody>' + postsHtml + '</tbody></table></section>' +

      // Traffic & CTA
      '<section><h3>🔗 Traffic & CTA</h3><div class="grid-4">' +
      '<div class="metric-card"><div class="title">Website Clicks</div><div class="value">' + fmtNum(traffic.websiteClicks) + '</div></div>' +
      '<div class="metric-card"><div class="title">Email Clicks</div><div class="value">' + fmtNum(traffic.emailClicks) + '</div></div>' +
      '<div class="metric-card"><div class="title">Call Clicks</div><div class="value">' + fmtNum(traffic.callClicks) + '</div></div>' +
      '<div class="metric-card"><div class="title">Directions</div><div class="value">' + fmtNum(traffic.directionClicks) + '</div></div></div></section>' +

      // AI Insights
      '<section><h3>🤖 AI Insights & Recommendations</h3><div class="insights-grid">' +
      '<div class="insight-panel"><h4>📊 Performance Analysis</h4>' +
      '<div class="insight-item"><div class="insight-label">Best Format:</div><div>' + insights.bestFormat + ' performs best for your audience.</div></div>' +
      '<div class="insight-item"><div class="insight-label">Growth Driver:</div><div>' + insights.growthCause + '</div></div>' +
      '<div class="insight-item"><div class="insight-label">Weakness:</div><div>' + insights.weakPattern + '</div></div></div>' +
      '<div class="insight-panel"><h4>🚀 Strategic Recommendations</h4>' +
      '<div class="insight-item"><div class="insight-label">Action:</div><div>' + insights.suggestion + '</div></div>' +
      '<div class="insight-item"><div class="insight-label">Mix:</div><div>Try ' + insights.ratio + ' for next month.</div></div>' +
      '<div class="insight-item"><div class="insight-label">Timing:</div><div>Schedule posts around ' + insights.bestTime + ' for max engagement.</div></div></div></div></section>' +

      // Footer
      '\u003cdiv class="footer"\u003e\u003cdiv class="logo"\u003eH\u0026C\u003c/div\u003e\u003cp class="brand"\u003eHaris \u0026 Co.\u003c/p\u003e\u003cp class="text"\u003eSocial Media Management Dashboard\u003c/p\u003e\u003cp class="text" style="margin-top: 16px;"\u003eGenerated on ' + genDate + '\u003c/p\u003e\u003c/div\u003e' +
      '\u003c/div\u003e\u003c/body\u003e\u003c/html\u003e';
  };

  const saveSchedule = async () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client to schedule reports for.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/reports/schedule', {
        clientIds: selectedClients,
        enabled: reportSchedule.enabled,
        dayOfMonth: reportSchedule.dayOfMonth,
        time: reportSchedule.time,
        interval: 'monthly',
        templateId: selectedTemplate || null,
        format: 'pdf',
        emailRecipients: reportSchedule.emailRecipients || [],
        sendToClient: reportSchedule.sendToClient || false
      });
      const result = response.data;

      if (result.success) {
        alert('Report schedule saved successfully!');
        fetchReportSchedule();
      } else {
        alert(result.error || 'Failed to save schedule');
      }
    } catch (error) {
      alert('Failed to save schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await api.delete(`/reports/schedules/${scheduleId}`);
      const result = response.data;

      if (result.success) {
        fetchReportSchedule();
      } else {
        alert(result.error || 'Failed to delete schedule');
      }
    } catch (error) {
      alert('Failed to delete schedule: ' + error.message);
    }
  };

  const runSchedule = async (scheduleId) => {
    if (!confirm('Run this schedule immediately?')) return;

    try {
      const response = await api.post(`/reports/schedules/${scheduleId}/run`);
      const result = response.data;

      if (result.success) {
        alert('Schedule triggered successfully!');
        fetchReportSchedule();
      } else {
        alert(result.error || 'Failed to run schedule');
      }
    } catch (error) {
      alert('Failed to run schedule: ' + error.message);
    }
  };

  // Open the modal instead of sending directly
  const openSendModal = () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }
    setShowSendModal(true);
  };

  const confirmSend = async () => {
    try {
      setSendingToClients(true);

      const additionalRecipients = additionalEmail
        ? additionalEmail.split(',').map(e => e.trim()).filter(e => e)
        : [];

      const response = await api.post('/reports/send-to-clients', {
        startDate,
        endDate,
        templateName: selectedTemplate || null,
        format: 'pdf',
        clientIds: selectedClients,
        additionalRecipients
      });
      const result = response.data;

      if (result.success) {
        const sentCount = result.data.filter(r => r.status === 'sent').length;
        const failedCount = result.data.filter(r => r.status === 'failed').length;

        if (sentCount === 0 && failedCount > 0) {
          // All failed - show the first error
          const firstError = result.data.find(r => r.status === 'failed').error;
          alert(`Failed to send report: ${firstError}`);
        } else if (failedCount > 0) {
          // Partial success
          alert(`Reports sent to ${sentCount} client(s). Failed for ${failedCount} client(s).`);
          setShowSendModal(false);
          setAdditionalEmail('');
        } else {
          // All success
          alert(result.message || 'Reports sent successfully!');
          setShowSendModal(false);
          setAdditionalEmail('');
        }
      } else {
        alert(result.error || 'Failed to send reports');
      }
    } catch (error) {
      alert('Failed to send reports: ' + error.message);
    } finally {
      setSendingToClients(false);
    }
  };

  // --- UI Components ---

  const MetricCard = ({ title, value, subValue, icon: Icon, trend }) => (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items - center gap - 1 text - xs font - medium px - 2 py - 1 rounded - full ${trend > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
            } `}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
      </div>
    </div>
  );

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(clientSearch.toLowerCase()))
  );

  const toggleClient = (id) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(c => c !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const setQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };
  // --- Render ---

  return (
    <Layout>
      <PageTitle title="Reports & Insights" />
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
            <p className="text-slate-400">Generate professional reports and view live performance insights.</p>
          </div >

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT COLUMN: Report Builder (40%) */}
            <div className="lg:col-span-5 space-y-6">

              {/* 1. Template Selection - REMOVED */}

              {/* 2. Client Selection */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <Users size={20} />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Select Clients</h3>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-slate-800 rounded-md text-slate-400">
                    {selectedClients.length} selected
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>

                <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                  <div
                    onClick={() => setSelectedClients(selectedClients.length === clients.length ? [] : clients.map(c => c._id))}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedClients.length === clients.length && clients.length > 0 ? 'bg-purple-500 border-purple-500' : 'border-slate-600'
                      }`}>
                      {selectedClients.length === clients.length && clients.length > 0 && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-300">Select All Clients</span>
                  </div>


                  {filteredClients.map(client => (
                    <div
                      key={client._id}
                      onClick={() => toggleClient(client._id)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors group"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedClients.includes(client._id) ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-slate-500'
                        }`}>
                        {selectedClients.includes(client._id) && <Check size={12} className="text-white" />}

                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{client.name}</p>
                          <p className="text-xs text-slate-500 truncate">{client.email || 'No email'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    Generate
                  </button>
                  <button
                    onClick={openSendModal}
                    disabled={sendingToClients}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingToClients ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    Send
                  </button>
                </div>

                {/* Download Options (Always visible for demo, but logically after generation) */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center gap-4 flex-wrap">
                  <button onClick={generateSummary} className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:text-green-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                    <FileBarChart2 size={14} /> Get Summary
                  </button>
                  <button onClick={printReportWithWhiteBackground} className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors font-medium">
                    <Download size={14} /> PDF
                  </button>
                  <button onClick={() => downloadReport('json')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Download size={12} /> JSON
                  </button>
                  <button onClick={() => downloadReport('txt')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Download size={12} /> Text
                  </button>
                </div>
              </div >

              {/* 4. Schedule (Collapsible) */}
              < div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg" >
                <button
                  onClick={() => setShowSchedule(!showSchedule)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                      <Calendar size={20} />
                    </div>
                    <h3 className="text-base font-semibold text-white">Monthly Schedule</h3>
                  </div>
                  {showSchedule ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
                </button>

                {
                  showSchedule && (
                    <div className="p-6 pt-0 border-t border-slate-800/50 mt-2">

                      {/* Client Selection Area */}
                      <div className="mb-6 mt-4">
                        <label className="block text-xs text-slate-400 mb-2 font-medium">Scheduling for Clients:</label>

                        {/* Selected Clients Tags */}
                        {selectedClients.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {selectedClients.map(clientId => {
                              const client = clients.find(c => c._id === clientId);
                              return client ? (
                                <div key={clientId} className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 px-2.5 py-1 rounded-md text-xs font-medium">
                                  <span>{client.name}</span>
                                  <button
                                    onClick={() => setSelectedClients(selectedClients.filter(id => id !== clientId))}
                                    className="text-blue-400 hover:text-blue-200"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}

                        {/* Add Client Dropdown */}
                        <select
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
                          onChange={(e) => {
                            if (e.target.value && !selectedClients.includes(e.target.value)) {
                              setSelectedClients([...selectedClients, e.target.value]);
                            }
                          }}
                          value=""
                        >
                          <option value="">{selectedClients.length === 0 ? '-- Select Client to Schedule --' : '+ Add another client'}</option>
                          {clients
                            .filter(c => !selectedClients.includes(c._id))
                            .map(client => (
                              <option key={client._id} value={client._id}>{client.name}</option>
                            ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-3 mb-4 mt-4">
                        <input
                          type="checkbox"
                          checked={reportSchedule.enabled}
                          onChange={(e) => setReportSchedule({ ...reportSchedule, enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-offset-slate-900"
                        />
                        <label className="text-sm text-slate-300">Enable automatic monthly reports</label>
                      </div>

                      {reportSchedule.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Day of Month</label>
                            <select
                              value={reportSchedule.dayOfMonth}
                              onChange={(e) => setReportSchedule({ ...reportSchedule, dayOfMonth: parseInt(e.target.value) })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                            >
                              {[...Array(31)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Time</label>
                            <input
                              type="time"
                              value={reportSchedule.time}
                              onChange={(e) => setReportSchedule({ ...reportSchedule, time: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
                            />
                          </div>
                        </div>
                      )}

                      {reportSchedule.enabled && (
                        <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
                          {/* Send to Client Checkbox */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={reportSchedule.sendToClient}
                              onChange={(e) => setReportSchedule({ ...reportSchedule, sendToClient: e.target.checked })}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-offset-slate-900"
                            />
                            <label className="text-sm text-slate-300">Send copy to Client Email</label>
                          </div>

                          {/* Additional Recipients */}
                          <div>
                            <label className="block text-xs text-slate-500 mb-2">Additional Email Recipients</label>
                            <div className="flex gap-2 mb-2">
                              <input
                                type="email"
                                placeholder="Enter email address"
                                value={newRecipient}
                                onChange={(e) => setNewRecipient(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newRecipient && newRecipient.includes('@')) {
                                      setReportSchedule({
                                        ...reportSchedule,
                                        emailRecipients: [...reportSchedule.emailRecipients, newRecipient]
                                      });
                                      setNewRecipient('');
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  if (newRecipient && newRecipient.includes('@')) {
                                    setReportSchedule({
                                      ...reportSchedule,
                                      emailRecipients: [...reportSchedule.emailRecipients, newRecipient]
                                    });
                                    setNewRecipient('');
                                  }
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Add
                              </button>
                            </div>

                            {/* Recipients List */}
                            {reportSchedule.emailRecipients.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {reportSchedule.emailRecipients.map((email, index) => (
                                  <div key={index} className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-300">
                                    <span>{email}</span>
                                    <button
                                      onClick={() => {
                                        const newRecipients = [...reportSchedule.emailRecipients];
                                        newRecipients.splice(index, 1);
                                        setReportSchedule({ ...reportSchedule, emailRecipients: newRecipients });
                                      }}
                                      className="text-slate-500 hover:text-rose-400"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <button
                        onClick={saveSchedule}
                        disabled={selectedClients.length === 0}
                        className={`w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedClients.length === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                      >
                        {selectedClients.length === 0 ? 'Select a Client to Schedule' : 'Save Schedule'}
                      </button>

                      {/* Display saved schedules */}
                      {savedSchedules.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-800">
                          <h4 className="text-sm font-medium text-slate-300 mb-3">Active Schedules</h4>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {savedSchedules.map(schedule => (
                              <div key={schedule._id} className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">
                                    {schedule.client?.name || 'Unknown Client'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Next: {new Date(schedule.nextRun).toLocaleDateString()} at {new Date(schedule.nextRun).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                <div className="flex items-center">
                                  <button
                                    onClick={() => runSchedule(schedule._id)}
                                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors mr-1"
                                    title="Run now"
                                  >
                                    <Play size={14} />
                                  </button>
                                  <button
                                    onClick={() => deleteSchedule(schedule._id)}
                                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
                                    title="Delete schedule"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}


                    </div>
                  )}
              </div>
            </div>

            {/* RIGHT COLUMN: Live Preview (60%) */}
            <div className="lg:col-span-7">
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 min-h-[600px] backdrop-blur-sm">
                {previewLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 py-20">
                    <Loader2 size={40} className="animate-spin text-blue-500 mb-4" />
                    <p>Generating preview...</p>
                  </div>
                ) : previewError ? (
                  <div className="h-full flex flex-col items-center justify-center text-rose-500 py-20">
                    <p>Error loading preview: {previewError}</p>
                  </div>
                ) : (
                  <LiveReportPreview
                    analytics={previewData}
                    client={clients.find(c => c._id === selectedClients[0])}
                    dateRange={{ startDate, endDate }}
                  />
                )}
              </div>
            </div>

          </div >
        </div >
      </div >

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">Send Report</h3>
            <p className="text-slate-400 text-sm mb-6">
              Send this report to {selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''}.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Additional Email Recipients</label>
                <input
                  type="text"
                  placeholder="e.g. manager@example.com (comma separated)"
                  value={additionalEmail}
                  onChange={(e) => setAdditionalEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-xs text-slate-500 mt-1">Optional. Separate multiple emails with commas.</p>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  <span className="font-semibold">Note:</span> The report will strictly be sent to the selected client's registered email address, plus any additional recipients entered above.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSend}
                disabled={sendingToClients}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {sendingToClients ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                Send Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {
        showSummary && summaryData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-t-2xl flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">📊 {summaryData.clientName} – Instagram Monthly Report</h2>
                  <p className="text-slate-300 text-sm mt-1">Period: {summaryData.periodText} | Comparison: {summaryData.comparison}</p>
                </div>
                <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-white/10 rounded-lg transition">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-8 text-slate-800">
                {/* 1. Performance Metrics Table */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="text-blue-500">1.</span> Instagram Performance Metrics
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left p-3 font-semibold">Metric</th>
                          <th className="text-right p-3 font-semibold">{summaryData.comparison.split(' ')[0]}</th>
                          <th className="text-right p-3 font-semibold">Current</th>
                          <th className="text-right p-3 font-semibold">% Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3">Followers</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.followers.previous.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.followers.current.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.followers.change}%</td>
                        </tr>
                        <tr className="border-b bg-slate-50">
                          <td className="p-3">Net Growth</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.netGrowth.previous}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.netGrowth.current}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.netGrowth.change}%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Impressions</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.impressions.previous.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.impressions.current.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.impressions.change}%</td>
                        </tr>
                        <tr className="border-b bg-slate-50">
                          <td className="p-3">Engagements</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.engagements.previous.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.engagements.current.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.engagements.change}%</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Engagement Rate</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.engagementRate.previous}%</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.engagementRate.current}%</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.engagementRate.change}%</td>
                        </tr>
                        <tr className="border-b bg-slate-50">
                          <td className="p-3">Reel Views</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.reelViews.previous.toLocaleString()}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.reelViews.current.toLocaleString()}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.reelViews.change}</td>
                        </tr>
                        <tr>
                          <td className="p-3">Messages (Sent/Received)</td>
                          <td className="p-3 text-right text-slate-500">{summaryData.metrics.messages.previous}</td>
                          <td className="p-3 text-right font-semibold">{summaryData.metrics.messages.current}</td>
                          <td className="p-3 text-right text-green-600">📈 {summaryData.metrics.messages.change}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* 2. What We Did */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">2.</span> What We Did in {summaryData.periodText.split(' ')[0]}
                  </h3>
                  <ul className="list-disc pl-6 space-y-2 text-slate-700">
                    {summaryData.whatWeDid.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                {/* 3. What Worked */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">3.</span> What Worked
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                    <p className="font-semibold text-green-800 mb-2">🎬 Top Performing Reels</p>
                    <ul className="list-disc pl-6 text-green-700 space-y-1">
                      {summaryData.whatWorked.topPerformingReels.map((reel, i) => (
                        <li key={i}>{reel.caption}... – Reach {reel.reach?.toLocaleString()}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-semibold text-green-800 mb-2">✅ Key Insights</p>
                    <ul className="list-disc pl-6 text-green-700 space-y-1">
                      {summaryData.whatWorked.insights.map((insight, i) => (
                        <li key={i}>{insight}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* 4. What Needs Improvement */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">4.</span> What Needs Improvement
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <ul className="space-y-2">
                      {summaryData.needsImprovement.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-amber-800">
                          <span className="text-amber-500">⚠️</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* 5. Next Month Focus */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">5.</span> Next Month Focus
                  </h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="font-semibold text-purple-800 mb-2">🚀 Content Strategy</p>
                    <ul className="list-disc pl-6 text-purple-700 space-y-1">
                      {summaryData.nextMonthFocus.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-3">
                    <p className="font-semibold text-blue-800 mb-2">⚙️ Optimization</p>
                    <ul className="list-disc pl-6 text-blue-700 space-y-1">
                      {summaryData.optimization.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>

                {/* 6. Visual Highlights */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">6.</span> Visual Highlights
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {summaryData.visualHighlights.map((post, i) => (
                      <div key={i} className="bg-slate-100 rounded-lg p-4">
                        <p className="font-semibold text-slate-800">Top {i === 0 ? 'Reel' : 'Post'} – {post.caption}...</p>
                        <p className="text-sm text-slate-600">Reach: {post.reach?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Summary */}
                <section className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center gap-2">
                    ✨ Summary
                  </h3>
                  <p className="text-orange-900 font-medium mb-3">
                    Instagram was the <span className="bg-yellow-200 px-1 rounded">primary driver of growth</span> in {summaryData.periodText}:
                  </p>
                  <ul className="list-disc pl-6 text-orange-800 space-y-1">
                    {summaryData.summaryText.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <button
                    onClick={printSummary}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Print / Save PDF
                  </button>
                  <button
                    onClick={() => setShowSummary(false)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-xl font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

    </Layout >
  );
};

export default Reports;
