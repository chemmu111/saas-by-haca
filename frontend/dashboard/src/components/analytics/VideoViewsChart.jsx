import React, { useState } from 'react';
import { Play, TrendingUp } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber } from '../../utils/analyticsUtils';

const VideoViewsChart = ({ posts }) => {
    const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'cumulative'

    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Video Views Trend</h3>
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                    No video data available
                </div>
            </div>
        );
    }

    // Filter video posts (Reels and Videos)
    const videoPosts = posts.filter(post => {
        const type = post.media_type || post.postType;
        return type === 'REELS' || type === 'reel' || type === 'VIDEO' || type === 'video' ||
            (type === 'VIDEO' && post.permalink?.includes('/reel/'));
    });

    if (videoPosts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Video Views Trend</h3>
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                    No video posts found
                </div>
            </div>
        );
    }

    // Group by date and separate Reels vs Videos
    const dailyData = {};

    videoPosts.forEach(post => {
        const date = new Date(post.timestamp || post.createdAt).toISOString().split('T')[0];
        const type = post.media_type || post.postType;
        const isReel = type === 'REELS' || type === 'reel' || (type === 'VIDEO' && post.permalink?.includes('/reel/'));
        const views = post.metrics?.views || 0;

        if (!dailyData[date]) {
            dailyData[date] = { date, reelViews: 0, videoViews: 0, totalViews: 0 };
        }

        if (isReel) {
            dailyData[date].reelViews += views;
        } else {
            dailyData[date].videoViews += views;
        }
        dailyData[date].totalViews += views;
    });

    // Sort by date
    let chartData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Format dates
    chartData = chartData.map(item => ({
        ...item,
        dateFormatted: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));

    // Calculate cumulative if needed
    if (viewMode === 'cumulative') {
        let cumulativeReels = 0;
        let cumulativeVideos = 0;
        let cumulativeTotal = 0;

        chartData = chartData.map(item => {
            cumulativeReels += item.reelViews;
            cumulativeVideos += item.videoViews;
            cumulativeTotal += item.totalViews;

            return {
                ...item,
                reelViews: cumulativeReels,
                videoViews: cumulativeVideos,
                totalViews: cumulativeTotal
            };
        });
    }

    // Calculate totals
    const totalReelViews = videoPosts
        .filter(p => {
            const type = p.media_type || p.postType;
            return type === 'REELS' || type === 'reel' || (type === 'VIDEO' && p.permalink?.includes('/reel/'));
        })
        .reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    const totalVideoViews = videoPosts
        .filter(p => {
            const type = p.media_type || p.postType;
            return type === 'VIDEO' && !p.permalink?.includes('/reel/');
        })
        .reduce((sum, p) => sum + (p.metrics?.views || 0), 0);

    const totalViews = totalReelViews + totalVideoViews;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-50 rounded-lg">
                        <Play size={24} className="text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Video Views Trend</h3>
                        <p className="text-sm text-slate-500">{videoPosts.length} video posts</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'daily'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setViewMode('cumulative')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewMode === 'cumulative'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                    >
                        Cumulative
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border border-red-200">
                    <p className="text-xs text-slate-600 mb-1">Total Views</p>
                    <p className="text-2xl font-bold text-slate-900">{formatNumber(totalViews)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-slate-600 mb-1">Reel Views</p>
                    <p className="text-2xl font-bold text-purple-900">{formatNumber(totalReelViews)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-slate-600 mb-1">Video Views</p>
                    <p className="text-2xl font-bold text-blue-900">{formatNumber(totalVideoViews)}</p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {viewMode === 'daily' ? (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="dateFormatted"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="reelViews"
                                name="Reel Views"
                                stroke="#E1306C"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="videoViews"
                                name="Video Views"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="totalViews"
                                name="Total Views"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    ) : (
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorReels" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#E1306C" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorVideos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="dateFormatted"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="reelViews"
                                name="Reel Views"
                                stroke="#E1306C"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorReels)"
                            />
                            <Area
                                type="monotone"
                                dataKey="videoViews"
                                name="Video Views"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorVideos)"
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Insights */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-slate-600" />
                    <h4 className="text-sm font-semibold text-slate-700">Insights</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Avg Views per Reel:</span>
                        <span className="font-semibold text-slate-900">
                            {formatNumber(Math.round(totalReelViews / Math.max(videoPosts.filter(p => {
                                const type = p.media_type || p.postType;
                                return type === 'REELS' || type === 'reel';
                            }).length, 1)))}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Avg Views per Video:</span>
                        <span className="font-semibold text-slate-900">
                            {formatNumber(Math.round(totalVideoViews / Math.max(videoPosts.filter(p => {
                                const type = p.media_type || p.postType;
                                return type === 'VIDEO' && !p.permalink?.includes('/reel/');
                            }).length, 1)))}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoViewsChart;
