import { useState, useEffect } from 'react';
import Layout from './Layout.jsx';
import { Image as ImageIcon, Calendar, Clock, Send, Upload, X, Instagram, Facebook, AlertCircle } from 'lucide-react';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [formData, setFormData] = useState({
    content: '',
    caption: '',
    client: '',
    platform: 'instagram',
    scheduledTime: '',
    mediaUrl: '',
    hashtags: '',
    imageFile: null,
    imagePreview: null
  });

  // Helper function to get backend URL
  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5001';
    }
    return window.location.origin;
  };

  useEffect(() => {
    fetchPosts();
    fetchClients();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setPosts(result.data || []);
      } else {
        setError(result.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        // Filter clients that have OAuth connected (Instagram or Facebook)
        const connectedClients = (result.data || []).filter(
          client => client.platform === 'instagram' || client.platform === 'facebook'
        );
        setClients(connectedClients);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imagePreview: URL.createObjectURL(file)
      }));
    }
  };

  const handleUploadImage = async () => {
    if (!formData.imageFile) {
      setError('Please select an image first');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const formDataToSend = new FormData();
      formDataToSend.append('image', formData.imageFile);

      const response = await fetch(`${backendUrl}/api/posts/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const result = await response.json();
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          mediaUrl: result.data.url
        }));
        return result.data.url;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Failed to upload image');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.client) {
      setError('Please select a client account');
      return;
    }

    if (!formData.imageFile && !formData.mediaUrl) {
      setError('Please upload an image');
      return;
    }

    try {
      // Upload image if not already uploaded
      let mediaUrl = formData.mediaUrl;
      if (formData.imageFile && !mediaUrl) {
        mediaUrl = await handleUploadImage();
      }

      if (!mediaUrl) {
        setError('Failed to upload image');
        return;
      }

      // Prepare post data
      const postData = {
        content: formData.caption || formData.content || '',
        caption: formData.caption || '',
        client: formData.client,
        platform: formData.platform,
        mediaUrls: [mediaUrl],
        hashtags: formData.hashtags ? formData.hashtags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      // Add scheduled time if provided
      if (formData.scheduledTime) {
        postData.scheduledTime = new Date(formData.scheduledTime).toISOString();
      }

      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();
      if (result.success) {
        // If scheduled time is not set, publish immediately
        if (!formData.scheduledTime) {
          await handlePublish(result.data._id);
        } else {
          setPosts(prev => [result.data, ...prev]);
          setShowForm(false);
          resetForm();
          setError('');
        }
      } else {
        setError(result.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post');
    }
  };

  const handlePublish = async (postId) => {
    try {
      setPublishing(true);
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setPosts(prev => prev.map(post => 
          post._id === postId ? result.data : post
        ));
        setShowForm(false);
        resetForm();
        setError('');
        alert('Post published successfully!');
      } else {
        setError(result.error || 'Failed to publish post');
      }
    } catch (err) {
      console.error('Error publishing post:', err);
      setError(err.message || 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      caption: '',
      client: '',
      platform: 'instagram',
      scheduledTime: '',
      mediaUrl: '',
      hashtags: '',
      imageFile: null,
      imagePreview: null
    });
    if (formData.imagePreview) {
      URL.revokeObjectURL(formData.imagePreview);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
            <p className="text-gray-600 mt-1">Create and schedule posts for your clients</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <ImageIcon size={20} />
            Create Post
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Create Post Form */}
        {showForm && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Post</h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Account *
                </label>
                <select
                  value={formData.client}
                  onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an account...</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>
                      {client.name} - {client.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                    </option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No connected accounts. <a href="/dashboard/clients" className="text-blue-600 hover:underline">Connect an account first</a>
                  </p>
                )}
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform *
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo *
                </label>
                {formData.imagePreview ? (
                  <div className="relative">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="max-w-md rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => {
                          if (prev.imagePreview) URL.revokeObjectURL(prev.imagePreview);
                          return { ...prev, imageFile: null, imagePreview: null, mediaUrl: '' };
                        });
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size={48} className="text-gray-400 mb-4" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption
                </label>
                <textarea
                  value={formData.caption}
                  onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Write a caption for your post..."
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hashtags (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.hashtags}
                  onChange={(e) => setFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="#hashtag1, #hashtag2, #hashtag3"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Post (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to publish immediately
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                {formData.scheduledTime ? (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Calendar size={20} />
                    {uploading ? 'Uploading...' : 'Schedule Post'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={uploading || publishing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send size={20} />
                    {uploading ? 'Uploading...' : publishing ? 'Publishing...' : 'Publish Now'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <ImageIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-4">Create your first post to get started</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <div key={post._id} className="bg-white rounded-lg shadow overflow-hidden">
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <img
                    src={post.mediaUrls[0]}
                    alt="Post"
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {post.platform === 'instagram' ? (
                        <Instagram size={20} className="text-pink-600" />
                      ) : (
                        <Facebook size={20} className="text-blue-600" />
                      )}
                      <span className="text-sm font-medium text-gray-900">
                        {post.client?.name || 'Unknown Client'}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(post.status)}`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                    {post.caption || post.content || 'No caption'}
                  </p>
                  {post.scheduledTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Clock size={14} />
                      <span>Scheduled: {formatDate(post.scheduledTime)}</span>
                    </div>
                  )}
                  {post.publishedTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <Send size={14} />
                      <span>Published: {formatDate(post.publishedTime)}</span>
                    </div>
                  )}
                  {post.status === 'scheduled' && (
                    <button
                      onClick={() => handlePublish(post._id)}
                      disabled={publishing}
                      className="w-full mt-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Publish Now
                    </button>
                  )}
                  {post.status === 'failed' && post.errorMessage && (
                    <p className="text-xs text-red-600 mt-2">{post.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Posts;

