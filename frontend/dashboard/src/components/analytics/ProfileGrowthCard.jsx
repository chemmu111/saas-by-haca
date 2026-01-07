import React from 'react';
import { Users, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, calculateMonthOverMonth } from '../../utils/analyticsUtils';

const ProfileGrowthCard = ({ analytics }) => {
    if (!analytics) return null;

    const currentFollowers = analytics.totalFollowers || 0;
    const followerGrowth = analytics.followerGrowth || 0;

    // Calculate followers gained/lost from trend data
    const followersTrend = analytics.followersTrend || [];
    let followersGained = 0;
    let followersLost = 0;
    let netGrowth = 0;

    if (followersTrend.length >= 2) {
        // Calculate from first to last data point in trend
        const firstData = followersTrend[0];
        const lastData = followersTrend[followersTrend.length - 1];
        const firstCount = firstData.followers || firstData.follower_count || 0;
        const lastCount = lastData.followers || lastData.follower_count || 0;

        netGrowth = lastCount - firstCount;

        if (netGrowth > 0) {
            followersGained = netGrowth;
            followersLost = 0;
        } else if (netGrowth < 0) {
            followersGained = 0;
            followersLost = Math.abs(netGrowth);
        }
    } else {
        // No trend data: show current followers as total gained
        // This is accurate for accounts without historical data
        netGrowth = currentFollowers;
        followersGained = currentFollowers;
        followersLost = 0;
    }

    // Calculate month-over-month from trend data
    let momPercentage = 0;
    let momDirection = 'neutral';

    if (followersTrend.length >= 2) {
        const latestData = followersTrend[followersTrend.length - 1];
        const previousData = followersTrend[followersTrend.length - 2];
        const mom = calculateMonthOverMonth(
            latestData.followers || latestData.follower_count,
            previousData.followers || previousData.follower_count
        );
        momPercentage = mom.percentage;
        momDirection = mom.direction;
    }

    // Prepare chart data (last 30 days)
    const chartData = followersTrend.slice(-30).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        followers: item.followers || item.follower_count || 0
    }));

    // Override with API follower metrics if available (from daily snapshots)
    const followerMetrics = analytics.followerMetrics || {};
    if (followerMetrics.hasData) {
        followersGained = followerMetrics.gained;
        followersLost = followerMetrics.lost;
        netGrowth = followerMetrics.netGrowth;
    }

    // Only show metrics if we have actual trend data or API snapshot data
    const hasTrendData = followersTrend.length >= 2 || (followerMetrics && followerMetrics.hasData);
    const hasChartData = followersTrend.length > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Profile Growth</h3>
                    <p className="text-sm text-slate-500">Follower metrics and trends</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                    <Users size={24} className="text-blue-600" />
                </div>
            </div>

            {/* Current Followers */}
            <div className="mb-6">
                <div className="flex items-end gap-3 mb-2">
                    <h2 className="text-4xl font-bold text-slate-900">{formatNumber(currentFollowers)}</h2>
                    {momDirection !== 'neutral' && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium mb-1 ${momDirection === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                            {momDirection === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {momPercentage}% MoM
                        </div>
                    )}
                </div>
                <p className="text-sm text-slate-500">Total Followers</p>
            </div>

            {/* Growth Metrics */}
            {hasTrendData ? (
                <>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-emerald-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ArrowUp size={16} className="text-emerald-600" />
                                <span className="text-2xl font-bold text-emerald-900">{formatNumber(followersGained)}</span>
                            </div>
                            <p className="text-xs text-emerald-700 font-medium">Followers Gained</p>
                        </div>
                        <div className="bg-rose-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <ArrowDown size={16} className="text-rose-600" />
                                <span className="text-2xl font-bold text-rose-900">{formatNumber(followersLost)}</span>
                            </div>
                            <p className="text-xs text-rose-700 font-medium">Followers Lost</p>
                        </div>
                    </div>

                    {/* Snapshot Info */}
                    {followerMetrics.hasData && (
                        <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-blue-700 font-medium">
                                    📸 Tracked over {followerMetrics.period || '30 days'}
                                </span>
                                <span className="text-blue-600">
                                    {followerMetrics.snapshotCount ? `${followerMetrics.snapshotCount} snapshots` : 'Real-time data'}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Net Growth */}
                    <div className={`rounded-lg p-4 mb-6 ${netGrowth >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Net Growth</span>
                            <div className="flex items-center gap-2">
                                {netGrowth >= 0 ? (
                                    <ArrowUp size={16} className="text-blue-600" />
                                ) : (
                                    <ArrowDown size={16} className="text-orange-600" />
                                )}
                                <span className={`text-xl font-bold ${netGrowth >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                                    {netGrowth >= 0 ? '+' : ''}{formatNumber(netGrowth)}
                                </span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-slate-50 rounded-lg p-6 mb-6 text-center">
                    <p className="text-sm text-slate-500">Follower trend data not available</p>
                    <p className="text-xs text-slate-400 mt-1">Historical data will appear after 24 hours</p>
                </div>
            )}

            {/* Trend Chart */}
            {hasChartData && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">30-Day Trend</h4>
                    <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorFollowersGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 10 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 10 }}
                                    width={40}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="followers"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorFollowersGrowth)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileGrowthCard;
