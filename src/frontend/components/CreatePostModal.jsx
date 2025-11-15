import React, { useState, useEffect, useRef } from 'react';
import {
  X, Upload, Image, Video, Hash, Calendar, Clock, Send,
  AlertCircle, CheckCircle, Loader, Sparkles, Crop, RotateCw,
  Instagram, Facebook, Eye, ExternalLink, Save, Trash2, Plus,
  Zap, MessageCircle, Music, Sticker, Lightbulb, Info
} from 'lucide-react';
import { useMediaDetector } from '../hooks/useMediaDetector';
import { useClientCapabilities } from '../hooks/useClientCapabilities';

const CreatePostModal = ({ isOpen, onClose, editingPost, onSuccess }) => {
  // Get backend URL helper
  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5001';
    }
    return window.location.origin;
  };

  // State management
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Form state
  const [formData, setFormData] = useState({
    clientId: '',
    platform: 'instagram',
    postType: 'post',
    format: 'square',
    caption: '',
    hashtags: [],
    scheduleType: 'immediate',
    scheduledTime: '',
    mediaFiles: [],
    hashtagInput: '',
    musicUrl: '',
    location: ''
  });

  // UI state
  const [currentStep, setCurrentStep] = useState('compose');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  // File input refs
  const fileInputRef = useRef(null);

  // Custom hooks
  const { mediaInfo, validationErrors, validateForPostType } = useMediaDetector(
    formData.mediaFiles.map(m => m.file).filter(Boolean)
  );
  const { clientPermissions, availablePlatforms, availablePostTypes, validateSelection } =
    useClientCapabilities(formData.clientId, formData.platform, formData.postType);

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Load clients on mount
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (editingPost && isOpen) {
      setFormData({
        clientId: editingPost.client?._id || editingPost.client || '',
        platform: editingPost.platform || 'instagram',
        postType: editingPost.postType || 'post',
        format: editingPost.format || 'square',
        caption: editingPost.caption || editingPost.content || '',
        hashtags: editingPost.hashtags || [],
        scheduleType: editingPost.scheduledTime ? 'schedule' : 'immediate',
        scheduledTime: editingPost.scheduledTime ?
          new Date(editingPost.scheduledTime).toISOString().slice(0, 16) : '',
        mediaFiles: (editingPost.mediaUrls || []).map(url => ({ url, preview: url })),
        hashtagInput: '',
        musicUrl: editingPost.musicUrl || '',
        location: editingPost.location || ''
      });
    }
  }, [editingPost, isOpen]);

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setClients(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  // Handle file selection
  const handleMediaSelect = (e) => {
    const files = Array.from(e.target.files);
    const newMediaFiles = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      url: null
    }));

    setFormData(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...newMediaFiles]
    }));

    // Auto-detect post type based on first file
    if (formData.mediaFiles.length === 0 && files.length > 0) {
      const firstFile = files[0];
      if (firstFile.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, postType: 'reel' }));
      }
    }
  };

  // Remove media file
  const handleRemoveMedia = (index) => {
    setFormData(prev => {
      const media = prev.mediaFiles[index];
      if (media.preview && media.preview.startsWith('blob:')) {
        URL.revokeObjectURL(media.preview);
      }
      return {
        ...prev,
        mediaFiles: prev.mediaFiles.filter((_, i) => i !== index)
      };
    });

    if (selectedMediaIndex >= index && selectedMediaIndex > 0) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    }
  };

  // Handle hashtag management
  const handleAddHashtag = () => {
    const tag = formData.hashtagInput.trim();
    if (tag && !formData.hashtags.includes(tag)) {
      const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
      setFormData(prev => ({
        ...prev,
        hashtags: [...prev.hashtags, cleanTag],
        hashtagInput: ''
      }));
    }
  };

  const handleRemoveHashtag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      hashtags: prev.hashtags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleInsertHashtagSuggestion = (tag) => {
    setFormData(prev => ({
      ...prev,
      hashtags: [...new Set([...prev.hashtags, tag])]
    }));
  };

  // Generate AI hashtags (mock implementation)
  const handleGenerateHashtags = async () => {
    const words = formData.caption.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    const suggestions = [
      'love', 'instagood', 'photooftheday', 'beautiful', 'happy',
      'cute', 'tbt', 'followme', 'picoftheday', 'instadaily'
    ].filter(tag => !formData.hashtags.includes(tag));

    setFormData(prev => ({
      ...prev,
      hashtags: [...new Set([...prev.hashtags, ...suggestions.slice(0, 5)])]
    }));

    showToast('Hashtag suggestions added!', 'success');
  };

  // Handle cropping (simplified implementation)
  const handleOpenCropper = (mediaIndex) => {
    setSelectedMediaIndex(mediaIndex);
    setShowCropper(true);
    setCurrentStep('crop');
    showToast('Crop feature coming soon!', 'info');
    setTimeout(() => {
      setShowCropper(false);
      setCurrentStep('compose');
    }, 1000);
  };

  // Validation before publish
  const validateBeforePublish = () => {
    const errors = [];

    // Client selection
    if (!formData.clientId) {
      errors.push('Please select a client account');
    }

    // Platform validation
    const platformValidation = validateSelection(formData.platform, formData.postType);
    if (!platformValidation.isValid) {
      errors.push(...platformValidation.errors);
    }

    // Media validation
    if (formData.mediaFiles.length === 0) {
      errors.push('Please upload at least one media file');
    }

    // Media type validation
    const mediaValidation = validateForPostType(formData.postType, formData.platform, mediaInfo);
    if (!mediaValidation.isValid) {
      errors.push(...mediaValidation.errors);
    }

    // Caption validation (optional but recommended)
    if (!formData.caption.trim()) {
      errors.push('Please add a caption to your post');
    }

    // Scheduling validation
    if (formData.scheduleType === 'schedule') {
      if (!formData.scheduledTime) {
        errors.push('Please select a scheduled time');
      } else {
        const scheduled = new Date(formData.scheduledTime);
        if (scheduled <= new Date()) {
          errors.push('Scheduled time must be in the future');
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Handle form submission
  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();

    if (saveAsDraft) {
      await handleSaveDraft();
      return;
    }

    // Validate before publishing
    const validation = validateBeforePublish();
    if (!validation.isValid) {
      showToast(validation.errors[0], 'error');
      return;
    }

    try {
      setLoading(true);

      // Upload media files
      const mediaUrls = [];
      for (const media of formData.mediaFiles) {
        if (media.url) {
          mediaUrls.push(media.url);
        } else if (media.file) {
          const url = await uploadMedia(media.file);
          mediaUrls.push(url);
        }
      }

      // Prepare post data
      const postData = {
        client: formData.clientId,
        platform: formData.platform,
        postType: formData.postType,
        format: formData.format,
        caption: formData.caption,
        hashtags: formData.hashtags,
        mediaUrls: mediaUrls,
        musicUrl: formData.musicUrl,
        location: formData.location
      };

      if (formData.scheduleType === 'schedule') {
        postData.scheduledTime = new Date(formData.scheduledTime).toISOString();
      } else {
        postData.publishImmediately = true;
      }

      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      const url = editingPost
        ? `${backendUrl}/api/posts/${editingPost._id}`
        : `${backendUrl}/api/posts`;

      const method = editingPost ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (result.success) {
        if (postData.publishImmediately && !editingPost) {
          // Show insights for immediate publish
          setShowInsights(true);
          setPublishResult(result.data || result.post);
        }

        const successMessage = editingPost
          ? 'Post updated successfully'
          : (postData.publishImmediately ? 'Post published successfully' : 'Post scheduled successfully');

        showToast(successMessage, 'success');

        if (onSuccess) {
          onSuccess();
        }

        // Close modal after a delay if not showing insights
        if (!postData.publishImmediately || editingPost) {
          setTimeout(() => onClose(), 1500);
        }
      } else {
        showToast(result.error || 'Failed to save post', 'error');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      showToast(err.message || 'Failed to save post', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    try {
      setLoading(true);

      // Upload media files
      const mediaUrls = [];
      for (const media of formData.mediaFiles) {
        if (media.url) {
          mediaUrls.push(media.url);
        } else if (media.file) {
          const url = await uploadMedia(media.file);
          mediaUrls.push(url);
        }
      }

      const postData = {
        client: formData.clientId,
        platform: formData.platform,
        postType: formData.postType,
        format: formData.format,
        caption: formData.caption,
        hashtags: formData.hashtags,
        mediaUrls: mediaUrls,
        status: 'draft'
      };

      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/posts?draft=true`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();

      if (result.success) {
        showToast('Post saved as draft', 'success');
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => onClose(), 1500);
      } else {
        showToast(result.error || 'Failed to save draft', 'error');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      showToast('Failed to save draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Upload media helper
  const uploadMedia = async (file) => {
    const token = localStorage.getItem('auth_token');
    const backendUrl = getBackendUrl();

    const formDataToSend = new FormData();
    formDataToSend.append('image', file);

    const response = await fetch(`${backendUrl}/api/posts/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formDataToSend
    });

    const result = await response.json();
    if (result.success) {
      return result.data.url;
    } else {
      throw new Error(result.error || 'Upload failed');
    }
  };

  // Reset form and close modal
  const handleClose = () => {
    // Clean up blob URLs
    formData.mediaFiles.forEach(media => {
      if (media.preview && media.preview.startsWith('blob:')) {
        URL.revokeObjectURL(media.preview);
      }
    });

    setFormData({
      clientId: '',
      platform: 'instagram',
      postType: 'post',
      format: 'square',
      caption: '',
      hashtags: [],
      scheduleType: 'immediate',
      scheduledTime: '',
      mediaFiles: [],
      hashtagInput: '',
      musicUrl: '',
      location: ''
    });

    setCurrentStep('compose');
    setShowCropper(false);
    setShowInsights(false);
    setSelectedMediaIndex(0);
    setPublishResult(null);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity cursor-pointer"
            onClick={handleClose}
          />

          {/* Modal Panel */}
          <div className="inline-block align-bottom bg-white rounded-2xl shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full max-h-[90vh] overflow-hidden">
            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Send className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {editingPost ? 'Edit Post' : 'Create New Post'}
                    </h2>
                    <p className="text-blue-100 text-sm">
                      {currentStep === 'compose' && 'Compose your post'}
                      {currentStep === 'crop' && 'Crop your image'}
                      {currentStep === 'preview' && 'Preview your post'}
                      {currentStep === 'publish' && 'Publishing...'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex max-h-[calc(100vh-200px)]">
                {/* Left Panel - Form */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {currentStep === 'compose' && (
                    <div className="space-y-6">
                      {/* Client Selection */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Social Account *
                        </label>
                        <select
                          value={formData.clientId}
                          onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                          required
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                          <option value="">Choose an account...</option>
                          {clients.map(client => (
                            <option key={client._id} value={client._id}>
                              {client.name} - {client.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                            </option>
                          ))}
                        </select>

                        {/* Client Status Indicator */}
                        {formData.clientId && clientPermissions && (
                          <div className="mt-3 flex items-center gap-2">
                            {clientPermissions.canAccessInstagram ? (
                              <CheckCircle className="text-green-500" size={16} />
                            ) : (
                              <AlertCircle className="text-red-500" size={16} />
                            )}
                            <span className="text-sm text-gray-600">
                              {clientPermissions.canAccessInstagram
                                ? 'Instagram connected'
                                : 'Instagram not connected - limited features'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Platform & Post Type Selection */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Platform Selection */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Platform *
                            </label>
                            <select
                              value={formData.platform}
                              onChange={(e) => {
                                const newPlatform = e.target.value;
                                // Auto-adjust post type if needed
                                let newPostType = formData.postType;
                                if (newPlatform === 'facebook' && (formData.postType === 'story' || formData.postType === 'reel')) {
                                  newPostType = 'post';
                                }
                                setFormData(prev => ({ ...prev, platform: newPlatform, postType: newPostType }));
                              }}
                              required
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              {availablePlatforms.map(platform => (
                                <option key={platform} value={platform}>
                                  {platform === 'instagram' ? 'Instagram' :
                                   platform === 'facebook' ? 'Facebook' : 'Both Platforms'}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Post Type Selection */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Content Type *
                            </label>
                            <select
                              value={formData.postType}
                              onChange={(e) => {
                                const newPostType = e.target.value;
                                // Auto-set format based on post type
                                let autoFormat = formData.format;
                                if (newPostType === 'reel') {
                                  autoFormat = 'reel';
                                } else if (newPostType === 'story') {
                                  autoFormat = 'story';
                                }
                                setFormData(prev => ({ ...prev, postType: newPostType, format: autoFormat }));
                              }}
                              required
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            >
                              {availablePostTypes.map(type => (
                                <option key={type} value={type}>
                                  {type === 'post' ? 'Feed Post' :
                                   type === 'story' ? 'Story' :
                                   type === 'reel' ? 'Reel' :
                                   type === 'carousel' ? 'Carousel' : type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Format Selection (conditional) */}
                        {formData.postType === 'post' && (
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Format / Aspect Ratio
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { value: 'square', label: 'Square (1:1)', desc: '1080×1080' },
                                { value: 'portrait', label: 'Portrait (4:5)', desc: '1080×1350' },
                                { value: 'landscape', label: 'Landscape (1.91:1)', desc: '1080×608' },
                                { value: 'carousel-square', label: 'Carousel Square', desc: '1080×1080' }
                              ].map(format => (
                                <button
                                  key={format.value}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, format: format.value }))}
                                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                                    formData.format === format.value
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="font-medium text-sm">{format.label}</div>
                                  <div className="text-xs text-gray-500">{format.desc}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Media Upload */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Media Files *
                          {formData.postType === 'reel' && <span className="text-red-500 ml-1">(Video required)</span>}
                          {formData.postType === 'carousel' && <span className="text-red-500 ml-1">(2+ images required)</span>}
                        </label>

                        {/* Upload Area */}
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-white"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
                          <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-500">
                            {formData.postType === 'reel' ? 'MP4, MOV videos up to 100MB' :
                             formData.postType === 'carousel' ? 'JPEG, PNG images (min 2 files)' :
                             'Images or videos'}
                          </p>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept={formData.postType === 'reel' ? 'video/*' : 'image/*,video/*'}
                          multiple={formData.postType === 'carousel'}
                          onChange={handleMediaSelect}
                        />

                        {/* Media Preview Grid */}
                        {formData.mediaFiles.length > 0 && (
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            {formData.mediaFiles.map((media, index) => (
                              <div key={index} className="relative group">
                                {media.file?.type?.startsWith('video/') ? (
                                  <video
                                    src={media.preview}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                    controls={false}
                                  />
                                ) : (
                                  <img
                                    src={media.preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                  />
                                )}

                                {/* Media overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                                  <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenCropper(index);
                                      }}
                                      className="p-1 bg-white rounded-full hover:bg-gray-100"
                                      title="Crop image"
                                    >
                                      <Crop size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMedia(index);
                                      }}
                                      className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                      title="Remove"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* File info */}
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                                  {media.file?.size ? `${(media.file.size / 1024 / 1024).toFixed(1)}MB` : 'URL'}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Validation Errors */}
                        {validationErrors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="text-red-500" size={16} />
                              <span className="text-red-700 text-sm">{validationErrors[0]}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Caption */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Caption
                        </label>
                        <textarea
                          value={formData.caption}
                          onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          placeholder="Write a compelling caption for your post..."
                          maxLength={2200}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">{formData.caption.length}/2200</span>
                          <button
                            type="button"
                            onClick={handleGenerateHashtags}
                            disabled={!formData.caption.trim()}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Sparkles size={14} />
                            AI Suggest
                          </button>
                        </div>
                      </div>

                      {/* Hashtags */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Hashtags
                        </label>

                        {/* Hashtag Input */}
                        <div className="flex gap-2 mb-3">
                          <div className="flex-1 relative">
                            <Hash className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input
                              type="text"
                              value={formData.hashtagInput}
                              onChange={(e) => setFormData(prev => ({ ...prev, hashtagInput: e.target.value }))}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter hashtag and press Enter"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddHashtag}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        {/* Hashtag Tags */}
                        {formData.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {formData.hashtags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                              >
                                #{tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHashtag(tag)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scheduling */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Publishing Schedule
                        </label>

                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="immediate"
                              checked={formData.scheduleType === 'immediate'}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium">Publish Now</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="schedule"
                              checked={formData.scheduleType === 'schedule'}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                              className="mr-2"
                            />
                            <span className="text-sm font-medium">Schedule Later</span>
                          </label>
                        </div>

                        {formData.scheduleType === 'schedule' && (
                          <div className="space-y-3">
                            <input
                              type="datetime-local"
                              value={formData.scheduledTime}
                              onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                              min={new Date().toISOString().slice(0, 16)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 'crop' && showCropper && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Crop Your Image</h3>
                        <p className="text-gray-600">Adjust the crop area to fit your selected format</p>
                      </div>

                      <div className="flex justify-center">
                        <div className="border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-500">Crop feature implementation pending...</p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => setCurrentStep('compose')}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowCropper(false);
                            setCurrentStep('compose');
                          }}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Apply Crop
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel - Preview */}
                <div className="w-96 bg-gray-50 p-6 border-l border-gray-200">
                  <div className="sticky top-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>

                    {/* Platform Preview */}
                    <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        {formData.platform === 'instagram' && <Instagram className="text-purple-600" size={20} />}
                        {formData.platform === 'facebook' && <Facebook className="text-blue-600" size={20} />}
                        {formData.platform === 'both' && (
                          <>
                            <Instagram className="text-purple-600" size={20} />
                            <Facebook className="text-blue-600" size={20} />
                          </>
                        )}
                        <span className="font-medium capitalize">{formData.platform}</span>
                        <span className="text-sm text-gray-500 capitalize">• {formData.postType}</span>
                      </div>

                      {/* Media Preview */}
                      {formData.mediaFiles.length > 0 && (
                        <div className="mb-3">
                          {formData.mediaFiles[0].file?.type?.startsWith('video/') ? (
                            <video
                              src={formData.mediaFiles[0].preview}
                              className="w-full h-48 object-cover rounded-lg"
                              controls={false}
                            />
                          ) : (
                            <img
                              src={formData.mediaFiles[0].preview}
                              alt="Post preview"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      )}

                      {/* Caption Preview */}
                      {formData.caption && (
                        <p className="text-sm text-gray-700 mb-2">{formData.caption}</p>
                      )}

                      {/* Hashtags Preview */}
                      {formData.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {formData.hashtags.slice(0, 5).map((tag, index) => (
                            <span key={index} className="text-sm text-blue-600">#{tag}</span>
                          ))}
                          {formData.hashtags.length > 5 && (
                            <span className="text-sm text-gray-500">+{formData.hashtags.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Insights (after publishing) */}
                    {showInsights && publishResult && (
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <CheckCircle className="text-green-500" size={16} />
                          Post Published
                        </h4>

                        {/* Platform-specific insights */}
                        <div className="space-y-3">
                          {publishResult.instagramPostId && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Instagram className="text-purple-600" size={16} />
                                  <span className="font-medium">Instagram</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => window.open(publishResult.instagramPostUrl, '_blank')}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Post ID: {publishResult.instagramPostId}
                              </p>
                            </div>
                          )}

                          {publishResult.facebookPostId && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Facebook className="text-blue-600" size={16} />
                                  <span className="font-medium">Facebook</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => window.open(publishResult.facebookPostUrl, '_blank')}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Post ID: {publishResult.facebookPostId}
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleClose}
                          className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              {currentStep === 'compose' && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between rounded-b-2xl">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      <Save size={16} />
                      Save Draft
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading && <Loader size={16} className="animate-spin" />}
                      {editingPost ? 'Update Post' : (
                        formData.scheduleType === 'schedule' ? (
                          <>
                            <Calendar size={16} />
                            Schedule Post
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Publish Now
                          </>
                        )
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertCircle size={20} />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
};

export default CreatePostModal;
