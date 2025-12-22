
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './models/Client.js';
import { fetchInstagramAnalytics } from './services/instagramInsightsService.js';

dotenv.config();

const runDebug = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // Find the first Instagram client
        const client = await Client.findOne({
            platform: 'instagram',
            igUserId: { $exists: true },
            pageAccessToken: { $exists: true }
        });

        if (!client) {
            console.error('❌ No suitable Instagram client found in database.');
            return;
        }

        console.log(`\n🔍 Testing Analytics for Client: ${client.name} (${client._id})`);
        console.log(`   IG User ID: ${client.igUserId}`);

        // Clear cache first to ensure fresh fetch
        // We can't easily import clearCache here without more setup, but we'll see if we hit cache.

        console.log('   Calling fetchInstagramAnalytics...');
        const result = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken, client);

        if (result.success) {
            console.log('\n✅ Fetch Success!');
            console.log('--------------------------------------------------');
            console.log('Total Media Items:', result.data.media ? result.data.media.total : 'N/A');
            console.log('Total Followers:', result.data.account ? result.data.account.follower_count : 'N/A');

            if (result.data.allPosts && result.data.allPosts.length > 0) {
                console.log(`\n📄 allPosts (first 3 of ${result.data.allPosts.length}):`);
                result.data.allPosts.slice(0, 3).forEach(p => {
                    console.log(`   - [${p.media_type}] ${p.id} (${p.timestamp})`);
                    console.log(`     Engagement: ${JSON.stringify(p.metrics)}`);
                });
            } else {
                console.warn('   ⚠️ result.data.allPosts is EMPTY');
            }

            // Check detailedPosts mapping simulation
            const allDetailedPosts = []; // In the real route this is accumulated
            if (result.data.allPosts) {
                // simulation of route logic
                console.log('\n🔄 Simulating Route Mapping Logic...');
                // ...
            }
        } else {
            console.error('\n❌ Fetch Failed:', result.error);
            if (result.needReLogin) {
                console.error('   ⚠️ Token Expired!');
            }
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
};

runDebug();
