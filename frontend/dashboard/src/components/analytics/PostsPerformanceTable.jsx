import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Download } from 'lucide-react';
import { formatNumber, getPostEngagement } from '../../utils/analyticsUtils';

const PostsPerformanceTable = ({ posts }) => {
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterType, setFilterType] = useState('all');
    const postsPerPage = 10;

    // Filter posts by type
    const filteredPosts = useMemo(() => {
        if (!posts || posts.length === 0) return [];
        if (filterType === 'all') return posts;
        return posts.filter(post => {
            const type = post.media_type || post.postType;
            if (filterType === 'REELS') return type === 'REELS' || type === 'reel' || (type === 'VIDEO' && post.permalink?.includes('/reel/'));
            if (filterType === 'IMAGE') return type === 'IMAGE' || type === 'post';
            if (filterType === 'CAROUSEL_ALBUM') return type === 'CAROUSEL_ALBUM' || type === 'carousel';
            if (filterType === 'VIDEO') return type === 'VIDEO' && !post.permalink?.includes('/reel/');
            return true;
        });
    }, [posts, filterType]);

    // Sort posts
    const sortedPosts = useMemo(() => {
        return [...filteredPosts].sort((a, b) => {
            let aValue, bValue;

            switch (sortField) {
                case 'timestamp':
                    aValue = new Date(a.timestamp || a.createdAt);
                    bValue = new Date(b.timestamp || b.createdAt);
                    break;
                case 'engagement':
                    aValue = getPostEngagement(a).total;
                    bValue = getPostEngagement(b).total;
                    break;
                case 'reach':
                    aValue = a.metrics?.reach || 0;
                    bValue = b.metrics?.reach || 0;
                    break;
                case 'views':
                    aValue = a.metrics?.views || 0;
                    bValue = b.metrics?.views || 0;
                    break;
                case 'likes':
                    aValue = a.metrics?.likes || 0;
                    bValue = b.metrics?.likes || 0;
                    break;
                default:
                    return 0;
            }

            if (sortDirection === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
    }, [filteredPosts, sortField, sortDirection]);

    // Paginate
    const totalPages = Math.ceil(sortedPosts.length / postsPerPage);
    const paginatedPosts = sortedPosts.slice(
        (currentPage - 1) * postsPerPage,
        currentPage * postsPerPage
    );

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="text-slate-400" />;
        return sortDirection === 'asc' ?
            <ArrowUp size={14} className="text-blue-600" /> :
            <ArrowDown size={14} className="text-blue-600" />;
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Date', 'Type', 'Caption', 'Likes', 'Comments', 'Shares', 'Saves', 'Views', 'Reach', 'Total Engagement'];
        const rows = sortedPosts.map(post => {
            const engagement = getPostEngagement(post);
            return [
                new Date(post.timestamp || post.createdAt).toLocaleDateString(),
                post.media_type || post.postType || 'N/A',
                (post.caption || '').replace(/,/g, ';').substring(0, 100),
                engagement.likes,
                engagement.comments,
                engagement.shares,
                engagement.saves,
                engagement.views,
                engagement.reach,
                engagement.total
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `posts_performance_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    // Empty state - check after all hooks
    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Posts Performance</h3>
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No posts data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Posts Performance</h3>
                    <p className="text-sm text-slate-500">{sortedPosts.length} posts</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    <Download size={16} />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {['all', 'REELS', 'IMAGE', 'CAROUSEL_ALBUM', 'VIDEO'].map(type => (
                    <button
                        key={type}
                        onClick={() => {
                            setFilterType(type);
                            setCurrentPage(1);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === type
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        {type === 'all' ? 'All Posts' : type.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-2 text-xs font-semibold text-slate-600">Post</th>
                            <th
                                className="text-left py-3 px-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('timestamp')}
                            >
                                <div className="flex items-center gap-1">
                                    Date <SortIcon field="timestamp" />
                                </div>
                            </th>
                            <th
                                className="text-right py-3 px-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('likes')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Likes <SortIcon field="likes" />
                                </div>
                            </th>
                            <th
                                className="text-right py-3 px-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('engagement')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Engagement <SortIcon field="engagement" />
                                </div>
                            </th>
                            <th
                                className="text-right py-3 px-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('reach')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Reach <SortIcon field="reach" />
                                </div>
                            </th>
                            <th
                                className="text-right py-3 px-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-blue-600"
                                onClick={() => handleSort('views')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Views <SortIcon field="views" />
                                </div>
                            </th>
                            <th className="text-center py-3 px-2 text-xs font-semibold text-slate-600">Link</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedPosts.map((post, index) => {
                            const engagement = getPostEngagement(post);
                            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                            const thumbnailUrl = post.thumbnail_url?.startsWith('http')
                                ? post.thumbnail_url
                                : post.thumbnail_url
                                    ? `${API_URL}${post.thumbnail_url}`
                                    : null;

                            return (
                                <tr key={post.id || index} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-2">
                                        <div className="flex items-center gap-3">
                                            {thumbnailUrl && (
                                                <img
                                                    src={thumbnailUrl}
                                                    alt="Post thumbnail"
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                    onError={(e) => e.target.style.display = 'none'}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                                                    {post.caption?.substring(0, 50) || 'No caption'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {post.media_type || post.postType || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-slate-600">
                                        {new Date(post.timestamp || post.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-2 text-sm font-semibold text-slate-900 text-right">
                                        {formatNumber(engagement.likes)}
                                    </td>
                                    <td className="py-3 px-2 text-sm font-semibold text-slate-900 text-right">
                                        {formatNumber(engagement.total)}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-slate-600 text-right">
                                        {formatNumber(engagement.reach)}
                                    </td>
                                    <td className="py-3 px-2 text-sm text-slate-600 text-right">
                                        {formatNumber(engagement.views)}
                                    </td>
                                    <td className="py-3 px-2 text-center">
                                        {post.permalink && (
                                            <a
                                                href={post.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                        Showing {((currentPage - 1) * postsPerPage) + 1} to {Math.min(currentPage * postsPerPage, sortedPosts.length)} of {sortedPosts.length}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PostsPerformanceTable;
