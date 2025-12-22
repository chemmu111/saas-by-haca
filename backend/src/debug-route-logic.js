
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './models/Client.js';
import User from './models/User.js';
import express from 'express';
import { updatePostEngagementMetrics, updateClientFollowerCount } from './services/analyticsService.js';
import { fetchInstagramAnalytics } from './services/instagramInsightsService.js';
import Post from './models/Post.js';
// We need to import the route handler logic. Since it's in a router, we might need to copy-paste or import the router.
// Importing the router is hard because it expects app context.
// Better to just copy the VITAL part of the logic or import the router and bind it.

// Actually, we can import the router and use `router.handle(req, res, next)`.
// But the route is defined as `router.get('/', ...)`
// Let's try to simulate the request against the running server if possible?
// No, running server requires auth.

// Plan B: Re-implement the core logic in this script to MATCH the route logic exactly.
// Or better: Use `mock-express-request` and `mock-express-response` if available? No.

// Let's just create a script that uses the SAME dependencies and logic structure as the route.
// This effectively tests the "integration" of services.

dotenv.config();

// MOCK CONSTANTS
const MOCK_REQ_QUERY = {
    clientId: '69397c51c83e1edc0786b727', // The ID from previous debug log
    startDate: '2025-11-17T00:00:00.000Z', // 30 days ago
    endDate: '2025-12-17T23:59:59.999Z'
};

const runDebug = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    try {
        const client = await Client.findById(MOCK_REQ_QUERY.clientId);
        if (!client) throw new Error("Client not found");
        console.log(`Testing Client: ${client.name}`);

        // 1. Fetch from Service (Simulate route calls)
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken, client);

        let allDetailedPosts = [];
        if (igData.success && igData.data && igData.data.allPosts) {
            const formattedPosts = igData.data.allPosts.map(post => ({
                id: post.id,
                media_type: post.media_type,
                timestamp: post.timestamp,
                metrics: post.metrics,
                clientId: client._id.toString()
            }));
            allDetailedPosts = formattedPosts;
        }

        console.log(`Service returned ${allDetailedPosts.length} posts`);

        // 2. Filter Logic (Simulate route logic)
        // In the route, we add these to `analytics.detailedPosts`.
        const analytics = {
            detailedPosts: allDetailedPosts
        };

        // 3. Output Check
        console.log("\n--- FINAL JSON STRUCTURE CHECK ---");
        if (analytics.detailedPosts && analytics.detailedPosts.length > 0) {
            console.log("✅ detailedPosts is PRESENT and has length:", analytics.detailedPosts.length);
            console.log("Sample Post:", analytics.detailedPosts[0]);
        } else {
            console.log("❌ detailedPosts is MISSING or EMPTY");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

runDebug();
