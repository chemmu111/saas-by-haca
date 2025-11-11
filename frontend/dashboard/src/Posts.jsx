import { useState, useEffect } from 'react';
import Layout from './Layout.jsx';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Edit, Trash2, Filter, Plus, Instagram, Facebook, Image as ImageIcon, Send, Upload, X, AlertCircle, Video, Hash } from 'lucide-react';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const [formData, setFormData] = useState({
    clientId: '',
    platform: 'instagram',
    postType: 'post',
    caption: '',
    hashtags: [],
    scheduleType: 'immediate', // 'immediate' or 'schedule'
    scheduledTime: '',
    mediaFiles: [], // Array of { file, preview, url }
    hashtagInput: ''
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

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  useEffect(() => {
    fetchPosts();
    fetchClients();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      const backendUrl = getBackendUrl();
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') {
        queryParams.append('status', statusFilter);
      }

      const response = await fetch(`${backendUrl}/api/posts?${queryParams.toString()}`, {
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
        setClients(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setDeletingId(postId);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setPosts(prev => prev.filter(post => post._id !== postId));
        showToast('Post deleted successfully', 'success');
      } else {
        showToast(result.error || 'Failed to delete post', 'error');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      showToast('Failed to delete post. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    // Populate form with existing post data
    setFormData({
      clientId: post.client?._id || post.client || '',
      platform: post.platform || 'instagram',
      postType: post.postType || 'post',
      caption: post.caption || post.content || '',
      hashtags: post.hashtags || [],
      scheduleType: post.scheduledTime ? 'schedule' : 'immediate',
      scheduledTime: post.scheduledTime ? new Date(post.scheduledTime).toISOString().slice(0, 16) : '',
      mediaFiles: (post.mediaUrls || []).map(url => ({ url, preview: url })),
      hashtagInput: ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    // Clean up preview URLs
    formData.mediaFiles.forEach(media => {
      if (media.preview && media.preview.startsWith('blob:')) {
        URL.revokeObjectURL(media.preview);
      }
    });
    
    setFormData({
      clientId: '',
      platform: 'instagram',
      postType: 'post',
      caption: '',
      hashtags: [],
      scheduleType: 'immediate',
      scheduledTime: '',
      mediaFiles: [],
      hashtagInput: ''
    });
    setEditingPost(null);
    setError('');
  };

  const handleCloseModal = () => {
    resetForm();
    setShowModal(false);
  };

  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    const newMediaFiles = files.map(file => {
      const preview = URL.createObjectURL(file);
      return { file, preview, url: null };
    });
    
    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...newMediaFiles]
    }));
  };

  const handleRemoveMedia = (index) => {
    setFormData(prev => {
      const media = prev.mediaFiles[index];
      if (media.preview && media.preview.startsWith('blob:')) {
        URL.revokeObjectURL(media.preview);
      }
      return {
        ...prev,
        mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
      };
    });
  };

  const uploadMedia = async (file) => {
    const token = localStorage.getItem('auth_token');
    const backendUrl = getBackendUrl();
    
    const formDataToSend = new FormData();
    formDataToSend.append('image', file);

    const response = await fetch(`${backendUrl}/api/posts/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formDataToSend
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  };

  const handleAddHashtag = () => {
    const tag = formData.hashtagInput.trim();
    if (tag && !formData.hashtags.includes(tag)) {
      // Remove # if user added it
      const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, cleanTag],
        hashtagInput: ''
      }));
    }
  };

  const handleRemoveHashtag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleHashtagInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHashtag();
    }
  };

  const validateForm = () => {
    if (!formData.clientId) {
      showToast('Please select a client', 'error');
      return false;
    }

    if (formData.mediaFiles.length === 0) {
      showToast('Please upload at least one media file', 'error');
      return false;
    }

    if (formData.scheduleType === 'schedule') {
      if (!formData.scheduledTime) {
        showToast('Please select a scheduled time', 'error');
        return false;
      }
      const scheduled = new Date(formData.scheduledTime);
      if (scheduled <= new Date()) {
        showToast('Scheduled time must be in the future', 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true);

      // Upload all media files
      const mediaUrls = [];
      for (const media of formData.mediaFiles) {
        if (media.url) {
          // Already uploaded
          mediaUrls.push(media.url);
        } else if (media.file) {
          // Need to upload
          const url = await uploadMedia(media.file);
          mediaUrls.push(url);
        }
      }

      if (mediaUrls.length === 0) {
        showToast('Failed to upload media files', 'error');
        return;
      }

      setUploading(false);

      // Prepare post data
      const postData = {
        client: formData.clientId,
        platform: formData.platform,
        postType: formData.postType,
        caption: formData.caption,
        hashtags: formData.hashtags,
        mediaUrls: mediaUrls
      };

      // Add scheduling
      if (formData.scheduleType === 'schedule') {
        postData.scheduledTime = new Date(formData.scheduledTime).toISOString();
      } else {
        postData.publishImmediately = true;
      }

      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      
      const url = editingPost 
        ? `${backendUrl}/api/posts/${editingPost._id}`
        : `${backendUrl}/api/posts`;
      
      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();
      
      if (result.success) {
        showToast(
          editingPost ? 'Post updated successfully' : (postData.publishImmediately ? 'Post published successfully' : 'Post scheduled successfully'),
          'success'
        );
        handleCloseModal();
        fetchPosts();
      } else {
        showToast(result.error || 'Failed to save post', 'error');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      showToast(err.message || 'Failed to save post. Please try again.', 'error');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircle size={12} />
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <Clock size={12} />
            Scheduled
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            Published
          </span>
        );
      default:
        return null;
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram size={16} className="text-purple-600" />;
      case 'facebook':
        return <Facebook size={16} className="text-blue-600" />;
      case 'both':
        return (
          <div className="flex gap-1">
            <Instagram size={16} className="text-purple-600" />
            <Facebook size={16} className="text-blue-600" />
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="text-blue-600" size={32} />
              Posts Management
            </h1>
            <p className="text-gray-600 mt-2">View and manage your social media posts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create Post
          </button>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Create/Edit Post Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div 
                className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                onClick={handleCloseModal}
              />

              {/* Modal panel */}
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <form onSubmit={handleSubmit}>
                  {/* Modal header */}
                  <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {editingPost ? 'Edit Post' : 'Create New Post'}
                    </h2>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Modal body */}
                  <div className="bg-white px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div className="space-y-6">
                      {/* Client Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client Account *
                        </label>
                        <select
                          value={formData.clientId}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Choose a client...</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.platform === 'instagram' ? 'Instagram' : client.platform === 'facebook' ? 'Facebook' : client.platform}
                            </option>
                          ))}
                        </select>
                        {clients.length === 0 && (
                          <p className="text-sm text-gray-500 mt-1">
                            No clients found. <a href="/dashboard/clients" className="text-blue-600 hover:underline">Add a client first</a>
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
                          <option value="both">Both</option>
                        </select>
                      </div>

                      {/* Post Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Post Type *
                        </label>
                        <select
                          value={formData.postType}
                          onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="post">Post</option>
                          <option value="story">Story</option>
                          <option value="reel">Reel</option>
                        </select>
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
                          Hashtags
                        </label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={formData.hashtagInput}
                            onChange={(e) => setFormData(prev => ({ ...prev, hashtagInput: e.target.value }))}
                            onKeyPress={handleHashtagInputKeyPress}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter hashtag and press Enter"
                          />
                          <button
                            type="button"
                            onClick={handleAddHashtag}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Hash size={20} />
                          </button>
                        </div>
                        {formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {formData.hashtags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHashtag(tag)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <X size={14} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Media Upload */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Media Files * (Images or Videos)
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                          {formData.mediaFiles.map((media, index) => (
                            <div key={index} className="relative group">
                              {media.file?.type?.startsWith('video/') ? (
                                <video
                                  src={media.preview}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300"
                                  controls={false}
                                />
                              ) : (
                                <img
                                  src={media.preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-gray-300"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMedia(index)}
                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload size={32} className="text-gray-400 mb-2" />
                            <p className="mb-1 text-sm text-gray-500">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">Images or Videos (multiple files supported)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,video/*"
                            multiple
                            onChange={handleMediaSelect}
                          />
                        </label>
                      </div>

                      {/* Scheduling Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Publishing Schedule
                        </label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="immediate"
                              checked={formData.scheduleType === 'immediate'}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                              className="mr-2"
                            />
                            <span>Publish Now</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="schedule"
                              checked={formData.scheduleType === 'schedule'}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                              className="mr-2"
                            />
                            <span>Schedule Later</span>
                          </label>
                        </div>
                        {formData.scheduleType === 'schedule' && (
                          <input
                            type="datetime-local"
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            min={new Date().toISOString().slice(0, 16)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal footer */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || uploading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      {submitting && !uploading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      {!uploading && !submitting && (formData.scheduleType === 'schedule' ? (
                        <>
                          <Calendar size={20} />
                          Schedule Post
                        </>
                      ) : (
                        <>
                          <Send size={20} />
                          {editingPost ? 'Update Post' : 'Publish Now'}
                        </>
                      ))}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-6 flex items-center gap-4">
          <Filter size={20} className="text-gray-600" />
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Draft
            </button>
            <button
              onClick={() => setStatusFilter('scheduled')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'scheduled'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === 'published'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Published
            </button>
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <FileText className="mx-auto text-gray-400" size={48} />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No posts found</h3>
            <p className="mt-2 text-gray-600">
              {statusFilter === 'all'
                ? 'Get started by creating your first post'
                : `No ${statusFilter} posts found`}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Create Your First Post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post._id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getPlatformIcon(post.platform)}
                      <h3 className="font-semibold text-gray-900">
                        {post.client?.name || 'Unknown Client'}
                      </h3>
                      {getStatusBadge(post.status)}
                      {post.postType && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                          {post.postType}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Platform: <span className="font-medium capitalize">{post.platform}</span>
                    </p>
                  </div>
                  {post.status !== 'published' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit post"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(post._id)}
                        disabled={deletingId === post._id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete post"
                      >
                        {deletingId === post._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Post Content */}
                <div className="mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{post.caption || post.content || 'No content'}</p>
                </div>

                {/* Media Preview */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <div className="mb-4 flex gap-2 flex-wrap">
                    {post.mediaUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Post media ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Post Details */}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>Created: {formatDate(post.createdAt)}</span>
                  </div>
                  {post.scheduledTime && (
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      <span>Scheduled: {formatDate(post.scheduledTime)}</span>
                    </div>
                  )}
                  {post.publishedTime && (
                    <div className="flex items-center gap-2">
                      <Send size={16} />
                      <span>Published: {formatDate(post.publishedTime)}</span>
                    </div>
                  )}
                </div>

                {/* Hashtags */}
                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {post.hashtags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Error Message */}
                {post.status === 'failed' && post.errorMessage && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800 mb-1">Publishing Failed</p>
                          <p className="text-xs text-red-700 whitespace-pre-wrap">{post.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Posts;
