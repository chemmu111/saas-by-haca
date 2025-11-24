import { useState } from 'react';
import Layout from './Layout.jsx';
import { Settings as SettingsIcon, User, Bell, Lock, Palette, Globe, Activity } from 'lucide-react';
import TokenHealthSettings from './components/TokenHealthSettings.jsx';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'token-health', label: 'Token Health', icon: Activity },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'preferences', label: 'Preferences', icon: Globe },
    ];

    return (
        <Layout>
            <div className="p-4 lg:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                                <SettingsIcon className="text-white" size={24} />
                            </div>
                            Settings
                        </h1>
                        <p className="text-slate-600">Manage your account settings and preferences</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Sidebar Tabs */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4">
                                <nav className="space-y-2">
                                    {tabs.map((tab) => {
                                        const Icon = tab.icon;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Icon size={20} />
                                                <span className="font-medium">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                                {activeTab === 'profile' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Settings</h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Your name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                                                <textarea
                                                    rows="4"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Tell us about yourself..."
                                                ></textarea>
                                            </div>
                                            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Notification Preferences</h2>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'Email notifications for new posts', desc: 'Get notified when posts are published' },
                                                { label: 'Post scheduling reminders', desc: 'Reminders before scheduled posts go live' },
                                                { label: 'Client activity updates', desc: 'Updates about client account changes' },
                                                { label: 'Weekly performance reports', desc: 'Summary of your weekly performance' },
                                            ].map((item, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{item.label}</p>
                                                        <p className="text-sm text-slate-500">{item.desc}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input type="checkbox" className="sr-only peer" />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'security' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Security Settings</h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                                                <input
                                                    type="password"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                            <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                                                Update Password
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'token-health' && (
                                    <TokenHealthSettings />
                                )}

                                {activeTab === 'appearance' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Appearance</h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-4">Theme</label>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {['Light', 'Dark', 'Auto'].map((theme) => (
                                                        <button
                                                            key={theme}
                                                            className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-500 transition-all"
                                                        >
                                                            <div className="font-medium text-slate-900">{theme}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'preferences' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Preferences</h2>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                                                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                    <option>English</option>
                                                    <option>Spanish</option>
                                                    <option>French</option>
                                                    <option>German</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                                                <select className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                                    <option>UTC</option>
                                                    <option>EST</option>
                                                    <option>PST</option>
                                                    <option>GMT</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
