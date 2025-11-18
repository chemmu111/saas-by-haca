import { useState, useEffect } from 'react';
import { Download, Mail, Calendar, FileText, Settings, Upload, Trash2, Users } from 'lucide-react';
import Layout from './Layout.jsx';
import { getBackendUrl } from './config/api.js';

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

      // Fetch current schedule settings
      // This would typically come from user settings
      // For now, we'll use localStorage
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

      // Get backend URL
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
      e.target.value = ''; // Reset file input
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

      // Get backend URL
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
          // Handle JSON response
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
        } else {
          // Handle binary response (PDF, HTML, etc.)
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
          clientIds: clientIds.length === clients.length ? [] : clientIds // Send all if all selected
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

      // Get backend URL
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

      // Get backend URL
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

  return (
    <Layout>
      <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">Generate and download comprehensive reports</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <p className="font-medium">Error: {error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading && !report && (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200 mb-6">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        )}

        {/* Template Management */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload size={24} />
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              />
              {uploadingTemplate && (
                <p className="mt-2 text-sm text-gray-600">Uploading template...</p>
              )}
            </div>
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Template
                </label>
                <div className="space-y-2">
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
                        <div key={template.filename} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">
                            {template.originalName || template.filename} ({(template.size / 1024).toFixed(2)} KB)
                          </span>
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
              </div>
            )}
          </div>
        </div>

        {/* Client Selection */}
        {clients.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={24} />
              Select Clients
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
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
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="selectAllClients" className="text-sm font-medium text-gray-700">
                  Select All Clients
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {clients.map((client) => (
                  <div key={client._id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
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
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor={`client-${client._id}`} className="text-sm text-gray-700 cursor-pointer flex-1">
                      <div className="font-medium">{client.name}</div>
                      <div className="text-xs text-gray-500">{client.email}</div>
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Period</h2>
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
          <div className="flex flex-wrap gap-4">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileText size={20} />
              Generate Report
            </button>
            <button
              onClick={() => downloadReport('pdf')}
              disabled={loading || !report}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={20} />
              Download PDF
            </button>
            <button
              onClick={() => downloadReport('json')}
              disabled={loading || !report}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download size={20} />
              Download JSON
            </button>
            <button
              onClick={sendToClients}
              disabled={loading || sendingToClients || clients.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Users size={20} />
              {sendingToClients ? 'Sending...' : 'Send to Clients'}
            </button>
          </div>
        </div>

        {/* Report Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={24} />
            Monthly Report Schedule
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="scheduleEnabled"
                checked={reportSchedule.enabled}
                onChange={(e) => setReportSchedule({ ...reportSchedule, enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={saveReportSchedule}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Settings size={20} />
                    Save Schedule
                  </button>
                  <button
                    onClick={sendTestReport}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Mail size={20} />
                    Send Test Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Report Display */}
        {report && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Report Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary?.totalPosts || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Published</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary?.publishedPosts || 0}</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary?.scheduledPosts || 0}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{report.summary?.successRate || '0%'}</p>
              </div>
            </div>

            {/* Platform Breakdown */}
            {report.breakdown?.byPlatform && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Platform Breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Instagram</p>
                    <p className="text-xl font-bold text-gray-900">{report.breakdown.byPlatform.instagram || 0}</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Facebook</p>
                    <p className="text-xl font-bold text-gray-900">{report.breakdown.byPlatform.facebook || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top Clients */}
            {report.topClients && report.topClients.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Clients</h3>
                <div className="space-y-2">
                  {report.topClients.map((client, index) => (
                    <div key={client.clientId} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{client.clientName}</p>
                          <p className="text-sm text-gray-500">{client.platform}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">{client.totalPosts} posts</p>
                          <p className="text-sm text-gray-500">{client.publishedPosts} published</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Reports;

