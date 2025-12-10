import { useState, useEffect, useRef } from 'react';
import PageTitle from './components/PageTitle';
import {
  X, Upload, Image as ImageIcon, Video, Hash, Calendar, Clock, Send,
  AlertCircle, CheckCircle, Loader, Sparkles, Crop, RotateCw,
  Instagram, Facebook, Eye, ExternalLink, Save, Trash2, Plus,
  Zap, MessageCircle, Music, Sticker, Lightbulb, Info,
  Smartphone, LayoutGrid, Maximize2, Minimize2, Square, RectangleHorizontal, RectangleVertical,
  ChevronRight, ChevronDown, Heart, Share2, Bookmark
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
    location: '',
    coverImage: null,
    coverPreview: null
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
  const coverInputRef = useRef(null);

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
      return ['post', 'story', 'reel', 'carousel']; // Instagram supports these types (video merged into reels)
    }

    if (platform === 'both') {
      return ['post']; // When posting to both, only regular posts work
    }

    return ['post', 'story', 'reel']; // Default types
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      // Use relative URL to leverage Vite proxy or same-origin in production
      const url = '/api/clients';

      console.log('Fetching clients from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setClients(result.data || []);
        if (result.data && result.data.length === 0) {
          console.log('No clients found for this user.');
        }
      } else {
        console.error('Failed to fetch clients:', result.error);
        showToast('Failed to load clients: ' + result.error, 'error');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      showToast('Error loading clients. Please try refreshing.', 'error');
    } finally {
      setLoading(false);
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

  // Handle cover image selection
  const handleCoverSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({
        ...prev,
        coverImage: file,
        coverPreview: URL.createObjectURL(file)
      }));
    }
  };

  // Remove cover image
  const handleRemoveCover = () => {
    if (formData.coverPreview) {
      URL.revokeObjectURL(formData.coverPreview);
    }
    setFormData(prev => ({
      ...prev,
      coverImage: null,
      coverPreview: null
    }));
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

      // Upload cover image if present
      if (formData.coverImage) {
        setPublishProgress({ step: 'upload', message: 'Uploading cover image...' });
        const coverUrl = await uploadMedia(formData.coverImage);
        postData.coverUrl = coverUrl;
      }

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

      // Read the response body as text first
      const responseText = await response.text();

      // Try to parse as JSON
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : { success: false, error: 'Empty response from server' };
      } catch (e) {
        // If it's not valid JSON, create an error result
        result = { success: false, error: responseText || `Server error: ${response.status}` };
      }

      // Handle non-OK responses
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

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

    // Clean up cover preview URL
    if (formData.coverPreview && formData.coverPreview.startsWith('blob:')) {
      URL.revokeObjectURL(formData.coverPreview);
    }

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
      location: '',
      coverImage: null,
      coverPreview: null
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
      <PageTitle title={editingPost ? "Edit Post" : "Create Post"} />
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm font-sans">
        <div
          className="fixed inset-0"
          onClick={handleClose}
        />

        {/* Modal Panel - Maximized Size */}
        <div className="relative bg-white rounded-[20px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] w-[98vw] h-[95vh] flex flex-col overflow-hidden border border-gray-100">

          {/* Full Modal Loading Overlay */}
          {(loading || uploadProgress.total > 0 || publishProgress.step) && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 rounded-[20px]">
              <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-sm w-full mx-4">
                <div className="relative">
                  <div className="w-16 h-16 border-[5px] border-[#6A4DFF]/20 rounded-full animate-spin border-t-[#6A4DFF]"></div>
                </div>
                <div className="text-center w-full">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {publishProgress.step === 'upload' && 'Uploading Media'}
                    {publishProgress.step === 'saving' && 'Saving Post'}
                    {publishProgress.step === 'publishing' && 'Publishing...'}
                    {publishProgress.step === 'processing' && 'Finishing Up'}
                    {publishProgress.step === 'complete' && 'Success!'}
                    {publishProgress.step === 'error' && 'Error Occurred'}
                  </h3>
                  <p className="text-gray-500 text-sm font-medium">{publishProgress.message || 'Please wait...'}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col flex-1 h-full overflow-hidden">

            {/* 1. Top Bar */}
            <div className="flex-none px-8 py-5 border-b border-[#E9E9E9] bg-white flex items-center justify-between z-20">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-semibold text-gray-900 tracking-tight">Create New Post</h2>
              </div>

              {/* Stepper Navigation */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[#6A4DFF] font-bold border-b-2 border-[#6A4DFF] pb-0.5">1. Details</span>
                </div>
                <div className="w-8 h-[1px] bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium">2. Content</span>
                </div>
                <div className="w-8 h-[1px] bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-medium">3. Schedule</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 2. Main Content Area (2-Column Split) */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

              {/* Left Column: Form (60%) */}
              <div className="w-full lg:w-[60%] overflow-y-auto [&::-webkit-scrollbar]:hidden p-4 lg:p-8 border-r border-[#E9E9E9] bg-white">
                <div className="max-w-3xl mx-auto space-y-8">

                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Post Details</h3>
                  </div>

                  {/* Account Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Account
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {formData.clientId ? (
                            <img src={`https://ui-avatars.com/api/?name=${clients.find(c => c._id === formData.clientId)?.name}&background=random`} alt="" className="w-full h-full" />
                          ) : (
                            <span className="text-[10px]">?</span>
                          )}
                        </div>
                      </div>
                      <select
                        value={formData.clientId}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                        required
                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6A4DFF]/20 focus:border-[#6A4DFF] appearance-none text-sm text-gray-900 font-medium transition-all hover:border-gray-300"
                      >
                        <option value="">Choose a social account...</option>
                        {clients.map(client => (
                          <option key={client._id} value={client._id}>
                            {client.name} ({client.platform === 'instagram' ? 'Instagram' : 'Facebook'})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>

                  {/* Platform & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          {formData.platform === 'instagram' ? <Instagram size={18} className="text-pink-600" /> :
                            formData.platform === 'facebook' ? <Facebook size={18} className="text-blue-600" /> :
                              <LayoutGrid size={18} className="text-gray-500" />}
                        </div>
                        <select
                          value={formData.platform}
                          onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6A4DFF]/20 focus:border-[#6A4DFF] appearance-none text-sm text-gray-900 font-medium transition-all hover:border-gray-300"
                        >
                          {getAvailablePlatforms().map(platform => (
                            <option key={platform} value={platform}>
                              {platform === 'instagram' ? 'Instagram' :
                                platform === 'facebook' ? 'Facebook' : 'Both'}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Content Type
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                          {formData.postType === 'post' ? <Square size={18} /> :
                            formData.postType === 'reel' ? <Smartphone size={18} /> :
                              <LayoutGrid size={18} />}
                        </div>
                        <select
                          value={formData.postType}
                          onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                          className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6A4DFF]/20 focus:border-[#6A4DFF] appearance-none text-sm text-gray-900 font-medium transition-all hover:border-gray-300"
                        >
                          {getAvailablePostTypes().map(type => (
                            <option key={type} value={type}>
                              {type === 'post' ? 'Feed Post' :
                                type === 'story' ? 'Story' :
                                  type === 'reel' ? 'Reel' :
                                    type === 'carousel' ? 'Carousel' : type}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Media Assets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Media Assets
                    </label>
                    <div
                      className="border-2 border-dashed border-gray-200 rounded-xl p-6 lg:p-10 text-center hover:border-[#6A4DFF] hover:bg-[#6A4DFF]/5 transition-all cursor-pointer bg-gray-50 group"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                          <Upload className="text-[#6A4DFF]" size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Drag and drop or click to browse</p>
                          <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG, MP4</p>
                        </div>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaSelect}
                    />

                    {/* Thumbnails */}
                    {formData.mediaFiles.length > 0 && (
                      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                        {formData.mediaFiles.map((media, index) => (
                          <div key={index} className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 group shadow-sm">
                            <img src={media.preview} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(index)}
                              className="absolute top-1 right-1 p-1 bg-white rounded-full text-gray-700 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover Photo Selection - Only for video/reel */}
                  {(formData.postType === 'reel' || formData.postType === 'video' ||
                    formData.mediaFiles.some(m => m.file?.type?.startsWith('video/'))) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cover Photo <span className="text-gray-400 font-normal">(Optional)</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-3">Select a custom thumbnail for your video</p>
                        {formData.coverPreview ? (
                          <div className="flex items-center gap-4">
                            <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-[#6A4DFF] shadow-md">
                              <img src={formData.coverPreview} alt="Cover" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={handleRemoveCover}
                                className="absolute top-2 right-2 p-1.5 bg-white rounded-full text-gray-700 shadow-md hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => coverInputRef.current?.click()}
                              className="px-4 py-2 text-sm font-medium text-[#6A4DFF] bg-[#6A4DFF]/10 rounded-lg hover:bg-[#6A4DFF]/20 transition-colors"
                            >
                              Change Cover
                            </button>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#6A4DFF] hover:bg-[#6A4DFF]/5 transition-all cursor-pointer bg-gray-50 group"
                            onClick={() => coverInputRef.current?.click()}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform">
                                <ImageIcon className="text-[#6A4DFF]" size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Add Cover Photo</p>
                                <p className="text-xs text-gray-500 mt-0.5">JPG or PNG recommended</p>
                              </div>
                            </div>
                          </div>
                        )}
                        <input
                          ref={coverInputRef}
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleCoverSelect}
                        />
                      </div>
                    )}

                  {/* Caption */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caption
                    </label>
                    <div className="relative">
                      <textarea
                        value={formData.caption}
                        onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                        rows={6}
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#6A4DFF]/20 focus:border-[#6A4DFF] resize-none text-sm leading-relaxed"
                        placeholder="Write a compelling caption..."
                        maxLength={2200}
                      />
                      <div className="flex justify-between items-center mt-2 px-1">
                        <span className="text-xs text-gray-400 font-medium">{formData.caption.length}/2200</span>
                        <button
                          type="button"
                          onClick={() => {
                            setAiGeneratorType('caption');
                            setShowAIGenerator(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6A4DFF]/10 text-[#6A4DFF] rounded-lg text-xs font-bold hover:bg-[#6A4DFF]/20 transition-colors"
                        >
                          <Sparkles size={14} />
                          Improve with AI
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Section (Moved to Left Column) */}
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Schedule</h3>
                    <div className="space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.scheduleType === 'immediate' ? 'border-[#6A4DFF]' : 'border-gray-300 group-hover:border-[#6A4DFF]'}`}>
                          {formData.scheduleType === 'immediate' && <div className="w-2.5 h-2.5 bg-[#6A4DFF] rounded-full" />}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-gray-900">Publish Now</span>
                          <span className="block text-xs text-gray-500">Post immediately to feed</span>
                        </div>
                        <input
                          type="radio"
                          value="immediate"
                          checked={formData.scheduleType === 'immediate'}
                          onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                          className="hidden"
                        />
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${formData.scheduleType === 'schedule' ? 'border-[#6A4DFF]' : 'border-gray-300 group-hover:border-[#6A4DFF]'}`}>
                          {formData.scheduleType === 'schedule' && <div className="w-2.5 h-2.5 bg-[#6A4DFF] rounded-full" />}
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-gray-900">Schedule for Later</span>
                          <span className="block text-xs text-gray-500">Pick a date and time</span>
                        </div>
                        <input
                          type="radio"
                          value="schedule"
                          checked={formData.scheduleType === 'schedule'}
                          onChange={(e) => setFormData(prev => ({ ...prev, scheduleType: e.target.value }))}
                          className="hidden"
                        />
                      </label>

                      {formData.scheduleType === 'schedule' && (
                        <div className="pt-2 pl-8 animate-in fade-in slide-in-from-top-2 duration-200">
                          <input
                            type="datetime-local"
                            value={formData.scheduledTime}
                            onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6A4DFF]/20 focus:border-[#6A4DFF]"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Preview (40%) */}
              <div className="hidden lg:flex w-full lg:w-[40%] bg-gray-50 items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-50"></div>

                {/* Smartphone Frame - Resized to be smaller */}
                <div className="bg-white rounded-[2rem] border-[8px] border-gray-900 shadow-2xl overflow-hidden relative w-[260px] h-[520px] flex flex-col ring-1 ring-gray-900/5 z-10 transform transition-transform hover:scale-[1.02]">
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-b-lg z-30"></div>

                  {/* Status Bar */}
                  <div className="bg-white px-5 py-2 flex justify-between items-center z-20 pt-3">
                    <span className="text-[10px] font-semibold text-gray-900">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-3 h-2 bg-gray-900 rounded-[1px]"></div>
                      <div className="w-3 h-2 bg-gray-900 rounded-[1px]"></div>
                    </div>
                  </div>

                  {/* App Header */}
                  <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50 bg-white sticky top-0 z-10">
                    <div className="text-sm font-bold tracking-tight">Instagram</div>
                    <div className="flex gap-3 text-gray-900">
                      <Plus size={18} strokeWidth={2.5} />
                      <Heart size={18} strokeWidth={2.5} />
                      <MessageCircle size={18} strokeWidth={2.5} />
                    </div>
                  </div>

                  {/* Content Scroll Area - Removed Scroll */}
                  <div className="flex-1 overflow-hidden bg-white flex flex-col">
                    {/* Post Header */}
                    <div className="px-3 py-2 flex items-center justify-between flex-none">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600 p-[2px]">
                          <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                            <img
                              src={`https://ui-avatars.com/api/?name=${clients.find(c => c._id === formData.clientId)?.name || 'User'}&background=random`}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-gray-900 block">
                            {clients.find(c => c._id === formData.clientId)?.name || 'Acme Corp'}
                          </span>
                          <span className="text-[10px] text-gray-500 block">Original Audio</span>
                        </div>
                      </div>
                      <div className="text-gray-900 font-bold text-xs">•••</div>
                    </div>

                    {/* Media - Adjusted to fit */}
                    <div className="relative bg-black flex-1 w-full flex items-center justify-center overflow-hidden">
                      {formData.mediaFiles.length > 0 ? (
                        (formData.mediaFiles[0].file?.type.startsWith('video/') || formData.mediaFiles[0].preview?.match(/\.(mp4|mov|webm)$/i)) ? (
                          <video
                            src={formData.mediaFiles[0].preview}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                          />
                        ) : (
                          <img
                            src={formData.mediaFiles[0].preview}
                            alt="Post preview"
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <ImageIcon size={40} strokeWidth={1.5} />
                          <span className="text-xs font-medium">No media selected</span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="px-3 py-2 flex justify-between items-center flex-none">
                      <div className="flex gap-4 text-gray-900">
                        <Heart size={20} strokeWidth={2} />
                        <MessageCircle size={20} strokeWidth={2} />
                        <Send size={20} strokeWidth={2} />
                      </div>
                      <Bookmark size={20} strokeWidth={2} className="text-gray-900" />
                    </div>

                    {/* Caption & Likes */}
                    <div className="px-3 pb-4 space-y-1 flex-none">
                      <p className="text-xs font-bold text-gray-900">1,178 likes</p>
                      <div className="text-xs text-gray-900 leading-relaxed line-clamp-2">
                        <span className="font-bold mr-1.5">{clients.find(c => c._id === formData.clientId)?.name || 'Acme Corp'}</span>
                        {formData.caption || 'Write a compelling caption...'}
                      </div>
                      <p className="text-[10px] text-gray-400 uppercase mt-1 font-medium">View all 7 comments</p>
                      <p className="text-[10px] text-gray-400 font-medium">2 HOURS AGO</p>
                    </div>
                  </div>

                  {/* Bottom Nav Removed */}

                </div>
              </div>
            </div>

            {/* 3. Bottom Sticky Action Bar */}
            <div className="flex-none px-4 lg:px-8 py-5 bg-white border-t border-[#E9E9E9] flex items-center justify-between z-20">
              <button
                type="button"
                onClick={() => handleSubmit(null, true)}
                className="px-5 py-2.5 text-gray-600 font-semibold hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <Save size={18} />
                Save Draft
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 text-gray-700 font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm shadow-sm"
                >
                  Preview Post
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-2.5 bg-[#6A4DFF] text-white font-semibold rounded-lg hover:bg-[#5839EE] transition-all text-sm shadow-lg shadow-[#6A4DFF]/30 disabled:opacity-70 disabled:shadow-none flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Publish Now
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>

          {/* AI Generator Modal Overlay */}
          {showAIGenerator && (
            <AIGenerator
              type={aiGeneratorType}
              onClose={() => setShowAIGenerator(false)}
              onGenerate={(content) => {
                if (aiGeneratorType === 'caption') {
                  setFormData(prev => ({ ...prev, caption: content }));
                } else {
                  handleInsertHashtagSuggestion(content);
                }
                setShowAIGenerator(false);
              }}
              initialContext={formData.caption}
            />
          )}

          {/* Cropper Overlay */}
          {showCropper && (
            <div className="absolute inset-0 z-50 bg-white flex flex-col">
              <div className="flex-none px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Crop Image</h3>
                <button onClick={() => setShowCropper(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 bg-gray-50 flex items-center justify-center p-8 overflow-hidden">
                <canvas ref={canvasRef} className="max-w-full max-h-full shadow-2xl rounded-lg" />
              </div>
              <div className="flex-none px-8 py-4 border-t border-gray-100 flex justify-end gap-4 bg-white">
                <button
                  onClick={() => setShowCropper(false)}
                  className="px-6 py-2 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyCrop}
                  className="px-6 py-2 bg-[#6A4DFF] text-white font-semibold rounded-lg hover:bg-[#5839EE] shadow-lg shadow-[#6A4DFF]/30"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <AIGenerator
          type={aiGeneratorType}
          existingCaption={formData.caption}
          onSelect={(text) => {
            if (aiGeneratorType === 'caption') {
              setFormData(prev => ({ ...prev, caption: text }));
            } else {
              // For hashtags, append to existing hashtags
              const newHashtags = text.match(/#[a-zA-Z0-9_]+/g) || [];
              const cleanHashtags = newHashtags.map(h => h.replace('#', ''));
              setFormData(prev => ({
                ...prev,
                hashtags: [...new Set([...prev.hashtags, ...cleanHashtags])]
              }));
            }
          }}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border animate-in fade-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error'
          ? 'bg-red-50 border-red-100 text-red-900'
          : 'bg-gray-900 border-gray-800 text-white'
          }`}>
          {toast.type === 'error' ? (
            <AlertCircle size={20} className="text-red-500 shrink-0" />
          ) : (
            <CheckCircle size={20} className="text-[#00FF94] shrink-0" />
          )}
          <p className="font-medium text-sm">{toast.message}</p>
        </div>
      )}
    </>
  );
};

export default CreatePostModal;
