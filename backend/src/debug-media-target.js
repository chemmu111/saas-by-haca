
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './models/Client.js';
import { fetchInstagramMedia } from './services/instagramInsightsService.js';

dotenv.config();

const TARGET_IG_ID = '17841417291862445'; // NIDHIL REAL

const runDebug = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);

        // Find Instagram client
        const client = await Client.findOne({ igUserId: TARGET_IG_ID });

        if (!client) {
            console.error(`❌ Client with IG ID ${TARGET_IG_ID} not found.`);
            return;
        }

        console.log(`\n🔍 Fetching Media for: ${client.name} (${client.igUserId})`);

        // Test Media Fetch with HIGHER limit
        const limit = 100;
        console.log(`   Calling fetchInstagramMedia (limit ${limit})...`);

        // Use the function
        const result = await fetchInstagramMedia(client.igUserId, client.pageAccessToken, limit);

        if (result.success) {
            const posts = result.data || [];
            console.log(`\n✅ Success! Found ${posts.length} posts.`);

            if (posts.length > 0) {
                console.log('\n--- Post Details ---');
                posts.forEach((p, index) => {
                    console.log(`#${index + 1} [${p.media_type}] ${p.timestamp} - ID: ${p.id}`);
                    if (index === 0) console.log("RAW FIRST POST:", JSON.stringify(p, null, 2));
                });
            } else {
                console.warn('⚠️ No posts returned from API.');
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
