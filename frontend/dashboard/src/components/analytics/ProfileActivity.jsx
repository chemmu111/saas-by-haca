import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Mail, Phone, Globe, MapPin, UserCheck, MessageCircle } from 'lucide-react';

const ProfileActivity = ({ analytics }) => {
    if (!analytics || !analytics.profileActivity) return null;

    const activity = analytics.profileActivity;

    const data = [
        { name: 'Website Clicks', value: activity.website_clicks || 0, icon: Globe, color: '#3B82F6' },
        { name: 'Email Contacts', value: activity.email_contacts || 0, icon: Mail, color: '#F59E0B' },
        { name: 'Call Clicks', value: activity.phone_call_clicks || 0, icon: Phone, color: '#10B981' },
        { name: 'Get Directions', value: activity.get_directions_clicks || 0, icon: MapPin, color: '#EF4444' },
        { name: 'Text Message', value: activity.text_message_clicks || 0, icon: MessageCircle, color: '#8B5CF6' },
    ].filter(item => item.value > 0);

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Profile Activity</h3>
                <div className="text-center py-8 text-slate-400">No activity data available</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Profile Activity (Contact Intent)</h3>
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip
                            cursor={{ fill: '#F1F5F9' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-slate-50 text-slate-500">
                            <item.icon size={14} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">{item.name}</span>
                            <span className="text-sm font-bold text-slate-900">{item.value}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfileActivity;
