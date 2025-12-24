
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from './src/models/Post.js'; // Adjust path if needed
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

async function debugCalendar() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error('❌ MONGODB_URI is missing in .env');
            return;
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected.');

        // Find all users (or just one to test)
        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            console.log(`\nChecking posts for user: ${user.name} (${user.email}) [${user._id}]`);

            // Find all posts for this user
            const posts = await Post.find({ createdBy: user._id }).sort({ scheduledTime: -1 });

            console.log(`Found ${posts.length} posts.`);

            posts.forEach(p => {
                console.log(`- Post [${p.status}] ID: ${p._id}`);
                console.log(`  Scheduled: ${p.scheduledTime} (UTC)`);
                console.log(`  Local String: ${p.scheduledTime ? new Date(p.scheduledTime).toString() : 'N/A'}`);
                console.log(`  Caption: ${p.caption ? p.caption.substring(0, 30) + '...' : 'No caption'}`);
            });
        }

        // Check stats for ALL posts
        console.log('\nChecking stats for ALL posts in system:');
        const allPosts = await Post.find({});
        console.log(`Total Posts: ${allPosts.length}`);

        const byStatus = {};
        allPosts.forEach(p => {
            byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        });
        console.log('Counts by status:', byStatus);

        console.log('\nChecking last 5 created posts:');
        const last5 = await Post.find({}).sort({ createdAt: -1 }).limit(5).populate('createdBy', 'name email'); // Removed client population for safety if missing
        last5.forEach(p => {
            console.log(`- [${p.status}] ID: ${p._id}`);
            console.log(`  Created: ${p.createdAt}`);
            console.log(`  Scheduled: ${p.scheduledTime}`);
            console.log(`  Content: ${p.content ? p.content.substring(0, 20) : 'n/a'}`);
        });

        // Check for ANY scheduled posts
        console.log('\nChecking for ANY scheduled posts in the system:');
        const allScheduled = await Post.find({ status: 'scheduled' }).populate('createdBy', 'name email');
        console.log(`Found ${allScheduled.length} total scheduled posts.`);
        allScheduled.forEach(p => {
            console.log(`- Post ID: ${p._id}`);
            console.log(`  Created By: ${p.createdBy ? p.createdBy.name + ' (' + p.createdBy.email + ')' : 'UNKNOWN'}`);
            console.log(`  Scheduled: ${p.scheduledTime}`);
            console.log(`  Client: ${p.client}`);
        });

        await mongoose.disconnect();
        console.log('\nDone.');
    } catch (error) {
        console.error('Error:', error);
        await mongoose.disconnect();
    }
}

debugCalendar();
