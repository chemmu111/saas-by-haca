import React, { useState } from 'react';
import {
    MoreVertical,
    LayoutDashboard,
    Edit,
    Trash2,
    Instagram,
    Users,
    FileText,
    BarChart2,
    Calendar,
    Tag,

    Phone,
    Globe,
    Mail,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClientCard = ({ client, onEdit, onDelete, onConnectInstagram, onViewDetails }) => {
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);

    const getStatusColor = (status) => {
        const state = typeof status === 'object' ? status.state : status;
        switch (state) {
            case 'active': return 'text-green-600 bg-green-50 border-green-200';
            case 'expiring': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'expired': return 'text-red-600 bg-red-50 border-red-200';
            case 'refreshing': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        const state = typeof status === 'object' ? status.state : status;
        switch (state) {
            case 'active': return <CheckCircle2 size={14} />;
            case 'expiring': return <AlertCircle size={14} />;
            case 'expired': return <XCircle size={14} />;
            case 'refreshing': return <Clock size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    const getStatusText = (client) => {
        if (client.platform !== 'instagram') return 'Manual';

        const status = client.tokenStatus;
        const state = typeof status === 'object' ? status.state : status;

        if (state === 'active') {
            const days = typeof status === 'object' ? status.expiresInDays : null;
            return days ? `Active (${days}d)` : 'Active';
        }
        if (state === 'expiring') return 'Expiring Soon';
        if (state === 'expired') return 'Expired';
        return 'Unknown';
    };

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setShowMenu(false);
        if (showMenu) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [showMenu]);

    return (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden"
            onClick={() => onViewDetails(client)}
        >
            {/* Brand Color Strip */}
            <div
                className="h-1.5 w-full absolute top-0 left-0"
                style={{ backgroundColor: client.brandColors?.primary || '#3b82f6' }}
            />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        {/* Show Instagram profile picture ONLY for Instagram clients */}
                        {client.platform === 'instagram' && client.instagramProfilePicture ? (
                            <img
                                src={client.instagramProfilePicture}
                                alt={client.instagramUsername || client.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                            />
                        ) : client.logo ? (
                            /* Show uploaded logo for all other clients */
                            <img
                                src={client.logo}
                                alt={client.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                            />
                        ) : (
                            /* Show initials as fallback */
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: client.brandColors?.primary || '#3b82f6' }}
                            >
                                {client.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg leading-tight">{client.name}</h3>

                            {/* Instagram Profile Info */}
                            {client.platform === 'instagram' && client.instagramUsername && (
                                <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Instagram size={12} className="text-purple-600" />
                                        <span className="text-xs text-gray-600 font-medium">
                                            @{client.instagramUsername}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CheckCircle2 size={12} className="text-green-600" />
                                        <span className="text-xs text-green-600 font-medium">
                                            Instagram Connected
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2 mt-1.5">
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(client.tokenStatus)}`}>
                                    {getStatusIcon(client.tokenStatus)}
                                    {getStatusText(client)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={handleMenuClick}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical size={20} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-3 py-2 border-b border-gray-50">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/clients/${client._id}`); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <LayoutDashboard size={16} /> Dashboard
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Edit size={16} /> Edit Details
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onConnectInstagram(client); }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Instagram size={16} /> {client.platform === 'instagram' ? 'Reconnect Instagram' : 'Connect Instagram'}
                                </button>
                                <div className="border-t border-gray-50 my-1"></div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(client); }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <Trash2 size={16} /> Delete Client
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        <span className="truncate">{client.email}</span>
                    </div>
                    {client.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            <span>{client.phone}</span>
                        </div>
                    )}
                    {client.website && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Globe size={14} className="text-gray-400" />
                            <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                                {client.website.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Followers</p>
                        <p className="font-semibold text-gray-900">{client.followerCount?.toLocaleString() || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Posts</p>
                        <p className="font-semibold text-gray-900">{client.totalPosts || 0}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Eng. Rate</p>
                        <p className="font-semibold text-gray-900">{client.engagementRate || '0%'}</p>
                    </div>
                </div>

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {client.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md font-medium">
                                {tag}
                            </span>
                        ))}
                        {client.tags.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md font-medium">
                                +{client.tags.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between group-hover:bg-blue-50/50 transition-colors">
                <span className="text-xs text-gray-500">
                    Last synced: {client.statsLastUpdated ? new Date(client.statsLastUpdated).toLocaleString() : 'Never'}
                </span>

            </div>
        </div>
    );
};

export default ClientCard;
