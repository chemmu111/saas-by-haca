import { useState, useEffect } from 'react';
import Layout from './Layout.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import CreatePostModal from './CreatePostModal.jsx';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Edit, Trash2, Filter, Plus, Instagram, Facebook, Image as ImageIcon, Send, Upload, X, AlertCircle, Video, Hash } from 'lucide-react';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  

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

  const handleDeleteClick = (post) => {
    setPostToDelete(post);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    setDeletingId(postToDelete._id);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login.html';
        return;
      }

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/posts/${postToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setPosts(prev => prev.filter(post => post._id !== postToDelete._id));
        showToast(result.message || 'Post deleted successfully', 'success');
        setDeleteModalOpen(false);
        setPostToDelete(null);
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

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setPostToDelete(null);
  };

  const handleEdit = (post) => {
    setEditingPost(post);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setEditingPost(null);
    setShowModal(false);
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
        <CreatePostModal
          isOpen={showModal}
          onClose={handleCloseModal}
          editingPost={editingPost}
          onSuccess={() => {
            fetchPosts();
            setShowModal(false);
          }}
        />

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
                      {post.format && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                          {post.format === 'square' && '1:1'}
                          {post.format === 'portrait' && '4:5'}
                          {post.format === 'landscape' && '1.91:1'}
                          {post.format === 'reel' && '9:16'}
                          {post.format === 'story' && '9:16'}
                          {post.format === 'carousel-square' && 'Carousel 1:1'}
                          {post.format === 'carousel-vertical' && 'Carousel 4:5'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Platform: <span className="font-medium capitalize">{post.platform}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(post)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title={post.status === 'published' ? 'Edit metadata (caption, hashtags)' : 'Edit post'}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(post)}
                      disabled={deletingId === post._id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={post.status === 'published' ? 'Delete from database (Instagram post remains)' : 'Delete post'}
                    >
                      {deletingId === post._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        postTitle={postToDelete?.caption || postToDelete?.content}
        postStatus={postToDelete?.status}
        isDeleting={deletingId === postToDelete?._id}
      />
    </Layout>
  );
};

export default Posts;
