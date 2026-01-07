import React from 'react';
import { Hash, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeHashtags, formatNumber } from '../../utils/analyticsUtils';

const TopHashtagsCard = ({ posts }) => {
    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Hashtags</h3>
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No hashtag data available
                </div>
            </div>
        );
    }

    const hashtagStats = analyzeHashtags(posts);
    const topHashtags = hashtagStats.slice(0, 10);

    if (topHashtags.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Hashtags</h3>
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No hashtags found in posts
                </div>
            </div>
        );
    }

    // Prepare chart data
    const chartData = topHashtags.slice(0, 5).map(item => ({
        hashtag: item.tag.replace('#', ''),
        engagement: item.avgEngagement
    }));

    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Top Hashtags</h3>
                    <p className="text-sm text-slate-500">Best performing hashtags</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                    <Hash size={24} className="text-indigo-600" />
                </div>
            </div>

            {/* Top 5 Chart */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Top 5 by Engagement</h4>
                <div className="h-[200px] w-full" style={{ minHeight: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                            <YAxis
                                type="category"
                                dataKey="hashtag"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                width={80}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px',
                                    border: 'none',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar dataKey="engagement" radius={[0, 8, 8, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Hashtag List */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">All Top Hashtags</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {topHashtags.map((item, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{item.tag}</p>
                                    <p className="text-xs text-slate-500">{item.count} posts</p>
                                </div>
                            </div>
                            <div className="text-right ml-3">
                                <div className="flex items-center gap-1 text-emerald-600">
                                    <TrendingUp size={14} />
                                    <span className="text-sm font-bold">{formatNumber(Math.round(item.avgEngagement))}</span>
                                </div>
                                <p className="text-xs text-slate-500">avg engagement</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-900">{hashtagStats.length}</p>
                        <p className="text-xs text-slate-600">Unique Hashtags</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-900">
                            {topHashtags.length > 0 ? formatNumber(Math.round(topHashtags[0].avgEngagement)) : 0}
                        </p>
                        <p className="text-xs text-slate-600">Best Performance</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopHashtagsCard;
