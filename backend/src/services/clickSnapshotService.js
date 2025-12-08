import ClickSnapshot from '../models/ClickSnapshot.js';
import { fetchContactMetrics } from './instagramInsightsService.js';
import Client from '../models/Client.js';
import { decryptToken } from '../utils/crypto.js';

/**
 * Take a snapshot of contact metrics for a specific client
 * @param {Object} client - Client document
 */
export const takeClickSnapshot = async (client) => {
    try {
        if (!client.instagramId || !client.accessToken) {
            return null;
        }

        const accessToken = decryptToken(client.accessToken);
        if (!accessToken) {
            console.warn(`⚠️ Cannot decrypt token for client ${client.name}`);
            return null;
        }

        // Fetch metrics from Instagram
        const metrics = await fetchContactMetrics(client.instagramId, accessToken);

        if (!metrics) {
            return null;
        }

        // Save snapshot
        const snapshot = await ClickSnapshot.create({
            client: client._id,
            date: new Date(),
            source: 'instagram',
            ...metrics
        });

        console.log(`📸 Click snapshot saved for ${client.name}: ${metrics.website_clicks} clicks`);
        return snapshot;
    } catch (error) {
        console.error(`❌ Error taking click snapshot for ${client.name}:`, error.message);
        return null;
    }
};

/**
 * Run snapshots for all active clients
 */
export const runAllClickSnapshots = async () => {
    console.log('🔄 Starting 5-minute click snapshot cycle...');
    try {
        const clients = await Client.find({
            instagramId: { $exists: true, $ne: null },
            accessToken: { $exists: true, $ne: null }
        });

        console.log(`   Found ${clients.length} clients to process`);

        const results = await Promise.allSettled(
            clients.map(client => takeClickSnapshot(client))
        );

        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(`✅ Click snapshot cycle complete. Success: ${successful}/${clients.length}`);
    } catch (error) {
        console.error('❌ Error in click snapshot cycle:', error);
    }
};

/**
 * Get the latest click snapshot for a client
 * @param {String} clientId 
 * @returns {Object} Latest snapshot
 */
export const getLatestClickSnapshot = async (clientId) => {
    try {
        return await ClickSnapshot.findOne({ client: clientId })
            .sort({ date: -1 });
    } catch (error) {
        console.error('Error fetching latest click snapshot:', error);
        return null;
    }
};
