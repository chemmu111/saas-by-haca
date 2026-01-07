import React from 'react';
import { Hash } from 'lucide-react';

const HashtagPerformance = ({ analytics }) => {
    if (!analytics || !analytics.bestHashtags || analytics.bestHashtags.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Hashtags</h3>
                <div className="text-center py-8 text-slate-400">No hashtag data available</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Top Hashtags</h3>
            <div className="flex flex-wrap gap-2">
                {analytics.bestHashtags.map((tag, index) => (
                    <div
                        key={tag.tag}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full hover:bg-blue-50 hover:border-blue-100 transition-colors group cursor-default"
                    >
                        <span className="text-slate-400 group-hover:text-blue-500 font-medium">#</span>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{tag.tag}</span>
                        <span className="text-xs text-slate-400 border-l border-slate-200 pl-2 ml-1">
                            {tag.avgEng} avg. eng
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HashtagPerformance;
