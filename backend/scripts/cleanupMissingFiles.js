import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Post from '../src/models/Post.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

console.log(`Uploads Directory: ${UPLOADS_DIR}`);

async function cleanupMissingFiles() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const posts = await Post.find({});
        let modifiedCount = 0;

        for (const post of posts) {
            let isModified = false;
            const originalMediaUrls = [...(post.mediaUrls || [])];

            // Filter mediaUrls
            if (post.mediaUrls && post.mediaUrls.length > 0) {
                post.mediaUrls = post.mediaUrls.filter(url => {
                    // Check if it's a local/ngrok/render URL that maps to uploads
                    if (url.includes('/uploads/') || url.includes('ngrok') || url.includes('localhost') || url.includes('onrender')) {
                        // Extract filename
                        const parts = url.split('/');
                        const filename = parts[parts.length - 1];

                        // Safety check: looks like a filename?
                        if (!filename || filename.length < 5) return true;

                        // Check existence
                        const filePath = path.join(UPLOADS_DIR, filename);
                        if (!fs.existsSync(filePath)) {
                            console.warn(`[Missing] Post ${post._id}: ${url} (File: ${filename})`);
                            isModified = true;
                            return false; // Remove
                        }
                    }
                    return true; // Keep Cloudinary or existing files
                });
            }

            // Check coverUrl
            if (post.coverUrl && (post.coverUrl.includes('/uploads/') || post.coverUrl.includes('ngrok'))) {
                const parts = post.coverUrl.split('/');
                const filename = parts[parts.length - 1];
                const filePath = path.join(UPLOADS_DIR, filename);
                if (!fs.existsSync(filePath)) {
                    console.warn(`[Missing Cover] Post ${post._id}: ${post.coverUrl}`);
                    post.coverUrl = undefined;
                    isModified = true;
                }
            }

            // Check thumbnailUrl
            if (post.thumbnailUrl && (post.thumbnailUrl.includes('/uploads/') || post.thumbnailUrl.includes('ngrok'))) {
                const parts = post.thumbnailUrl.split('/');
                const filename = parts[parts.length - 1];
                const filePath = path.join(UPLOADS_DIR, filename);
                if (!fs.existsSync(filePath)) {
                    console.warn(`[Missing Thumbnail] Post ${post._id}: ${post.thumbnailUrl}`);
                    post.thumbnailUrl = undefined;
                    isModified = true;
                }
            }

            if (isModified) {
                await post.save();
                console.log(`Updated Post ${post._id} - Removed ${originalMediaUrls.length - post.mediaUrls.length} media URLs.`);
                modifiedCount++;
            }
        }

        console.log(`\nCleanup complete. Modified ${modifiedCount} posts.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

cleanupMissingFiles();
