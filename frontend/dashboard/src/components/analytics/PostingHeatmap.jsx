import React from 'react';

const PostingHeatmap = ({ analytics }) => {
    if (!analytics || !analytics.bestPostingTimes || analytics.bestPostingTimes.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Best Time to Post</h3>
                <div className="text-center py-8 text-slate-400">No posting time data available</div>
            </div>
        );
    }

    // Process data for heatmap (Day x Hour)
    // This is a simplified visualization. In a real app, we'd map 24h x 7days.
    // For now, we'll list the top times in a nice grid.

    const topTimes = analytics.bestPostingTimes.slice(0, 6);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Best Time to Post</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topTimes.map((time, index) => (
                    <div
                        key={`${time.day}-${time.hour}`}
                        className={`p-3 rounded-lg flex flex-col items-center justify-center text-center border ${index === 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
                            }`}
                    >
                        <span className={`text-xs font-bold uppercase mb-1 ${index === 0 ? 'text-blue-600' : 'text-slate-500'
                            }`}>
                            {time.day}
                        </span>
                        <span className="text-lg font-bold text-slate-900">
                            {time.hour}:00
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">
                            {time.engagement} avg. eng
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">
                Based on historical engagement data from your posts.
            </p>
        </div>
    );
};

export default PostingHeatmap;
