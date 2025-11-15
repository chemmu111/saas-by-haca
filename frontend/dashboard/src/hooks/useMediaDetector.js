import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!files || files.length === 0) {
      setMediaInfo([]);
      setValidationErrors([]);
      return;
    }

    const processFiles = async () => {
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
      setValidationErrors(errors);
      setLoading(false);
    };

    processFiles();

    // Cleanup previews on unmount
    return () => {
      mediaInfo.forEach(item => {
        if (item.preview && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
    };
  }, [files]);

  /**
   * Validates media files for a specific post type and platform
   * @param {string} postType - The post type (post, story, reel, carousel)
   * @param {string} platform - The platform (instagram, facebook, both)
   * @param {Array} mediaFiles - Array of processed media file info
   * @returns {Object} - Validation result with isValid boolean and errors array
   */
  const validateForPostType = (postType, platform, mediaFiles) => {
    const errors = [];

    if (!mediaFiles || mediaFiles.length === 0) {
      return { isValid: false, errors: ['At least one media file is required'] };
    }

    // Validate based on post type
    switch (postType) {
      case 'reel':
        // Reel requires exactly one video
        if (mediaFiles.length !== 1) {
          errors.push('Reels must have exactly one video file');
        } else {
          const file = mediaFiles[0];
          if (file.type !== 'video') {
            errors.push('Reels require a video file');
          } else if (file.duration && file.duration > 90) {
            errors.push(`Reel videos must be 90 seconds or less (current: ${Math.round(file.duration)}s)`);
          } else if (file.duration && file.duration < 3) {
            errors.push('Reel videos must be at least 3 seconds');
          }
        }
        break;

      case 'story':
        // Story can have images or videos
        const hasInvalidFile = mediaFiles.some(file => file.type === 'unsupported');
        if (hasInvalidFile) {
          errors.push('Stories only support images and videos');
        }
        if (platform === 'instagram' || platform === 'both') {
          // Instagram stories have specific requirements
          const hasInvalidVideo = mediaFiles.some(file =>
            file.type === 'video' && file.duration && file.duration > 15
          );
          if (hasInvalidVideo) {
            errors.push('Instagram story videos must be 15 seconds or less');
          }
        }
        break;

      case 'carousel':
        // Carousel requires at least 2 images
        if (mediaFiles.length < 2) {
          errors.push('Carousels require at least 2 images');
        }
        if (mediaFiles.length > 10) {
          errors.push('Carousels can have maximum 10 images');
        }
        const hasNonImage = mediaFiles.some(file => file.type !== 'image');
        if (hasNonImage) {
          errors.push('Carousels only support images');
        }
        break;

      default: // post
        // Regular posts can have images or videos
        const hasUnsupported = mediaFiles.some(file => file.type === 'unsupported');
        if (hasUnsupported) {
          errors.push('Posts only support images and videos');
        }
        break;
    }

    // Platform-specific validations
    if (platform === 'instagram' || platform === 'both') {
      mediaFiles.forEach((file, index) => {
        if (file.type === 'video' && file.size > 100 * 1024 * 1024) { // 100MB
          errors.push(`Instagram video ${index + 1} exceeds 100MB limit (${file.sizeFormatted})`);
        }
        if (file.type === 'image' && file.size > 8 * 1024 * 1024) { // 8MB
          errors.push(`Instagram image ${index + 1} exceeds 8MB limit (${file.sizeFormatted})`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return {
    mediaInfo,
    validationErrors,
    loading,
    validateForPostType
  };
};