import { useState, useEffect, useRef } from 'react';
import {
  X, Upload, Image as ImageIcon, Video, Hash, Calendar, Clock, Send,
  AlertCircle, CheckCircle, Loader, Sparkles, Crop, RotateCw,
  Instagram, Facebook, Eye, ExternalLink, Save, Trash2, Plus,
  Zap, MessageCircle, Music, Sticker, Lightbulb, Info,
  Smartphone, LayoutGrid, Maximize2, Minimize2, Square, RectangleHorizontal, RectangleVertical
} from 'lucide-react';

// Import our custom hooks
import { useMediaDetector } from './hooks/useMediaDetector';
import { useClientCapabilities } from './hooks/useClientCapabilities';
import { useAIHashtags } from './hooks/useAIHashtags';
import { useScheduling } from './hooks/useScheduling';
import { useImageCrop } from './hooks/useImageCrop';
import AIGenerator from './components/AIGenerator.jsx';
import { validateVideo } from './utils/instagramVideoValidator';

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
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [publishProgress, setPublishProgress] = useState({ step: '', message: '' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [publishResult, setPublishResult] = useState(null);

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
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiGeneratorType, setAiGeneratorType] = useState('caption'); // 'caption' or 'hashtag'
  const [errorDetails, setErrorDetails] = useState(null);

  // File input refs
  const fileInputRef = useRef(null);
  const musicInputRef = useRef(null);

  // Custom hooks
  const { mediaInfo, validationErrors, validateForPostType } = useMediaDetector(
    formData.mediaFiles.map(m => m.file).filter(Boolean)
  );
  const { clientPermissions, availablePlatforms, availablePostTypes, validateSelection } =
    useClientCapabilities(formData.clientId, formData.platform, formData.postType);
  const { suggestions: hashtagSuggestions, loading: hashtagsLoading, generateHashtags, clearSuggestions } = useAIHashtags();
  const { getSuggestedTimes, validateScheduledTime } = useScheduling();
  const { canvasRef, autoCropToRatio, applyCrop, initializeCrop } = useImageCrop();

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

  // Get available platforms for selected client
  const getAvailablePlatforms = () => {
    const selectedClientData = clients.find(c => c._id === formData.clientId);
    if (!selectedClientData) {
      return ['instagram', 'facebook', 'both'];
    }

    const platforms = [];
    if (selectedClientData.platform === 'instagram' || selectedClientData.platform === 'manual') {
      platforms.push('instagram');
    }
    if (selectedClientData.platform === 'facebook' || selectedClientData.platform === 'manual') {
      platforms.push('facebook');
    }
    if (platforms.length >= 2 || selectedClientData.platform === 'manual') {
      platforms.push('both');
    }

    return platforms.length > 0 ? platforms : ['instagram', 'facebook', 'both'];
  };

  // Get available post types based on selected platform
  const getAvailablePostTypes = () => {
    const platform = formData.platform;

    if (platform === 'facebook') {
      return ['post']; // Facebook only supports regular posts
    }

    if (platform === 'instagram') {
      return ['post', 'story', 'reel', 'carousel', 'video']; // Instagram supports all types
    }

    if (platform === 'both') {
      return ['post']; // When posting to both, only regular posts work
    }

    return ['post', 'story', 'reel']; // Default: all types
  };

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
  const handleMediaSelect = async (e) => {
    const files = Array.from(e.target.files);

    // Process files and validate videos
    const newMediaFiles = await Promise.all(files.map(async (file) => {
      let validation = null;
      if (file.type.startsWith('video/')) {
        validation = await validateVideo(file);
      }

      return {
        file,
        preview: URL.createObjectURL(file),
        url: null,
        validation
      };
    }));

    // Auto-detect aspect ratio and set format
    const detectAspectRatio = async (file) => {
      return new Promise((resolve) => {
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.onload = () => {
            const ratio = img.width / img.height;
            URL.revokeObjectURL(img.src);
            resolve(ratio);
          };
          img.onerror = () => resolve(null);
          img.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('video/')) {
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            const ratio = video.videoWidth / video.videoHeight;
            URL.revokeObjectURL(video.src);
            resolve(ratio);
          };
          video.onerror = () => resolve(null);
          video.src = URL.createObjectURL(file);
        } else {
          resolve(null);
        }
      });
    };

    // Detect aspect ratio for the first file
    let detectedFormat = formData.format;
    if (files.length > 0 && formData.mediaFiles.length === 0) {
      const ratio = await detectAspectRatio(files[0]);
      if (ratio) {
        // Map ratio to Instagram formats
        if (Math.abs(ratio - 1.0) < 0.1) {
          detectedFormat = 'square'; // 1:1
        } else if (ratio < 0.9) {
          detectedFormat = 'portrait'; // 4:5 (0.8)
        } else if (ratio > 1.5) {
          detectedFormat = 'landscape'; // 1.91:1
        } else if (Math.abs(ratio - 0.8) < 0.1) {
          detectedFormat = 'portrait'; // 4:5
        }
        console.log(`Auto-detected aspect ratio: ${ratio.toFixed(2)} → Format: ${detectedFormat}`);
      }
    }

    setFormData(prev => {
      const updatedMediaFiles = [...prev.mediaFiles, ...newMediaFiles];
      let updatedPostType = prev.postType;

      // Auto-detect post type
      if (updatedMediaFiles.length > 1) {
        // If multiple files, switch to carousel
        updatedPostType = 'carousel';
      } else if (prev.mediaFiles.length === 0 && files.length > 0) {
        // If first file is video, switch to reel
        const firstFile = files[0];
        if (firstFile.type.startsWith('video/')) {
          updatedPostType = 'reel';
        }
      }

      return {
        ...prev,
        mediaFiles: updatedMediaFiles,
        postType: updatedPostType,
        format: detectedFormat
      };
    });
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
    // Show suggestions modal or add to form
    if (hashtagSuggestions.length > 0) {
      // You can add logic here to show suggestions or auto-add them
      showToast(`Generated ${hashtagSuggestions.length} hashtag suggestions!`, 'success');
    }
  };

  // Handle cropping
  const handleOpenCropper = (mediaIndex) => {
    const media = formData.mediaFiles[mediaIndex];
    if (media && media.preview) {
      setSelectedMediaIndex(mediaIndex);
      setShowCropper(true);
      setCurrentStep('crop');
    }
  };

  // Initialize cropper when showing
  useEffect(() => {
    if (currentStep === 'crop' && showCropper && formData.mediaFiles[selectedMediaIndex]) {
      const media = formData.mediaFiles[selectedMediaIndex];
      const targetRatio = {
        square: '1:1',
        portrait: '4:5',
        landscape: '16:9'
      }[formData.format] || '1:1';

      // Small timeout to ensure canvas is mounted
      setTimeout(() => {
        initializeCrop(media.preview, targetRatio);
      }, 100);
    }
  }, [currentStep, showCropper, selectedMediaIndex, formData.mediaFiles, formData.format]);

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

    // Check for video validation errors
    const invalidVideo = formData.mediaFiles.find(m => m.validation && !m.validation.isValid);
    if (invalidVideo) {
      errors.push(`Video "${invalidVideo.file.name}" has errors: ${invalidVideo.validation.errors.join(', ')}`);
    }

    // Media type validation
    // Media type validation
    const mediaValidation = validateForPostType(formData.postType, formData.platform, mediaInfo);
    if (!mediaValidation.isValid) {
      errors.push(...mediaValidation.messages);
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
      setPublishProgress({ step: 'upload', message: 'Preparing media files...' });

      // Upload media files with progress
      const mediaUrls = [];
      const filesToUpload = formData.mediaFiles.filter(m => m.file && !m.url);
      const totalFiles = filesToUpload.length;

      for (let i = 0; i < formData.mediaFiles.length; i++) {
        const media = formData.mediaFiles[i];
        if (media.url) {
          mediaUrls.push(media.url);
        } else if (media.file) {
          setPublishProgress({
            step: 'upload',
            message: `Uploading ${media.file.name} (${i + 1}/${totalFiles})...`
          });
          const url = await uploadMedia(media.file, i, totalFiles);
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
        setPublishProgress({ step: 'saving', message: 'Saving scheduled post...' });
      } else {
        postData.publishImmediately = true;
        setPublishProgress({ step: 'publishing', message: 'Publishing to Instagram...' });
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

      if (postData.publishImmediately && !editingPost) {
        setPublishProgress({ step: 'processing', message: 'Processing media on Instagram...' });
      }

      if (result.success) {
        if (postData.publishImmediately && !editingPost) {
          setPublishProgress({ step: 'complete', message: 'Post published successfully!' });
          // Show insights for immediate publish
          setShowInsights(true);
          setPublishResult(result.data);
        } else {
          setPublishProgress({ step: 'complete', message: 'Post saved successfully!' });
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
          setTimeout(() => {
            setPublishProgress({ step: '', message: '' });
            setUploadProgress({ current: 0, total: 0, fileName: '' });
            onClose();
          }, 1500);
        }
      } else {
        const errorMessage = result.error || 'Failed to save post';
        setPublishProgress({ step: 'error', message: errorMessage });

        // If error is long or contains specific keywords, show dialog
        if (errorMessage.length > 100 || errorMessage.includes('Instagram rejected') || errorMessage.includes('requirements')) {
          setErrorDetails(errorMessage);
        } else {
          showToast(errorMessage, 'error');
        }
      }
    } catch (err) {
      console.error('Error saving post:', err);
      const errorMessage = err.message || 'Failed to save post';
      setPublishProgress({ step: 'error', message: errorMessage });

      if (errorMessage.length > 100 || errorMessage.includes('Instagram rejected') || errorMessage.includes('requirements')) {
        setErrorDetails(errorMessage);
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
      // Clear progress after a delay
      setTimeout(() => {
        setPublishProgress({ step: '', message: '' });
        setUploadProgress({ current: 0, total: 0, fileName: '' });
      }, 3000);
    }
  };

  // Handle save as draft
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      setPublishProgress({ step: 'upload', message: 'Uploading media files...' });

      // Upload media files with progress
      const mediaUrls = [];
      const filesToUpload = formData.mediaFiles.filter(m => m.file && !m.url);
      const totalFiles = filesToUpload.length;

      for (let i = 0; i < formData.mediaFiles.length; i++) {
        const media = formData.mediaFiles[i];
        if (media.url) {
          mediaUrls.push(media.url);
        } else if (media.file) {
          setPublishProgress({
            step: 'upload',
            message: `Uploading ${media.file.name} (${i + 1}/${totalFiles})...`
          });
          const url = await uploadMedia(media.file, i, totalFiles);
          mediaUrls.push(url);
        }
      }

      setPublishProgress({ step: 'saving', message: 'Saving draft...' });

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
        setPublishProgress({ step: 'complete', message: 'Draft saved successfully!' });
        showToast('Post saved as draft', 'success');
        if (onSuccess) {
          onSuccess();
        }
        setTimeout(() => {
          setPublishProgress({ step: '', message: '' });
          setUploadProgress({ current: 0, total: 0, fileName: '' });
          onClose();
        }, 1500);
      } else {
        setPublishProgress({ step: 'error', message: result.error || 'Failed to save draft' });
        showToast(result.error || 'Failed to save draft', 'error');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setPublishProgress({ step: 'error', message: err.message || 'Failed to save draft' });
      showToast('Failed to save draft', 'error');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setPublishProgress({ step: '', message: '' });
        setUploadProgress({ current: 0, total: 0, fileName: '' });
      }, 3000);
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

  // Helper function to get post insights from publish result
  const getPostInsights = (publishResult) => {
    if (!publishResult) return null;

    const insights = {
      status: publishResult.status,
      publishedAt: publishResult.publishedTime,
      platforms: []
    };

    // Instagram insights
    if (publishResult.instagramPostId) {
      insights.platforms.push({
        platform: 'instagram',
        postId: publishResult.instagramPostId,
        url: publishResult.instagramPostUrl,
        success: true
      });
    }

    // Facebook insights
    if (publishResult.facebookPostId) {
      insights.platforms.push({
        platform: 'facebook',
        postId: publishResult.facebookPostId,
        url: publishResult.facebookPostUrl,
        success: true
      });
    }

    // Handle partial failures
    if (publishResult.publishingErrors) {
      insights.errors = publishResult.publishingErrors;
    }

    return insights;
  };

  // Helper function to open post URL
  const openPostUrl = (platform, url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Handle publish now button
  const handlePublishNow = async () => {
    if (editingPost && editingPost.status === 'scheduled') {
      try {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const backendUrl = getBackendUrl();

        const response = await fetch(`${backendUrl}/api/posts/${editingPost._id}/publish`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        if (result.success) {
          setPublishResult(result.data);
          setShowInsights(true);
          showToast('Post published successfully', 'success');
          if (onSuccess) onSuccess();
        } else {
          showToast(result.error || 'Failed to publish post', 'error');
        }
      } catch (err) {
        console.error('Error publishing post:', err);
        showToast('Failed to publish post', 'error');
      } finally {
        setLoading(false);
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
    setSelectedMediaIndex(0);
    setPublishResult(null);

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 p-6">
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity cursor-pointer"
            onClick={handleClose}
          />

          {/* Modal Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Full Modal Loading Overlay */}
            {(loading || uploadProgress.total > 0 || publishProgress.step) && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
                <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full mx-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Send size={24} className="text-blue-600" />
                    </div>
                  </div>

                  <div className="text-center w-full">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {publishProgress.step === 'upload' && 'Uploading Media'}
                      {publishProgress.step === 'saving' && 'Saving Post'}
                      {publishProgress.step === 'publishing' && 'Publishing to Instagram'}
                      {publishProgress.step === 'processing' && 'Finishing Up'}
                      {publishProgress.step === 'complete' && 'Success!'}
                      {publishProgress.step === 'error' && 'Error Occurred'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4">{publishProgress.message || 'Please wait while we process your request...'}</p>

                    {uploadProgress.total > 0 && (
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300 ease-out"
                          style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col flex-1 min-h-0">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl flex-none">
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
              <div className="flex flex-1 min-h-0 overflow-hidden">
                {/* Left Panel - Form */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
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
                              {getAvailablePlatforms().map(platform => (
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
                              {getAvailablePostTypes().map(type => (
                                <option key={type} value={type}>
                                  {type === 'post' ? 'Feed Post' :
                                    type === 'story' ? 'Story' :
                                      type === 'reel' ? 'Reel' :
                                        type === 'carousel' ? `Carousel ${formData.mediaFiles.length > 1 ? `(${formData.mediaFiles.length} items)` : ''}` :
                                          type === 'video' ? 'Feed Video' : type}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Format Selection (conditional) */}
                        {(formData.postType === 'post' || formData.postType === 'video') && (
                          <div className="mt-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                              Format / Aspect Ratio
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { value: 'square', label: 'Square', ratio: '1:1', icon: Square, desc: '1080×1080' },
                                { value: 'portrait', label: 'Portrait', ratio: '4:5', icon: RectangleVertical, desc: '1080×1350' },
                                { value: 'landscape', label: 'Landscape', ratio: '1.91:1', icon: RectangleHorizontal, desc: '1080×608' },
                                { value: 'carousel-square', label: 'Carousel', ratio: '1:1', icon: LayoutGrid, desc: 'Multi-image' }
                              ].map(format => {
                                const Icon = format.icon;
                                const isSelected = formData.format === format.value;
                                return (
                                  <button
                                    key={format.value}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, format: format.value }))}
                                    className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 ${isSelected
                                      ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                      : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50 text-gray-600'
                                      }`}
                                  >
                                    <div className={`mb-2 p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                      <Icon size={20} className={isSelected ? 'text-blue-600' : 'text-gray-500'} />
                                    </div>
                                    <span className="text-xs font-bold">{format.label}</span>
                                    <span className="text-[10px] opacity-70 mt-0.5">{format.ratio}</span>

                                    {isSelected && (
                                      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Media Upload */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Media Files *
                          {formData.postType === 'reel' && formData.mediaFiles.length === 0 && <span className="text-red-500 ml-1">(Video required)</span>}
                          {formData.postType === 'video' && formData.mediaFiles.length === 0 && <span className="text-red-500 ml-1">(Video required)</span>}
                          {formData.postType === 'carousel' && <span className="text-red-500 ml-1">
                            {formData.mediaFiles.length > 0 ? `(${formData.mediaFiles.length} items)` : '(2-10 images required)'}
                          </span>}
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
                              formData.postType === 'video' ? 'MP4, MOV videos up to 4GB' :
                                formData.postType === 'carousel' ? 'JPEG, PNG images (2-10 files)' :
                                  'Images or videos'}
                          </p>
                        </div>

                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept={(formData.postType === 'reel' || formData.postType === 'video') ? 'video/*' :
                            formData.postType === 'carousel' ? 'image/*' : 'image/*,video/*'}
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
                                    className={`w-full h-20 object-cover rounded-lg border ${media.validation && !media.validation.isValid ? 'border-red-500' :
                                      media.validation && media.validation.warnings.length > 0 ? 'border-yellow-500' :
                                        'border-gray-200'
                                      }`}
                                    controls={false}
                                  />
                                ) : (
                                  <img
                                    src={media.preview}
                                    alt={`Preview ${index + 1}`}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-200"
                                  />
                                )}

                                {/* Validation Status Overlay */}
                                {media.validation && (
                                  <div className="absolute top-1 right-1 z-10">
                                    {!media.validation.isValid ? (
                                      <div className="bg-red-500 text-white p-1 rounded-full shadow-md" title={media.validation.errors.join('\n')}>
                                        <X size={12} />
                                      </div>
                                    ) : media.validation.warnings.length > 0 ? (
                                      <div className="bg-yellow-500 text-white p-1 rounded-full shadow-md" title={media.validation.warnings.join('\n')}>
                                        <AlertCircle size={12} />
                                      </div>
                                    ) : (
                                      <div className="bg-green-500 text-white p-1 rounded-full shadow-md" title="Video Ready — meets Instagram standards ✔️">
                                        <CheckCircle size={12} />
                                      </div>
                                    )}
                                  </div>
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
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* File info */}
                                <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-[10px] px-1.5 py-0.5 rounded max-w-[90%] truncate">
                                  {media.file?.size ? `${(media.file.size / 1024 / 1024).toFixed(1)}MB` : 'URL'}
                                </div>

                                {/* Validation Message (if selected or error) */}
                                {(media.validation && (!media.validation.isValid || media.validation.warnings.length > 0)) && (
                                  <div className={`absolute -bottom-2 left-0 right-0 transform translate-y-full z-20 p-2 rounded text-xs shadow-lg ${!media.validation.isValid ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                    } hidden group-hover:block`}>
                                    <ul className="list-disc list-inside">
                                      {media.validation.errors.map((e, i) => <li key={`err-${i}`}>{e}</li>)}
                                      {media.validation.warnings.map((w, i) => <li key={`warn-${i}`}>{w}</li>)}
                                    </ul>
                                  </div>
                                )}
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
                            onClick={() => {
                              setAiGeneratorType('caption');
                              setShowAIGenerator(true);
                            }}
                            disabled={loading}
                            className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Sparkles size={14} />
                            AI Magic
                          </button>
                        </div>
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

                            {/* Quick schedule options */}
                            <div className="grid grid-cols-2 gap-2">
                              {getSuggestedTimes().map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, scheduledTime: suggestion.value }))}
                                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                                >
                                  <div className="font-medium text-sm">{suggestion.label}</div>
                                  <div className="text-xs text-gray-500">{suggestion.description}</div>
                                </button>
                              ))}
                            </div>
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

                {/* Right Panel - Preview */}
                <div className="w-96 bg-white p-6 border-l border-gray-200 flex flex-col items-center justify-center relative">
                  <div className="sticky top-6 z-10 w-full max-w-[280px]">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Preview</h3>

                    {/* Phone Frame */}
                    <div className="bg-white rounded-[2rem] border-[6px] border-gray-900 shadow-2xl overflow-hidden relative h-[520px] flex flex-col">
                      {/* Notch/Status Bar */}
                      <div className="bg-white px-5 py-2.5 flex justify-between items-center border-b border-gray-50 z-20">
                        <span className="text-[10px] font-semibold text-gray-900">9:41</span>
                        <div className="flex gap-1">
                          <div className="w-3 h-2 bg-gray-900 rounded-[1px]"></div>
                          <div className="w-0.5 h-2 bg-gray-900 rounded-[1px]"></div>
                        </div>
                      </div>

                      {/* App Header */}
                      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-[1.5px]">
                            <div className="w-full h-full rounded-full bg-white p-[1.5px]">
                              <img
                                src={`https://ui-avatars.com/api/?name=${clients.find(c => c._id === formData.clientId)?.name || 'User'}&background=random`}
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-900 leading-tight">
                              {clients.find(c => c._id === formData.clientId)?.name || 'username'}
                            </p>
                            <p className="text-[8px] text-gray-500 leading-tight">
                              {formData.location || 'Original Audio'}
                            </p>
                          </div>
                        </div>
                        <div className="text-gray-900">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                        </div>
                      </div>

                      {/* Content Scroll Area */}
                      <div className="flex-1 overflow-y-auto bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                        {/* Media */}
                        <div className="relative bg-gray-100 min-h-[250px] flex items-center justify-center">
                          {formData.mediaFiles.length > 0 ? (
                            formData.mediaFiles[0].file?.type?.startsWith('video/') ? (
                              <video
                                src={formData.mediaFiles[0].preview}
                                className="w-full h-full object-cover max-h-[320px]"
                                controls={false}
                                autoPlay
                                muted
                                loop
                              />
                            ) : (
                              <img
                                src={formData.mediaFiles[0].preview}
                                alt="Post preview"
                                className="w-full h-full object-cover max-h-[320px]"
                              />
                            )
                          ) : (
                            <div className="text-gray-400 flex flex-col items-center">
                              <ImageIcon size={24} className="mb-2 opacity-50" />
                              <span className="text-[10px]">No media selected</span>
                            </div>
                          )}

                          {/* Carousel Indicators */}
                          {formData.mediaFiles.length > 1 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-10">
                              {formData.mediaFiles.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-white/60'}`}></div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Bar */}
                        <div className="px-3 py-2 flex justify-between items-center">
                          <div className="flex gap-3">
                            <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                          </div>
                          <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        </div>

                        {/* Caption & Comments */}
                        <div className="px-3 pb-4">
                          <div className="text-[10px] font-bold mb-1">1,234 likes</div>
                          <div className="text-[10px]">
                            <span className="font-bold mr-2">{clients.find(c => c._id === formData.clientId)?.name || 'username'}</span>
                            <span className="text-gray-900">{formData.caption || 'Write a caption...'}</span>
                          </div>

                          {/* Hashtags */}
                          {formData.hashtags.length > 0 && (
                            <div className="mt-1 text-[10px] text-blue-900">
                              {formData.hashtags.map(t => `#${t}`).join(' ')}
                            </div>
                          )}

                          <div className="text-[8px] text-gray-500 mt-2 uppercase">2 hours ago</div>
                        </div>
                      </div>

                      {/* Bottom Nav Mock */}
                      <div className="border-t border-gray-100 px-4 py-2 flex justify-between items-center bg-white">
                        <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <div className="w-5 h-5 rounded-md border-2 border-gray-900 flex items-center justify-center"><Plus size={12} /></div>
                        <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                        <div className="w-5 h-5 rounded-full bg-gray-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              {currentStep === 'compose' && (
                <div className="bg-white px-6 py-4 border-t border-gray-200 rounded-b-2xl flex items-center justify-between relative z-20 flex-none">


                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, true)}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                    >
                      <Save size={18} />
                      Save Draft
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-6 py-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                      disabled={loading}
                    >
                      Cancel
                    </button>

                    {editingPost && editingPost.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={handlePublishNow}
                        disabled={publishing}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold shadow-sm hover:shadow-md disabled:opacity-50"
                      >
                        {publishing ? <Loader size={18} className="animate-spin" /> : 'Publish Now'}
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transform hover:-translate-y-0.5"
                    >
                      {loading && <Loader size={18} className="animate-spin" />}
                      {editingPost ? 'Update Post' : (
                        formData.scheduleType === 'schedule' ? (
                          <>
                            <Calendar size={18} />
                            Schedule Post
                          </>
                        ) : (
                          <>
                            <Send size={18} />
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



      {/* AI Generator Modal */}
      {
        showAIGenerator && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
              <button
                onClick={() => setShowAIGenerator(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <div className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  {aiGeneratorType === 'caption' ? 'Generate Caption' : 'Generate Hashtags'}
                </h3>
                <AIGenerator
                  type={aiGeneratorType}
                  onSelect={(text) => {
                    if (aiGeneratorType === 'caption') {
                      setFormData(prev => ({ ...prev, caption: prev.caption ? prev.caption + '\n\n' + text : text }));
                    } else {
                      const tags = text.match(/#[\w]+/g) || [];
                      const cleanTags = tags.map(t => t.slice(1));
                      setFormData(prev => ({
                        ...prev,
                        hashtags: [...new Set([...prev.hashtags, ...cleanTags])]
                      }));
                    }
                    setShowAIGenerator(false);
                  }}
                />
              </div>
            </div>
          </div>
        )
      }

      {/* Error Dialog */}
      {errorDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                  <AlertCircle size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Upload Failed
                  </h3>
                  <div className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {errorDetails}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setErrorDetails(null)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {
        toast.show && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
            {toast.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </div>
        )
      }
    </>
  );
};

export default CreatePostModal;
