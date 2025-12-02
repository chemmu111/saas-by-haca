import React from 'react';
import { Heart, MessageCircle, Share2, Bookmark, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatNumber } from '../../utils/analyticsUtils';

const EngagementBreakdownCard = ({ analytics }) => {
    if (!analytics) return null;

    const totalLikes = analytics.totalLikes || 0;
    const totalComments = analytics.totalComments || 0;
    const totalShares = analytics.totalShares || 0;
    const totalSaves = analytics.totalSaves || 0;
    const totalEngagements = totalLikes + totalComments + totalShares + totalSaves;

    const engagementData = [
        {
            type: 'Likes',
            value: totalLikes,
            percentage: totalEngagements > 0 ? ((totalLikes / totalEngagements) * 100).toFixed(1) : 0,
            icon: Heart,
            color: '#EF4444'
        },
        {
            type: 'Comments',
            value: totalComments,
            percentage: totalEngagements > 0 ? ((totalComments / totalEngagements) * 100).toFixed(1) : 0,
            icon: MessageCircle,
            color: '#3B82F6'
        },
        {
            type: 'Shares',
            value: totalShares,
            percentage: totalEngagements > 0 ? ((totalShares / totalEngagements) * 100).toFixed(1) : 0,
            icon: Share2,
            color: '#10B981'
        },
        {
            type: 'Saves',
            value: totalSaves,
            percentage: totalEngagements > 0 ? ((totalSaves / totalEngagements) * 100).toFixed(1) : 0,
            icon: Bookmark,
            color: '#F59E0B'
        }
    ];

    const chartData = engagementData.map(item => ({
        name: item.type,
        value: item.value,
        color: item.color
    }));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Engagement Breakdown</h3>
                    <p className="text-sm text-slate-500">Detailed interaction metrics</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                    <BarChart3 size={24} className="text-indigo-600" />
                </div>
            </div>

            {/* Total Engagements */}
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Total Engagements</p>
                <h2 className="text-3xl font-bold text-slate-900">{formatNumber(totalEngagements)}</h2>
            </div>

            {/* Engagement Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {engagementData.map((item, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                                <item.icon size={18} style={{ color: item.color }} />
                            </div>
                            <span className="text-xs font-medium text-slate-600">{item.type}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <h4 className="text-2xl font-bold text-slate-900">{formatNumber(item.value)}</h4>
                            <span className="text-sm font-semibold text-slate-500">{item.percentage}%</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bar Chart */}
            {totalEngagements > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Distribution</h4>
                    <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
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
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                                />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EngagementBreakdownCard;
