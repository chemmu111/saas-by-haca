import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTitle from './components/PageTitle';
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

// DayCell Component - Modernized & Compact
const DayCell = ({ day, posts, isToday, isRecommended, onClick }) => {
  const postCount = posts.length;
  const hasPosts = postCount > 0;

  // Get post type info with color coding
  const getPostTypeInfo = (type) => {
    if (type === 'REEL' || type === 'REELS') return { icon: '🎥', color: 'bg-purple-500', label: 'Reel' };
    if (type === 'VIDEO') return { icon: '🎬', color: 'bg-red-500', label: 'Video' };
    return { icon: '📸', color: 'bg-blue-500', label: 'Image' };
  };

  // Compact color coding
  const getDayClasses = () => {
    if (isToday) return 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200';
    if (isRecommended) return 'border-yellow-300 bg-yellow-50/30';
    if (postCount === 0) return 'border-slate-200/60 bg-white hover:bg-slate-50/50';
    if (postCount <= 2) return 'border-purple-200/60 bg-purple-50/30';
    if (postCount <= 5) return 'border-purple-300/60 bg-purple-50/50';
    return 'border-purple-400/60 bg-purple-100/50';
  };

  return (
    <div
      className={`relative h-14 sm:h-20 lg:h-24 border rounded-lg p-1 transition-all duration-200 hover:shadow-md hover:scale-[1.02] cursor-pointer group ${getDayClasses()}`}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Date with mini indicator */}
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] sm:text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
            {day}
          </span>
          <div className="flex items-center gap-0.5">
            {isRecommended && (
              <Star size={8} className="text-yellow-500 fill-yellow-500 sm:size-[10px]" />
            )}
            {hasPosts && (
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 sm:hidden"></div>
            )}
          </div>
        </div>

        {/* Event blocks - compact, hidden on very small screens */}
        {hasPosts && (
          <div className="hidden sm:block flex-1 overflow-hidden space-y-0.5">
            {posts.slice(0, 3).map((post, idx) => {
              const time = new Date(post.scheduledTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const typeInfo = getPostTypeInfo(post.type);

              return (
                <div
                  key={post._id || idx}
                  className={`text-[9px] lg:text-[10px] ${typeInfo.color} text-white rounded px-1 py-0.5 truncate flex items-center gap-0.5 hover:shadow-sm transition-shadow`}
                  title={`${typeInfo.icon} ${typeInfo.label} - ${time}`}
                >
                  <span className="text-[8px] lg:text-[9px]">{typeInfo.icon}</span>
                  <span className="flex-1 truncate">{time}</span>
                </div>
              );
            })}
            {postCount > 3 && (
              <div className="text-[8px] lg:text-[9px] text-slate-600 font-medium bg-slate-100/80 rounded px-1 py-0.5 text-center">
                +{postCount - 3}
              </div>
            )}
          </div>
        )}

        {/* Mobile indicators (dots) */}
        {hasPosts && (
          <div className="sm:hidden flex flex-wrap gap-0.5 mt-auto">
            {posts.slice(0, 4).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-blue-500"></div>
            ))}
          </div>
        )}
      </div>

      {/* Hover tooltip - only on desktop */}
      {hasPosts && (
        <div className="hidden lg:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {postCount} post{postCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

// DayPreviewModal Component - Modernized
const DayPreviewModal = ({ isOpen, onClose, date, posts, onEditPost, onDeletePost }) => {
  if (!isOpen) return null;

  const dateStr = date ? new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : '';

  const getPostTypeIcon = (type) => {
    if (type === 'REEL' || type === 'REELS') return <Film size={16} className="text-purple-600" />;
    if (type === 'VIDEO') return <Video size={16} className="text-red-600" />;
    return <ImageIcon size={16} className="text-blue-600" />;
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/60 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{dateStr}</h3>
            <p className="text-xs text-slate-600 mt-0.5">{posts.length} scheduled post{posts.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/80 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="mx-auto text-slate-300 mb-2" size={40} />
              <p className="text-slate-600 text-sm font-medium">No posts scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => {
                const scheduledTime = new Date(post.scheduledTime);
                const typeInfo = post.type === 'REEL' || post.type === 'REELS' ? 'purple' : post.type === 'VIDEO' ? 'red' : 'blue';

                return (
                  <div
                    key={post._id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                  >
                    <div className="flex-shrink-0">
                      {getPostTypeIcon(post.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 line-clamp-2">
                        {post.caption || post.content || 'Untitled Post'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-500">
                          {post.client?.name || 'Unknown Client'}
                        </p>
                        {post.platform && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {post.platform}
                          </span>
                        )}
                        {post.type && (
                          <span className={`text-[10px] px-1.5 py-0.5 bg-${typeInfo}-100 text-${typeInfo}-700 rounded-full`}>
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
                      <div className="flex gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditPost(post)}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Edit post"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDeletePost(post)}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Delete post"
                        >
                          <Trash2 size={14} />
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
  const [monthTransition, setMonthTransition] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    clientId: '',
    platform: '',
    status: '' // Default to show all (scheduled + published)
  });
  const [clients, setClients] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Cache for calendar data
  const calendarCache = useMemo(() => new Map(), []);

  const getBackendUrl = useCallback(() => {
    // 1. Force correct backend for target domain
    if (window.location.hostname.includes('socialhac.com')) {
      return 'https://haca-social-x-backend.onrender.com';
    }

    // 2. Development mode
    if (window.location.hostname === 'localhost' || window.location.port === '3000' || window.location.port === '5173') {
      const savedPort = localStorage.getItem('backend_port') || '5000';
      return `http://localhost:${savedPort}`;
    }

    // 3. Fallback
    return 'https://haca-social-x-backend.onrender.com';
  }, []);

  // Fetch clients for filter
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        const backendUrl = getBackendUrl();
        const url = backendUrl ? `${backendUrl}/api/clients` : '/api/clients';

        const response = await fetch(url, {
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

      const url = backendUrl ? `${backendUrl}/api/posts/calendar?${params.toString()}` : `/api/posts/calendar?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
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
    // Format as YYYY-MM-DD using local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${dayStr}`;
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
    setMonthTransition(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
      calendarCache.clear();
      setMonthTransition(false);
    }, 150);
  };

  const nextMonth = () => {
    setMonthTransition(true);
    setTimeout(() => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
      calendarCache.clear();
      setMonthTransition(false);
    }, 150);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    calendarCache.clear();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    calendarCache.clear();
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
      <PageTitle title="Scheduler" />
      <div className="p-2 lg:p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header - Compact */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <CalendarIcon className="text-white" size={20} />
                </div>
                Content Calendar
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">View and manage your scheduled posts</p>
            </div>
            <button
              onClick={() => navigate('/dashboard/posts')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus size={16} />
              Create Post
            </button>
          </div>

          {/* Filters - Compact with mobile dropdown */}
          <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200/60 p-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                <Filter size={14} />
                Filters
              </button>
              <div className={`${showFilters ? 'flex' : 'hidden'} lg:flex items-center gap-2 flex-wrap w-full lg:w-auto`}>
                <div className="flex items-center gap-1.5">
                  <Filter size={14} className="text-slate-500 hidden lg:block" />
                  <span className="text-xs font-semibold text-slate-700 hidden lg:block">Filters:</span>
                </div>
                <select
                  value={filters.clientId}
                  onChange={(e) => handleFilterChange('clientId', e.target.value)}
                  className="px-2 py-1 border border-slate-300/60 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                >
                  <option value="">All Clients</option>
                  {clients.map(client => (
                    <option key={client._id} value={client._id}>{client.name}</option>
                  ))}
                </select>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className="px-2 py-1 border border-slate-300/60 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                >
                  <option value="">All Platforms</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="both">Both</option>
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-2 py-1 border border-slate-300/60 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="">All Status</option>
                </select>
              </div>
            </div>
          </div>



          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50/80 border border-red-200/60 rounded-lg text-red-700 text-sm">
              {error}
              <button
                onClick={() => fetchCalendarData()}
                className="ml-3 text-red-600 hover:text-red-800 underline text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {/* Calendar - Compact & Modern */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/60 overflow-hidden">
            <div className="p-3 bg-gradient-to-r from-slate-50/80 to-blue-50/50 border-b border-slate-200/60">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {calendarData?.postsByDay ? Object.keys(calendarData.postsByDay).length : 0} days with scheduled posts
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={goToToday}
                    className="px-2 py-1 text-xs bg-white hover:bg-blue-50 text-blue-600 rounded-md transition-colors border border-blue-200/60"
                  >
                    Today
                  </button>
                  <button
                    onClick={previousMonth}
                    className="p-1.5 hover:bg-white/80 rounded-md transition-colors"
                    title="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-white/80 rounded-md transition-colors"
                    title="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-slate-500 text-xs">Loading calendar...</p>
                </div>
              ) : (
                <div className={`transition-opacity duration-150 ${monthTransition ? 'opacity-50' : 'opacity-100'}`}>
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center font-semibold text-slate-600 text-[10px] py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month starts */}
                    {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                      <div key={`empty-${index}`} className="h-14 sm:h-20 lg:h-24 bg-slate-50/30 rounded-lg"></div>
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
                </div>
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

          {/* Upcoming Posts List - Compact */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-slate-200/60 overflow-hidden">
            <div className="p-3 bg-gradient-to-r from-slate-50/80 to-blue-50/50 border-b border-slate-200/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Clock size={16} className="text-blue-600" />
                Upcoming Posts
              </h3>
              {upcomingPosts.length > 0 && (
                <span className="text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded-full">
                  {upcomingPosts.length} upcoming
                </span>
              )}
            </div>
            <div className="p-3">
              {loading ? (
                <div className="text-center py-8 text-slate-500">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-xs">Loading upcoming posts...</p>
                </div>
              ) : upcomingPosts.length > 0 ? (
                <div className="space-y-2">
                  {upcomingPosts.map(post => {
                    const scheduledDate = new Date(post.scheduledTime);
                    const isToday = scheduledDate.toDateString() === new Date().toDateString();
                    const isTomorrow = scheduledDate.toDateString() === new Date(Date.now() + 86400000).toDateString();

                    return (
                      <div
                        key={post._id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200/60 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer"
                        onClick={() => handleEditPost(post)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-900 line-clamp-1">
                            {post.caption || post.content || 'Untitled Post'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-slate-500">
                              {post.client?.name || 'Unknown Client'}
                            </p>
                            {post.platform && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {post.platform}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-blue-600">
                            {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="mx-auto text-slate-300 mb-2" size={40} />
                  <p className="text-slate-600 font-medium text-sm">No upcoming scheduled posts</p>
                  <p className="text-xs text-slate-500 mt-1">Schedule posts to see them here</p>
                  <button
                    onClick={() => navigate('/dashboard/posts')}
                    className="mt-3 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
                  >
                    <Plus size={14} className="inline mr-1" />
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
