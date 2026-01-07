import React from 'react';
import { Mail, Phone, Globe, MapPin, MessageCircle, Eye, Users, MousePointer, ExternalLink } from 'lucide-react';

const ProfileActivity = ({ analytics }) => {
    // Get profile activity data from analytics
    const activity = analytics?.profileActivity || {};
    const totalFollowers = analytics?.totalFollowers || 0;
    const profileViews = activity.profile_views || analytics?.profileViews || 0;

    // Define all profile metrics
    const profileMetrics = [
        {
            name: 'Profile Views',
            value: profileViews,
            icon: Eye,
            color: 'bg-blue-500',
            bgLight: 'bg-blue-50',
            description: 'Total profile visits'
        },
        {
            name: 'Website Clicks',
            value: activity.website_clicks || 0,
            icon: Globe,
            color: 'bg-indigo-500',
            bgLight: 'bg-indigo-50',
            description: 'Link in bio clicks'
        },
        {
            name: 'Email Clicks',
            value: activity.email_contacts || 0,
            icon: Mail,
            color: 'bg-amber-500',
            bgLight: 'bg-amber-50',
            description: 'Email button taps'
        },
        {
            name: 'Call Clicks',
            value: activity.phone_call_clicks || 0,
            icon: Phone,
            color: 'bg-green-500',
            bgLight: 'bg-green-50',
            description: 'Phone button taps'
        },
        {
            name: 'Directions',
            value: activity.get_directions_clicks || 0,
            icon: MapPin,
            color: 'bg-red-500',
            bgLight: 'bg-red-50',
            description: 'Get directions taps'
        },
        {
            name: 'Text Messages',
            value: activity.text_message_clicks || 0,
            icon: MessageCircle,
            color: 'bg-purple-500',
            bgLight: 'bg-purple-50',
            description: 'Text button taps'
        },
    ];

    // Calculate total interactions
    const totalInteractions = profileMetrics.reduce((sum, m) => sum + m.value, 0);

    // Check if we have any data
    const hasData = totalInteractions > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Profile Activity</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Actions people take on your profile</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                    <MousePointer size={14} className="text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">{totalInteractions.toLocaleString()} total</span>
                </div>
            </div>

            {!hasData ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                        <Eye size={28} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">No profile activity data yet</p>
                    <p className="text-slate-400 text-sm mt-1">Data will appear as people interact with your profile</p>
                </div>
            ) : (
                <>
                    {/* Main Profile Views Card */}
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 mb-5 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-blue-100 text-sm font-medium">Profile Views</p>
                                <p className="text-4xl font-bold mt-1">{profileViews.toLocaleString()}</p>
                                <p className="text-blue-200 text-xs mt-2">
                                    {totalFollowers > 0 ?
                                        `${((profileViews / totalFollowers) * 100).toFixed(1)}% of followers visited` :
                                        'People who viewed your profile'
                                    }
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <Eye size={28} />
                            </div>
                        </div>
                    </div>

                    {/* Grid of Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {profileMetrics.slice(1).map((metric) => (
                            <div
                                key={metric.name}
                                className={`${metric.bgLight} rounded-xl p-4 border border-transparent hover:border-slate-200 transition-all`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`p-1.5 ${metric.color} rounded-lg`}>
                                        <metric.icon size={14} className="text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-slate-600">{metric.name}</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{metric.value.toLocaleString()}</p>
                                <p className="text-xs text-slate-500 mt-1">{metric.description}</p>
                            </div>
                        ))}
                    </div>

                    {/* Conversion Rate */}
                    {profileViews > 0 && (
                        <div className="mt-5 p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Profile Conversion Rate</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        People who took action after viewing your profile
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-900">
                                        {((totalInteractions - profileViews) / profileViews * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {(totalInteractions - profileViews).toLocaleString()} actions
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProfileActivity;
