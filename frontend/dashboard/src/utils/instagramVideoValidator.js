/**
 * Instagram Video Validator
 * Validates video files against Instagram's official requirements for Reels and Feed videos.
 */

export const validateVideo = async (file) => {
    const result = {
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
            duration: 0,
            width: 0,
            height: 0,
            sizeMB: 0,
            type: file.type
        }
    };

    // 1. Allowed Formats
    const allowedTypes = ['video/mp4', 'video/quicktime'];
    const allowedExts = ['mp4', 'mov'];
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) {
        result.errors.push(`Format not supported. Allowed: .mp4, .mov`);
        result.isValid = false;
        return result; // Stop if format is wrong
    }

    // 2. File Size Limits
    const sizeMB = file.size / (1024 * 1024);
    result.metadata.sizeMB = parseFloat(sizeMB.toFixed(2));

    if (sizeMB > 4096) { // 4GB
        result.errors.push(`File too large (${sizeMB.toFixed(1)}MB). Max: 4GB`);
        result.isValid = false;
    }
    if (sizeMB < 1) {
        result.warnings.push(`File is small (${sizeMB.toFixed(1)}MB). Instagram may compress it poorly.`);
    }

    // Load video for metadata
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            const duration = video.duration;
            const width = video.videoWidth;
            const height = video.videoHeight;

            result.metadata.duration = duration;
            result.metadata.width = width;
            result.metadata.height = height;

            // 3. Duration
            // Global Min: 3s
            if (duration < 3) {
                result.errors.push(`Video too short (${duration.toFixed(1)}s). Min: 3s.`);
                result.isValid = false;
            }

            // Global Max: 60 mins (Feed)
            if (duration > 3600) {
                result.errors.push(`Video too long (${(duration / 60).toFixed(1)}m). Max: 60m.`);
                result.isValid = false;
            }

            // Reel Warning (3 mins)
            if (duration > 180 && duration <= 3600) {
                result.warnings.push(`Video is longer than 3 mins (Reel limit). It will be posted as a Feed Video.`);
            }

            // 4. Dimensions (Resolution)
            // Minimum: 720x1280 (implies 720px width for vertical)
            // We'll enforce min width of 720px for quality
            if (width < 320) {
                result.errors.push(`Resolution width too low (${width}px). Min width: 320px.`);
                result.isValid = false;
            } else if (width < 480) {
                result.warnings.push(`Low resolution (${width}px). Recommended width: 720px+ for best quality.`);
            }

            // Horizontal check
            if (width > height) {
                result.warnings.push(`Horizontal video detected (${width}x${height}). Instagram prefers vertical (9:16).`);
            }

            // 6. Aspect Ratio
            const ratio = width / height;
            // 9:16 = 0.5625
            // 4:5 = 0.8
            // 16:9 = 1.77 (Horizontal)

            // If vertical but not 9:16
            if (height > width) {
                const targetRatio = 9 / 16; // 0.5625
                const tolerance = 0.01;
                if (Math.abs(ratio - targetRatio) > tolerance) {
                    // It's vertical but not exactly 9:16
                    result.warnings.push(`Aspect ratio is ${ratio.toFixed(2)}. For best results on Reels use 9:16 (0.56).`);
                }
            }

            // 7. Audio Check (Best Effort)
            // Note: This might not work in all browsers without user interaction, but for file validation it often works.
            if (video.mozHasAudio === false || (video.webkitAudioDecodedByteCount === 0) || (video.audioTracks && video.audioTracks.length === 0)) {
                result.warnings.push("No audio track detected. Silent videos may have reduced reach.");
            } else {
                // Try captureStream if available
                try {
                    if (video.captureStream) {
                        const stream = video.captureStream();
                        const audioTracks = stream.getAudioTracks();
                        if (audioTracks.length === 0) {
                            result.warnings.push("No audio track detected. Silent videos may have reduced reach.");
                        }
                    }
                } catch (e) {
                    // Ignore error if captureStream fails
                }
            }

            // 5. Frame Rate (FPS) - Placeholder
            // Cannot reliably detect FPS in browser without external lib.
            // We skip strict FPS check but assume standard.

            window.URL.revokeObjectURL(video.src);

            console.log('📸 Video Validation Result:', {
                file: file.name,
                ...result
            });

            resolve(result);
        };

        video.onerror = () => {
            window.URL.revokeObjectURL(video.src);
            result.errors.push("Failed to load video metadata. File might be corrupted or format unsupported.");
            result.isValid = false;
            console.error('📸 Video Validation Failed:', result);
            resolve(result);
        };

        video.src = window.URL.createObjectURL(file);
    });
};
