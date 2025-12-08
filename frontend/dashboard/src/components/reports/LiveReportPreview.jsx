import React from 'react';
import {
    Users, Eye, Activity, Heart, ArrowUp, ArrowDown, Calendar,
    MessageSquare, Share2, Bookmark, Video, Image, Layers,
    MousePointer, Phone, Mail, MapPin, Zap, Clock
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, BarChart, Bar
} from 'recharts';

const LiveReportPreview = ({ analytics, client, dateRange }) => {
    if (!analytics || !analytics.executiveSummary) {
        return (
            <div className="flex flex-col items-center justify-center h-[600px] text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
                <Activity size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a client and date range to generate preview</p>
            </div>
        );
    }

    const { startDate, endDate } = dateRange;
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num || 0;
    };

    const {
        executiveSummary, audienceGrowth, reachImpressions, engagementBreakdown,
        contentPerformance, videoPerformance, detailedPosts, traffic, insights
    } = analytics;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 p-4">
            {/* Header */}
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

            {/* 1. EXECUTIVE SUMMARY */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={24} /> Executive Summary
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard title="Total Followers" value={formatNumber(executiveSummary.totalFollowers)} sub={`+${executiveSummary.newFollowers} new`} icon={Users} color="text-blue-400" bg="bg-blue-500/10" />
                    <MetricCard title="Total Reach" value={formatNumber(executiveSummary.totalReach)} sub="Unique accounts" icon={Users} color="text-purple-400" bg="bg-purple-500/10" />
                    <MetricCard title="Engagement Rate" value={`${executiveSummary.engagementRate}%`} sub="Avg per impression" icon={Activity} color="text-emerald-400" bg="bg-emerald-500/10" />
                    <MetricCard title="Total Engagements" value={formatNumber(executiveSummary.totalEngagements)} sub="Likes, comments, etc." icon={Heart} color="text-rose-400" bg="bg-rose-500/10" />
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Top Highlights</h4>
                    <ul className="space-y-2">
                        {executiveSummary.highlights.map((h, i) => (
                            <li key={i} className="flex items-center gap-2 text-slate-200">
                                <span className="w-2 h-2 rounded-full bg-yellow-400" /> {h}
                            </li>
                        ))}
                        {executiveSummary.highlights.length === 0 && <li className="text-slate-500">No significant highlights for this period.</li>}
                    </ul>
                </div>
            </section>

            {/* 2. AUDIENCE & GROWTH */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="text-blue-400" size={24} /> Audience & Growth
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Follower Growth</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={audienceGrowth.chartData}>
                                    <defs>
                                        <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                                    <Area type="monotone" dataKey="followers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFollowers)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">Net Growth</h4>
                            <div className="text-3xl font-bold text-white flex items-center gap-2">
                                {audienceGrowth.netGrowth > 0 ? '+' : ''}{audienceGrowth.netGrowth}
                                {audienceGrowth.netGrowth > 0 ? <ArrowUp size={20} className="text-emerald-400" /> : <ArrowDown size={20} className="text-rose-400" />}
                            </div>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <h4 className="text-sm font-semibold text-slate-400 mb-2">Platform Split</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">Instagram</span>
                                    <span className="text-white font-medium">{formatNumber(audienceGrowth.platformSplit.instagram)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-300">Facebook</span>
                                    <span className="text-white font-medium">{formatNumber(audienceGrowth.platformSplit.facebook)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. REACH & IMPRESSIONS */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Eye className="text-purple-400" size={24} /> Reach & Impressions
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Reach & Impressions Trend</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={reachImpressions.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                                    <YAxis stroke="#64748b" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                    <Line type="monotone" dataKey="reach" stroke="#10b981" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="impressions" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Reach Source Breakdown</h4>
                        <div style={{ width: '100%', height: 250 }}>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Reels', value: reachImpressions.breakdown.reels, color: '#f43f5e' },
                                        { name: 'Profile Visits', value: reachImpressions.breakdown.profileVisits, color: '#3b82f6' },
                                        { name: 'Other', value: reachImpressions.totalReach - reachImpressions.breakdown.reels - reachImpressions.breakdown.profileVisits, color: '#64748b' }
                                    ].filter(d => d.value > 0)} cx="50%" cy="50%" labelLine={false} label outerRadius={80} fill="#8884d8" dataKey="value">
                                        {[
                                            { name: 'Reels', value: reachImpressions.breakdown.reels, color: '#f43f5e' },
                                            { name: 'Profile Visits', value: reachImpressions.breakdown.profileVisits, color: '#3b82f6' },
                                            { name: 'Other', value: reachImpressions.totalReach - reachImpressions.breakdown.reels - reachImpressions.breakdown.profileVisits, color: '#64748b' }
                                        ].filter(d => d.value > 0).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                                    <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. ENGAGEMENT BREAKDOWN */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="text-rose-400" size={24} /> Engagement Breakdown
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <MetricCard title="Likes" value={formatNumber(engagementBreakdown.breakdown.likes)} icon={Heart} color="text-rose-400" bg="bg-rose-500/10" />
                    <MetricCard title="Comments" value={formatNumber(engagementBreakdown.breakdown.comments)} icon={MessageSquare} color="text-blue-400" bg="bg-blue-500/10" />
                    <MetricCard title="Shares" value={formatNumber(engagementBreakdown.breakdown.shares)} icon={Share2} color="text-emerald-400" bg="bg-emerald-500/10" />
                    <MetricCard title="Saves" value={formatNumber(engagementBreakdown.breakdown.saves)} icon={Bookmark} color="text-amber-400" bg="bg-amber-500/10" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Engagement Quality</h4>
                        <div className="space-y-4">
                            <ProgressBar label="Save-to-View Ratio" value={engagementBreakdown.ratios.saveToView} color="bg-amber-500" />
                            <ProgressBar label="Share-to-View Ratio" value={engagementBreakdown.ratios.shareToView} color="bg-emerald-500" />
                            <ProgressBar label="Engagement per Reach" value={engagementBreakdown.rates.perReach} color="bg-rose-500" />
                        </div>
                    </div>
                </div>

                {/* Engagements Trend Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Engagements Trend</h4>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={engagementBreakdown.engagementTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="total" name="Total" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="instagram" name="Instagram" stroke="#e879f9" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="facebook" name="Facebook" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Engagement Rate Trend Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Engagement Rate Trend (%)</h4>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={engagementBreakdown.engagementRateTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                                <YAxis stroke="#64748b" fontSize={12} unit="%" />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} formatter={(value) => `${value}%`} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="total" name="Total ER" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="instagram" name="Instagram ER" stroke="#e879f9" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="facebook" name="Facebook ER" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Video Views Trend Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Video Views Trend</h4>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={engagementBreakdown.videoViewsTrend || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={formatDate} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                <Line type="monotone" dataKey="total" name="Total Views" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="instagram" name="IG Reels" stroke="#e879f9" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="facebook" name="FB Videos" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>

            {/* 5. CONTENT PERFORMANCE */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="text-indigo-400" size={24} /> Content Performance
                </h3>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-white mb-4">Content Mix</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                            <Image className="mx-auto mb-2 text-blue-400" />
                            <div className="text-xl font-bold text-white">{contentPerformance.byFormat.image}</div>
                            <div className="text-xs text-slate-500">Images</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                            <Video className="mx-auto mb-2 text-purple-400" />
                            <div className="text-xl font-bold text-white">{contentPerformance.byFormat.video}</div>
                            <div className="text-xs text-slate-500">Videos</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                            <Layers className="mx-auto mb-2 text-emerald-400" />
                            <div className="text-xl font-bold text-white">{contentPerformance.byFormat.carousel}</div>
                            <div className="text-xs text-slate-500">Carousels</div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-lg text-center">
                            <Video className="mx-auto mb-2 text-rose-400" />
                            <div className="text-xl font-bold text-white">{contentPerformance.byFormat.reel}</div>
                            <div className="text-xs text-slate-500">Reels</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. DETAILED POSTS */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="text-slate-400" size={24} /> Post Performance
                </h3>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-4">Media</th>
                                    <th className="px-4 py-4">Content</th>
                                    <th className="px-4 py-4">Type</th>
                                    <th className="px-4 py-4">Reach</th>
                                    <th className="px-4 py-4">Eng. Rate</th>
                                    <th className="px-4 py-4">Ranking</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {detailedPosts.slice(0, 10).map((post, i) => (
                                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            {post.thumbnail ? (
                                                <img
                                                    src={post.thumbnail}
                                                    alt="Post thumbnail"
                                                    className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                                                    {post.type === 'VIDEO' || post.type === 'REELS' ? (
                                                        <Video size={20} className="text-slate-500" />
                                                    ) : (
                                                        <Image size={20} className="text-slate-500" />
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-200 truncate max-w-[200px]">{post.caption || 'No caption'}</div>
                                            <div className="text-xs text-slate-500">{formatDate(post.publishedAt)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-400 capitalize">{post.type?.toLowerCase()}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{formatNumber(post.reach)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-300">{(post.engagementRate || 0).toFixed(1)}%</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${post.ranking === 'Top Performer' ? 'bg-emerald-500/10 text-emerald-400' :
                                                post.ranking === 'Needs Improvement' ? 'bg-rose-500/10 text-rose-400' :
                                                    'bg-slate-500/10 text-slate-400'
                                                }`}>
                                                {post.ranking}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* 9. TRAFFIC & CTA */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <MousePointer className="text-cyan-400" size={24} /> Traffic & CTA
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Website Clicks" value={traffic.websiteClicks} icon={MousePointer} color="text-cyan-400" bg="bg-cyan-500/10" />
                    <MetricCard title="Email Clicks" value={traffic.emailClicks} icon={Mail} color="text-indigo-400" bg="bg-indigo-500/10" />
                    <MetricCard title="Call Clicks" value={traffic.callClicks} icon={Phone} color="text-green-400" bg="bg-green-500/10" />
                    <MetricCard title="Directions" value={traffic.directionClicks} icon={MapPin} color="text-red-400" bg="bg-red-500/10" />
                </div>
            </section>

            {/* 10. AI INSIGHTS */}
            <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-yellow-400" size={24} /> AI Insights & Recommendations
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Performance Analysis</h4>
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="text-emerald-400 font-bold">Best Format:</span>
                                <span className="text-slate-300">{insights.bestFormat} performs best for your audience.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-blue-400 font-bold">Growth Driver:</span>
                                <span className="text-slate-300">{insights.growthCause}.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-rose-400 font-bold">Weakness:</span>
                                <span className="text-slate-300">{insights.weakPattern}</span>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">Strategic Recommendations</h4>
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <span className="text-yellow-400 font-bold">Action:</span>
                                <span className="text-slate-300">{insights.suggestion}</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-purple-400 font-bold">Mix:</span>
                                <span className="text-slate-300">Try {insights.ratio} for next month.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-cyan-400 font-bold">Timing:</span>
                                <span className="text-slate-300">Schedule posts around {insights.bestTime} for max engagement.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
};

const MetricCard = ({ title, value, sub, icon: Icon, color, bg }) => (
    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl">
        <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">{title}</span>
            <div className={`p-2 rounded-lg ${bg} ${color}`}>
                <Icon size={18} />
            </div>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
);

const ProgressBar = ({ label, value, color }) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{label}</span>
            <span className="text-white font-medium">{value}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
    </div>
);

export default LiveReportPreview;
