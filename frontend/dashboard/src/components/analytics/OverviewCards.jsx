import React from 'react';
import { Users, Eye, Activity, Heart, ArrowUp, ArrowDown, Link as LinkIcon } from 'lucide-react';

const OverviewCard = ({ title, value, subValue, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon size={24} className="text-white" />
            </div>
            {trend && (
                <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                    } px-2 py-1 rounded-full`}>
                    {trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {trendValue}
                </div>
            )}
        </div>
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
    </div>
);

const OverviewCards = ({ analytics }) => {
    if (!analytics) return null;

    // Helper to format numbers (e.g., 1.2k)
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
        return num;
    };

    // Get link clicks from profile activity
    const linkClicks = analytics.profileActivity?.website_clicks || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <OverviewCard
                title="Total Reach"
                value={formatNumber(analytics.totalReach)}
                subValue="Unique accounts reached"
                icon={Users}
                color="bg-blue-500"
            />
            <OverviewCard
                title="Impressions"
                value={formatNumber(analytics.totalImpressions || analytics.totalViews)}
                subValue="Total content views"
                icon={Eye}
                color="bg-purple-500"
            />
            <OverviewCard
                title="Engagement Rate"
                value={`${analytics.engagementRate}%`}
                subValue={`Avg. per post`}
                icon={Activity}
                color="bg-emerald-500"
            />
            <OverviewCard
                title="Total Interactions"
                value={formatNumber(analytics.totalInteractions)}
                subValue="Likes, comments, shares"
                icon={Heart}
                color="bg-rose-500"
            />
            <OverviewCard
                title="Link Clicks"
                value={formatNumber(linkClicks)}
                subValue="Bio link taps"
                icon={LinkIcon}
                color="bg-indigo-500"
            />
        </div>
    );
};

export default OverviewCards;
