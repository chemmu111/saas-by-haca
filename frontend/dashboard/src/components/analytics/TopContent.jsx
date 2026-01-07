import React, { useState } from 'react';
import { Eye, Heart, MessageSquare, Share2, ExternalLink } from 'lucide-react';

const TopContent = ({ posts }) => {
    const [sortMetric, setSortMetric] = useState('engagement');

    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Content</h3>
                <div className="text-center py-8 text-slate-400">No posts available</div>
            </div>
        );
    }

    // Sort posts based on selected metric
    const sortedPosts = [...posts].sort((a, b) => {
        const metricA = a.metrics?.[sortMetric] || 0;
        const metricB = b.metrics?.[sortMetric] || 0;
        return metricB - metricA;
    }).slice(0, 5); // Show top 5

    const metrics = [
        { id: 'engagement', label: 'Engagement', icon: Heart },
        { id: 'views', label: 'Views', icon: Eye },
        { id: 'comments', label: 'Comments', icon: MessageSquare },
        { id: 'shares', label: 'Shares', icon: Share2 },
    ];

    const API_URL = (import.meta.env.VITE_API_URL || 'https://haca-social-x-backend.onrender.com').replace(/\/$/, '');

    const getMediaUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        if (url.startsWith('/uploads')) return `${API_URL}${url}`;
        return url;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Top Content</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {metrics.map(metric => (
                        <button
                            key={metric.id}
                            onClick={() => setSortMetric(metric.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${sortMetric === metric.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <metric.icon size={12} />
                            {metric.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {sortedPosts.map((post, index) => (
                    <div key={post.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                            {post.thumbnail_url ? (
                                <img src={getMediaUrl(post.thumbnail_url)} alt="Post thumbnail" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Eye size={20} />
                                </div>
                            )}
                            <div className="absolute top-0 right-0 bg-black bg-opacity-60 text-white text-[10px] px-1 rounded-bl">
                                #{index + 1}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 line-clamp-2 mb-1 font-medium">
                                {post.caption || 'No caption'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Heart size={12} /> {post.metrics?.likes || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MessageSquare size={12} /> {post.metrics?.comments || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Eye size={12} /> {post.metrics?.views || 0}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {post.permalink && (
                            <a
                                href={post.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TopContent;
