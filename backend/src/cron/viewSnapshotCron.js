import cron from 'node-cron';
import Client from '../models/Client.js';
import { createViewSnapshot } from '../services/viewSnapshotService.js';
import { fetchInstagramMedia } from '../services/instagramInsightsService.js';

/**
 * Fetch view counts for a client's Instagram posts
 * @param {Object} client - Client object with pageAccessToken and igUserId
 * @returns {Object} { totalViews, reelViews, videoViews, postCount }
 */
const fetchClientViewCounts = async (client) => {
    try {
        // Fetch all media for the client
        const mediaResult = await fetchInstagramMedia(client.igUserId, client.pageAccessToken, 100);

        if (!mediaResult || !mediaResult.success || !mediaResult.data) {
            console.log(`   ⚠️ No media data returned for ${client.name}`);
            return { totalViews: 0, reelViews: 0, videoViews: 0, postCount: 0 };
        }

        // fetchInstagramMedia returns an ARRAY of posts directly in .data
        const posts = Array.isArray(mediaResult.data) ? mediaResult.data : [];

        if (posts.length === 0) {
            console.log(`   ⚠️ No posts found for ${client.name}`);
            return { totalViews: 0, reelViews: 0, videoViews: 0, postCount: 0 };
        }

        let totalViews = 0;
        let reelViews = 0;
        let videoViews = 0;

        posts.forEach(post => {
            // Get views from insights (the structure fetchInstagramMedia returns)
            const views = post.views || post.insights?.views || post.video_play_count || 0;
            const mediaType = post.media_type;
            const isReel = mediaType === 'REELS' || mediaType === 'REEL' ||
                (mediaType === 'VIDEO' && post.permalink?.includes('/reel/'));

            totalViews += views;
            if (isReel || mediaType === 'REELS' || mediaType === 'REEL') {
                reelViews += views;
            } else if (mediaType === 'VIDEO') {
                videoViews += views;
            }
        });

        console.log(`   📊 ${client.name}: Found ${posts.length} posts, ${totalViews} total views`);

        return {
            totalViews,
            reelViews,
            videoViews,
            postCount: posts.length
        };
    } catch (error) {
        console.error(`❌ Error fetching view counts for ${client.name}:`, error.message);
        return { totalViews: 0, reelViews: 0, videoViews: 0, postCount: 0 };
    }
};

/**
 * Initialize view snapshot cron job
 * Runs every 5 minutes (same as follower snapshot)
 */
export const initViewSnapshotCron = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('📊 Starting view snapshot...');
        const startTime = Date.now();

        try {
            // Find all Instagram clients with valid tokens
            const clients = await Client.find({
                platform: 'instagram',
                pageAccessToken: { $exists: true, $ne: null },
                igUserId: { $exists: true, $ne: null }
            });

            console.log(`   Found ${clients.length} Instagram client(s) to snapshot views`);

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const client of clients) {
                try {
                    // Fetch current view counts from Instagram
                    const viewData = await fetchClientViewCounts(client);

                    // Store snapshot in database
                    await createViewSnapshot(client._id, viewData);

                    successCount++;
                    console.log(`   ✅ ${client.name}: ${viewData.totalViews} total views (Reels: ${viewData.reelViews}, Videos: ${viewData.videoViews})`);
                } catch (error) {
                    errorCount++;
                    errors.push({ client: client.name, error: error.message });
                    console.error(`   ❌ ${client.name}: ${error.message}`);
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`📊 View snapshot complete in ${duration}s: ${successCount} success, ${errorCount} errors`);

            if (errors.length > 0) {
                console.log('   Errors:', errors);
            }
        } catch (error) {
            console.error('❌ View snapshot cron error:', error);
        }
    });

    console.log('✅ View snapshot cron job initialized (runs every 5 minutes)');
};

/**
 * Manually trigger a view snapshot for all clients (for testing/initialization)
 */
export const manualViewSnapshot = async () => {
    console.log('📊 Manual view snapshot triggered...');

    try {
        const clients = await Client.find({
            platform: 'instagram',
            pageAccessToken: { $exists: true, $ne: null },
            igUserId: { $exists: true, $ne: null }
        });

        const results = [];

        for (const client of clients) {
            try {
                const viewData = await fetchClientViewCounts(client);
                await createViewSnapshot(client._id, viewData);
                results.push({ client: client.name, ...viewData, success: true });
            } catch (error) {
                results.push({ client: client.name, error: error.message, success: false });
            }
        }

        return results;
    } catch (error) {
        console.error('❌ Manual view snapshot error:', error);
        throw error;
    }
};
