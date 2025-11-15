import { useState, useRef } from 'react';

export const useImageCrop = () => {
  const [cropData, setCropData] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const canvasRef = useRef(null);

  const aspectRatios = {
    '1:1': 1,
    '4:5': 4/5,
    '16:9': 16/9
  };

  const initializeCrop = (imageSrc, aspectRatio = '1:1') => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const maxWidth = 800;
      const maxHeight = 600;

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Initialize crop area
      const cropSize = Math.min(width, height) * 0.8;
      const cropX = (width - cropSize) / 2;
      const cropY = (height - cropSize) / 2;

      setCropData({
        x: cropX,
        y: cropY,
        width: cropSize,
        height: cropSize,
        aspectRatio,
        imageWidth: width,
        imageHeight: height
      });
    };
    img.src = imageSrc;
  };

  const updateCropArea = (newCropData) => {
    setCropData(prev => ({ ...prev, ...newCropData }));
  };

  const applyCrop = () => {
    if (!cropData || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Create a temporary canvas for the cropped image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    const { x, y, width, height } = cropData;

    // Set temp canvas size to crop dimensions
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw the cropped portion
    tempCtx.drawImage(
      canvas,
      x, y, width, height,  // Source rectangle
      0, 0, width, height   // Destination rectangle
    );

    // Convert to blob
    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        const croppedUrl = URL.createObjectURL(blob);
        setCroppedImage(croppedUrl);
        resolve({ blob, url: croppedUrl });
      }, 'image/jpeg', 0.9);
    });
  };

  const autoCropToRatio = (imageSrc, targetRatio) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      const imageRatio = width / height;

      let cropWidth, cropHeight, cropX, cropY;

      if (imageRatio > targetRatio) {
        // Image is wider, crop width
        cropHeight = height;
        cropWidth = height * targetRatio;
        cropX = (width - cropWidth) / 2;
        cropY = 0;
      } else {
        // Image is taller, crop height
        cropWidth = width;
        cropHeight = width / targetRatio;
        cropX = 0;
        cropY = (height - cropHeight) / 2;
      }

      setCropData({
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
        aspectRatio: targetRatio,
        imageWidth: width,
        imageHeight: height,
        autoCropped: true
      });
    };
    img.src = imageSrc;
  };

  const resetCrop = () => {
    setCropData(null);
    setCroppedImage(null);
  };

  const getInstagramRequirements = (format) => {
    const requirements = {
      square: { ratio: '1:1', dimensions: '1080×1080', description: 'Perfect square for feed posts' },
      portrait: { ratio: '4:5', dimensions: '1080×1350', description: 'Vertical format for stories and reels' },
      landscape: { ratio: '1.91:1', dimensions: '1080×608', description: 'Horizontal format for landscape posts' },
      story: { ratio: '9:16', dimensions: '1080×1920', description: 'Full-screen vertical for stories' },
      reel: { ratio: '9:16', dimensions: '1080×1920', description: 'Vertical video format for reels' }
    };

    return requirements[format] || requirements.square;
  };

  return {
    cropData,
    croppedImage,
    canvasRef,
    aspectRatios,
    initializeCrop,
    updateCropArea,
    applyCrop,
    autoCropToRatio,
    resetCrop,
    getInstagramRequirements
  };
};
