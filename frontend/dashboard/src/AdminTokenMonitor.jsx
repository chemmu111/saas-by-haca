import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';

const AdminTokenMonitor = () => {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(null);
    const [error, setError] = useState(null);

    const getBackendUrl = () => {
        if (window.location.hostname.includes('socialhac.com')) return 'https://haca-social-x-backend.onrender.com';
        return (import.meta.env.VITE_API_URL || 'https://haca-social-x-backend.onrender.com').replace(/\/$/, '');
    };

    // Fetch token data
    const fetchTokens = async () => {
        try {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('auth_token');
            const backendUrl = getBackendUrl();

            const response = await fetch(`${backendUrl}/api/admin/tokens`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch token data');
            }

            const data = await response.json();
            setTokens(data);
        } catch (err) {
            console.error('Error fetching tokens:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Refresh a specific token
    const handleRefreshToken = async (clientId, clientName) => {
        try {
            setRefreshing(clientId);
            const token = localStorage.getItem('auth_token');
            const backendUrl = getBackendUrl();

            const response = await fetch(`${backendUrl}/api/auth/refresh/${clientId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ Token refreshed successfully for ${clientName}`);
                fetchTokens(); // Reload data
            } else {
                alert(`❌ Failed to refresh token: ${result.error}`);
            }
        } catch (err) {
            console.error('Error refreshing token:', err);
            alert(`❌ Error: ${err.message}`);
        } finally {
            setRefreshing(null);
        }
    };

    // Reconnect Instagram
    const handleReconnect = (clientId) => {
        window.location.href = `/dashboard/clients`;
    };

    useEffect(() => {
        fetchTokens();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchTokens, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Get status badge
    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <CheckCircle size={16} />
                        Active
                    </span>
                );
            case 'expiringSoon':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                        <Clock size={16} />
                        Expiring Soon
                    </span>
                );
            case 'expired':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                        <AlertCircle size={16} />
                        Expired
                    </span>
                );
            case 'not_connected':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        <AlertCircle size={16} />
                        Not Connected
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        Unknown
                    </span>
                );
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p className="text-gray-600">Loading token data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={fetchTokens}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Token Monitor</h1>
                    <p className="text-gray-600 mt-1">Monitor Instagram token expiration for all clients</p>
                </div>
                <button
                    onClick={fetchTokens}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-600">Total Clients</div>
                    <div className="text-2xl font-bold text-gray-900">{tokens.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg shadow p-4">
                    <div className="text-sm text-green-600">Active</div>
                    <div className="text-2xl font-bold text-green-900">
                        {tokens.filter(t => t.tokenStatus === 'active').length}
                    </div>
                </div>
                <div className="bg-orange-50 rounded-lg shadow p-4">
                    <div className="text-sm text-orange-600">Expiring Soon</div>
                    <div className="text-2xl font-bold text-orange-900">
                        {tokens.filter(t => t.tokenStatus === 'expiringSoon').length}
                    </div>
                </div>
                <div className="bg-red-50 rounded-lg shadow p-4">
                    <div className="text-sm text-red-600">Expired</div>
                    <div className="text-2xl font-bold text-red-900">
                        {tokens.filter(t => t.tokenStatus === 'expired').length}
                    </div>
                </div>
            </div>

            {/* Token Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Instagram Username
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Days Left
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Expires At
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Refreshed
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tokens.map((token) => (
                            <tr key={token._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{token.clientName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{token.igUsername}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getStatusBadge(token.tokenStatus)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className={`text-sm font-medium ${token.expiresInDays === null ? 'text-gray-400' :
                                        token.expiresInDays <= 0 ? 'text-red-600' :
                                            token.expiresInDays <= 10 ? 'text-orange-600' :
                                                'text-green-600'
                                        }`}>
                                        {token.expiresInDays === null ? 'N/A' : `${token.expiresInDays} days`}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{formatDate(token.expiresAt)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{formatDate(token.lastRefreshedAt)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div className="flex items-center gap-2">
                                        {token.isConnected && token.tokenStatus !== 'expired' && (
                                            <button
                                                onClick={() => handleRefreshToken(token._id, token.clientName)}
                                                disabled={refreshing === token._id}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                                            >
                                                <RefreshCw size={14} className={refreshing === token._id ? 'animate-spin' : ''} />
                                                Refresh
                                            </button>
                                        )}
                                        {(!token.isConnected || token.tokenStatus === 'expired') && (
                                            <button
                                                onClick={() => handleReconnect(token._id)}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                            >
                                                <ExternalLink size={14} />
                                                Reconnect
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {tokens.length === 0 && (
                    <div className="text-center py-12">
                        <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
                        <p className="text-gray-600">No clients found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTokenMonitor;
