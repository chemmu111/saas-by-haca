/**
 * Media utility functions for file handling, validation, and processing
 */

/**
 * Get file type from file object
 * @param {File} file - File object
 * @returns {string} - 'image', 'video', 'audio', or 'unknown'
 */
export const getFileType = (file) => {
  if (!file || !file.type) return 'unknown';
  
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  
  return 'unknown';
};

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get image dimensions from file
 * @param {File} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
};

/**
 * Get video metadata (duration, dimensions)
 * @param {File} file - Video file
 * @returns {Promise<{duration: number, width: number, height: number}>}
 */
export const getVideoMetadata = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    };
    
    video.src = url;
  });
};

/**
 * Validate file for Instagram requirements
 * @param {File} file - File to validate
 * @param {string} postType - Post type (post, story, reel, carousel)
 * @returns {Promise<{isValid: boolean, errors: string[]}>}
 */
export const validateInstagramFile = async (file, postType = 'post') => {
  const errors = [];
  const fileType = getFileType(file);
  
  // Size limits
  const maxSize = {
    image: 8 * 1024 * 1024, // 8MB
    video: 100 * 1024 * 1024 // 100MB
  };
  
  if (fileType === 'image' && file.size > maxSize.image) {
    errors.push(`Image exceeds 8MB limit (${formatFileSize(file.size)})`);
  }
  
  if (fileType === 'video' && file.size > maxSize.video) {
    errors.push(`Video exceeds 100MB limit (${formatFileSize(file.size)})`);
  }
  
  // Post type specific validations
  if (postType === 'reel') {
    if (fileType !== 'video') {
      errors.push('Reels require a video file');
    } else {
      try {
        const metadata = await getVideoMetadata(file);
        if (metadata.duration > 90) {
          errors.push(`Reel videos must be 90 seconds or less (${Math.round(metadata.duration)}s)`);
        }
        if (metadata.duration < 3) {
          errors.push('Reel videos must be at least 3 seconds');
        }
      } catch (err) {
        errors.push('Failed to validate video metadata');
      }
    }
  }
  
  if (postType === 'story') {
    if (fileType === 'video') {
      try {
        const metadata = await getVideoMetadata(file);
        if (metadata.duration > 15) {
          errors.push(`Story videos must be 15 seconds or less (${Math.round(metadata.duration)}s)`);
        }
      } catch (err) {
        errors.push('Failed to validate video metadata');
      }
    }
  }
  
  if (postType === 'carousel') {
    if (fileType !== 'image') {
      errors.push('Carousels only support images');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate aspect ratio from dimensions
 * @param {number} width - Image/video width
 * @param {number} height - Image/video height
 * @returns {string} - Aspect ratio (e.g., "1:1", "4:5", "16:9")
 */
export const calculateAspectRatio = (width, height) => {
  if (!width || !height) return 'unknown';
  
  const ratio = width / height;
  
  // Common ratios
  if (Math.abs(ratio - 1) < 0.01) return '1:1';
  if (Math.abs(ratio - 4/5) < 0.01) return '4:5';
  if (Math.abs(ratio - 5/4) < 0.01) return '5:4';
  if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
  if (Math.abs(ratio - 1.91) < 0.01) return '1.91:1';
  
  return `${width}:${height}`;
};

/**
 * Get recommended format based on aspect ratio
 * @param {number} width - Image/video width
 * @param {number} height - Image/video height
 * @returns {string} - Recommended format
 */
export const getRecommendedFormat = (width, height) => {
  const ratio = calculateAspectRatio(width, height);
  
  switch (ratio) {
    case '1:1':
      return 'square';
    case '4:5':
    case '5:4':
      return 'portrait';
    case '16:9':
    case '1.91:1':
      return 'landscape';
    case '9:16':
      return 'reel';
    default:
      return 'square';
  }
};

/**
 * Create preview URL from file
 * @param {File} file - File object
 * @returns {string} - Blob URL for preview
 */
export const createPreviewUrl = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Revoke preview URL to free memory
 * @param {string} url - Blob URL to revoke
 */
export const revokePreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * Validate media files for carousel (requires 2+ images)
 * @param {File[]} files - Array of files
 * @returns {Promise<{isValid: boolean, errors: string[]}>}
 */
export const validateCarouselFiles = async (files) => {
  const errors = [];
  
  if (!files || files.length < 2) {
    errors.push('Carousels require at least 2 images');
    return { isValid: false, errors };
  }
  
  if (files.length > 10) {
    errors.push('Carousels can have maximum 10 images');
    return { isValid: false, errors };
  }
  
  // Check all files are images
  for (let i = 0; i < files.length; i++) {
    const fileType = getFileType(files[i]);
    if (fileType !== 'image') {
      errors.push(`File ${i + 1} is not an image`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
