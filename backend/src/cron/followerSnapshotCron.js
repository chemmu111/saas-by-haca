import cron from 'node-cron';
import Client from '../models/Client.js';
import { createSnapshot } from '../services/followerSnapshotService.js';

/**
 * Fetch Instagram follower count for a client
 * @param {Object} client - Client object with pageAccessToken and igUserId
 * @returns {Number} Follower count
 */
const fetchInstagramFollowerCount = async (client) => {
    try {
        const url = `https://graph.facebook.com/v18.0/${client.igUserId}?fields=followers_count&access_token=${client.pageAccessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.followers_count || 0;
    } catch (error) {
        console.error(`❌ Error fetching follower count for ${client.name}:`, error.message);
        throw error;
    }
};

/**
 * Initialize follower snapshot cron job
 * Runs every 5 minutes for testing (change to '0 0 * * *' for daily in production)
 */
export const initFollowerSnapshotCron = () => {
    // Run every 5 minutes (*/5 * * * *)
    // For production, use: '0 0 * * *' (daily at midnight UTC)
    cron.schedule('*/5 * * * *', async () => {
        console.log('📸 Starting follower snapshot...');
        const startTime = Date.now();

        try {
            // Find all Instagram clients with valid tokens
            const clients = await Client.find({
                platform: 'instagram',
                pageAccessToken: { $exists: true, $ne: null },
                igUserId: { $exists: true, $ne: null }
            });

            console.log(`   Found ${clients.length} Instagram client(s) to snapshot`);

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (const client of clients) {
                try {
                    // Fetch current follower count from Instagram
                    const followerCount = await fetchInstagramFollowerCount(client);

                    // Store snapshot in database
                    await createSnapshot(client._id, followerCount, 'instagram');

                    successCount++;
                    console.log(`   ✅ ${client.name}: ${followerCount} followers`);
                } catch (error) {
                    errorCount++;
                    errors.push({ client: client.name, error: error.message });
                    console.error(`   ❌ ${client.name}: ${error.message}`);
                }
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`📸 Snapshot complete in ${duration}s: ${successCount} success, ${errorCount} errors`);

            if (errors.length > 0) {
                console.log('   Errors:', errors);
            }
        } catch (error) {
            console.error('❌ Follower snapshot cron error:', error);
        }
    });

    console.log('✅ Follower snapshot cron job initialized (runs every 5 minutes)');
};

/**
 * Manually trigger a snapshot for all clients (for testing)
 */
export const manualSnapshot = async () => {
    console.log('📸 Manual follower snapshot triggered...');

    try {
        const clients = await Client.find({
            platform: 'instagram',
            pageAccessToken: { $exists: true, $ne: null },
            igUserId: { $exists: true, $ne: null }
        });

        const results = [];

        for (const client of clients) {
            try {
                const followerCount = await fetchInstagramFollowerCount(client);
                await createSnapshot(client._id, followerCount, 'instagram');
                results.push({ client: client.name, followerCount, success: true });
            } catch (error) {
                results.push({ client: client.name, error: error.message, success: false });
            }
        }

        return results;
    } catch (error) {
        console.error('❌ Manual snapshot error:', error);
        throw error;
    }
};
