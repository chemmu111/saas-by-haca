import React from 'react';
import { Instagram, Facebook, TrendingUp, Users, Eye, Heart } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNumber } from '../../utils/analyticsUtils';

const PlatformComparisonCard = ({ analytics, posts }) => {
    if (!analytics || !posts) return null;

    // Group posts by platform
    const instagramPosts = posts.filter(p =>
        (p.clientName && p.clientName.toLowerCase().includes('instagram')) ||
        p.platform === 'instagram'
    );
    const facebookPosts = posts.filter(p =>
        (p.clientName && p.clientName.toLowerCase().includes('facebook')) ||
        p.platform === 'facebook'
    );

    // Calculate metrics for each platform
    const calculatePlatformMetrics = (platformPosts) => {
        let totalEngagement = 0;
        let totalReach = 0;
        let totalViews = 0;
        let totalLikes = 0;

        platformPosts.forEach(post => {
            const metrics = post.metrics || {};
            totalEngagement += (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saved || 0);
            totalReach += metrics.reach || 0;
            totalViews += metrics.views || 0;
            totalLikes += metrics.likes || 0;
        });

        const engagementRate = totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0;

        return {
            posts: platformPosts.length,
            engagement: totalEngagement,
            reach: totalReach,
            views: totalViews,
            likes: totalLikes,
            engagementRate
        };
    };

    const instagramMetrics = calculatePlatformMetrics(instagramPosts);
    const facebookMetrics = calculatePlatformMetrics(facebookPosts);

    // Determine best performing platform
    const bestPlatform = instagramMetrics.engagement > facebookMetrics.engagement ? 'Instagram' : 'Facebook';

    // Chart data
    const comparisonData = [
        {
            metric: 'Posts',
            Instagram: instagramMetrics.posts,
            Facebook: facebookMetrics.posts
        },
        {
            metric: 'Engagement',
            Instagram: instagramMetrics.engagement,
            Facebook: facebookMetrics.engagement
        },
        {
            metric: 'Reach',
            Instagram: instagramMetrics.reach,
            Facebook: facebookMetrics.reach
        },
        {
            metric: 'Views',
            Instagram: instagramMetrics.views,
            Facebook: facebookMetrics.views
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Platform Comparison</h3>
                <p className="text-sm text-slate-500">Facebook vs Instagram performance</p>
            </div>

            {/* Best Platform Indicator */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 rounded-lg">
                        <TrendingUp size={20} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-600">Best Performing Platform</p>
                        <p className="text-xl font-bold text-slate-900">{bestPlatform}</p>
                    </div>
                </div>
            </div>

            {/* Platform Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Instagram */}
                <div className="border-2 border-pink-200 rounded-lg p-4 bg-gradient-to-br from-pink-50 to-purple-50">
                    <div className="flex items-center gap-2 mb-4">
                        <Instagram size={24} className="text-pink-600" />
                        <h4 className="font-bold text-slate-900">Instagram</h4>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-slate-600">Posts</p>
                            <p className="text-2xl font-bold text-slate-900">{instagramMetrics.posts}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Total Engagement</p>
                            <p className="text-lg font-semibold text-slate-900">{formatNumber(instagramMetrics.engagement)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Engagement Rate</p>
                            <p className="text-lg font-semibold text-pink-600">{instagramMetrics.engagementRate}%</p>
                        </div>
                    </div>
                </div>

                {/* Facebook */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                            Coming Soon
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-4 opacity-50">
                        <Facebook size={24} className="text-blue-600" />
                        <h4 className="font-bold text-slate-900">Facebook</h4>
                    </div>
                    <div className="space-y-3 opacity-50">
                        <div>
                            <p className="text-xs text-slate-600">Posts</p>
                            <p className="text-2xl font-bold text-slate-900">--</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Total Engagement</p>
                            <p className="text-lg font-semibold text-slate-900">--</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600">Engagement Rate</p>
                            <p className="text-lg font-semibold text-blue-600">--</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Chart */}
            <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Side-by-Side Comparison</h4>
                <div className="h-[250px] w-full" style={{ minHeight: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="metric"
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
                            />
                            <Legend />
                            <Bar dataKey="Instagram" fill="#E1306C" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="Facebook" fill="#1877F2" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Detailed Metrics */}
            <div className="mt-6 pt-6 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Detailed Metrics</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 mb-2">Instagram</p>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Reach:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(instagramMetrics.reach)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Views:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(instagramMetrics.views)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Likes:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(instagramMetrics.likes)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-2">Facebook</p>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Reach:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(facebookMetrics.reach)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Views:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(facebookMetrics.views)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Likes:</span>
                                <span className="font-semibold text-slate-900">{formatNumber(facebookMetrics.likes)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformComparisonCard;
