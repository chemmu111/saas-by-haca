import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './Layout.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import CreatePostModal from './CreatePostModal.jsx';
import { FileText, Calendar, Clock, CheckCircle, XCircle, Edit, Trash2, Filter, Plus, Instagram, Facebook, Image as ImageIcon, Send, Upload, X, AlertCircle, Video, Hash, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Play, Heart, MessageCircle, Eye, TrendingUp } from 'lucide-react';

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
  
  // New state for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [selectedPostTypes, setSelectedPostTypes] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [galleryModal, setGalleryModal] = useState({ open: false, post: null, currentIndex: 0 });
  
  const POSTS_PER_PAGE = 10;
  

  // Helper function to get backend URL
  const getBackendUrl = () => {
    // If accessing via ngrok, always use localhost:5000 for backend
    if (window.location.hostname.includes('ngrok')) {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    
    // If on Vite dev server (port 3000) or localhost, use localhost:5000 for backend
    if (window.location.port === '3000' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    
    // Production: use same origin
    return window.location.origin;
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Filter and paginate posts
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesCaption = post.caption?.toLowerCase().includes(query) || post.content?.toLowerCase().includes(query);
        const matchesHashtags = post.hashtags?.some(tag => tag.toLowerCase().includes(query));
        const matchesClient = post.client?.name?.toLowerCase().includes(query);
        const matchesPlatform = post.platform?.toLowerCase().includes(query);
        
        if (!matchesCaption && !matchesHashtags && !matchesClient && !matchesPlatform) {
          return false;
        }
      }
      
      // Platform filter
      if (selectedPlatforms.length > 0) {
        const platformMatch = selectedPlatforms.some(platform => {
          if (platform === 'both') {
            return post.platform === 'both';
          }
          return post.platform === platform || post.platform === 'both';
        });
        if (!platformMatch) return false;
      }
      
      // Post type filter
      if (selectedPostTypes.length > 0) {
        if (!selectedPostTypes.includes(post.postType)) {
          return false;
        }
      }
      
      return true;
    });
  }, [posts, debouncedSearch, selectedPlatforms, selectedPostTypes]);

  // Paginate filtered posts
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, currentPage]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatforms, selectedPostTypes, statusFilter]);

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

  const togglePlatform = (platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const togglePostType = (type) => {
    setSelectedPostTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const openGallery = useCallback((post, index = 0) => {
    setGalleryModal({ open: true, post, currentIndex: index });
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryModal({ open: false, post: null, currentIndex: 0 });
  }, []);

  const nextGalleryImage = useCallback(() => {
    setGalleryModal(prev => {
      if (prev.post?.mediaUrls) {
        const nextIndex = (prev.currentIndex + 1) % prev.post.mediaUrls.length;
        return { ...prev, currentIndex: nextIndex };
      }
      return prev;
    });
  }, []);

  const prevGalleryImage = useCallback(() => {
    setGalleryModal(prev => {
      if (prev.post?.mediaUrls) {
        const prevIndex = prev.currentIndex === 0 
          ? prev.post.mediaUrls.length - 1 
          : prev.currentIndex - 1;
        return { ...prev, currentIndex: prevIndex };
      }
      return prev;
    });
  }, []);

  const isVideo = (url) => {
    return url?.toLowerCase().match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    if (!galleryModal.open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeGallery();
      } else if (e.key === 'ArrowLeft') {
        prevGalleryImage();
      } else if (e.key === 'ArrowRight') {
        nextGalleryImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galleryModal.open, closeGallery, prevGalleryImage, nextGalleryImage]);

  // UI Components
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  );

  const SkeletonLoading = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
      <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
        <FileText className="text-blue-600" size={48} />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts found</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {statusFilter === 'all' && debouncedSearch === '' && selectedPlatforms.length === 0 && selectedPostTypes.length === 0
          ? 'Get started by creating your first post'
          : 'Try adjusting your filters or search query'}
      </p>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
      >
        <Plus size={20} />
        Create First Post
      </button>
    </div>
  );

  const MediaPreview = ({ post }) => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    const mediaCount = post.mediaUrls.length;
    const isSingle = mediaCount === 1;

    return (
      <div className="mb-4">
        {isSingle ? (
          <div 
            className="relative w-40 h-40 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
            onClick={() => openGallery(post, 0)}
          >
            {isVideo(post.mediaUrls[0]) ? (
              <>
                <video 
                  src={post.mediaUrls[0]} 
                  className="w-full h-full object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-40 transition-opacity">
                  <Play className="text-white" size={32} />
                </div>
              </>
            ) : (
              <img
                src={post.mediaUrls[0]}
                alt="Post media"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {post.mediaUrls.slice(0, 4).map((url, index) => (
              <div
                key={index}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-pointer group"
                onClick={() => openGallery(post, index)}
              >
                {isVideo(url) ? (
                  <>
                    <video 
                      src={url} 
                      className="w-full h-full object-cover"
                      muted
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                      <Play className="text-white" size={16} />
                    </div>
                  </>
                ) : (
                  <img
                    src={url}
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                )}
                {index === 3 && mediaCount > 4 && (
                  <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">+{mediaCount - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const PostStats = ({ post }) => {
    const stats = [];
    if (post.likes !== undefined) stats.push({ icon: Heart, value: post.likes, label: 'Likes' });
    if (post.comments !== undefined) stats.push({ icon: MessageCircle, value: post.comments, label: 'Comments' });
    if (post.views !== undefined) stats.push({ icon: Eye, value: post.views, label: 'Views' });
    if (post.reach !== undefined) stats.push({ icon: TrendingUp, value: post.reach, label: 'Reach' });

    if (stats.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 text-gray-700 rounded-md text-xs font-medium"
          >
            <stat.icon size={14} className="text-gray-500" />
            <span className="font-semibold">{stat.value.toLocaleString()}</span>
            <span className="text-gray-500">{stat.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const PostCard = ({ post }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <div
        key={post._id}
        className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hover Actions */}
        <div className={`absolute top-4 right-4 flex gap-2 transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={() => handleEdit(post)}
            className="p-2 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg shadow-md transition-colors"
            title="Edit post"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => handleDeleteClick(post)}
            disabled={deletingId === post._id}
            className="p-2 bg-white text-red-600 hover:bg-red-50 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete post"
          >
            {deletingId === post._id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            ) : (
              <Trash2 size={18} />
            )}
          </button>
        </div>

        <div className="flex items-start gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {getPlatformIcon(post.platform)}
              <h3 className="font-semibold text-gray-900">
                {post.client?.name || 'Unknown Client'}
              </h3>
              {getStatusBadge(post.status)}
              {post.postType && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium capitalize">
                  {post.postType}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Platform: <span className="font-medium capitalize">{post.platform}</span>
            </p>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-4">
          <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">{post.caption || post.content || 'No content'}</p>
        </div>

        {/* Media Preview */}
        <MediaPreview post={post} />

        {/* Post Stats */}
        <PostStats post={post} />

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
                className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium"
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
    );
  };

  const GalleryModal = () => {
    if (!galleryModal.open || !galleryModal.post) return null;

    const { post, currentIndex } = galleryModal;
    const mediaUrls = post.mediaUrls || [];
    const currentMedia = mediaUrls[currentIndex];

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
        onClick={closeGallery}
      >
        <div className="relative max-w-6xl w-full max-h-[90vh] flex items-center justify-center">
          <button
            onClick={closeGallery}
            className="absolute top-4 right-4 z-10 p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          
          {mediaUrls.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevGalleryImage();
                }}
                className="absolute left-4 z-10 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextGalleryImage();
                }}
                className="absolute right-4 z-10 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div 
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {isVideo(currentMedia) ? (
              <video 
                src={currentMedia} 
                controls
                autoPlay
                className="max-w-full max-h-[90vh] rounded-lg"
              />
            ) : (
              <img
                src={currentMedia}
                alt={`Media ${currentIndex + 1}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23ddd" width="400" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EFailed to load%3C/text%3E%3C/svg%3E';
                }}
              />
            )}
          </div>

          {mediaUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {mediaUrls.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryModal(prev => ({ ...prev, currentIndex: index }));
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentIndex ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentPage === page
                ? 'bg-blue-600 text-white'
                : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Posts Management
            </h1>
            <p className="text-gray-600 mt-2">View and manage your social media posts</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Plus size={20} />
            Create Post
          </button>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top ${
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

        {/* Search Bar and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search posts by caption, hashtags, client, or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filters Panel */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-gray-600" />
                <span className="font-medium text-gray-900">Filters</span>
                {(selectedPlatforms.length > 0 || selectedPostTypes.length > 0) && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    {selectedPlatforms.length + selectedPostTypes.length}
                  </span>
                )}
              </div>
              {filtersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {filtersOpen && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'draft', 'scheduled', 'published'].map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                          statusFilter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="flex flex-wrap gap-2">
                    {['instagram', 'facebook', 'both'].map(platform => (
                      <button
                        key={platform}
                        onClick={() => togglePlatform(platform)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-2 ${
                          selectedPlatforms.includes(platform)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {platform === 'instagram' && <Instagram size={16} />}
                        {platform === 'facebook' && <Facebook size={16} />}
                        {platform === 'both' && (
                          <>
                            <Instagram size={16} />
                            <Facebook size={16} />
                          </>
                        )}
                        {platform}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
                  <div className="flex flex-wrap gap-2">
                    {['post', 'reel', 'story', 'carousel'].map(type => (
                      <button
                        key={type}
                        onClick={() => togglePostType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                          selectedPostTypes.includes(type)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {paginatedPosts.length} of {filteredPosts.length} posts
            {filteredPosts.length !== posts.length && ` (${posts.length} total)`}
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <SkeletonLoading />
        ) : filteredPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="space-y-4">
              {paginatedPosts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
            <Pagination />
          </>
        )}
      </div>

      {/* Gallery Modal */}
      <GalleryModal />

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
