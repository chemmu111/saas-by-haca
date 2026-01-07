import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from '../src/models/Post.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkMediaUrls() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const posts = await Post.find({}, 'mediaUrls coverUrl caption').sort({ createdAt: -1 }).limit(10);

        posts.forEach(post => {
            console.log(`Post ID: ${post._id}`);
            if (post.mediaUrls && post.mediaUrls.length > 0) {
                console.log('  MediaUrls:', post.mediaUrls);
            }
            if (post.coverUrl) {
                console.log('  CoverUrl:', post.coverUrl);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

checkMediaUrls();
