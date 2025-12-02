import React from 'react';
import { Eye, Users, Target, TrendingUp } from 'lucide-react';
import { formatNumber } from '../../utils/analyticsUtils';

const AudienceMetricsCard = ({ analytics }) => {
    if (!analytics) return null;

    const totalReach = analytics.totalReach || 0;
    const totalImpressions = analytics.totalImpressions || analytics.totalViews || 0;
    const totalFollowers = analytics.totalFollowers || 0;
    const engagementRate = analytics.engagementRate || 0;

    // Calculate unique vs total views ratio
    const uniqueViewsRatio = totalReach > 0 && totalImpressions > 0
        ? ((totalReach / totalImpressions) * 100).toFixed(1)
        : 0;

    const metrics = [
        {
            label: 'Total Reach',
            value: formatNumber(totalReach),
            subValue: 'Unique accounts reached',
            icon: Target,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-900'
        },
        {
            label: 'Total Impressions',
            value: formatNumber(totalImpressions),
            subValue: 'Total content views',
            icon: Eye,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-900'
        },
        {
            label: 'Audience Size',
            value: formatNumber(totalFollowers),
            subValue: 'Total followers',
            icon: Users,
            color: 'bg-emerald-500',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-900'
        },
        {
            label: 'Engagement Rate',
            value: `${engagementRate}%`,
            subValue: 'Average per post',
            icon: TrendingUp,
            color: 'bg-rose-500',
            bgColor: 'bg-rose-50',
            textColor: 'text-rose-900'
        }
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900 mb-1">Audience Metrics</h3>
                <p className="text-sm text-slate-500">Reach, impressions, and engagement overview</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {metrics.map((metric, index) => (
                    <div key={index} className={`${metric.bgColor} rounded-lg p-4`}>
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 ${metric.color} rounded-lg`}>
                                <metric.icon size={18} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h4 className={`text-2xl font-bold ${metric.textColor} mb-1`}>
                                {metric.value}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium mb-0.5">{metric.label}</p>
                            <p className="text-xs text-slate-500">{metric.subValue}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Insights */}
            <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Insights</h4>
                <div className="space-y-2">
                    {totalReach > 0 && totalImpressions > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Unique View Ratio</span>
                            <span className="font-semibold text-slate-900">{uniqueViewsRatio}%</span>
                        </div>
                    )}
                    {totalImpressions > 0 && totalFollowers > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Avg Impressions per Follower</span>
                            <span className="font-semibold text-slate-900">
                                {(totalImpressions / totalFollowers).toFixed(2)}
                            </span>
                        </div>
                    )}
                    {totalReach > 0 && totalFollowers > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Reach vs Followers</span>
                            <span className="font-semibold text-slate-900">
                                {((totalReach / totalFollowers) * 100).toFixed(0)}%
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudienceMetricsCard;
