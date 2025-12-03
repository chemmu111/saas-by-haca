import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const ContentBreakdown = ({ analytics }) => {
    if (!analytics) return null;

    const data = [
        { name: 'Reels', value: analytics.postsByType?.REELS || analytics.postsByType?.reel || 0, color: '#E1306C' },
        { name: 'Images', value: analytics.postsByType?.IMAGE || analytics.postsByType?.post || 0, color: '#405DE6' },
        { name: 'Carousels', value: analytics.postsByType?.CAROUSEL_ALBUM || 0, color: '#F56040' },
        { name: 'Videos', value: analytics.postsByType?.VIDEO || 0, color: '#5851DB' },
    ].filter(item => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Content Breakdown</h3>
                <div className="flex items-center justify-center h-[250px] text-slate-400">
                    No content data available
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Content Breakdown</h3>
            <div className="h-[250px] w-full" style={{ minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                {data.map((item) => (
                    <div key={item.name} className="flex flex-col">
                        <span className="text-xs text-slate-500">{item.name}</span>
                        <span className="text-lg font-bold text-slate-900">
                            {((item.value / total) * 100).toFixed(1)}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContentBreakdown;
