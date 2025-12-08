import { useState, useEffect, useRef } from 'react';
import PageTitle from './components/PageTitle';
import api from './api';
import Layout from './Layout.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';
import { User, Bell, Lock, Activity, Settings as SettingsIcon, Save, Loader, CheckCircle, AlertCircle, Camera, Upload, Edit2 } from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showAvatarSelection, setShowAvatarSelection] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    // Profile state
    const [profile, setProfile] = useState({ name: '', email: '', bio: '', avatar: '', gender: '' });

    // Notifications state
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        tokenAlerts: true,
        reminders: true,
        weeklyReports: false
    });

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        twoFactorEnabled: false,
        activeSessions: 0
    });

    // Token Health state
    const [tokenHealth, setTokenHealth] = useState({
        totalClients: 0,
        tokens: []
    });
    const [tokenHealthLoading, setTokenHealthLoading] = useState(false);

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'token-health', label: 'Token Health', icon: Activity },
    ];

    const tokenStats = (() => {
        const tokens = tokenHealth.tokens || [];
        return {
            tokens,
            active: tokens.filter((token) => token.tokenStatus === 'active').length,
            expired: tokens.filter((token) => token.tokenStatus === 'expired').length,
            missing: tokens.filter((token) => token.tokenStatus === 'no_token').length,
        };
    })();



    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    };

    const fetchTokenHealth = async (showSpinner = true) => {
        try {
            const response = await api.get('/settings/token-health');
            if (response.data.success) {
                setTokenHealth(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching token health:', error);
        } finally {
            if (showSpinner) {
                setTokenHealthLoading(false);
            }
        }
    };

    // Load data when tab changes
    useEffect(() => {
        loadTabData();
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'token-health') return;
        fetchTokenHealth(true);
        const interval = setInterval(() => fetchTokenHealth(false), 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const loadTabData = async () => {
        if (activeTab === 'token-health') {
            return;
        }

        try {
            let endpoint = '';
            switch (activeTab) {
                case 'profile':
                    endpoint = '/settings/profile';
                    break;
                case 'notifications':
                    endpoint = '/settings/notifications';
                    break;
                case 'security':
                    endpoint = '/settings/security';
                    break;
                default:
                    return;
            }

            const response = await api.get(endpoint);
            const result = response.data;
            if (result.success) {
                switch (activeTab) {
                    case 'profile':
                        setProfile(result.data);
                        break;
                    case 'notifications':
                        setNotifications(result.data);
                        break;
                    case 'security':
                        setSecurity(prev => ({ ...prev, ...result.data }));
                        break;
                }
            }
        } catch (error) {
            console.error('Error loading tab data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Profile handlers
    const handleProfileUpdate = async () => {
        setLoading(true);
        try {
            const response = await api.put('/settings/profile', profile);
            const result = response.data;

            if (result.success) {
                showMessage('success', 'Profile updated successfully!');
                setProfile(result.data);
                // Update localStorage user info
                const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
                userInfo.name = result.data.name;
                userInfo.email = result.data.email;
                userInfo.avatar = result.data.avatar; // Update avatar in local storage
                localStorage.setItem('user_info', JSON.stringify(userInfo));

                // Dispatch custom event to notify Sidebar/Layout
                window.dispatchEvent(new Event('user-info-updated'));
            } else {
                showMessage('error', result.error || 'Failed to update profile');
            }
        } catch (error) {
            showMessage('error', error.response?.data?.error || 'An error occurred while updating profile');
        } finally {
            setLoading(false);
        }
    };

    // Notifications handlers
    const handleNotificationToggle = async (key) => {
        const newNotifications = { ...notifications, [key]: !notifications[key] };
        setNotifications(newNotifications);

        try {
            const response = await api.put('/settings/notifications', newNotifications);
            const result = response.data;

            if (result.success) {
                showMessage('success', 'Notification settings updated!');
            } else {
                // Revert on error
                setNotifications(notifications);
                showMessage('error', result.error || 'Failed to update notifications');
            }
        } catch (error) {
            // Revert on error
            setNotifications(notifications);
            showMessage('error', error.response?.data?.error || 'An error occurred');
        }
    };

    // Security handlers
    const handlePasswordChange = async () => {
        if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
            showMessage('error', 'All password fields are required');
            return;
        }

        if (security.newPassword !== security.confirmPassword) {
            showMessage('error', 'New passwords do not match');
            return;
        }

        if (security.newPassword.length < 6) {
            showMessage('error', 'Password must be at least 6 characters long');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/settings/change-password', {
                currentPassword: security.currentPassword,
                newPassword: security.newPassword,
                confirmPassword: security.confirmPassword
            });

            const result = response.data;
            if (result.success) {
                showMessage('success', 'Password changed successfully!');
                setSecurity(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
            } else {
                showMessage('error', result.error || 'Failed to change password');
            }
        } catch (error) {
            showMessage('error', error.response?.data?.error || 'An error occurred while changing password');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAToggle = async () => {
        const newValue = !security.twoFactorEnabled;
        // Optimistic update
        setSecurity(prev => ({ ...prev, twoFactorEnabled: newValue }));

        try {
            const response = await api.post('/settings/enable-2fa', { enabled: newValue });
            const result = response.data;

            if (result.success) {
                showMessage('success', result.message);
            } else {
                // Revert on failure
                setSecurity(prev => ({ ...prev, twoFactorEnabled: !newValue }));
                showMessage('error', result.error || 'Failed to update 2FA');
            }
        } catch (error) {
            // Revert on error
            setSecurity(prev => ({ ...prev, twoFactorEnabled: !newValue }));
            showMessage('error', error.response?.data?.error || 'An error occurred');
        }
    };

    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleLogoutAll = () => {
        setShowLogoutModal(true);
    };

    const confirmLogoutAll = async () => {
        setLoading(true);
        try {
            const response = await api.post('/settings/logout-all');
            const result = response.data;

            if (result.success) {
                showMessage('success', 'Logged out from all devices. Redirecting...');
                setShowLogoutModal(false);
                setTimeout(() => {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_info');
                    window.location.href = '/login';
                }, 2000);
            } else {
                showMessage('error', result.error || 'Failed to logout');
                setShowLogoutModal(false);
            }
        } catch (error) {
            showMessage('error', error.response?.data?.error || 'An error occurred');
            setShowLogoutModal(false);
        } finally {
            setLoading(false);
        }
    };



    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (!file.type.startsWith('image/')) {
            showMessage('error', 'Please upload an image file (PNG, JPG)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showMessage('error', 'File size must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await api.post('/settings/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.success) {
                const newAvatarUrl = response.data.url;
                setProfile({ ...profile, avatar: newAvatarUrl });

                // Immediately update sidebar too for better UX
                const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
                userInfo.avatar = newAvatarUrl;
                localStorage.setItem('user_info', JSON.stringify(userInfo));
                window.dispatchEvent(new Event('user-info-updated'));

                showMessage('success', 'Avatar uploaded! Click Save Changes to persist fully.');
                setShowAvatarSelection(false);
            } else {
                showMessage('error', response.data.error || 'Failed to upload avatar');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showMessage('error', error.response?.data?.error || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
            // Reset input
            e.target.value = null;
        }
    };

    return (
        <Layout>
            <PageTitle title="Settings" />
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
                    </div >

                    {/* Message Toast */}
                    {
                        message.text && (
                            <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
                                }`}>
                                {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                                <span>{message.text}</span>
                            </div>
                        )
                    }

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
                                {loading && activeTab !== 'token-health' && (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader className="animate-spin text-blue-600" size={32} />
                                    </div>
                                )}

                                {!loading && activeTab === 'profile' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Settings</h2>

                                        {/* Avatar Section */}
                                        <div className="mb-8 flex flex-col md:flex-row gap-6 items-start">
                                            <div className="flex-shrink-0 relative group">
                                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 relative">
                                                    {profile.avatar ? (
                                                        <img
                                                            src={profile.avatar}
                                                            alt="Profile"
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                console.error('Error loading avatar image:', profile.avatar);
                                                                e.target.style.display = 'none';
                                                                e.target.parentNode.classList.add('bg-blue-100', 'flex', 'items-center', 'justify-center');
                                                                // Create a fallback element
                                                                const fallback = document.createElement('div');
                                                                fallback.className = 'text-blue-600 font-bold text-2xl';
                                                                fallback.innerText = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
                                                                e.target.parentNode.appendChild(fallback);
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-600">
                                                            <div className="text-2xl font-bold">
                                                                {profile.name ? profile.name.charAt(0).toUpperCase() : <User size={40} />}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Upload Overlay on Hover/Loading */}
                                                    {uploadingAvatar && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                                            <Loader className="animate-spin text-white" size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-grow w-full">
                                                <label className="block text-sm font-medium text-slate-700 mb-3">Profile Avatar</label>

                                                <div className="flex flex-wrap gap-3 mb-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAvatarSelection(!showAvatarSelection)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                        {showAvatarSelection ? 'Hide Presets' : 'Choose Preset'}
                                                    </button>

                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleAvatarUpload}
                                                            disabled={uploadingAvatar}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            disabled={uploadingAvatar}
                                                            className={`flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Upload size={16} />
                                                            {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {showAvatarSelection && (
                                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <p className="text-xs text-slate-500 mb-3 uppercase tracking-wide font-semibold">Select a Preset</p>
                                                        <div className="flex flex-wrap gap-3">
                                                            {[
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Willow',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Mittens',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Garfield',
                                                                'https://api.dicebear.com/7.x/avataaars/svg?seed=Loki'
                                                            ].map((url, index) => (
                                                                <button
                                                                    key={index}
                                                                    onClick={() => {
                                                                        setProfile({ ...profile, avatar: url });
                                                                    }}
                                                                    className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all p-0.5
                                                                        ${profile.avatar === url
                                                                            ? 'border-blue-600 scale-110 shadow-md ring-2 ring-blue-100'
                                                                            : 'border-transparent hover:border-slate-300'
                                                                        }`}
                                                                >
                                                                    <img src={url} alt="Option" className="w-full h-full rounded-full bg-slate-50" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={profile.name}
                                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Your name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">Gender</label>
                                                    <select
                                                        value={profile.gender || ''}
                                                        onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    >
                                                        <option value="">Select Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                                <input
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="your@email.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                                                <textarea
                                                    rows="4"
                                                    value={profile.bio}
                                                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Tell us about yourself..."
                                                    maxLength={500}
                                                ></textarea>
                                                <p className="text-xs text-slate-500 mt-1">{profile.bio?.length || 0}/500 characters</p>
                                            </div>
                                            <button
                                                onClick={handleProfileUpdate}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Save size={20} />
                                                {loading ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Notification Preferences</h2>
                                        <div className="space-y-4">
                                            {[
                                                { key: 'emailAlerts', label: 'Email notifications', desc: 'Get notified via email for important updates' },
                                                { key: 'tokenAlerts', label: 'Token expiry alerts', desc: 'Get notified when Instagram tokens are about to expire' },
                                                { key: 'reminders', label: 'Post scheduling reminders', desc: 'Reminders before scheduled posts go live' },
                                                { key: 'weeklyReports', label: 'Weekly performance reports', desc: 'Summary of your weekly performance' },
                                            ].map((item) => (
                                                <div key={item.key} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{item.label}</p>
                                                        <p className="text-sm text-slate-500">{item.desc}</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={notifications[item.key]}
                                                            onChange={() => handleNotificationToggle(item.key)}
                                                        />
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
                                        <div className="space-y-8">
                                            {/* Change Password */}
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                                                        <input
                                                            type="password"
                                                            value={security.currentPassword}
                                                            onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                                                        <input
                                                            type="password"
                                                            value={security.newPassword}
                                                            onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                                                        <input
                                                            type="password"
                                                            value={security.confirmPassword}
                                                            onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handlePasswordChange}
                                                        disabled={loading}
                                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                                                    >
                                                        {loading ? 'Updating...' : 'Update Password'}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Two-Factor Authentication */}
                                            <div className="border-t border-slate-200 pt-6">
                                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Two-Factor Authentication</h3>
                                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                                                    <div>
                                                        <p className="font-medium text-slate-900">Enable 2FA</p>
                                                        <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={security.twoFactorEnabled}
                                                            onChange={handle2FAToggle}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Logout All Devices */}
                                            <div className="border-t border-slate-200 pt-6">
                                                <h3 className="text-lg font-semibold text-slate-900 mb-4">Active Sessions</h3>
                                                <p className="text-sm text-slate-600 mb-4">You have {security.activeSessions} active session(s)</p>
                                                <button
                                                    onClick={handleLogoutAll}
                                                    disabled={loading}
                                                    className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:bg-red-700 transition-all disabled:opacity-50"
                                                >
                                                    Logout from All Devices
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'token-health' && (
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Instagram Token Health</h2>
                                        {tokenHealthLoading ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader className="animate-spin text-blue-600" size={32} />
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {[
                                                        {
                                                            label: 'Active Tokens',
                                                            value: tokenStats.active,
                                                            accent: 'from-green-500/10 to-green-100 border-green-200 text-green-800'
                                                        },
                                                        {
                                                            label: 'Expired Tokens',
                                                            value: tokenStats.expired,
                                                            accent: 'from-red-500/10 to-red-100 border-red-200 text-red-800'
                                                        },
                                                        {
                                                            label: 'No Token',
                                                            value: tokenStats.missing,
                                                            accent: 'from-slate-500/10 to-slate-100 border-slate-200 text-slate-800'
                                                        }
                                                    ].map((card, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`p-4 rounded-xl border bg-gradient-to-br ${card.accent}`}
                                                        >
                                                            <p className="text-sm font-medium">{card.label}</p>
                                                            <p className="text-3xl font-bold mt-2">{card.value}</p>
                                                            <p className="text-xs mt-1 text-slate-600">of {tokenHealth.totalClients} tracked clients</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {tokenStats.tokens.length === 0 ? (
                                                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                                                        <Activity className="mx-auto text-slate-300 mb-3" size={48} />
                                                        <p className="text-slate-700 font-semibold">No Instagram tokens found.</p>
                                                        <p className="text-sm text-slate-500 mt-1">
                                                            Connect a client via Instagram OAuth to start tracking token health.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {tokenStats.tokens.map((client) => {
                                                            const badgeStyles = {
                                                                active: 'bg-green-50 text-green-700 border border-green-200',
                                                                expired: 'bg-red-50 text-red-700 border border-red-200',
                                                                no_token: 'bg-slate-50 text-slate-700 border border-slate-200'
                                                            };

                                                            const badgeLabel = {
                                                                active: 'Active',
                                                                expired: 'Expired',
                                                                no_token: 'No Token'
                                                            }[client.tokenStatus] || 'Unknown';

                                                            const countdownText = (() => {
                                                                if (client.tokenStatus === 'no_token') return 'No token connected';
                                                                if (client.expiresInDays === null || client.expiresInDays === undefined) return 'Expiry unknown';
                                                                if (client.expiresInDays < 0) return `Expired ${Math.abs(client.expiresInDays)} day(s) ago`;
                                                                if (client.expiresInDays === 0) return 'Expires today';
                                                                return `Expires in ${client.expiresInDays} day${client.expiresInDays === 1 ? '' : 's'}`;
                                                            })();

                                                            return (
                                                                <div key={client.clientId} className="p-4 border border-slate-200 rounded-2xl hover:shadow-md transition-shadow">
                                                                    <div className="flex items-center justify-between">
                                                                        <div>
                                                                            <p className="font-semibold text-slate-900">{client.name}</p>
                                                                            <p className="text-sm text-slate-500">
                                                                                {client.instagramConnected ? 'Instagram connected' : 'Instagram not connected'}
                                                                            </p>
                                                                        </div>
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeStyles[client.tokenStatus]}`}>
                                                                            {badgeLabel}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                                                        <div className="p-3 rounded-lg bg-slate-50">
                                                                            <p className="text-slate-500 text-xs uppercase tracking-wide">Expiry Date</p>
                                                                            <p className="font-semibold text-slate-900 mt-1">
                                                                                {client.expiresAt ? new Date(client.expiresAt).toLocaleDateString(undefined, {
                                                                                    month: 'short',
                                                                                    day: 'numeric',
                                                                                    year: 'numeric'
                                                                                }) : 'Not available'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="p-3 rounded-lg bg-slate-50">
                                                                            <p className="text-slate-500 text-xs uppercase tracking-wide">Countdown</p>
                                                                            <p className="font-semibold text-slate-900 mt-1">{countdownText}</p>
                                                                        </div>
                                                                        <div className="p-3 rounded-lg bg-slate-50">
                                                                            <p className="text-slate-500 text-xs uppercase tracking-wide">Status Detail</p>
                                                                            <p className="font-semibold text-slate-900 mt-1">
                                                                                {client.tokenStatus === 'active'
                                                                                    ? 'Token ready for publishing'
                                                                                    : client.tokenStatus === 'expired'
                                                                                        ? 'Reconnect via Instagram OAuth'
                                                                                        : 'Connect Instagram to generate token'}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}


                            </div>
                        </div>
                    </div>
                </div >
            </div >
            <ConfirmationModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={confirmLogoutAll}
                title="Logout All Devices?"
                message="Are you sure you want to logout from all devices? This will terminate all active sessions including this one. You will need to login again."
                confirmText="Yes, Logout All"
                confirmStyle="danger"
                isLoading={loading}
            />
        </Layout >
    );
};

export default Settings;
