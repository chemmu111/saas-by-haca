import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Client from '../models/Client.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config({ path: join(__dirname, '../../.env') });

async function debugReelMetrics() {
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

        // Use the Reel ID found in previous debug
        const mediaId = '17993962061719358';
        console.log(`\n🔍 Debugging Reel Metrics for ID: ${mediaId}`);

        // 1. Fetch Media Fields (video_play_count, play_count)
        console.log('\n1️⃣ Fetching Media Fields...');
        const fieldsUrl = `https://graph.facebook.com/v22.0/${mediaId}?fields=id,media_type,media_product_type,video_play_count,play_count,shortcode&access_token=${client.pageAccessToken}`;
        const fieldsRes = await fetch(fieldsUrl);
        const fieldsData = await fieldsRes.json();
        console.log('Fields Data:', JSON.stringify(fieldsData, null, 2));

        // 2. Fetch Insights: views
        console.log('\n2️⃣ Fetching Insights (metric=views)...');
        const viewsUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=views&access_token=${client.pageAccessToken}`;
        const viewsRes = await fetch(viewsUrl);
        const viewsData = await viewsRes.json();
        console.log('Insights (views):', JSON.stringify(viewsData, null, 2));

        // 3. Fetch Insights: plays
        console.log('\n3️⃣ Fetching Insights (metric=plays)...');
        const playsUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=plays&access_token=${client.pageAccessToken}`;
        const playsRes = await fetch(playsUrl);
        const playsData = await playsRes.json();
        console.log('Insights (plays):', JSON.stringify(playsData, null, 2));

        // 4. Fetch Insights: reach
        console.log('\n4️⃣ Fetching Insights (metric=reach)...');
        const reachUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=reach&access_token=${client.pageAccessToken}`;
        const reachRes = await fetch(reachUrl);
        const reachData = await reachRes.json();
        console.log('Insights (reach):', JSON.stringify(reachData, null, 2));

        // 6. Fetch Insights: profile_activity (Test potential invalid metric)
        console.log('\n6️⃣ Fetching Insights (metric=profile_activity)...');
        const profileActivityUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=profile_activity&access_token=${client.pageAccessToken}`;
        const profileActivityRes = await fetch(profileActivityUrl);
        const profileActivityData = await profileActivityRes.json();
        console.log('Insights (profile_activity):', JSON.stringify(profileActivityData, null, 2));

        const output = {
            fieldsData,
            viewsData,
            playsData,
            reachData,
            combinedData,
            profileActivityData
        };
        fs.writeFileSync('debug_reel_result.json', JSON.stringify(output, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Done.');
    }
}

debugReelMetrics();
