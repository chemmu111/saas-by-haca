import React, { useState, useEffect } from 'react';
import { Folder, Plus, Trash2, MoreVertical, FolderOpen } from 'lucide-react';

const FolderSidebar = ({ activeFolder, onSelectFolder }) => {
    const [folders, setFolders] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    useEffect(() => {
        fetchFolders();
    }, []);

    const fetchFolders = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:5000/api/folders', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setFolders(data.data);
        } catch (err) {
            console.error('Failed to fetch folders', err);
        }
    };

    const createFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:5000/api/folders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ name: newFolderName })
            });
            const data = await res.json();
            if (data.success) {
                setFolders([...folders, data.data]);
                setNewFolderName('');
                setIsCreating(false);
            }
        } catch (err) {
            console.error('Failed to create folder', err);
        }
    };

    const deleteFolder = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this folder? Posts inside will not be deleted.')) return;
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`http://localhost:5000/api/folders/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setFolders(folders.filter(f => f._id !== id));
            if (activeFolder === id) onSelectFolder(null);
        } catch (err) {
            console.error('Failed to delete folder', err);
        }
    };

    return (
        <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Folders</h3>
                <button
                    onClick={() => setIsCreating(true)}
                    className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
                >
                    <Plus size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button
                    onClick={() => onSelectFolder(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeFolder === null
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                >
                    <FolderOpen size={18} />
                    All Posts
                </button>

                {folders.map(folder => (
                    <button
                        key={folder._id}
                        onClick={() => onSelectFolder(folder._id)}
                        className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeFolder === folder._id
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Folder size={18} />
                            <span className="truncate">{folder.name}</span>
                        </div>
                        <div
                            onClick={(e) => deleteFolder(folder._id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded"
                        >
                            <Trash2 size={14} />
                        </div>
                    </button>
                ))}

                {isCreating && (
                    <div className="px-3 py-2">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Folder name..."
                            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:border-blue-500"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') createFolder();
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                            onBlur={() => setIsCreating(false)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default FolderSidebar;
