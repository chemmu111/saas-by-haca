import { useState, useEffect, useCallback } from 'react';
import PageTitle from './components/PageTitle';
import Layout from './Layout.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import CreatePostModal from './CreatePostModal.jsx';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Edit, Trash2, Filter, Plus, Instagram, Facebook, Image as ImageIcon, Send, AlertCircle, Video } from 'lucide-react';

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
  const [failedMediaUrls, setFailedMediaUrls] = useState(new Set());
  const [retryingMediaUrls, setRetryingMediaUrls] = useState(new Set());

  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    return window.location.origin;
  };

  const normalizeMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return null;

    try {
      const backendUrl = getBackendUrl();

      // Already a full URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);

        // If URL points to production/ngrok but we're running locally, rewrite to use current backend
        if (urlObj.hostname.includes('onrender.com') || urlObj.hostname.includes('ngrok')) {
          return `${backendUrl}${urlObj.pathname}`;
        }

        // If it's a localhost URL with different port, normalize to our backend
        if (urlObj.hostname === 'localhost' && urlObj.port && urlObj.port !== '5000' && urlObj.port !== '3000') {
          return `${backendUrl}${urlObj.pathname}`;
        }

        return url;
      }

      // Handle relative paths
      if (url.startsWith('/uploads/')) {
        return `${backendUrl}${url}`;
      }

      if (url.startsWith('/api/images/')) {
        return `${backendUrl}${url.replace('/api/images/', '/uploads/')}`;
      }

      // Handle uploads without leading slash
      if (url.startsWith('uploads/')) {
        return `${backendUrl}/${url}`;
      }

      // Handle any path starting with /
      if (url.startsWith('/')) {
        return `${backendUrl}${url}`;
      }

      // Plain filename - assume it's in uploads
      if (!url.includes('/') && !url.includes('http')) {
        return `${backendUrl}/uploads/${url}`;
      }

      // Default: prepend backend URL
      return `${backendUrl}/${url}`;
    } catch (error) {
      console.warn('Error normalizing media URL:', url, error);
      const backendUrl = getBackendUrl();
      if (url.startsWith('/')) {
        return `${backendUrl}${url}`;
      }
      return `${backendUrl}/uploads/${url}`;
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const fetchPosts = useCallback(async () => {
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

      if (!response.ok) {
        let errorMessage = `Failed to fetch posts (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = response.statusText || errorMessage;
        }
        setError(errorMessage);
        console.error('Error fetching posts:', response.status, errorMessage);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setPosts(result.data || []);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchClients = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchClients();
  }, [fetchPosts, fetchClients]);

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
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
            <XCircle size={12} />
            Draft
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
            <Clock size={12} />
            Scheduled
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle size={12} />
            Published
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
            Processing
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
      <PageTitle title="Posts & Publishing" />
      <div className="max-w-7xl mx-auto lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <FileText className="text-white" size={24} />
              </div>
              Posts Management
            </h1>
            <p className="text-gray-600 mt-2 ml-14">Create and manage your social media content</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Plus size={20} />
            <span className="font-semibold">Create Post</span>
          </button>
        </div>

        {/* Toast Notification */}
        {
          toast.show && (
            <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
              {toast.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <span>{toast.message}</span>
            </div>
          )
        }

        {/* Error Message */}
        {
          error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )
        }

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
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter size={18} />
              <span>Filter by Status</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${statusFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${statusFilter === 'draft'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter('scheduled')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${statusFilter === 'scheduled'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Scheduled
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${statusFilter === 'published'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Published
              </button>
              <button
                onClick={() => setStatusFilter('processing')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${statusFilter === 'processing'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Processing
              </button>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        {
          loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-white rounded-2xl border-2 border-dashed border-gray-300">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl mb-4">
                <FileText className="text-gray-500" size={48} />
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900">No posts found</h3>
              <p className="mt-2 text-gray-600 max-w-md mx-auto">
                {statusFilter === 'all'
                  ? 'Get started by creating your first post to engage with your audience'
                  : `No ${statusFilter} posts found. Try a different filter or create a new post.`}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
              >
                <Plus size={20} />
                Create Your First Post
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => {
                const firstMediaUrl = post.mediaUrls && Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0
                  ? post.mediaUrls[0]
                  : null;

                const hasVideoExtension = firstMediaUrl && /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(firstMediaUrl);
                const isReel = post.postType === 'reel' || post.postType === 'video';
                const isVideo = hasVideoExtension || isReel;

                // For video/reel posts, prefer cover photo, then thumbnail, then first frame
                let displayMediaUrl = firstMediaUrl;
                if (isVideo) {
                  if (post.coverUrl) {
                    displayMediaUrl = post.coverUrl;
                  } else if (post.thumbnailUrl) {
                    displayMediaUrl = post.thumbnailUrl;
                  }
                }

                const normalizedMediaUrl = displayMediaUrl ? normalizeMediaUrl(displayMediaUrl) : null;

                return (
                  <div
                    key={post._id}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 group"
                  >
                    {/* Media Preview */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                      {normalizedMediaUrl ? (
                        <>
                          {isVideo ? (
                            <>
                              {/* For videos: if we have a cover/thumbnail image, show it as image, not video */}
                              {(post.coverUrl || post.thumbnailUrl) ? (
                                failedMediaUrls.has(normalizedMediaUrl) ? (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                                    <div className="p-4 bg-white/80 rounded-2xl shadow-sm">
                                      <Video size={32} className="text-purple-500" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Video</p>
                                  </div>
                                ) : (
                                  <img
                                    src={normalizedMediaUrl}
                                    alt="Video cover"
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      setFailedMediaUrls(prev => new Set(prev).add(normalizedMediaUrl));
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )
                              ) : (
                                /* No cover/thumbnail - show video element */
                                failedMediaUrls.has(normalizedMediaUrl) ? (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                                    <div className="p-4 bg-white/80 rounded-2xl shadow-sm">
                                      <Video size={32} className="text-purple-500" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 font-medium">Video</p>
                                  </div>
                                ) : (
                                  <video
                                    src={normalizeMediaUrl(firstMediaUrl)}
                                    className="w-full h-full object-cover"
                                    muted
                                    playsInline
                                    preload="metadata"
                                    onError={(e) => {
                                      setFailedMediaUrls(prev => new Set(prev).add(normalizedMediaUrl));
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )
                              )}
                              {/* Video play icon overlay */}
                              {!failedMediaUrls.has(normalizedMediaUrl) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
                                  <div className="bg-white bg-opacity-90 rounded-full p-3 shadow-lg">
                                    <Video className="text-purple-600" size={24} fill="currentColor" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            failedMediaUrls.has(normalizedMediaUrl) ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 text-gray-400">
                                <div className="p-4 bg-white/80 rounded-2xl shadow-sm">
                                  <ImageIcon size={32} className="text-blue-400" />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium">Image</p>
                              </div>
                            ) : (
                              <img
                                src={normalizedMediaUrl}
                                alt="Post media"
                                className="w-full h-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  // Mark as failed
                                  setFailedMediaUrls(prev => new Set(prev).add(normalizedMediaUrl));
                                  e.target.style.display = 'none';
                                }}
                              />
                            )
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                          <div className="p-4 bg-white/80 rounded-2xl shadow-sm">
                            {post.postType === 'reel' ? (
                              <Video size={32} className="text-purple-500" />
                            ) : (
                              <ImageIcon size={32} className="text-pink-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-2 font-medium capitalize">{post.postType || 'Post'}</p>
                        </div>
                      )}

                      {/* Status & Platform Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        {getStatusBadge(post.status)}
                        {getPlatformIcon(post.platform)}
                      </div>

                      {/* Action Buttons */}
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-2 bg-white/90 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-white transition-colors shadow-md"
                          title="Edit post"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(post)}
                          disabled={deletingId === post._id}
                          className="p-2 bg-white/90 backdrop-blur-sm text-red-600 rounded-lg hover:bg-white transition-colors shadow-md disabled:opacity-50"
                          title="Delete post"
                        >
                          {deletingId === post._id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>

                      {/* Media Count */}
                      {post.mediaUrls && post.mediaUrls.length > 1 && (
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                          +{post.mediaUrls.length - 1} more
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5">
                      {/* Header */}
                      <div className="mb-4">
                        <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                          {post.client?.name || 'Unknown Client'}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.postType && (
                            <span className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-lg text-xs font-semibold capitalize">
                              {post.postType}
                            </span>
                          )}
                          {post.format && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold">
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
                      </div>

                      {/* Caption */}
                      <div className="mb-4">
                        <p className="text-gray-700 text-sm line-clamp-3 leading-relaxed">
                          {post.caption || post.content || 'No caption'}
                        </p>
                      </div>

                      {/* Hashtags */}
                      {post.hashtags && post.hashtags.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {post.hashtags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100"
                            >
                              #{tag}
                            </span>
                          ))}
                          {post.hashtags.length > 3 && (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                              +{post.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Post Details */}
                      <div className="pt-4 border-t border-gray-100 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={14} />
                          <span>{formatDate(post.createdAt)}</span>
                        </div>
                        {post.scheduledTime && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={14} />
                            <span>Scheduled: {formatDate(post.scheduledTime)}</span>
                          </div>
                        )}
                        {post.publishedTime && (
                          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                            <Send size={14} />
                            <span>Published: {formatDate(post.publishedTime)}</span>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {post.status === 'failed' && post.errorMessage && (
                        <div className="mt-4 pt-4 border-t border-red-100">
                          <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-red-800 mb-1">Publishing Failed</p>
                                <p className="text-xs text-red-700 line-clamp-2">{post.errorMessage}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
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
