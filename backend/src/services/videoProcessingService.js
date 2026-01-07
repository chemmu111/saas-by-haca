import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

// Ensure uploads directory exists for processed files
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'processed');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Get video metadata using ffprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<Object>} - Video metadata
 */
export const getVideoMetadata = (filePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(err);
            }

            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

            resolve({
                format: metadata.format,
                video: videoStream,
                audio: audioStream,
                duration: metadata.format.duration,
                size: metadata.format.size,
                width: videoStream ? videoStream.width : 0,
                height: videoStream ? videoStream.height : 0,
                codec: videoStream ? videoStream.codec_name : 'unknown',
                audioCodec: audioStream ? audioStream.codec_name : 'none'
            });
        });
    });
};

/**
 * Process video for Instagram (Reels/Stories)
 * Enforces: 9:16 aspect ratio, H.264 video, AAC audio, MP4 container
 * @param {string} inputPath - Path to input video
 * @returns {Promise<string>} - Path to processed video
 */
export const processVideoForInstagram = (inputPath) => {
    return new Promise((resolve, reject) => {
        const filename = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(UPLOADS_DIR, `${filename}_processed.mp4`);

        console.log(`🎬 Starting video processing for: ${filename}`);
        console.log(`   Input: ${inputPath}`);
        console.log(`   Output: ${outputPath}`);

        // Check if output file already exists, delete if so
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        ffmpeg(inputPath)
            // Force 1080x1920 resolution with crop (cover)
            // This ensures 9:16 aspect ratio without distortion (crops sides of landscape video)
            .outputOptions([
                '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
                '-c:v', 'libx264',       // Force H.264 codec
                '-preset', 'medium',     // Balance between speed and quality
                '-crf', '23',            // Quality (lower is better, 18-28 is good range)
                '-c:a', 'aac',           // Force AAC audio
                '-b:a', '128k',          // Audio bitrate
                '-movflags', '+faststart', // Optimize for web streaming
                '-pix_fmt', 'yuv420p'    // Ensure compatibility
            ])
            .on('start', (commandLine) => {
                console.log('   FFmpeg command:', commandLine);
            })
            .on('progress', (progress) => {
                // Optional: Log progress periodically
                // console.log(`   Processing: ${progress.percent}% done`);
            })
            .on('end', async () => {
                console.log('   ✅ Video processing complete');

                // Get new file stats
                try {
                    const stats = fs.statSync(outputPath);
                    const sizeMB = stats.size / (1024 * 1024);
                    console.log(`   New file size: ${sizeMB.toFixed(2)} MB`);
                    resolve(outputPath);
                } catch (e) {
                    console.error('   ❌ Error getting processed file stats:', e);
                    resolve(outputPath); // Resolve anyway
                }
            })
            .on('error', (err, stdout, stderr) => {
                console.error('   ❌ FFmpeg error:', err.message);
                console.error('   FFmpeg stderr:', stderr);
                reject(err);
            })
            .save(outputPath);
    });
};
