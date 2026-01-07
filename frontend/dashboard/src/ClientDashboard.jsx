import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Instagram,
    Users,
    BarChart2,
    Calendar,
    FileText,
    Settings,
    ExternalLink,
    MoreVertical,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import Layout from './Layout.jsx';
import TokenCountdown from './components/TokenCountdown.jsx';
import Analytics from './Analytics';

const getBackendUrl = () => {
    // 1. Force correct backend for target domain
    if (window.location.hostname.includes('socialhac.com')) {
        return 'https://haca-social-x-backend.onrender.com';
    }

    // 2. Development mode
    if (window.location.hostname === 'localhost' || window.location.port === '3000') {
        return 'http://localhost:5001';
    }

    // 3. Fallback
    return 'https://haca-social-x-backend.onrender.com';
};

const ClientDashboard = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchClient = async () => {
            try {
                const token = localStorage.getItem('auth_token');
                const backendUrl = getBackendUrl();
                if (!token) {
                    window.location.href = '/login';
                    return;
                }
                const url = backendUrl ? `${backendUrl}/api/clients/${clientId}` : `/api/clients/${clientId}`;
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        setClient(result.data);
                    }
                }
            } catch (err) {
                console.error('Error fetching client:', err);
            } finally {
                setLoading(false);
            }
        };
        // Initial fetch
        fetchClient();
        // Set interval for auto-refresh every 100 seconds
        const intervalId = setInterval(fetchClient, 100000);
        return () => clearInterval(intervalId);
    }, [clientId]);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </Layout>
        );
    }

    if (!client) {
        return (
            <Layout>
                <div className="max-w-7xl mx-auto px-4 py-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Client not found</h2>
                    <button
                        onClick={() => navigate('/dashboard/clients')}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Back to Clients
                    </button>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="max-w-7xl mx-auto lg:px-8 py-8">
                {/* Breadcrumb & Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/dashboard/clients')}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} /> Back to Clients
                    </button>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                {client.logo ? (
                                    <img src={client.logo} alt={client.name} className="w-20 h-20 rounded-xl object-cover border border-gray-100 shadow-sm" />
                                ) : (
                                    <div
                                        className="w-20 h-20 rounded-xl flex items-center justify-center text-white font-bold text-3xl shadow-sm"
                                        style={{ backgroundColor: client.brandColors?.primary || '#3b82f6' }}
                                    >
                                        {client.name.substring(0, 2).toUpperCase()}
                                    </div>
                                )}

                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                        <span className="flex items-center gap-1">
                                            {client.platform === 'instagram' ? <Instagram size={16} className="text-pink-600" /> : <Users size={16} />}
                                            {client.platform === 'instagram' ? 'Instagram Connected' : 'Manual Entry'}
                                        </span>
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span>{client.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                                    Edit Details
                                </button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                                    Create Report
                                </button>
                            </div>
                        </div>

                        {/* Quick Stats Strip */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-gray-100">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Followers</p>
                                <p className="text-2xl font-bold text-gray-900">{client.followerCount?.toLocaleString() || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Engagement Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{client.engagementRate || '0%'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Total Posts</p>
                                <p className="text-2xl font-bold text-gray-900">{client.totalPosts || 0}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Token Status</p>
                                {client.platform === 'instagram' && client.tokenExpiresAt ? (
                                    <TokenCountdown
                                        expiresAt={client.tokenExpiresAt}
                                        clientId={client._id}
                                        onExpired={() => {
                                            // Auto-open reconnect modal or redirect
                                            console.log('Token expired for client:', client.name);
                                        }}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {client.tokenStatus === 'active' ? (
                                            <span className="flex items-center gap-1 text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded-full text-sm">
                                                <CheckCircle2 size={14} /> Active
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full text-sm">
                                                <AlertCircle size={14} /> Expired
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="flex gap-8">
                        {['overview', 'analytics', 'content', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Recent Activity */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                                    <div className="text-center py-8 text-gray-500">
                                        <Clock className="mx-auto mb-2 opacity-20" size={48} />
                                        <p>No recent activity</p>
                                    </div>
                                </div>

                                {/* Tasks */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Tasks</h3>
                                    {client.tasks && client.tasks.length > 0 ? (
                                        <div className="space-y-3">
                                            {client.tasks.map((task, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                    <span className="flex-1 text-sm font-medium text-gray-700">{task.title}</span>
                                                    <span className="text-xs text-gray-500">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <CheckCircle2 className="mx-auto mb-2 opacity-20" size={48} />
                                            <p>No pending tasks</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-6">
                                {/* Client Details */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Website</p>
                                            {client.website ? (
                                                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                    {client.website.replace(/^https?:\/\//, '')} <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <p className="text-gray-400 text-sm">Not set</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                                            <p className="text-gray-900 text-sm">{client.phone || 'Not set'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tags</p>
                                            <div className="flex flex-wrap gap-2">
                                                {client.tags && client.tags.length > 0 ? (
                                                    client.tags.map((tag, i) => (
                                                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <p className="text-gray-400 text-sm">No tags</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Notes</h3>
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="mx-auto mb-2 opacity-20" size={48} />
                                        <p>No notes yet</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="mt-6">
                            <Analytics embedded={true} clientId={client._id} />
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                            <Settings className="mx-auto mb-4 text-gray-300" size={64} />
                            <h3 className="text-xl font-medium text-gray-900">Content Management</h3>
                            <p className="text-gray-500 mt-2">This section is under development.</p>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                            <Settings className="mx-auto mb-4 text-gray-300" size={64} />
                            <h3 className="text-xl font-medium text-gray-900">Client Settings</h3>
                            <p className="text-gray-500 mt-2">This section is under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default ClientDashboard;
