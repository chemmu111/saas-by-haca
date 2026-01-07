import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Cloudinary credentials are set
const isCloudinaryConfigured =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

let storage;

if (isCloudinaryConfigured) {
    console.log('☁️ Cloudinary configured - Using Cloud Storage for uploads');

    // Configure Cloudinary Storage
    storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'haca-social-uploads', // Folder name in Cloudinary
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'mp4', 'mov', 'avi', 'webm'],
            resource_type: 'auto', // Auto-detect image or video
        },
    });
} else {
    console.log('💾 Cloudinary NOT configured - Using Local Disk Storage (Ephemeral on Render)');

    // Configure Local Disk Storage (Fallback)
    storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = path.join(__dirname, '../../uploads');
            // Ensure directory exists
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    });
}

// Define allowed file types
const allowedImageTypes = /jpeg|jpg|png|gif|webp|heic|heif/;
const allowedVideoTypes = /mp4|mov|avi|mkv|webm|m4v/;
const allowedAudioTypes = /mp3|wav|ogg|m4a|aac|flac/;
const allowedMimeTypes = {
    // Images
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'image/heic': true,
    'image/heif': true,
    // Videos
    'video/mp4': true,
    'video/quicktime': true,
    'video/x-msvideo': true,
    'video/x-matroska': true,
    'video/webm': true,
    'video/x-m4v': true,
    // Audio
    'audio/mpeg': true,
    'audio/mp3': true,
    'audio/wav': true,
    'audio/ogg': true,
    'audio/m4a': true,
    'audio/aac': true,
    'audio/flac': true,
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
        timeout: 10 * 60 * 1000 // 10 minutes
    },
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        const isImage = allowedImageTypes.test(ext);
        const isVideo = allowedVideoTypes.test(ext);
        const isAudio = allowedAudioTypes.test(ext);

        // Log the file details for debugging
        console.log(`Processing upload: ${file.originalname}, Type: ${file.mimetype}, Ext: ${ext}`);

        // More lenient check: If extension is valid, allow it. 
        // We trust the extension because Cloudinary will validate the actual content.
        if (isImage || isVideo || isAudio) {
            cb(null, true);
        } else {
            console.error(`Rejected file: ${file.originalname}, Type: ${file.mimetype}`);
            cb(new Error(`File type not allowed. Supported: Images, Videos, and Audio.`));
        }
    }
});

export default upload;
