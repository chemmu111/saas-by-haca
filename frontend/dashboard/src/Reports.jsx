import React, { useState, useEffect, useMemo } from 'react';
import {
  Download, Mail, Calendar, FileText, Settings, Upload, Trash2,
  Users, BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown,
  Minus, Search, Check, X, FileBarChart2, ChevronDown, ChevronUp,
  Eye, Heart, MessageSquare, Share2, Loader2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

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
  });
  const [showSchedule, setShowSchedule] = useState(false);

  // --- State: Live Preview ---
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

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

  const getBackendUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  };

  const fetchWithAuth = async (endpoint, options = {}) => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No auth token found');

    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  };

  // --- Data Fetching ---

  const fetchReportSchedule = async () => {
    try {
      const saved = localStorage.getItem('reportSchedule');
      if (saved) {
        setReportSchedule(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error fetching report schedule:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const result = await fetchWithAuth('/api/reports/templates');
      if (result.success) {
        setTemplates(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const result = await fetchWithAuth('/api/clients');
      if (result.success) {
        setClients(result.data || []);
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
      const result = await fetchWithAuth(`/api/analytics?${params.toString()}`);

      if (result.success) {
        setPreviewData(result.data);
      } else {
        setPreviewError(result.error || 'Failed to load preview data');
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
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      const formData = new FormData();
      formData.append('template', file);

      const response = await fetch(`${backendUrl}/api/reports/upload-template`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        alert('Template uploaded successfully!');
        fetchTemplates();
      } else {
        alert(result.error || 'Failed to upload template');
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

      const result = await fetchWithAuth(`/api/reports?${params.toString()}`);

      if (result.success) {
        alert('Report generated successfully! You can now download it.');
      } else {
        alert(result.error || 'Failed to generate report');
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
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      // Use the new export endpoint
      const response = await fetch(`${backendUrl}/api/reports/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateRange: { startDate, endDate },
          format: format === 'google-doc' ? 'pdf' : format, // Map google-doc to pdf for now or handle separately
          templateId: selectedTemplate || null,
          clients: selectedClients,
          sendToClient: false // This is for download only
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${startDate}-${endDate}.${format === 'google-doc' ? 'pdf' : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to download report');
      }
    } catch (error) {
      alert('Failed to download report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client to schedule reports for.');
      return;
    }

    try {
      setLoading(true);
      const result = await fetchWithAuth('/api/reports/schedule', {
        method: 'POST',
        body: JSON.stringify({
          clientIds: selectedClients,
          enabled: reportSchedule.enabled,
          dayOfMonth: reportSchedule.dayOfMonth,
          time: reportSchedule.time,
          interval: 'monthly', // Default to monthly for now as per UI
          templateId: selectedTemplate || null,
          format: 'pdf', // Default format
          emailRecipients: [] // Default to user email (handled by backend if empty)
        })
      });

      if (result.success) {
        alert('Report schedule saved successfully!');
      } else {
        alert(result.error || 'Failed to save schedule');
      }
    } catch (error) {
      alert('Failed to save schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendToClients = async () => {
    if (selectedClients.length === 0) {
      alert('Please select at least one client');
      return;
    }

    try {
      setSendingToClients(true);
      const result = await fetchWithAuth('/api/reports/send-to-clients', {
        method: 'POST',
        body: JSON.stringify({
          startDate,
          endDate,
          templateName: selectedTemplate || null,
          format: 'pdf',
          clientIds: selectedClients
        })
      });

      if (result.success) {
        alert(result.message || 'Reports sent successfully!');
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
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
            }`}>
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
      <div className="min-h-screen bg-slate-950 text-slate-50 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
            <p className="text-slate-400">Generate professional reports and view live performance insights.</p>
          </div>

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
              </div>

              {/* 3. Period & Actions */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Calendar size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Report Period</h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  {[
                    { label: '7 Days', days: 7 },
                    { label: '30 Days', days: 30 },
                    { label: '90 Days', days: 90 },
                    { label: 'YTD', days: 365 } // Simplified YTD
                  ].map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setQuickDateRange(opt.days)}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
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

                <div className="flex gap-3">
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-3 rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                    Generate
                  </button>
                  <button
                    onClick={sendToClients}
                    disabled={sendingToClients}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium border border-slate-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {sendingToClients ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    Send
                  </button>
                </div>

                {/* Download Options (Always visible for demo, but logically after generation) */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center gap-4">
                  <button onClick={() => downloadReport('pdf')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Download size={12} /> PDF
                  </button>
                  <button onClick={() => downloadReport('json')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Download size={12} /> JSON
                  </button>
                  <button onClick={() => downloadReport('txt')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Download size={12} /> Text
                  </button>
                </div>
              </div>

              {/* 4. Schedule (Collapsible) */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
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

                {showSchedule && (
                  <div className="p-6 pt-0 border-t border-slate-800/50 mt-2">
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
                    <button
                      onClick={saveSchedule}
                      className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Save Schedule
                    </button>
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

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Reports;
