import { useState, useEffect, useRef, useMemo } from 'react';
import { getFileType, getImageDimensions, getVideoMetadata, formatFileSize } from '../lib/mediaUtils';

/**
 * Custom hook for detecting media file types and validating them
 * @param {File[]} files - Array of File objects
 * @returns {Object} - Media information and validation results
 */
export const useMediaDetector = (files) => {
  const [mediaInfo, setMediaInfo] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const mediaInfoRef = useRef([]);
  const filesRef = useRef([]);
  const isProcessingRef = useRef(false);

  // Create a stable reference for files by comparing file names and sizes
  const filesKey = useMemo(() => {
    if (!files || files.length === 0) return '';
    return files.map(f => `${f.name}-${f.size}-${f.lastModified}`).join('|');
  }, [files]);

  useEffect(() => {
    // Prevent infinite loops by checking if files actually changed
    if (filesKey === filesRef.current) {
      return;
    }

    // Prevent concurrent processing
    if (isProcessingRef.current) {
      return;
    }

    filesRef.current = filesKey;

    if (!files || files.length === 0) {
      setMediaInfo([]);
      setValidationErrors([]);
      return;
    }

    const processFiles = async () => {
      isProcessingRef.current = true;
      setLoading(true);
      const info = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = getFileType(file);

        const fileInfo = {
          index: i,
          file,
          type: fileType,
          size: file.size,
          sizeFormatted: formatFileSize(file.size),
          preview: null,
          duration: null,
          dimensions: null,
          aspectRatio: null,
          validation: { isValid: true, message: '' }
        };

        try {
          if (fileType === 'image') {
            fileInfo.preview = URL.createObjectURL(file);
            const dimensions = await getImageDimensions(file);
            fileInfo.dimensions = dimensions;
            fileInfo.aspectRatio = `${dimensions.width}:${dimensions.height}`;
          } else if (fileType === 'video') {
            fileInfo.preview = URL.createObjectURL(file);
            const metadata = await getVideoMetadata(file);
            fileInfo.duration = metadata.duration;
            fileInfo.dimensions = { width: metadata.width, height: metadata.height };
            fileInfo.aspectRatio = `${metadata.width}:${metadata.height}`;
          } else {
            fileInfo.type = 'unsupported';
            fileInfo.validation = {
              isValid: false,
              message: 'Unsupported file type. Only images and videos are allowed.'
            };
            errors.push(`File ${i + 1}: ${fileInfo.validation.message}`);
          }
        } catch (err) {
          console.error(`Error processing file ${i + 1}:`, err);
          fileInfo.validation = {
            isValid: false,
            message: err.message || 'Failed to process file'
          };
          errors.push(`File ${i + 1}: ${fileInfo.validation.message}`);
        }

        info.push(fileInfo);
      }

      setMediaInfo(info);
      mediaInfoRef.current = info; // Update ref
      setValidationErrors(errors);
      setLoading(false);
      isProcessingRef.current = false;
    };

    processFiles();

    // Cleanup previews on unmount or when files change
    return () => {
      // Cleanup previous mediaInfo using ref to avoid dependency issues
      mediaInfoRef.current.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [filesKey]);

  /**
   * Format duration in seconds to MM:SS
   */
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /**
   * Validates media files for a specific post type and platform
   * @param {string} postType - The post type (post, story, reel, carousel, video)
   * @param {string} platform - The platform (instagram, facebook, both)
   * @param {Array} mediaFiles - Array of processed media file info
   * @returns {Object} - { isValid, level, messages }
   */
  const validateForPostType = (postType, platform, mediaFiles) => {
    const messages = [];
    let level = 'valid'; // valid, warning, error

    if (!mediaFiles || mediaFiles.length === 0) {
      return { isValid: false, level: 'error', messages: ['At least one media file is required'] };
    }

    const addMessage = (msg, type = 'error') => {
      messages.push(msg);
      if (type === 'error') level = 'error';
      else if (type === 'warning' && level !== 'error') level = 'warning';
    };

    // Validate based on post type
    switch (postType) {
      case 'reel':
        // Reel requires exactly one video
        if (mediaFiles.length !== 1) {
          addMessage('Reels must have exactly one video file', 'error');
        } else {
          const file = mediaFiles[0];
          if (file.type !== 'video') {
            addMessage('Reels require a video file', 'error');
          } else {
            // Duration: 3s - 180s (3 mins)
            if (file.duration) {
              if (file.duration > 180) {
                addMessage(`Reel duration (${formatDuration(file.duration)}) exceeds 3 minutes limit`, 'error');
              } else if (file.duration < 3) {
                addMessage('Reel duration must be at least 3 seconds', 'error');
              }
            }

            // File Size: 4GB
            if (file.size > 4 * 1024 * 1024 * 1024) {
              addMessage(`File size (${file.sizeFormatted}) exceeds 4GB limit`, 'error');
            }

            // Resolution & Aspect Ratio
            if (file.dimensions) {
              const { width, height } = file.dimensions;

              // Min resolution 320x (WhatsApp usually 480px)
              if (width < 320) {
                addMessage(`Resolution width (${width}px) is below minimum 320px`, 'error');
              } else if (width < 480) {
                addMessage(`Low resolution (${width}px). Recommended width: 720px+ for best quality.`, 'warning');
              }

              // Warn if < 1080x1920
              if (width < 1080 || height < 1920) {
                addMessage('Recommended resolution is 1080x1920 for best quality', 'warning');
              }

              // Aspect Ratio (9:16 to 4:5)
              const ratio = width / height;
              if (ratio > 0.8) { // Wider than 4:5 (0.8)
                addMessage('Reels should be vertical (9:16 recommended)', 'warning');
              }
            }
          }
        }
        break;

      case 'video': // Feed Video
        if (mediaFiles.length !== 1) {
          addMessage('Feed Videos must have exactly one video file', 'error');
        } else {
          const file = mediaFiles[0];
          if (file.type !== 'video') {
            addMessage('Feed Videos require a video file', 'error');
          } else {
            // Duration: 3s - 60 mins
            if (file.duration) {
              if (file.duration > 3600) {
                addMessage(`Video duration (${formatDuration(file.duration)}) exceeds 60 minutes limit`, 'error');
              } else if (file.duration < 3) {
                addMessage('Video duration must be at least 3 seconds', 'error');
              }
            }

            // File Size: 4GB
            if (file.size > 4 * 1024 * 1024 * 1024) {
              addMessage(`File size (${file.sizeFormatted}) exceeds 4GB limit`, 'error');
            }

            // Warnings for resolution
            if (file.dimensions) {
              const { width, height } = file.dimensions;
              if (width < 720) {
                addMessage(`Low resolution (${width}x${height}). 1080p recommended.`, 'warning');
              }
            }
          }
        }
        break;

      case 'story':
        const hasInvalidFile = mediaFiles.some(file => file.type === 'unsupported');
        if (hasInvalidFile) {
          addMessage('Stories only support images and videos', 'error');
        }
        if (platform === 'instagram' || platform === 'both') {
          const hasInvalidVideo = mediaFiles.some(file =>
            file.type === 'video' && file.duration && file.duration > 60
          );
          if (hasInvalidVideo) {
            addMessage('Instagram story videos must be 60 seconds or less', 'error');
          }
        }
        break;

      case 'carousel':
        if (mediaFiles.length < 2) {
          addMessage('Carousels require at least 2 images', 'error');
        }
        if (mediaFiles.length > 10) {
          addMessage('Carousels can have maximum 10 images', 'error');
        }
        const hasNonImage = mediaFiles.some(file => file.type !== 'image');
        if (hasNonImage) {
          addMessage('Carousels only support images', 'error');
        }
        break;

      default: // post
        const hasUnsupported = mediaFiles.some(file => file.type === 'unsupported');
        if (hasUnsupported) {
          addMessage('Posts only support images and videos', 'error');
        }

        // Image validation
        mediaFiles.forEach(file => {
          if (file.type === 'image') {
            if (file.size > 30 * 1024 * 1024) {
              addMessage(`Image ${file.file.name} exceeds 30MB limit`, 'error');
            }
            if (file.dimensions && (file.dimensions.width < 1080 && file.dimensions.height < 1080)) {
              addMessage(`Image ${file.file.name} is low resolution. 1080px+ recommended.`, 'warning');
            }
          }
        });
        break;
    }

    return {
      isValid: level !== 'error',
      level,
      messages: messages.length > 0 ? messages : (level === 'valid' ? ['Media is valid'] : [])
    };
  };

  return {
    mediaInfo,
    validationErrors,
    loading,
    validateForPostType
  };
};