import { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Undo2, LayoutGrid, List as ListIcon } from 'lucide-react';
import Layout from './Layout.jsx';
import ClientCard from './components/ClientCard.jsx';
import ClientDrawer from './components/ClientDrawer.jsx';
import FilterBar from './components/FilterBar.jsx';
import AddClientModal from './components/AddClientModal.jsx';
import { useNavigate } from 'react-router-dom';

// Helper function to get backend URL
const getBackendUrl = () => {
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  if (window.location.port === '3000' || window.location.hostname === 'localhost') {
    const savedPort = localStorage.getItem('backend_port');
    return savedPort ? `http://localhost:${savedPort}` : 'http://localhost:5000';
  }
  return window.location.origin;
};

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [error, setError] = useState('');
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Fetch clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = `${getBackendUrl()}/login.html`;
        return;
      }

      const response = await fetch(`${getBackendUrl()}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch clients');
      const result = await response.json();
      if (result.success) {
        setClients(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'client_added') {
      fetchClients();
      window.history.replaceState({}, '', '/dashboard/clients');
    }
  }, []);

  // Filtered & Sorted Clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Status Filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'connected':
          result = result.filter(c => c.platform === 'instagram' && c.tokenStatus === 'active');
          break;
        case 'disconnected':
          result = result.filter(c => c.platform === 'manual');
          break;
        case 'expired':
          result = result.filter(c => c.tokenStatus === 'expired');
          break;
        case 'expiring':
          // Logic for expiring soon (e.g. < 7 days)
          // This requires checking tokenExpiresAt date
          break;
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'followers_desc': return (b.followerCount || 0) - (a.followerCount || 0);
        case 'engagement_desc': return (parseFloat(b.engagementRate) || 0) - (parseFloat(a.engagementRate) || 0);
        default: return 0;
      }
    });

    return result;
  }, [clients, searchQuery, filterStatus, sortBy]);

  const handleAddClient = async (formData) => {
    if (formData.platform !== 'manual') {
      // Handle OAuth
      handleOAuthConnect(formData);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getBackendUrl()}/api/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (result.success) {
        setClients(prev => [result.data, ...prev]);
        setShowAddModal(false);
      } else {
        setError(result.error || 'Failed to add client');
      }
    } catch (err) {
      setError('Failed to add client');
    }
  };

  const handleOAuthConnect = async (formData) => {
    setConnectingOAuth(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getBackendUrl()}/api/oauth/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          platform: formData.platform,
          name: formData.name,
          email: formData.email
        })
      });

      const result = await response.json();
      if (result.success && result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        setError(result.error || 'Failed to initiate OAuth');
        setConnectingOAuth(false);
      }
    } catch (err) {
      setError('Failed to connect');
      setConnectingOAuth(false);
    }
  };

  const handleDeleteClient = async (client) => {
    if (!window.confirm(`Are you sure you want to delete ${client.name}?`)) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${getBackendUrl()}/api/clients/${client._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setClients(prev => prev.filter(c => c._id !== client._id));
      }
    } catch (err) {
      console.error('Error deleting client:', err);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-blue-600" size={32} />
              Clients Management
            </h1>
            <p className="text-gray-600 mt-2">Manage your social media clients and connections</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={20} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ListIcon size={20} />
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={20} />
              Add Client
            </button>
          </div>
        </div>

        {/* Filters */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
              <Undo2 size={18} />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <Users className="mx-auto text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-medium text-gray-900">No clients found</h3>
            <p className="text-gray-500 mt-2 mb-6">Try adjusting your filters or add a new client</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Client
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {filteredClients.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onEdit={(c) => { setSelectedClient(c); setIsDrawerOpen(true); }}
                onDelete={handleDeleteClient}
                onConnectInstagram={(c) => handleOAuthConnect({ ...c, platform: 'instagram' })}
                onViewDetails={(c) => { setSelectedClient(c); setIsDrawerOpen(true); }}
              />
            ))}
          </div>
        )}

        {/* Modals & Drawers */}
        <AddClientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddClient}
          connectingOAuth={connectingOAuth}
          error={error}
        />

        <ClientDrawer
          client={selectedClient}
          isOpen={isDrawerOpen}
          onClose={() => { setIsDrawerOpen(false); setSelectedClient(null); }}
          onUpdate={fetchClients}
        />
      </div>
    </Layout>
  );
};

export default Clients;
