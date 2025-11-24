import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout.jsx';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Filter,
  X,
  Star,
  Image as ImageIcon,
  Video,
  Film,
  Edit2,
  Trash2
} from 'lucide-react';

// DayCell Component
const DayCell = ({ day, posts, isToday, isRecommended, onClick }) => {
  const postCount = posts.length;
  const hasPosts = postCount > 0;
  
  // Color coding based on post count
  const getDayColor = () => {
    if (isToday) return 'border-blue-500 bg-blue-50';
    if (isRecommended) return 'border-yellow-400 bg-yellow-50';
    if (postCount === 0) return 'border-slate-200 bg-white';
    if (postCount <= 2) return 'border-purple-200 bg-purple-50';
    if (postCount <= 5) return 'border-purple-300 bg-purple-100';
    return 'border-purple-500 bg-purple-200';
  };

  return (
    <div
      className={`aspect-square border-2 rounded-xl p-2 transition-all hover:shadow-md cursor-pointer ${getDayColor()}`}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
            {day}
          </span>
          {isRecommended && (
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
          )}
        </div>
        {hasPosts && (
          <div className="mt-1 flex-1 overflow-hidden space-y-0.5">
            {posts.slice(0, 2).map((post, idx) => {
              const time = new Date(post.scheduledTime).toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
              });
              return (
                <div
                  key={post._id || idx}
                  className="text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded px-1.5 py-0.5 truncate"
                  title={`${time} - ${post.caption || post.content || 'Post'}`}
                >
                  {time}
                </div>
              );
            })}
            {postCount > 2 && (
              <div className="text-xs text-slate-600 font-semibold bg-slate-100 rounded px-1.5 py-0.5">
                +{postCount - 2} more
              </div>
            )}
          </div>
        )}
        {hasPosts && (
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {postCount} post{postCount !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

// DayPreviewModal Component
const DayPreviewModal = ({ isOpen, onClose, date, posts, onEditPost, onDeletePost }) => {
  if (!isOpen) return null;

  const dateStr = date ? new Date(date).toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : '';

  const getPostTypeIcon = (type) => {
    if (type === 'REEL' || type === 'REELS') return <Film size={16} />;
    if (type === 'VIDEO') return <Video size={16} />;
    return <ImageIcon size={16} />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{dateStr}</h3>
            <p className="text-sm text-slate-600 mt-1">{posts.length} scheduled post{posts.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-600 font-medium">No posts scheduled</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map(post => {
                const scheduledTime = new Date(post.scheduledTime);
                return (
                  <div
                    key={post._id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex-shrink-0">
                      {getPostTypeIcon(post.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 line-clamp-2">
                        {post.caption || post.content || 'Untitled Post'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-slate-500">
                          {post.client?.name || 'Unknown Client'}
                        </p>
                        {post.platform && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {post.platform}
                          </span>
                        )}
                        {post.type && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            {post.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-blue-600">
                        {scheduledTime.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => onEditPost(post)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit post"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => onDeletePost(post)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete post"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Calendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState(null);
  const [upcomingPosts, setUpcomingPosts] = useState([]);
  const [bestPostingTimes, setBestPostingTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    clientId: '',
    platform: '',
    status: 'scheduled'
  });
  const [clients, setClients] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [draggedPost, setDraggedPost] = useState(null);

  // Cache for calendar data
  const calendarCache = useMemo(() => new Map(), []);

  const getBackendUrl = useCallback(() => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }, []);

  // Fetch clients for filter
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/clients`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setClients(result.data || []);
          }
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, [getBackendUrl]);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async (month = null) => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Please login to view calendar');
        setLoading(false);
        return;
      }

      const backendUrl = getBackendUrl();
      const year = currentDate.getFullYear();
      const monthNum = currentDate.getMonth() + 1;
      const monthKey = `${year}-${String(monthNum).padStart(2, '0')}`;

      // Check cache
      const cacheKey = `${monthKey}-${filters.clientId}-${filters.platform}-${filters.status}`;
      if (calendarCache.has(cacheKey)) {
        const cached = calendarCache.get(cacheKey);
        // Use cache if less than 5 minutes old
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          setCalendarData(cached.data);
          setLoading(false);
          return;
        }
      }

      // Build query params
      const params = new URLSearchParams({
        month: monthKey
      });
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`${backendUrl}/api/posts/calendar?${params.toString()}`, {
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
        throw new Error(`Failed to fetch calendar: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setCalendarData(result.data);
        // Cache the data
        calendarCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
      } else {
        setError(result.error || 'Failed to fetch calendar data');
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setError(error.message || 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [currentDate, filters, getBackendUrl, calendarCache]);

  // Fetch upcoming posts
  const fetchUpcomingPosts = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const backendUrl = getBackendUrl();
      const params = new URLSearchParams({ limit: '10' });
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.platform) params.append('platform', filters.platform);

      const response = await fetch(`${backendUrl}/api/posts/upcoming?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUpcomingPosts(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching upcoming posts:', error);
    }
  }, [filters, getBackendUrl]);

  // Fetch best posting times
  const fetchBestPostingTimes = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const backendUrl = getBackendUrl();
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);

      const response = await fetch(`${backendUrl}/api/analytics/best-posting-times?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBestPostingTimes(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching best posting times:', error);
    }
  }, [filters, getBackendUrl]);

  // Fetch all data
  useEffect(() => {
    fetchCalendarData();
    fetchUpcomingPosts();
    fetchBestPostingTimes();
  }, [fetchCalendarData, fetchUpcomingPosts, fetchBestPostingTimes]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Get posts for a specific day
  const getPostsForDate = useCallback((day) => {
    if (!calendarData?.postsByDay) return [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    return calendarData.postsByDay[dateKey] || [];
  }, [calendarData, currentDate]);

  // Check if a day is recommended (best posting time)
  const isRecommendedDay = useCallback((day) => {
    if (!bestPostingTimes?.recommendedTimes) return false;
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    return bestPostingTimes.recommendedTimes.some(rec => 
      rec.day === dayOfWeek && rec.hour === hour
    );
  }, [bestPostingTimes, currentDate]);

  const handleDayClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDay(date);
    setShowDayModal(true);
  };

  const handleReschedule = async (postId, newDate) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/posts/${postId}/reschedule`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scheduledTime: newDate.toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Clear cache and refetch
          calendarCache.clear();
          fetchCalendarData();
          fetchUpcomingPosts();
        }
      }
    } catch (error) {
      console.error('Error rescheduling post:', error);
    }
  };

  const handleEditPost = (post) => {
    navigate(`/dashboard/posts?post=${post._id}`);
  };

  const handleDeletePost = async (post) => {
    if (!confirm(`Are you sure you want to delete this post?`)) return;

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/posts/${post._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Clear cache and refetch
        calendarCache.clear();
        fetchCalendarData();
        fetchUpcomingPosts();
        setShowDayModal(false);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    calendarCache.clear(); // Clear cache when changing months
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    calendarCache.clear(); // Clear cache when changing months
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    calendarCache.clear();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    calendarCache.clear(); // Clear cache when filters change
  };

  const stats = calendarData?.stats || {
    total: 0,
    scheduled: 0,
    published: 0,
    draft: 0,
    reels: 0,
    photos: 0,
    videos: 0
  };

  return (
    <Layout>
      <div className="p-4 lg:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <CalendarIcon className="text-white" size={24} />
                </div>
                Content Calendar
              </h1>
              <p className="text-slate-600">View and manage your scheduled posts</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/posts')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              Create Post
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-white rounded-xl shadow-lg border border-slate-200 p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-slate-500" />
                <span className="text-sm font-semibold text-slate-700">Filters:</span>
              </div>
              <select
                value={filters.clientId}
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Clients</option>
                {clients.map(client => (
                  <option key={client._id} value={client._id}>{client.name}</option>
                ))}
              </select>
              <select
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Platforms</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="both">Both</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="">All Status</option>
              </select>
            </div>
          </div>

          {/* Monthly Summary */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Total Posts</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Scheduled</p>
              <p className="text-2xl font-bold text-purple-600">{stats.scheduled}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Published</p>
              <p className="text-2xl font-bold text-green-600">{stats.published}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Drafts</p>
              <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Reels</p>
              <p className="text-2xl font-bold text-pink-600">{stats.reels}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Photos</p>
              <p className="text-2xl font-bold text-blue-600">{stats.photos}</p>
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-600 mb-1">Videos</p>
              <p className="text-2xl font-bold text-red-600">{stats.videos}</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
              <button
                onClick={() => fetchCalendarData()}
                className="ml-4 text-red-600 hover:text-red-800 underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Calendar Controls */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{monthName}</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {calendarData?.postsByDay ? Object.keys(calendarData.postsByDay).length : 0} days with scheduled posts
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToToday}
                    className="px-3 py-1.5 text-sm bg-white hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-blue-200"
                  >
                    Today
                  </button>
                  <button
                    onClick={previousMonth}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Next month"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-slate-500">Loading calendar...</p>
                </div>
              ) : (
                <>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-semibold text-slate-600 text-sm py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="aspect-square"></div>
                    ))}

                    {/* Days of the month */}
                    {Array.from({ length: daysInMonth }).map((_, index) => {
                      const day = index + 1;
                      const postsForDay = getPostsForDate(day);
                      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                      const isRecommended = isRecommendedDay(day);

                      return (
                        <DayCell
                          key={day}
                          day={day}
                          posts={postsForDay}
                          isToday={isToday}
                          isRecommended={isRecommended}
                          onClick={() => handleDayClick(day)}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Day Preview Modal */}
          <DayPreviewModal
            isOpen={showDayModal}
            onClose={() => setShowDayModal(false)}
            date={selectedDay}
            posts={selectedDay ? getPostsForDate(selectedDay.getDate()) : []}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
          />

          {/* Upcoming Posts List */}
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock size={20} className="text-blue-600" />
                Upcoming Posts
              </h3>
              {upcomingPosts.length > 0 && (
                <span className="text-sm text-slate-600 bg-white px-3 py-1 rounded-full">
                  {upcomingPosts.length} upcoming
                </span>
              )}
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2">Loading upcoming posts...</p>
                </div>
              ) : upcomingPosts.length > 0 ? (
                <div className="space-y-3">
                  {upcomingPosts.map(post => {
                    const scheduledDate = new Date(post.scheduledTime);
                    const isToday = scheduledDate.toDateString() === new Date().toDateString();
                    const isTomorrow = scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();
                    
                    return (
                      <div 
                        key={post._id} 
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                        onClick={() => handleEditPost(post)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 line-clamp-1">
                            {post.caption || post.content || 'Untitled Post'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500">
                              {post.client?.name || 'Unknown Client'}
                            </p>
                            {post.platform && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {post.platform}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-semibold text-blue-600">
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-slate-600 font-medium">No upcoming scheduled posts</p>
                  <p className="text-sm text-slate-500 mt-1">Schedule posts to see them here</p>
                  <button
                    onClick={() => navigate('/dashboard/posts')}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    <Plus size={16} className="inline mr-2" />
                    Create Your First Post
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;
