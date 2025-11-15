import { useState, useEffect } from 'react';

export const useMediaDetection = (files) => {
  const [mediaInfo, setMediaInfo] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setMediaInfo([]);
      setValidationErrors([]);
      return;
    }

    const processFiles = async () => {
      const info = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileInfo = {
          index: i,
          file,
          type: 'unknown',
          size: file.size,
          sizeMB: (file.size / (1024 * 1024)).toFixed(2),
          preview: null,
          duration: null,
          dimensions: null,
          validation: { isValid: true, message: '' }
        };

        // Detect file type
        if (file.type.startsWith('image/')) {
          fileInfo.type = 'image';
          fileInfo.preview = URL.createObjectURL(file);

          // Get image dimensions
          await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              fileInfo.dimensions = { width: img.width, height: img.height };
              URL.revokeObjectURL(img.src);
              resolve();
            };
            img.src = fileInfo.preview;
          });
        } else if (file.type.startsWith('video/')) {
          fileInfo.type = 'video';
          fileInfo.preview = URL.createObjectURL(file);

          // Get video duration and dimensions
          await new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              fileInfo.duration = video.duration;
              fileInfo.dimensions = { width: video.videoWidth, height: video.videoHeight };
              URL.revokeObjectURL(video.src);
              resolve();
            };
            video.src = fileInfo.preview;
          });
        } else {
          fileInfo.type = 'unsupported';
          fileInfo.validation = {
            isValid: false,
            message: 'Unsupported file type. Only images and videos are allowed.'
          };
          errors.push(fileInfo.validation.message);
        }

        info.push(fileInfo);
      }

      setMediaInfo(info);
      setValidationErrors(errors);
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
        } else if (mediaFiles[0].type !== 'video') {
          errors.push('Reels require a video file');
        } else if (mediaFiles[0].duration && mediaFiles[0].duration > 90) {
          errors.push('Reel videos must be 90 seconds or less');
        }
        break;

      case 'story':
        // Story can have images or videos
        const hasInvalidFile = mediaFiles.some(file => file.type === 'unsupported');
        if (hasInvalidFile) {
          errors.push('Stories only support images and videos');
        }
        if (platform === 'instagram') {
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
    if (platform === 'instagram') {
      mediaFiles.forEach((file, index) => {
        if (file.type === 'video' && file.size > 100 * 1024 * 1024) { // 100MB
          errors.push(`Instagram video ${index + 1} exceeds 100MB limit`);
        }
        if (file.type === 'image' && file.size > 8 * 1024 * 1024) { // 8MB
          errors.push(`Instagram image ${index + 1} exceeds 8MB limit`);
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
    validateForPostType
  };
};
