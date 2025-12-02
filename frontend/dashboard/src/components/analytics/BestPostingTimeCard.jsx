import React from 'react';
import { Clock, Calendar, TrendingUp } from 'lucide-react';
import { findBestPostingTimes, getDayName, formatHour } from '../../utils/analyticsUtils';

const BestPostingTimeCard = ({ posts }) => {
    if (!posts || posts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Best Posting Times</h3>
                <div className="flex items-center justify-center h-[200px] text-slate-400">
                    No data available
                </div>
            </div>
        );
    }

    const { bestHours, bestDays, heatmapData } = findBestPostingTimes(posts);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Best Posting Times</h3>
                    <p className="text-sm text-slate-500">Optimal times for maximum engagement</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                    <Clock size={24} className="text-amber-600" />
                </div>
            </div>

            {/* Best Hours */}
            {bestHours.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-slate-600" />
                        <h4 className="text-sm font-semibold text-slate-700">Top Hours</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {bestHours.map((hour, index) => (
                            <div
                                key={index}
                                className="relative p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg"
                            >
                                <div className="absolute top-2 right-2 w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-amber-900 mb-1">
                                        {formatHour(hour.hour)}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        {Math.round(hour.avgEngagement)} avg engagement
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {hour.count} posts
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Best Days */}
            {bestDays.length > 0 && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={16} className="text-slate-600" />
                        <h4 className="text-sm font-semibold text-slate-700">Top Days</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {bestDays.map((day, index) => (
                            <div
                                key={index}
                                className="relative p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg"
                            >
                                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-blue-900 mb-1">
                                        {getDayName(day.day)}
                                    </p>
                                    <p className="text-xs text-slate-600">
                                        {Math.round(day.avgEngagement)} avg engagement
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {day.count} posts
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Heatmap Preview */}
            {heatmapData.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={16} className="text-slate-600" />
                        <h4 className="text-sm font-semibold text-slate-700">Engagement Heatmap</h4>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <div key={index} className="text-center text-xs font-medium text-slate-600 py-1">
                                {day}
                            </div>
                        ))}
                        {Array.from({ length: 7 }, (_, dayIndex) => {
                            // Get average engagement for this day across all hours
                            const dayData = heatmapData.filter(d => d.day === dayIndex);
                            const avgEngagement = dayData.length > 0
                                ? dayData.reduce((sum, d) => sum + d.avgEngagement, 0) / dayData.length
                                : 0;

                            // Calculate intensity (0-100)
                            const maxEngagement = Math.max(...heatmapData.map(d => d.avgEngagement), 1);
                            const intensity = (avgEngagement / maxEngagement) * 100;

                            // Color based on intensity
                            let bgColor = 'bg-slate-100';
                            if (intensity > 75) bgColor = 'bg-emerald-500';
                            else if (intensity > 50) bgColor = 'bg-emerald-400';
                            else if (intensity > 25) bgColor = 'bg-emerald-300';
                            else if (intensity > 0) bgColor = 'bg-emerald-200';

                            return (
                                <div
                                    key={dayIndex}
                                    className={`h-12 rounded ${bgColor} flex items-center justify-center`}
                                    title={`${getDayName(dayIndex)}: ${Math.round(avgEngagement)} avg engagement`}
                                >
                                    {avgEngagement > 0 && (
                                        <span className="text-xs font-semibold text-white">
                                            {Math.round(avgEngagement)}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-3">
                        <span className="text-xs text-slate-500">Low</span>
                        <div className="flex gap-1">
                            <div className="w-4 h-4 bg-slate-100 rounded"></div>
                            <div className="w-4 h-4 bg-emerald-200 rounded"></div>
                            <div className="w-4 h-4 bg-emerald-300 rounded"></div>
                            <div className="w-4 h-4 bg-emerald-400 rounded"></div>
                            <div className="w-4 h-4 bg-emerald-500 rounded"></div>
                        </div>
                        <span className="text-xs text-slate-500">High</span>
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {bestHours.length > 0 && bestDays.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <TrendingUp size={18} className="text-white" />
                            </div>
                            <div>
                                <h5 className="font-semibold text-slate-900 mb-1">Recommendation</h5>
                                <p className="text-sm text-slate-700">
                                    Post on <span className="font-bold text-blue-700">{getDayName(bestDays[0].day)}</span> at{' '}
                                    <span className="font-bold text-blue-700">{formatHour(bestHours[0].hour)}</span> for best engagement
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BestPostingTimeCard;
