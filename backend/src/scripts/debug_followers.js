import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Client from '../models/Client.js';
import { fetchAccountInsights } from '../services/instagramInsightsService.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../../.env') });

async function debugFollowers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const client = await Client.findOne({
            platform: 'instagram',
            igUserId: { $exists: true },
            pageAccessToken: { $exists: true }
        });

        if (!client) {
            console.log('❌ No Instagram client found in DB.');
            return;
        }

        console.log(`\n🔍 Debugging Client: ${client.name}`);
        console.log(`   IG User ID: ${client.igUserId}`);
        console.log(`   Access Token: ${client.pageAccessToken.substring(0, 15)}...`);

        console.log('\n📡 Fetching User Details (Username)...');
        const userUrl = `https://graph.facebook.com/v22.0/${client.igUserId}?fields=username,name,followers_count&access_token=${client.pageAccessToken}`;
        const userRes = await fetch(userUrl);
        const userData = await userRes.json();
        console.log('User Data:', JSON.stringify(userData, null, 2));

        console.log('\n📡 Fetching Account Insights...');
        const result = await fetchAccountInsights(client.igUserId, client.pageAccessToken);

        console.log('\n📡 Fetching Account Insights Trend...');
        const { fetchAccountInsightsTrend } = await import('../services/instagramInsightsService.js');
        const trendResult = await fetchAccountInsightsTrend(client.igUserId, client.pageAccessToken);

        console.log('\n📊 Trend Result:');
        console.log(JSON.stringify(trendResult, null, 2));

        console.log('\n📡 Fetching Media to inspect VIDEO items...');
        const { fetchInstagramMedia } = await import('../services/instagramInsightsService.js');
        const mediaResult = await fetchInstagramMedia(client.igUserId, client.pageAccessToken, 20);

        let videoItems = [];
        if (mediaResult.success && mediaResult.data) {
            videoItems = mediaResult.data.filter(item => item.media_type === 'VIDEO');
        }

        console.log(`\nFound ${videoItems.length} VIDEO items.`);
        if (videoItems.length > 0) {
            console.log('First VIDEO item:', JSON.stringify(videoItems[0], null, 2));
        }

        const debugOutput = {
            userData,
            insightsResult: result,
            trendResult,
            videoSample: videoItems[0]
        };

        fs.writeFileSync('debug_result.json', JSON.stringify(debugOutput, null, 2));

        if (result.success) {
            console.log(`\n✅ Follower Count in Result: ${result.data.follower_count}`);
        } else {
            console.log('\n❌ Fetch failed.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Done.');
    }
}

debugFollowers();
