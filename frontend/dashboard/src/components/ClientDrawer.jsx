import React, { useState, useEffect } from 'react';
import {
    X,
    User,
    Instagram,
    FileText,
    CheckSquare,
    Users,
    BarChart2,
    Activity,
    Plus,
    Trash2,
    ExternalLink,
    Mail,
    Phone,
    Globe,
    Calendar,
    Edit2,
    Save,
    RefreshCw
} from 'lucide-react';

const ClientDrawer = ({ client, isOpen, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [noteContent, setNoteContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        if (client) {
            setEditForm({
                name: client.name || '',
                email: client.email || '',
                phone: client.phone || '',
                website: client.website || '',
                brandColors: client.brandColors || { primary: '#000000', secondary: '#ffffff' }
            });
        }
    }, [client]);

    if (!isOpen || !client) return null;

    const tabs = [
        { id: 'overview', label: 'Overview', icon: User },
        { id: 'insights', label: 'Insights', icon: BarChart2 },
        { id: 'notes', label: 'Notes', icon: FileText },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'team', label: 'Team', icon: Users },
    ];

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:5000/api/clients/${client._id}/notes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: noteContent })
            });

            if (response.ok) {
                setNoteContent('');
                onUpdate(); // Refresh client data
            }
        } catch (err) {
            console.error('Error adding note:', err);
        }
    };

    const handleSaveDetails = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:5000/api/clients/${client._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            });

            if (response.ok) {
                setIsEditing(false);
                onUpdate();
            }
        } catch (err) {
            console.error('Error updating client:', err);
        }
    };

    const handleSyncStats = async () => {
        if (client.platform !== 'instagram') return;

        setIsSyncing(true);
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`http://localhost:5000/api/clients/${client._id}/sync`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                onUpdate();
            }
        } catch (err) {
            console.error('Error syncing stats:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        {client.logo ? (
                            <img src={client.logo} alt={client.name} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                            <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: client.brandColors?.primary || '#3b82f6' }}
                            >
                                {client.name.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                    {client.platform === 'instagram' ? (
                                        <span className="flex items-center gap-1 text-pink-600"><Instagram size={14} /> Instagram Connected</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-gray-500">Manual Entry</span>
                                    )}
                                </p>
                                {client.platform === 'instagram' && (
                                    <button
                                        onClick={handleSyncStats}
                                        disabled={isSyncing}
                                        className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${isSyncing ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                                    >
                                        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                                        {isSyncing ? 'Syncing...' : 'Sync Stats'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Edit Details"
                            >
                                <Edit2 size={20} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSaveDetails}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                title="Save Changes"
                            >
                                <Save size={20} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-gray-100 flex overflow-x-auto hide-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h3>
                                    <div className="space-y-3">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm border rounded-lg"
                                                    placeholder="Client Name"
                                                />
                                                <input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm border rounded-lg"
                                                    placeholder="Email"
                                                />
                                                <input
                                                    type="tel"
                                                    value={editForm.phone}
                                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm border rounded-lg"
                                                    placeholder="Phone"
                                                />
                                                <input
                                                    type="url"
                                                    value={editForm.website}
                                                    onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                                                    className="w-full px-3 py-1.5 text-sm border rounded-lg"
                                                    placeholder="Website"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3 text-gray-700">
                                                    <Mail size={18} className="text-gray-400" />
                                                    <span className="text-sm">{client.email}</span>
                                                </div>
                                                {client.phone && (
                                                    <div className="flex items-center gap-3 text-gray-700">
                                                        <Phone size={18} className="text-gray-400" />
                                                        <span className="text-sm">{client.phone}</span>
                                                    </div>
                                                )}
                                                {client.website && (
                                                    <div className="flex items-center gap-3 text-gray-700">
                                                        <Globe size={18} className="text-gray-400" />
                                                        <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                                            {client.website}
                                                        </a>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <h3 className="text-sm font-medium text-gray-500 mb-3">Brand Colors</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            {isEditing ? (
                                                <input
                                                    type="color"
                                                    value={editForm.brandColors?.primary}
                                                    onChange={(e) => setEditForm({
                                                        ...editForm,
                                                        brandColors: { ...editForm.brandColors, primary: e.target.value }
                                                    })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg shadow-sm border border-gray-200" style={{ backgroundColor: client.brandColors?.primary || '#000000' }} />
                                            )}
                                            <div>
                                                <p className="text-xs text-gray-500">Primary</p>
                                                <p className="text-sm font-mono">{isEditing ? editForm.brandColors?.primary : (client.brandColors?.primary || '#000000')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {isEditing ? (
                                                <input
                                                    type="color"
                                                    value={editForm.brandColors?.secondary}
                                                    onChange={(e) => setEditForm({
                                                        ...editForm,
                                                        brandColors: { ...editForm.brandColors, secondary: e.target.value }
                                                    })}
                                                    className="w-8 h-8 rounded cursor-pointer border-0"
                                                />
                                            ) : (
                                                <div className="w-8 h-8 rounded-lg shadow-sm border border-gray-200" style={{ backgroundColor: client.brandColors?.secondary || '#ffffff' }} />
                                            )}
                                            <div>
                                                <p className="text-xs text-gray-500">Secondary</p>
                                                <p className="text-sm font-mono">{isEditing ? editForm.brandColors?.secondary : (client.brandColors?.secondary || '#ffffff')}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
                                <div className="flex flex-wrap gap-2">
                                    {client.tags && client.tags.map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                            {tag}
                                        </span>
                                    ))}
                                    <button className="px-3 py-1 border border-dashed border-gray-300 text-gray-500 rounded-full text-sm hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center gap-1">
                                        <Plus size={14} /> Add Tag
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="space-y-4">
                            <form onSubmit={handleAddNote} className="relative">
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Add a note about this client..."
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32"
                                />
                                <button
                                    type="submit"
                                    disabled={!noteContent.trim()}
                                    className="absolute bottom-3 right-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add Note
                                </button>
                            </form>

                            <div className="space-y-4">
                                {client.notes && client.notes.length > 0 ? (
                                    client.notes.map((note, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
                                            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                                                <span>{new Date(note.createdAt).toLocaleString()}</span>
                                                <span>by User</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <FileText className="mx-auto mb-2 opacity-20" size={48} />
                                        <p>No notes yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Other tabs placeholders */}
                    {['insights', 'tasks', 'team'].includes(activeTab) && (
                        <div className="text-center py-12 text-gray-500">
                            <Activity className="mx-auto mb-3 opacity-20" size={48} />
                            <p>This section is coming soon</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2">
                        <Trash2 size={16} /> Delete Client
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientDrawer;
