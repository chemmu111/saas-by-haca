import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react';

const TokenHealthSettings = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshingId, setRefreshingId] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch('http://localhost:5001/api/clients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setClients(data.data.filter(c => c.platform === 'instagram'));
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleForceRefresh = async (clientId) => {
        setRefreshingId(clientId);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:5001/api/auth/refresh/${clientId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                // Update local state
                setClients(clients.map(c =>
                    c._id === clientId ? { ...c, tokenStatus: data.status } : c
                ));
            } else {
                alert('Refresh failed: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            alert('Error refreshing token');
        } finally {
            setRefreshingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const state = typeof status === 'object' ? status.state : status;

        switch (state) {
            case 'active':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                        <CheckCircle2 size={12} /> Active
                    </span>
                );
            case 'expiring':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium border border-yellow-200">
                        <AlertCircle size={12} /> Expiring Soon
                    </span>
                );
            case 'expired':
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium border border-red-200">
                        <XCircle size={12} /> Expired
                    </span>
                );
            default:
                return (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full text-xs font-medium border border-gray-200">
                        <AlertCircle size={12} /> Unknown
                    </span>
                );
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading token status...</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Token Health</h2>
            <p className="text-slate-600 mb-6">Monitor and manage the status of your Instagram access tokens. Tokens automatically refresh every 30 days.</p>

            <div className="space-y-4">
                {clients.length === 0 ? (
                    <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-500">
                        No Instagram clients connected.
                    </div>
                ) : (
                    clients.map(client => {
                        const status = client.tokenStatus || {};
                        const state = typeof status === 'object' ? status.state : status;
                        const daysLeft = typeof status === 'object' ? status.expiresInDays : null;
                        const lastRefresh = typeof status === 'object' && status.lastRefresh ? new Date(status.lastRefresh).toLocaleDateString() : 'N/A';
                        const nextRefresh = typeof status === 'object' && status.nextRefresh ? new Date(status.nextRefresh).toLocaleDateString() : 'Auto';

                        return (
                            <div key={client._id} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {client.logo ? (
                                            <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {client.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-semibold text-slate-900">{client.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {getStatusBadge(client.tokenStatus)}
                                                {daysLeft !== null && (
                                                    <span className="text-xs text-slate-500">
                                                        • Expires in {daysLeft} days
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleForceRefresh(client._id)}
                                        disabled={refreshingId === client._id || state === 'expired'}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${state === 'expired'
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        <RefreshCw size={14} className={refreshingId === client._id ? 'animate-spin' : ''} />
                                        {refreshingId === client._id ? 'Refreshing...' : 'Force Refresh'}
                                    </button>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-500 bg-slate-50/50 p-3 rounded-lg">
                                    <div>Last Refresh: <span className="font-medium text-slate-700">{lastRefresh}</span></div>
                                    <div>Next Auto-Refresh: <span className="font-medium text-slate-700">{nextRefresh}</span></div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TokenHealthSettings;
