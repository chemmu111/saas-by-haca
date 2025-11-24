import React, { useState } from 'react';
import { X, Instagram, Facebook, Upload } from 'lucide-react';

const AddClientModal = ({ isOpen, onClose, onAdd, connectingOAuth, error }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        website: '',
        platform: 'manual',
        socialMediaLink: '',
        brandColors: {
            primary: '#000000',
            secondary: '#ffffff'
        },
        tags: ''
    });

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleColorChange = (type, value) => {
        setFormData(prev => ({
            ...prev,
            brandColors: {
                ...prev.brandColors,
                [type]: value
            }
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Process tags
        const processedData = {
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
        onAdd(processedData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-gray-900">Add New Client</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="client@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>

                    {/* Brand Info */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-4">Brand Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
                                    <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                    <p className="text-sm text-gray-500">Click to upload logo</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={formData.brandColors.primary}
                                            onChange={(e) => handleColorChange('primary', e.target.value)}
                                            className="h-10 w-10 rounded cursor-pointer border-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.brandColors.primary}
                                            onChange={(e) => handleColorChange('primary', e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg uppercase font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            value={formData.brandColors.secondary}
                                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                                            className="h-10 w-10 rounded cursor-pointer border-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.brandColors.secondary}
                                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                        <input
                            type="text"
                            name="tags"
                            value={formData.tags}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Retail, VIP, Q3 Campaign (comma separated)"
                        />
                    </div>

                    {/* Platform Selection */}
                    <div className="border-t border-gray-100 pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-4">Connection Method</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.platform === 'manual' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name="platform" value="manual" checked={formData.platform === 'manual'} onChange={handleInputChange} className="absolute opacity-0" />
                                <span className="font-semibold text-gray-900">Manual Entry</span>
                                <span className="text-xs text-gray-500 mt-1">No API connection</span>
                            </label>
                            <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.platform === 'instagram' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name="platform" value="instagram" checked={formData.platform === 'instagram'} onChange={handleInputChange} className="absolute opacity-0" />
                                <Instagram className={formData.platform === 'instagram' ? 'text-pink-600' : 'text-gray-400'} size={24} />
                                <span className="font-semibold text-gray-900 mt-2">Instagram</span>
                            </label>
                            <label className={`relative flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${formData.platform === 'facebook' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                                <input type="radio" name="platform" value="facebook" checked={formData.platform === 'facebook'} onChange={handleInputChange} className="absolute opacity-0" />
                                <Facebook className={formData.platform === 'facebook' ? 'text-blue-600' : 'text-gray-400'} size={24} />
                                <span className="font-semibold text-gray-900 mt-2">Facebook</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={connectingOAuth}
                            className={`flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors ${formData.platform === 'instagram'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {connectingOAuth ? 'Connecting...' : `Add Client ${formData.platform !== 'manual' ? '& Connect' : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
