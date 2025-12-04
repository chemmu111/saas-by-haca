import React from 'react';
import { Users, Eye, Activity, Heart, ArrowUp, ArrowDown, Calendar, MessageSquare, Share2, Bookmark } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const LiveReportPreview = ({ analytics, client, dateRange }) => {
    if (!analytics) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                <Activity size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a client and date range to generate preview</p>
            </div>
        );
    }

    const { startDate, endDate } = dateRange;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Helper to format numbers
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num || 0;
    };

    // Prepare chart data
    const engagementData = (analytics.engagementTrend || []).map(item => ({
        date: formatDate(item.date),
        engagements: item.engagements || 0,
        reach: item.reach || 0
    }));

    const audienceData = (analytics.followersTrend || []).map(item => ({
        date: formatDate(item.date),
        followers: item.followers || 0
    }));

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Report Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                    {client?.profilePictureUrl ? (
                        <img src={client.profilePictureUrl} alt={client.name} className="w-16 h-16 rounded-full border-2 border-slate-700" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                            {client?.name?.charAt(0) || 'C'}
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold text-white">{client?.name || 'Client Report'}</h2>
                        <p className="text-slate-400 flex items-center gap-2">
                            <Calendar size={14} />
                            {startDate ? formatDate(startDate) : 'Start'} - {endDate ? formatDate(endDate) : 'End'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Generated on</div>
                    <div className="text-slate-300 font-medium">{new Date().toLocaleDateString()}</div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Reach"
                    value={formatNumber(analytics.totalReach)}
                    icon={Users}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <MetricCard
                    title="Impressions"
                    value={formatNumber(analytics.totalImpressions || analytics.totalViews)}
                    icon={Eye}
                    color="text-purple-400"
                    bg="bg-purple-500/10"
                />
                <MetricCard
                    title="Engagement Rate"
                    value={`${analytics.engagementRate}%`}
                    icon={Activity}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <MetricCard
                    title="Interactions"
                    value={formatNumber(analytics.totalInteractions)}
                    icon={Heart}
                    color="text-rose-400"
                    bg="bg-rose-500/10"
                />
            </div>

            {/* Engagement Breakdown */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Likes"
                    value={formatNumber(analytics.totalLikes)}
                    icon={Heart}
                    color="text-rose-400"
                    bg="bg-rose-500/10"
                />
                <MetricCard
                    title="Comments"
                    value={formatNumber(analytics.totalComments)}
                    icon={MessageSquare}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                />
                <MetricCard
                    title="Shares"
                    value={formatNumber(analytics.totalShares)}
                    icon={Share2}
                    color="text-emerald-400"
                    bg="bg-emerald-500/10"
                />
                <MetricCard
                    title="Saves"
                    value={formatNumber(analytics.totalSaves)}
                    icon={Bookmark}
                    color="text-amber-400"
                    bg="bg-amber-500/10"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Engagement vs Reach */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Engagement vs Reach</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={engagementData}>
                                <defs>
                                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                />
                                <Area type="monotone" dataKey="reach" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorReach)" name="Reach" />
                                <Area type="monotone" dataKey="engagements" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorEngage)" name="Engagement" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Audience Growth */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Audience Growth</h3>
                    <div className="h-[300px]">
                        {audienceData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={audienceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Line type="monotone" dataKey="followers" stroke="#10b981" strokeWidth={2} dot={false} name="Followers" />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Users size={32} className="mb-2 opacity-50" />
                                <p>No growth data available for this period</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Breakdown & Profile Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Content Breakdown */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">Content Breakdown</h3>
                    <div className="h-[300px] flex items-center justify-center">
                        {analytics.postsByType && Object.values(analytics.postsByType).some(v => v > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Images', value: analytics.postsByType.IMAGE || 0, color: '#3b82f6' },
                                            { name: 'Videos', value: analytics.postsByType.VIDEO || 0, color: '#8b5cf6' },
                                            { name: 'Carousels', value: analytics.postsByType.CAROUSEL_ALBUM || 0, color: '#10b981' },
                                            { name: 'Reels', value: analytics.postsByType.REELS || 0, color: '#f43f5e' }
                                        ].filter(item => item.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {[
                                            { name: 'Images', value: analytics.postsByType.IMAGE || 0, color: '#3b82f6' },
                                            { name: 'Videos', value: analytics.postsByType.VIDEO || 0, color: '#8b5cf6' },
                                            { name: 'Carousels', value: analytics.postsByType.CAROUSEL_ALBUM || 0, color: '#10b981' },
                                            { name: 'Reels', value: analytics.postsByType.REELS || 0, color: '#f43f5e' }
                                        ].filter(item => item.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value, entry) => <span className="text-slate-300 font-medium ml-1">{value} <span className="text-slate-500">({entry.payload.value})</span></span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-slate-500 flex flex-col items-center">
                                <Activity size={32} className="mb-2 opacity-50" />
                                <p>No content type data available</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Video Performance */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6">Video Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <Eye size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Total Video Views</p>
                            <h4 className="text-2xl font-bold text-white">{formatNumber(analytics.totalViews || 0)}</h4>
                        </div>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Avg Watch Time</p>
                            <h4 className="text-2xl font-bold text-white">{(analytics.avgWatchTime || 0).toFixed(1)}s</h4>
                        </div>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-xl p-5 flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Video Reach</p>
                            <h4 className="text-2xl font-bold text-white">{formatNumber(analytics.totalReach || 0)}</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Content Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white">Top Performing Content</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Content</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Reach</th>
                                <th className="px-6 py-4">Engagement</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {((analytics.detailedPosts || []).sort((a, b) => (b.metrics?.engagement || 0) - (a.metrics?.engagement || 0)).slice(0, 5)).map((post, i) => (
                                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                                                {post.thumbnail_url ? (
                                                    <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                        <Activity size={16} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-sm text-slate-200 truncate max-w-[200px]">{post.caption || 'No caption'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400 capitalize">{post.media_type || 'Post'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">{formatNumber(post.metrics?.reach || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-300 font-medium">{formatNumber(post.metrics?.engagement || 0)}</td>
                                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(post.timestamp)}</td>
                                </tr>
                            ))}
                            {(!analytics.detailedPosts || analytics.detailedPosts.length === 0) && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No posts found for this period</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, icon: Icon, color, bg }) => (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">{title}</span>
            <div className={`p-2 rounded-lg ${bg} ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
    </div>
);

export default LiveReportPreview;
