import React, { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-lg">
                <p className="text-sm font-semibold text-slate-900 mb-2">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-slate-600 capitalize">{entry.name}:</span>
                        <span className="font-medium text-slate-900">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const ChartsSection = ({ analytics }) => {
    const [activeTab, setActiveTab] = useState('engagement');

    if (!analytics) return null;

    // Prepare data for charts
    const engagementData = (analytics.engagementTrend || []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        engagements: item.engagements || 0,
        views: item.views || 0
    }));

    const impressionsData = (analytics.impressionsTrend || []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        impressions: item.impressions || 0,
        reach: item.reach || 0
    }));

    const audienceData = (analytics.followersTrend || []).map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        followers: item.followers || 0
    }));

    const tabs = [
        { id: 'engagement', label: 'Engagement' },
        { id: 'impressions', label: 'Impressions & Reach' },
        { id: 'audience', label: 'Audience Growth' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-lg font-bold text-slate-900">Performance Trends</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[350px] w-full" style={{ minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {activeTab === 'engagement' && (
                        <AreaChart data={engagementData}>
                            <defs>
                                <linearGradient id="colorEngagements" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="engagements"
                                name="Engagements"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorEngagements)"
                            />
                        </AreaChart>
                    )}

                    {activeTab === 'impressions' && (
                        <LineChart data={impressionsData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="impressions"
                                name="Impressions"
                                stroke="#8B5CF6"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="reach"
                                name="Reach"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    )}

                    {activeTab === 'audience' && (
                        <AreaChart data={audienceData}>
                            <defs>
                                <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} domain={['auto', 'auto']} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="followers"
                                name="Total Followers"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorFollowers)"
                            />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartsSection;
