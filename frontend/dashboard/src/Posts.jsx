import { useState, useEffect, useCallback } from 'react';
import Layout from './Layout.jsx';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';
import CreatePostModal from './CreatePostModal.jsx';
import FolderSidebar from './components/FolderSidebar.jsx';
import {
  FileText, Calendar, Clock, CheckCircle, XCircle, Edit, Trash2, Filter, Plus,
  Instagram, Facebook, Image as ImageIcon, Send, AlertCircle, Video,
  Search, Grid, List, MoreHorizontal, Copy, Save, CheckSquare, Square
} from 'lucide-react';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [folderFilter, setFolderFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedPosts, setSelectedPosts] = useState(new Set());

  const [deletingId, setDeletingId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [failedMediaUrls, setFailedMediaUrls] = useState(new Set());

  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      return savedPort ? `http://localhost:${savedPort}` : 'http://localhost:5000';
    }
    return window.location.origin;
  };

  const normalizeMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
      const backendUrl = getBackendUrl();
      if (url.startsWith('http')) return url;
      if (url.startsWith('/uploads/')) return `${backendUrl}${url}`;
      if (url.startsWith('uploads/')) return `${backendUrl}/${url}`;
      return `${backendUrl}/uploads/${url}`;
    } catch (e) {
      return url;
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
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
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (folderFilter) queryParams.append('folder', folderFilter);
      if (searchQuery) queryParams.append('search', searchQuery);

      const response = await fetch(`${backendUrl}/api/posts?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        window.location.href = '/login.html';
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
      setError('Failed to load posts.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, folderFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchPosts]);

  const handleSelectPost = (id) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedPosts(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedPosts.size} posts?`)) return;
    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/posts/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ postIds: Array.from(selectedPosts) })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${data.deletedCount} posts deleted`);
        setSelectedPosts(new Set());
        fetchPosts();
      }
    } catch (err) {
      showToast('Bulk delete failed', 'error');
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
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/posts/${postToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setPosts(prev => prev.filter(p => p._id !== postToDelete._id));
        showToast('Post deleted successfully');
        setDeleteModalOpen(false);
      } else {
        showToast(result.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      showToast('Failed to delete post', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft': return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"><XCircle size={12} /> Draft</span>;
      case 'scheduled': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium"><Clock size={12} /> Scheduled</span>;
      case 'published': return <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium"><CheckCircle size={12} /> Published</span>;
      default: return null;
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <FolderSidebar activeFolder={folderFilter} onSelectFolder={setFolderFilter} />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Posts Library</h1>
              <p className="text-slate-500 text-sm">Manage, schedule, and publish your content</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} /> Create Post
            </button>
          </div>

          {/* Toolbar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search posts..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              {['all', 'draft', 'scheduled', 'published'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${statusFilter === status ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* View Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                <List size={18} />
              </button>
            </div>

            {/* Bulk Actions */}
            {selectedPosts.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
              >
                <Trash2 size={16} /> Delete ({selectedPosts.size})
              </button>
            )}
          </div>

          {/* Posts Grid/List */}
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <FileText className="mx-auto text-slate-300 mb-3" size={48} />
              <h3 className="text-lg font-medium text-slate-900">No posts found</h3>
              <p className="text-slate-500 text-sm">Try adjusting your filters or create a new post.</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {posts.map(post => {
                const firstMedia = post.mediaUrls?.[0];
                const normalizedMedia = normalizeMediaUrl(firstMedia);
                const isSelected = selectedPosts.has(post._id);

                if (viewMode === 'list') {
                  return (
                    <div key={post._id} className={`bg-white p-4 rounded-xl border ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow`}>
                      <button onClick={() => handleSelectPost(post._id)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? <CheckSquare size={20} className="text-indigo-600" /> : <Square size={20} />}
                      </button>
                      <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        {normalizedMedia ? (
                          <img src={normalizedMedia} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={24} /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{post.caption || 'No caption'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {getStatusBadge(post.status)}
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                          {post.client && <span className="px-2 py-0.5 bg-slate-100 rounded-full">{post.client.name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingPost(post); setShowModal(true); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteClick(post)} className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={post._id} className={`bg-white rounded-xl border ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200'} shadow-sm overflow-hidden hover:shadow-lg transition-all group`}>
                    <div className="relative h-48 bg-slate-100">
                      {normalizedMedia ? (
                        <img src={normalizedMedia} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={48} /></div>
                      )}
                      <div className="absolute top-3 left-3 flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleSelectPost(post._id); }} className="bg-white/90 p-1 rounded text-slate-600 hover:text-indigo-600">
                          {isSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                        </button>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingPost(post); setShowModal(true); }} className="bg-white/90 p-1.5 rounded-lg text-slate-700 hover:text-indigo-600 shadow-sm"><Edit size={14} /></button>
                        <button onClick={() => handleDeleteClick(post)} className="bg-white/90 p-1.5 rounded-lg text-slate-700 hover:text-red-600 shadow-sm"><Trash2 size={14} /></button>
                      </div>
                      <div className="absolute bottom-3 left-3">
                        {getStatusBadge(post.status)}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3 h-10">{post.caption || 'No caption'}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-1">
                          {post.platform === 'instagram' ? <Instagram size={14} /> : <Facebook size={14} />}
                          {post.client?.name}
                        </div>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.message}
        </div>
      )}

      <CreatePostModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingPost(null); }}
        editingPost={editingPost}
        onSuccess={() => { fetchPosts(); setShowModal(false); setEditingPost(null); }}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        postTitle={postToDelete?.caption}
        isDeleting={!!deletingId}
      />
    </Layout>
  );
};

export default Posts;
