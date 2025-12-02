import React from 'react';
import { Film, Image as ImageIcon, Grid, Video, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { groupPostsByContentType, formatNumber, calculateEngagementRate } from '../../utils/analyticsUtils';

const ContentTypeEngagementCard = ({ posts }) => {
    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Content Type Performance</h3>
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No content data available
                </div>
            </div>
        );
    }

    const groupedPosts = groupPostsByContentType(posts);

    // Calculate metrics for each content type
    const contentTypeMetrics = Object.entries(groupedPosts).map(([type, typePosts]) => {
        let totalEngagement = 0;
        let totalReach = 0;
        let totalViews = 0;

        typePosts.forEach(post => {
            const metrics = post.metrics || {};
            totalEngagement += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saved || 0);
            totalReach += metrics.reach || 0;
            totalViews += metrics.views || 0;
        });

        const avgEngagement = typePosts.length > 0 ? totalEngagement / typePosts.length : 0;
        const engagementRate = calculateEngagementRate(totalEngagement, totalReach, 0);

        return {
            type,
            count: typePosts.length,
            totalEngagement,
            avgEngagement,
            engagementRate: parseFloat(engagementRate),
            totalReach,
            totalViews
        };
    }).filter(item => item.count > 0);

    // Sort by average engagement
    contentTypeMetrics.sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Best performing type
    const bestType = contentTypeMetrics.length > 0 ? contentTypeMetrics[0] : null;

    // Pie chart data
    const pieData = contentTypeMetrics.map(item => ({
        name: item.type,
        value: item.count
    }));

    const colors = {
        REELS: '#E1306C',
        IMAGE: '#405DE6',
        CAROUSEL_ALBUM: '#F56040',
        VIDEO: '#5851DB'
    };

    const icons = {
        REELS: Film,
        IMAGE: ImageIcon,
        CAROUSEL_ALBUM: Grid,
        VIDEO: Video
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Content Type Performance</h3>
                    <p className="text-sm text-slate-500">Engagement by content type</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                    <Grid size={24} className="text-purple-600" />
                </div>
            </div>

            {/* Best Performing Type */}
            {bestType && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600 rounded-lg">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Best Performing Type</p>
                            <p className="text-xl font-bold text-slate-900">{bestType.type}</p>
                            <p className="text-xs text-slate-500">
                                {Math.round(bestType.avgEngagement)} avg engagement • {bestType.engagementRate}% rate
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Type Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {contentTypeMetrics.map((item, index) => {
                    const Icon = icons[item.type] || Grid;
                    const color = colors[item.type] || '#8B5CF6';

                    return (
                        <div
                            key={index}
                            className="border-2 rounded-lg p-4 hover:shadow-md transition-shadow"
                            style={{ borderColor: `${color}40` }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                                    <Icon size={18} style={{ color }} />
                                </div>
                                <span className="text-sm font-semibold text-slate-900">{item.type}</span>
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-slate-600">Posts</p>
                                    <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600">Avg Engagement</p>
                                    <p className="text-lg font-semibold" style={{ color }}>
                                        {formatNumber(Math.round(item.avgEngagement))}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-600">Engagement Rate</p>
                                    <p className="text-sm font-semibold text-slate-700">{item.engagementRate}%</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Distribution Pie Chart */}
            {pieData.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Content Distribution</h4>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={colors[entry.name] || '#8B5CF6'} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Detailed Metrics */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Detailed Metrics</h4>
                <div className="space-y-2">
                    {contentTypeMetrics.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">{item.type} Total Engagement:</span>
                            <span className="font-semibold text-slate-900">{formatNumber(item.totalEngagement)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContentTypeEngagementCard;
