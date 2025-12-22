
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './models/Client.js';
import { fetchInstagramMedia } from './services/instagramInsightsService.js';

dotenv.config();

const runDebug = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);

        // Find Instagram client
        const client = await Client.findOne({
            platform: 'instagram',
            igUserId: { $exists: true },
            pageAccessToken: { $exists: true }
        });

        if (!client) {
            console.error('❌ No Instagram client found.');
            return;
        }

        console.log(`\n🔍 Fetching Media for: ${client.name} (${client.igUserId})`);

        // Test Media Fetch
        console.log('   Calling fetchInstagramMedia...');
        const result = await fetchInstagramMedia(client.igUserId, client.pageAccessToken, 20); // Limit 20

        if (result.success) {
            const posts = result.data || [];
            console.log(`\n✅ Success! Found ${posts.length} posts.`);

            if (posts.length > 0) {
                console.log('\nSample Post Dump:');
                const p = posts[0];
                console.log(JSON.stringify(p, null, 2));

                console.log('\nDates of first 5 posts:');
                posts.slice(0, 5).forEach(p => console.log(`- ${p.timestamp} (${p.media_type})`));
            } else {
                console.warn('⚠️ No posts returned. Check if account is empty or permissions missing.');
            }
        } else {
            console.error('\n❌ Media Fetch Failed:', result.error);
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await mongoose.disconnect();
    }
};

runDebug();
