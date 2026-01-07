import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Client from '../models/Client.js';
import fetch from 'node-fetch'; // OR global fetch might be available in node 22

// Load env
dotenv.config();

// Node v22 has global fetch, so we might not need node-fetch.
// But if it's not available, it will fail. Let's assume global fetch exists in Node 22.

async function run() {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is missing from env');
            // Try to read .env file manually if dotenv fails?
            // But dotenv.config() should work if run from backend dir.
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const client = await Client.findOne({ name: /nidhil/i });
        if (!client) {
            console.error('Client nidhil not found');
            process.exit(1);
        }

        console.log(`Found client: ${client.name} (${client._id})`);
        console.log(`IG User ID: ${client.igUserId}`);
        console.log(`Page Access Token: ${client.pageAccessToken ? 'Present' : 'Missing'}`);

        if (!client.pageAccessToken) {
            process.exit(1);
        }

        // 1. Fetch Account Insights (Reach)
        const pageAccessToken = client.pageAccessToken;
        const igUserId = client.igUserId;

        console.log('\n--- TEST 1: Daily Reach ---');
        // Try both period=day and period=days_28 to see what works
        const reachUrl = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=reach&period=day&access_token=${pageAccessToken}`;
        console.log('Requesting:', reachUrl.replace(pageAccessToken, '***'));

        const reachRes = await fetch(reachUrl);
        const reachData = await reachRes.json();
        console.log('Status:', reachRes.status);
        console.log('Body:', JSON.stringify(reachData, null, 2));

        // 2. Fetch Media
        console.log('\n--- TEST 2: Recent Media ---');
        const mediaUrl = `https://graph.facebook.com/v22.0/${igUserId}/media?limit=1&access_token=${pageAccessToken}`;
        const mediaRes = await fetch(mediaUrl);
        const mediaData = await mediaRes.json();
        console.log('Media Body:', JSON.stringify(mediaData, null, 2));

        if (mediaData.data && mediaData.data.length > 0) {
            const mediaId = mediaData.data[0].id;
            console.log(`\n--- TEST 3: Media Insights for ${mediaId} ---`);
            // Try to fetch insights for this media
            const metrics = 'reach,total_interactions,saved,shares'; // v22 compatible
            const insightsUrl = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
            const insightsRes = await fetch(insightsUrl);
            const insightsData = await insightsRes.json();
            console.log('Insights Body:', JSON.stringify(insightsData, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run();
