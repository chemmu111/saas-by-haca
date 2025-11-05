import { useState, useEffect } from 'react';
import { Users, Plus, Mail, Link as LinkIcon, User, X, Instagram, Facebook } from 'lucide-react';
import Layout from './Layout.jsx';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    platform: 'manual',
    socialMediaLink: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [connectingOAuth, setConnectingOAuth] = useState(false);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const errorParam = urlParams.get('error');

    if (connected) {
      // OAuth callback success - show success message
      // The user can now add the client manually or we can fetch from OAuth
      setError('');
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/clients');
      setShowForm(true);
      // Optionally show success message
    } else if (errorParam) {
      // OAuth callback error
      setError(`OAuth connection failed: ${errorParam}`);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/clients');
    }
  }, []);

  // Fetch clients from API
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      const response = await fetch('/api/clients', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login.html';
        return;
      }

      const result = await response.json();
      if (result.success) {
        setClients(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch clients');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();

    // Check for OAuth callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const errorParam = urlParams.get('error');
    const platform = urlParams.get('platform');

    if (success === 'client_added') {
      // Refresh clients list
      fetchClients();
      // Notify dashboard
      window.dispatchEvent(new CustomEvent('clientAdded'));
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/clients');
    } else if (errorParam) {
      let errorMessage = 'Failed to connect account';
      if (errorParam === 'oauth_cancelled') {
        errorMessage = 'OAuth connection was cancelled';
      } else if (errorParam === 'invalid_platform') {
        errorMessage = 'Invalid platform selected';
      } else if (errorParam.includes('instagram')) {
        errorMessage = 'Instagram connection failed. Please try again.';
      } else if (errorParam.includes('facebook')) {
        errorMessage = 'Facebook connection failed. Please try again.';
      }
      setError(errorMessage);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard/clients');
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        // Add new client to the list immediately
        setClients(prev => [result.data, ...prev]);
        // Reset form
        setFormData({ name: '', email: '', socialMediaLink: '' });
        setShowForm(false);
        setError('');
        // Notify dashboard to refresh client count
        window.dispatchEvent(new CustomEvent('clientAdded'));
      } else {
        setError(result.error || 'Failed to create client');
      }
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Failed to create client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setFormData({ name: '', email: '', platform: 'manual', socialMediaLink: '' });
    setError('');
    setConnectingOAuth(false);
  };

  const handlePlatformChange = (e) => {
    const platform = e.target.value;
    setFormData(prev => ({
      ...prev,
      platform: platform,
      socialMediaLink: platform === 'manual' ? prev.socialMediaLink : ''
    }));
  };

  const handleOAuthConnect = async (platform) => {
    if (!formData.name || !formData.email) {
      setError('Please enter client name and email first');
      return;
    }

    if (!/.+@.+\..+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setConnectingOAuth(true);

    try {
      // Redirect directly to OAuth endpoint
      const backendUrl = 'http://localhost:5000';
      const oauthUrl = `${backendUrl}/auth/${platform}?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`;
      window.location.href = oauthUrl;
    } catch (err) {
      console.error('Error initiating OAuth:', err);
      setError('Failed to connect. Please try again.');
      setConnectingOAuth(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="text-blue-600" size={32} />
              Clients Management
            </h1>
            <p className="text-gray-600 mt-2">Manage your social media clients</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Client
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Add Client Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Add New Client</h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={connectingOAuth}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter client name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={connectingOAuth}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-2">
                    Platform *
                  </label>
                  <select
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={handlePlatformChange}
                    required
                    disabled={connectingOAuth}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>

                {formData.platform === 'manual' ? (
                  <div>
                    <label htmlFor="socialMediaLink" className="block text-sm font-medium text-gray-700 mb-2">
                      Social Media Link (Optional)
                    </label>
                    <input
                      type="url"
                      id="socialMediaLink"
                      name="socialMediaLink"
                      value={formData.socialMediaLink}
                      onChange={handleInputChange}
                      disabled={connectingOAuth}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="https://instagram.com/client"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Connect Account
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOAuthConnect(formData.platform)}
                      disabled={connectingOAuth || !formData.name || !formData.email || !/.+@.+\..+/.test(formData.email)}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        formData.platform === 'instagram'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={
                        !formData.name ? 'Please enter client name first' :
                        !formData.email ? 'Please enter client email first' :
                        !/.+@.+\..+/.test(formData.email) ? 'Please enter a valid email address' :
                        'Click to connect with ' + formData.platform
                      }
                    >
                      {connectingOAuth ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          {formData.platform === 'instagram' ? (
                            <>
                              <Instagram size={20} />
                              Connect with Instagram
                            </>
                          ) : (
                            <>
                              <Facebook size={20} />
                              Connect with Facebook
                            </>
                          )}
                        </>
                      )}
                    </button>
                    {(!formData.name || !formData.email || !/.+@.+\..+/.test(formData.email)) && !connectingOAuth && (
                      <p className="mt-2 text-xs text-orange-600">
                        {!formData.name ? 'Enter client name and email above to enable connection' :
                         !formData.email ? 'Enter client email above to enable connection' :
                         'Enter a valid email address to enable connection'}
                      </p>
                    )}
                    {formData.name && formData.email && /.+@.+\..+/.test(formData.email) && (
                      <p className="mt-2 text-xs text-gray-500">
                        You'll be redirected to {formData.platform === 'instagram' ? 'Instagram' : 'Facebook'} to authorize access
                      </p>
                    )}
                  </div>
                )}

                {formData.platform === 'manual' && (
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Adding...' : 'Add Client'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Clients List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <Users className="mx-auto text-gray-400" size={48} />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No clients yet</h3>
            <p className="mt-2 text-gray-600">Get started by adding your first client</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <div
                key={client._id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{client.name}</h3>
                      <p className="text-sm text-gray-500">Client</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  {client.socialMediaLink && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <LinkIcon size={16} />
                      <a
                        href={client.socialMediaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline truncate"
                      >
                        {client.socialMediaLink}
                      </a>
                    </div>
                  )}
                  {client.platform && client.platform !== 'manual' && (
                    <div className="flex items-center gap-2">
                      {client.platform === 'instagram' ? (
                        <div className="flex items-center gap-2 px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded text-xs font-medium">
                          <Instagram size={14} />
                          Instagram Connected
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                          <Facebook size={14} />
                          Facebook Connected
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Added {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Clients;

