import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Upload, Image, Video, Hash, Calendar, Clock, Send,
  AlertCircle, CheckCircle, Loader, Sparkles, Crop, RotateCw,
  Instagram, Facebook, Eye, ExternalLink, Save, Trash2, Plus,
  Zap, MessageCircle, Music, Sticker, Lightbulb, Info, Tag,
  Smile, ShoppingBag, ChevronDown
} from 'lucide-react';

// Import our custom hooks
import { useMediaDetector } from './hooks/useMediaDetector';
import { useClientCapabilities } from './hooks/useClientCapabilities';
import { useAIHashtags } from './hooks/useAIHashtags';
import { useImageCrop } from './hooks/useImageCrop';

const CreatePostModal = ({ isOpen, onClose, editingPost, onSuccess }) => {
  // Get backend URL helper
  const getBackendUrl = () => {
    if (window.location.port === '3000') {
      const savedPort = localStorage.getItem('backend_port');
      if (savedPort) {
        return `http://localhost:${savedPort}`;
      }
      return 'http://localhost:5000';
    }
    return window.location.origin;
  };

  // State management
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
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
  const [currentStep, setCurrentStep] = useState('compose'); // compose, crop, preview, publish
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [showCropper, setShowCropper] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // Buffer-style preview panel toggle
  const [selectedTags, setSelectedTags] = useState([]);

  // File input refs
  const fileInputRef = useRef(null);
  const musicInputRef = useRef(null);
  
  // Image crop hook
  const { canvasRef, applyCrop, autoCropToRatio, resetCrop } = useImageCrop();

  // Custom hooks
  const { mediaInfo, validationErrors, validateForPostType } = useMediaDetector(
    formData.mediaFiles.map(m => m.file).filter(Boolean)
  );
  const { clientPermissions, availablePlatforms, availablePostTypes, validateSelection, getAvailablePlatforms, getAvailablePostTypes } =
    useClientCapabilities(formData.clientId, formData.platform, formData.postType);
  const { suggestions: hashtagSuggestions, loading: hashtagsLoading, error: hashtagsError, generateHashtags, clearSuggestions } = useAIHashtags();

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchClients = useCallback(async () => {
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
  }, []);

  // Load clients on mount
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen, fetchClients]);

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
      hashtags: [...new Set([...prev.hashtags, tag])] // Remove duplicates
    }));
  };

  // Generate AI hashtags
  const handleGenerateHashtags = async () => {
    await generateHashtags(formData.caption, formData.hashtags);
    // After generation, suggestions will be available in hashtagSuggestions
  };

  // Add suggested hashtag to form
  const handleAddSuggestedHashtag = (tag) => {
    handleInsertHashtagSuggestion(tag);
    // Optionally clear suggestions after adding
  };

  // Handle cropping
  const handleOpenCropper = (mediaIndex) => {
    const media = formData.mediaFiles[mediaIndex];
    if (media && media.preview) {
      setSelectedMediaIndex(mediaIndex);
      setShowCropper(true);
      setCurrentStep('crop');

      // Auto-crop based on format
      const targetRatio = {
        square: '1:1',
        portrait: '4:5',
        landscape: '16:9'
      }[formData.format] || '1:1';

      autoCropToRatio(media.preview, targetRatio);
    }
  };

  const handleApplyCrop = async () => {
    const cropped = await applyCrop();
    if (cropped) {
      setFormData(prev => {
        const newMediaFiles = [...prev.mediaFiles];
        newMediaFiles[selectedMediaIndex] = {
          ...newMediaFiles[selectedMediaIndex],
          file: new File([cropped.blob], 'cropped-image.jpg', { type: 'image/jpeg' }),
          preview: cropped.url
        };
        return { ...prev, mediaFiles: newMediaFiles };
      });
      setShowCropper(false);
      setCurrentStep('compose');
      showToast('Image cropped successfully', 'success');
    }
  };

  // Validate scheduled time
  const validateScheduledTime = (scheduledTime, postType, platform) => {
    if (!scheduledTime) {
      return { isValid: false, error: 'Please select a scheduled time' };
    }

    const scheduledDate = new Date(scheduledTime);
    const now = new Date();

    if (scheduledDate <= now) {
      return { isValid: false, error: 'Scheduled time must be in the future' };
    }

    // Check minimum scheduling time (e.g., 5 minutes from now)
    const minTime = new Date(now.getTime() + 5 * 60 * 1000);
    if (scheduledDate < minTime) {
      return { isValid: false, error: 'Scheduled time must be at least 5 minutes from now' };
    }

    return { isValid: true };
  };

  // Get preview dimensions based on format
  const getPreviewDimensions = (format) => {
    const baseWidth = 280; // Preview container width
    
    switch (format) {
      case 'square':
      case 'carousel-square':
        return { width: baseWidth, height: baseWidth, aspectRatio: '1:1' };
      case 'portrait':
        return { width: baseWidth, height: Math.round(baseWidth * 1.25), aspectRatio: '4:5' }; // 4:5 = 1.25
      case 'landscape':
        return { width: baseWidth, height: Math.round(baseWidth / 1.91), aspectRatio: '1.91:1' }; // 1.91:1
      case 'story':
      case 'reel':
        return { width: baseWidth, height: Math.round(baseWidth * 1.777), aspectRatio: '9:16' }; // 9:16 = 1.777
      case 'igtv':
        return { width: baseWidth, height: Math.round(baseWidth * 1.777), aspectRatio: '9:16' };
      default:
        return { width: baseWidth, height: baseWidth, aspectRatio: '1:1' };
    }
  };

  // Get suggested scheduling times
  const getSuggestedTimes = () => {
    const now = new Date();
    const suggestions = [];

    // Today at specific times
    const today = new Date(now);
    today.setHours(12, 0, 0, 0); // 12:00 PM today
    if (today > now) {
      suggestions.push({
        label: 'Today 12:00 PM',
        description: 'Lunch time',
        value: today.toISOString().slice(0, 16)
      });
    }

    today.setHours(18, 0, 0, 0); // 6:00 PM today
    if (today > now) {
      suggestions.push({
        label: 'Today 6:00 PM',
        description: 'Evening',
        value: today.toISOString().slice(0, 16)
      });
    }

    // Tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9:00 AM tomorrow
    suggestions.push({
      label: 'Tomorrow 9:00 AM',
      description: 'Morning',
      value: tomorrow.toISOString().slice(0, 16)
    });

    // Next week
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);
    suggestions.push({
      label: 'Next Week',
      description: 'Same time next week',
      value: nextWeek.toISOString().slice(0, 16)
    });

    return suggestions;
  };

  // Get post insights after publishing
  const getPostInsights = (result) => {
    if (!result || !result.data) return null;

    const platforms = [];
    if (result.data.instagramPostId) {
      platforms.push({
        platform: 'instagram',
        postId: result.data.instagramPostId,
        url: result.data.instagramPostUrl || `https://instagram.com/p/${result.data.instagramPostId}`
      });
    }
    if (result.data.facebookPostId) {
      platforms.push({
        platform: 'facebook',
        postId: result.data.facebookPostId,
        url: result.data.facebookPostUrl || `https://facebook.com/${result.data.facebookPostId}`
      });
    }

    return { platforms };
  };

  // Open post URL in new tab
  const openPostUrl = (platform, url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Publish a scheduled post
  const publishPost = async (postId) => {
    try {
      setPublishing(true);
      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        setPublishResult(result);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to publish post' };
      }
    } catch (err) {
      console.error('Error publishing post:', err);
      return { success: false, error: 'Failed to publish post. Please try again.' };
    } finally {
      setPublishing(false);
    }
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
      const scheduleValidation = validateScheduledTime(formData.scheduledTime, formData.postType, formData.platform);
      if (!scheduleValidation.isValid) {
        errors.push(scheduleValidation.error);
      }
    }

    return { isValid: errors.length === 0, errors };
  };

  // Handle form submission
  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();

    if (saveAsDraft) {
      // Save as draft logic
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
          setPublishResult(result);
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
        mediaUrls: mediaUrls
      };

      const token = localStorage.getItem('auth_token');
      const backendUrl = getBackendUrl();

      // Use draft query parameter for draft saving
      const url = `${backendUrl}/api/posts?draft=true`;
      const response = await fetch(url, {
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

  // Handle publish now button
  const handlePublishNow = async () => {
    if (editingPost && editingPost.status === 'scheduled') {
      // Publish existing scheduled post
      const result = await publishPost(editingPost._id);
      if (result.success) {
        setShowInsights(true);
        showToast('Post published successfully', 'success');
        if (onSuccess) onSuccess();
      } else {
        showToast(result.error, 'error');
      }
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
    setPublishResult(null);
    setPublishing(false);
    setSelectedMediaIndex(0);
    resetCrop();

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-4 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity cursor-pointer"
            onClick={handleClose}
          />

          {/* Modal Panel - Buffer Style */}
          <div className="inline-block align-bottom bg-white rounded-lg shadow-2xl transform transition-all sm:my-4 sm:align-middle sm:max-w-7xl sm:w-full max-h-[95vh] overflow-hidden flex flex-col">
            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* Modal Header - Buffer Style */}
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Create Post
                  </h2>
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Tag size={16} />
                      Tags
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Buffer Style */}
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left Panel - Form */}
                <div className="flex-1 overflow-y-auto">
                  {currentStep === 'compose' && (
                    <div className="p-6">
                      {/* Account Selector - Buffer Style */}
                      {(() => {
                        const selectedClient = clients.find(c => c._id === formData.clientId);
                        return (
                          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                            {selectedClient ? (
                              <>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                  {selectedClient.platform === 'instagram' ? (
                                    <Instagram className="text-white" size={20} />
                                  ) : (
                                    <Facebook className="text-white" size={20} />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {selectedClient.name}
                                    {selectedClient.platform === 'instagram' && ' - Business'}
                                  </div>
                                  <select
                                    value={formData.clientId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                    required
                                    className="text-sm text-gray-500 border-0 bg-transparent p-0 focus:ring-0 cursor-pointer"
                                  >
                                    <option value="">Select account...</option>
                                    {clients.map(client => (
                                      <option key={client._id} value={client._id}>
                                        {client.name} - {client.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            ) : (
                              <select
                                value={formData.clientId}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select an account...</option>
                                {clients.map(client => (
                                  <option key={client._id} value={client._id}>
                                    {client.name} - {client.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })()}

                      {/* Post Type Selection - Buffer Style Radio Buttons */}
                      <div className="flex gap-4 mt-6 mb-6">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="postType"
                            value="post"
                            checked={formData.postType === 'post'}
                            onChange={(e) => {
                              const newPostType = e.target.value;
                              let autoFormat = formData.format;
                              if (!['square', 'portrait', 'landscape', 'carousel-square'].includes(formData.format)) {
                                autoFormat = 'square';
                              }
                              setFormData(prev => ({ ...prev, postType: newPostType, format: autoFormat }));
                            }}
                            className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Post</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="postType"
                            value="reel"
                            checked={formData.postType === 'reel'}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, postType: e.target.value, format: 'reel' }));
                            }}
                            className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Reel</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="postType"
                            value="story"
                            checked={formData.postType === 'story'}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, postType: e.target.value, format: 'story' }));
                            }}
                            className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">Story</span>
                        </label>
                      </div>

                      {/* Text Input - Buffer Style */}
                      <div className="mt-6 mb-6">
                        <textarea
                          value={formData.caption}
                          onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                          rows={8}
                          className="w-full px-0 py-3 border-0 focus:ring-0 resize-none text-base text-gray-900 placeholder-gray-400"
                          placeholder="What would you like to share?"
                          maxLength={2200}
                        />
                        
                        {/* Text Input Toolbar - Buffer Style */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="Emoji"
                            >
                              <Smile size={20} />
                            </button>
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-700 transition-colors"
                              title="Hashtag"
                            >
                              <Hash size={20} />
                            </button>
                            <button
                              type="button"
                              onClick={handleGenerateHashtags}
                              disabled={hashtagsLoading || !formData.caption.trim()}
                              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="AI Assistant"
                            >
                              {hashtagsLoading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                              <span className="text-sm font-medium">AI Assistant</span>
                            </button>
                          </div>
                          <span className="text-sm text-gray-500">{formData.caption.length}/2200</span>
                        </div>
                      </div>

                      {/* Media Upload - Buffer Style */}
                      <div className="mt-6 mb-6">
                        <div
                          className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Image className="mx-auto text-gray-400 mb-3" size={40} />
                          <p className="text-gray-600 font-medium mb-1">Drag & drop or select a file</p>
                          <p className="text-sm text-gray-500">
                            {formData.postType === 'reel' || formData.postType === 'story' ? 'MP4, MOV videos up to 100MB' :
                             'JPEG, PNG images'}
                          </p>
                        </div>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept={formData.postType === 'reel' || formData.postType === 'story' ? 'video/*' : 'image/*,video/*'}
                        multiple={formData.postType === 'carousel' || formData.postType === 'album'}
                        onChange={handleMediaSelect}
                      />

                      {/* Media Preview Grid */}
                      {formData.mediaFiles.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
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
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="text-red-500" size={16} />
                            <span className="text-red-700 text-sm">{validationErrors[0]}</span>
                          </div>
                        </div>
                      )}

                      {/* Post Options - Buffer Style */}
                      <div className="flex flex-wrap items-center gap-3 pt-6 mt-6 mb-6 border-t border-gray-200">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Sticker size={16} />
                          Add Stickers
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Music size={16} />
                          ♫ Music
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ShoppingBag size={16} />
                          Tag Products
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            Automatic
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </div>

                      {/* First Comment - Buffer Style */}
                      <div className="mt-6 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Comment</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Your comment"
                        />
                      </div>

                      {/* Shop Grid Link - Buffer Style */}
                      <div className="mt-6 mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Shop Grid Link</label>
                        <input
                          type="url"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Website or Product URL"
                        />
                      </div>

                      {/* Hashtags - Simplified */}
                      {formData.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
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
                  )}
                  
                  {/* Bottom padding to ensure all content is visible */}
                  {currentStep === 'compose' && <div className="pb-6"></div>}

                  {currentStep === 'crop' && showCropper && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Crop Your Image</h3>
                        <p className="text-gray-600">Adjust the crop area to fit your selected format</p>
                      </div>

                      <div className="flex justify-center">
                        <canvas
                          ref={canvasRef}
                          className="border border-gray-200 rounded-lg max-w-full max-h-96"
                        />
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
                          onClick={handleApplyCrop}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Apply Crop
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Panel - Preview - Buffer Style */}
                {showPreview ? (
                  <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Instagram Preview</h3>
                        <Info size={14} className="text-gray-400" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto">

                    {/* Platform Preview */}
                    <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        {formData.platform === 'instagram' && <Instagram className="text-purple-600" size={20} />}
                        {formData.platform === 'facebook' && <Facebook className="text-blue-600" size={20} />}
                        {formData.platform === 'both' && (
                          <>
                            <Instagram className="text-purple-600" size={20} />
                            <Facebook className="text-blue-600" size={20} />
                          </>
                        )}
                        <span className="font-medium capitalize">
                          {formData.platform === 'both' ? 'Both Platforms' : 
                           formData.platform === 'instagram' ? 'Instagram' : 
                           formData.platform === 'facebook' ? 'Facebook' : formData.platform}
                        </span>
                        <span className="text-sm text-gray-500 capitalize">
                          • {formData.postType === 'post' ? 'Feed Post' :
                             formData.postType === 'story' ? 'Story' :
                             formData.postType === 'reel' ? 'Reel' :
                             formData.postType === 'carousel' ? 'Carousel' :
                             formData.postType === 'igtv' ? 'IGTV' :
                             formData.postType === 'live' ? 'Live' :
                             formData.postType === 'video' ? 'Video' :
                             formData.postType === 'album' ? 'Album' : formData.postType}
                        </span>
                      </div>

                      {/* Media Preview - Live Format Change */}
                      {(() => {
                        const dimensions = getPreviewDimensions(formData.format || 'square');
                        return (
                          <div className="mb-3">
                            <div 
                              className="w-full rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center relative"
                              style={{ 
                                width: `${dimensions.width}px`, 
                                height: `${dimensions.height}px`,
                                maxWidth: '100%',
                                minHeight: '120px'
                              }}
                            >
                              {formData.mediaFiles.length > 0 ? (
                                formData.mediaFiles[0].file?.type?.startsWith('video/') ? (
                                  <video
                                    src={formData.mediaFiles[0].preview}
                                    className="w-full h-full object-cover"
                                    controls={false}
                                    style={{ 
                                      width: `${dimensions.width}px`, 
                                      height: `${dimensions.height}px`,
                                      objectFit: 'cover'
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={formData.mediaFiles[0].preview}
                                    alt="Post preview"
                                    className="w-full h-full object-cover"
                                    style={{ 
                                      width: `${dimensions.width}px`, 
                                      height: `${dimensions.height}px`,
                                      objectFit: 'cover'
                                    }}
                                  />
                                )
                              ) : (
                                <div className="text-center p-4 text-gray-400">
                                  <Image className="mx-auto mb-2" size={32} />
                                  <p className="text-xs">Preview</p>
                                  <p className="text-xs mt-1">{dimensions.aspectRatio}</p>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-gray-500 text-center">
                              {dimensions.aspectRatio} • {dimensions.width}×{dimensions.height}px
                            </div>
                          </div>
                        );
                      })()}

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

                        {getPostInsights(publishResult)?.platforms.map((platform, index) => (
                          <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {platform.platform === 'instagram' && <Instagram className="text-purple-600" size={16} />}
                                {platform.platform === 'facebook' && <Facebook className="text-blue-600" size={16} />}
                                <span className="font-medium capitalize">{platform.platform}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => openPostUrl(platform.platform, platform.url)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <ExternalLink size={14} />
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Post ID: {platform.postId}
                            </p>
                          </div>
                        ))}

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
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="w-8 bg-white border-l border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center"
                    title="Show Preview"
                  >
                    <Eye size={18} className="text-gray-600" />
                  </button>
                )}
              </div>

              {/* Modal Footer - Buffer Style */}
              {currentStep === 'compose' && (
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Create Another
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={loading}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
                    >
                      Save Draft
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        Prioritize
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        scheduleType: prev.scheduleType === 'schedule' ? 'immediate' : 'schedule' 
                      }))}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      <Calendar size={16} />
                      {formData.scheduleType === 'schedule' ? 'Schedule' : 'Publish Now'}
                    </button>
                    {formData.scheduleType === 'schedule' && (
                      <input
                        type="datetime-local"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader size={16} className="animate-spin" />
                      ) : formData.scheduleType === 'schedule' ? (
                        'Schedule Post'
                      ) : (
                        'Publish Now'
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
