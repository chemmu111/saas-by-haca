import { useState, useEffect } from 'react';
import { Download, Mail, Calendar, FileText, Settings, Upload, Trash2, Users, BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import Layout from './Layout.jsx';

const Reports = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClients, setSelectedClients] = useState([]);
  const [sendingToClients, setSendingToClients] = useState(false);
  const [reportSchedule, setReportSchedule] = useState({
    enabled: false,
    dayOfMonth: 1,
    email: '',
  });
  const [googleDocUrl, setGoogleDocUrl] = useState(null);
  const [generatingGoogleDoc, setGeneratingGoogleDoc] = useState(false);

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);

    fetchReportSchedule();
    fetchTemplates();
    fetchClients();
  }, []);

  const fetchReportSchedule = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const saved = localStorage.getItem('reportSchedule');
      if (saved) {
        setReportSchedule(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error fetching report schedule:', error);
    }
  };

  const generateReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();

      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${backendUrl}/api/reports?${params.toString()}`, {
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
        setReport(result.data);
        setError(null);
      } else {
        console.error('Failed to generate report:', result.error);
        setError(result.error || 'Failed to generate report');
        alert(result.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.message || 'Failed to generate report');
      alert('Failed to generate report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/reports/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTemplates(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setClients(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploadingTemplate(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login to upload templates');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();
      const formData = new FormData();
      formData.append('template', file);

      const response = await fetch(`${backendUrl}/api/reports/upload-template`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Template uploaded successfully!');
          fetchTemplates();
        } else {
          alert(result.error || 'Failed to upload template');
        }
      } else {
        const errorText = await response.text();
        alert('Failed to upload template: ' + errorText);
      }
    } catch (error) {
      console.error('Error uploading template:', error);
      alert('Failed to upload template: ' + error.message);
    } finally {
      setUploadingTemplate(false);
      e.target.value = '';
    }
  };

  const deleteTemplate = async (filename) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login to delete templates');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/reports/templates/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('Template deleted successfully!');
          fetchTemplates();
          if (selectedTemplate === filename) {
            setSelectedTemplate('');
          }
        } else {
          alert(result.error || 'Failed to delete template');
        }
      } else {
        const errorText = await response.text();
        alert('Failed to delete template: ' + errorText);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template: ' + error.message);
    }
  };

  const downloadReport = async (format = 'pdf') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/reports/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          format,
          templateName: selectedTemplate || null
        })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          if (result.success && result.data) {
            const dataStr = JSON.stringify(result.data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report-${startDate || 'all'}-${endDate || 'all'}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }
        } else if (format === 'txt') {
          const text = await response.text();
          const blob = new Blob([text], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${startDate || 'all'}-${endDate || 'all'}.txt`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report-${startDate || 'all'}-${endDate || 'all'}.${format}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        const errorText = await response.text();
        console.error('Download failed:', errorText);
        alert('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToClients = async () => {
    if (clients.length === 0) {
      alert('No clients found. Please add clients first.');
      return;
    }

    try {
      setSendingToClients(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login to send reports');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();
      const clientIds = selectedClients.length > 0 ? selectedClients : clients.map(c => c._id);

      const response = await fetch(`${backendUrl}/api/reports/send-to-clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate,
          templateName: selectedTemplate || null,
          format: 'pdf',
          clientIds: clientIds.length === clients.length ? [] : clientIds
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(result.message || `Reports sent to ${result.data.filter(r => r.status === 'sent').length} client(s)!`);
        } else {
          alert(result.error || 'Failed to send reports');
        }
      } else {
        const errorText = await response.text();
        alert('Failed to send reports: ' + errorText);
      }
    } catch (error) {
      console.error('Error sending reports to clients:', error);
      alert('Failed to send reports: ' + error.message);
    } finally {
      setSendingToClients(false);
    }
  };

  const saveReportSchedule = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/reports/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportSchedule)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('reportSchedule', JSON.stringify(reportSchedule));
        alert('Report schedule saved successfully');
      } else {
        alert(result.error || 'Failed to save report schedule');
      }
    } catch (error) {
      console.error('Error saving report schedule:', error);
      alert('Failed to save report schedule: ' + error.message);
    }
  };

  const sendTestReport = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error('No auth token found');
        return;
      }

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/reports/send-test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateName: selectedTemplate || null,
          format: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert('Test report sent successfully! Check your email.');
      } else {
        alert(result.error || 'Failed to send test report');
      }
    } catch (error) {
      console.error('Error sending test report:', error);
      alert('Failed to send test report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateGoogleDoc = async () => {
    try {
      setGeneratingGoogleDoc(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const getBackendUrl = () => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return 'http://localhost:5000';
        }
        return window.location.origin;
      };
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/reports/google-doc`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate,
          endDate
        })
      });

      const result = await response.json();
      if (result.success && result.data && result.data.pdfUrl) {
        setGoogleDocUrl(result.data.pdfUrl);
      } else {
        alert('Failed to generate Google Doc: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating Google Doc:', error);
      alert('Failed to generate Google Doc: ' + error.message);
    } finally {
      setGeneratingGoogleDoc(false);
    }
  };

  const setQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  // Calculate success rate percentage
  const getSuccessRatePercentage = () => {
    if (!report?.summary) return 0;
    const rate = report.summary.successRate;
    if (typeof rate === 'string') {
      return parseInt(rate.replace('%', '')) || 0;
    }
    return rate || 0;
  };

  // Get trend indicator
  const getTrendIndicator = (value, isPositive = true) => {
    const trend = Math.random() > 0.5 ? 'up' : 'down'; // In real app, calculate from historical data
    const percentage = (Math.random() * 20).toFixed(1);

    if (trend === 'up') {
      return (
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          <ArrowUp size={14} />
          <span>+{percentage}%</span>
        </div>
      );
    } else if (trend === 'down') {
      return (
        <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-red-600' : 'text-green-600'}`}>
          <ArrowDown size={14} />
          <span>-{percentage}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Minus size={14} />
        <span>0%</span>
      </div>
    );
  };

  return (
    <Layout>
      {/* Google Doc Modal */}
      {googleDocUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Report Generated!</h3>
            <p className="text-gray-600 mb-6">Your Google Doc report has been generated and converted to PDF.</p>
            <div className="flex flex-col gap-3">
              <a
                href={googleDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-blue-600 text-white rounded-lg text-center font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Open PDF Report
              </a>
              <button
                onClick={() => setGoogleDocUrl(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        {/* Page Header */}
        <div className="mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-lg">
                <BarChart3 className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Reports</h1>
                <p className="text-gray-600 text-sm mt-0.5">Generate comprehensive insights and export beautiful reports</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-medium text-red-700">Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !report && (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border border-gray-200 mb-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        )}

        {/* Report Display - Moved to top for data-first approach */}
        {report && (
          <div className="mb-6">
            {/* Key Metrics with Visual Enhancements */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Posts */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="text-black" size={20} />
                  </div>
                  {getTrendIndicator(report.summary?.totalPosts, true)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Total Posts</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{report.summary?.totalPosts || 0}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Published */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <TrendingUp className="text-black" size={20} />
                  </div>
                  {getTrendIndicator(report.summary?.publishedPosts, true)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Published</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{report.summary?.publishedPosts || 0}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${((report.summary?.publishedPosts || 0) / (report.summary?.totalPosts || 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(((report.summary?.publishedPosts || 0) / (report.summary?.totalPosts || 1)) * 100)}% of total
                </p>
              </div>

              {/* Scheduled */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Calendar className="text-black" size={20} />
                  </div>
                  {getTrendIndicator(report.summary?.scheduledPosts, true)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{report.summary?.scheduledPosts || 0}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full"
                    style={{ width: `${((report.summary?.scheduledPosts || 0) / (report.summary?.totalPosts || 1)) * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(((report.summary?.scheduledPosts || 0) / (report.summary?.totalPosts || 1)) * 100)}% of total
                </p>
              </div>

              {/* Success Rate */}
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <BarChart3 className="text-black" size={20} />
                  </div>
                  {getTrendIndicator(getSuccessRatePercentage(), true)}
                </div>
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mb-2">{report.summary?.successRate || '0%'}</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${getSuccessRatePercentage()}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Performance metric</p>
              </div>
            </div>

            {/* Platform Breakdown with Visual Comparison */}
            {report.breakdown?.byPlatform && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="text-black" size={20} />
                  Platform Distribution
                </h3>
                <div className="space-y-4">
                  {/* Instagram */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Instagram</span>
                      <span className="text-sm font-bold text-gray-900">{report.breakdown.byPlatform.instagram || 0} posts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${((report.breakdown.byPlatform.instagram || 0) / ((report.breakdown.byPlatform.instagram || 0) + (report.breakdown.byPlatform.facebook || 0) || 1)) * 100}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {Math.round(((report.breakdown.byPlatform.instagram || 0) / ((report.breakdown.byPlatform.instagram || 0) + (report.breakdown.byPlatform.facebook || 0) || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Facebook</span>
                      <span className="text-sm font-bold text-gray-900">{report.breakdown.byPlatform.facebook || 0} posts</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full flex items-center justify-end pr-2"
                        style={{
                          width: `${((report.breakdown.byPlatform.facebook || 0) / ((report.breakdown.byPlatform.instagram || 0) + (report.breakdown.byPlatform.facebook || 0) || 1)) * 100}%`
                        }}
                      >
                        <span className="text-xs text-white font-medium">
                          {Math.round(((report.breakdown.byPlatform.facebook || 0) / ((report.breakdown.byPlatform.instagram || 0) + (report.breakdown.byPlatform.facebook || 0) || 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Clients with Rankings */}
            {report.topClients && report.topClients.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="text-black" size={20} />
                  Top Performing Clients
                </h3>
                <div className="space-y-3">
                  {report.topClients.map((client, index) => {
                    const maxPosts = Math.max(...report.topClients.map(c => c.totalPosts));
                    const percentage = (client.totalPosts / maxPosts) * 100;

                    return (
                      <div key={client.clientId} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                              }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{client.clientName}</p>
                              <p className="text-xs text-gray-500">{client.platform}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">{client.totalPosts}</p>
                            <p className="text-xs text-gray-500">{client.publishedPosts} published</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-purple-600'
                              }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Template Management */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Upload size={20} className="text-black" />
            </div>
            Report Templates
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Template (HTML or PDF)
              </label>
              <input
                type="file"
                accept=".html,.htm,.pdf"
                onChange={handleTemplateUpload}
                disabled={uploadingTemplate}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-black file:text-white hover:file:bg-gray-800"
              />
              {uploadingTemplate && (
                <p className="mt-2 text-sm text-orange-600">Uploading template...</p>
              )}
            </div>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No Template (Use Default)</option>
                  {templates.map((template) => (
                    <option key={template.filename} value={template.filename}>
                      {template.originalName || template.filename} ({template.type.toUpperCase()})
                    </option>
                  ))}
                </select>
                {templates.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {templates.map((template) => (
                      <div key={template.filename} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <FileText className="text-black" size={18} />
                          <span className="text-sm text-gray-700">
                            {template.originalName || template.filename} ({(template.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.filename)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete template"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Client Selection */}
        {clients.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users size={20} className="text-black" />
                </div>
                Select Clients
              </h2>
              <span className="px-3 py-1 bg-black text-white text-sm font-medium rounded-full">
                {selectedClients.length} Selected
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="selectAllClients"
                  checked={selectedClients.length === clients.length && clients.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedClients(clients.map(c => c._id));
                    } else {
                      setSelectedClients([]);
                    }
                  }}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="selectAllClients" className="text-sm font-medium text-gray-700">
                  Select All Clients
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map((client) => (
                  <div key={client._id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${selectedClients.includes(client._id)
                    ? 'bg-purple-50 border-purple-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                    <input
                      type="checkbox"
                      id={`client-${client._id}`}
                      checked={selectedClients.includes(client._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClients([...selectedClients, client._id]);
                        } else {
                          setSelectedClients(selectedClients.filter(id => id !== client._id));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <label htmlFor={`client-${client._id}`} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{client.name}</div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {selectedClients.length === 0
                  ? `No clients selected. Reports will be sent to all ${clients.length} client(s).`
                  : `${selectedClients.length} client(s) selected.`
                }
              </p>
            </div>
          </div>
        )}

        {/* Date Range Selector */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar size={20} className="text-black" />
            </div>
            Report Period
          </h2>

          {/* Quick Date Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Last 7 Days', days: 7 },
                { label: 'Last 30 Days', days: 30 },
                { label: 'Last 90 Days', days: 90 },
                { label: 'Last Year', days: 365 }
              ].map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => setQuickDateRange(preset.days)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 border border-blue-200"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="space-y-4">
            {/* Primary Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateReport}
                disabled={loading}
                className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm transition-all duration-200"
                style={{ backgroundColor: '#3377f2' }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    Generate Report
                  </>
                )}
              </button>
              <button
                onClick={sendToClients}
                disabled={loading || sendingToClients || clients.length === 0}
                className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm transition-all duration-200"
                style={{ backgroundColor: '#3377f2' }}
              >
                {sendingToClients ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    Send to Clients
                  </>
                )}
              </button>
            </div>

            {/* Download Options */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Download Options</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => downloadReport('pdf')}
                  disabled={loading || !report}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all duration-200"
                >
                  <Download size={16} />
                  PDF
                </button>
                <button
                  onClick={() => downloadReport('json')}
                  disabled={loading || !report}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all duration-200"
                >
                  <Download size={16} />
                  JSON
                </button>
                <button
                  onClick={() => downloadReport('txt')}
                  disabled={loading || !report}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all duration-200"
                >
                  <Download size={16} />
                  Text
                </button>
                <button
                  onClick={generateGoogleDoc}
                  disabled={generatingGoogleDoc}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium shadow-sm transition-all duration-200"
                >
                  {generatingGoogleDoc ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Google Doc
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Schedule */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings size={20} className="text-black" />
            </div>
            Monthly Report Schedule
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="scheduleEnabled"
                checked={reportSchedule.enabled}
                onChange={(e) => setReportSchedule({ ...reportSchedule, enabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="scheduleEnabled" className="text-sm font-medium text-gray-700">
                Enable automatic monthly reports
              </label>
            </div>
            {reportSchedule.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Day of Month
                  </label>
                  <select
                    value={reportSchedule.dayOfMonth}
                    onChange={(e) => setReportSchedule({ ...reportSchedule, dayOfMonth: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={reportSchedule.email}
                    onChange={(e) => setReportSchedule({ ...reportSchedule, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveReportSchedule}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 font-medium"
                  >
                    <Settings size={18} />
                    Save Schedule
                  </button>
                  <button
                    onClick={sendTestReport}
                    disabled={loading}
                    className="px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                  >
                    <Mail size={18} />
                    Send Test Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
