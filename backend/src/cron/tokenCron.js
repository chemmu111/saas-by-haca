import cron from 'node-cron';
import Client from '../models/Client.js';
import User from '../models/User.js';
import { sendTokenExpiryAlert } from '../services/emailService.js';



/**
 * Check all Instagram tokens and send alerts
 */
async function checkTokensAndSendAlerts() {
    try {
        console.log('🔍 Starting token expiry check...');

        // Find all Instagram clients with tokens
        const clients = await Client.find({
            platform: 'instagram',
            pageAccessToken: { $exists: true, $ne: null }
        }).populate('createdBy', 'email name');

        console.log(`📊 Found ${clients.length} Instagram clients to check`);

        for (const client of clients) {
            try {
                // Skip if no expiration date
                if (!client.tokenExpiresAt) {
                    console.log(`⚠️ Skipping ${client.name} - no expiration date`);
                    continue;
                }

                // Calculate days until expiration
                const now = new Date();
                const expiresAt = new Date(client.tokenExpiresAt);
                const diffTime = expiresAt - now;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                console.log(`📅 ${client.name}: ${daysLeft} days left`);

                // Check if we should send an alert
                const shouldAlert = daysLeft === 7 || daysLeft === 3 || daysLeft === 1 || daysLeft <= 0;

                if (shouldAlert) {
                    // Get user email
                    const userEmail = client.createdBy?.email;
                    const userName = client.createdBy?.name || 'User';

                    if (!userEmail) {
                        console.log(`⚠️ No email found for client ${client.name}`);
                        continue;
                    }

                    // Generate reconnect URL
                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
                    const reconnectUrl = `${frontendUrl}/dashboard/clients`;

                    // Send alert
                    await sendTokenExpiryAlert(userEmail, userName, client.name, daysLeft, reconnectUrl);
                    console.log(`✅ Alert sent for ${client.name} (${daysLeft} days left)`);
                }
            } catch (error) {
                console.error(`❌ Error processing client ${client.name}:`, error);
                // Continue with next client
            }
        }

        console.log('✅ Token expiry check completed');
    } catch (error) {
        console.error('❌ Error in token expiry check:', error);
    }
}

/**
 * Initialize the token monitoring cron job
 * Runs every day at 12:00 AM
 */
export function initTokenMonitoringCron() {
    // Schedule: Run at 12:00 AM every day
    // Format: second minute hour day month weekday
    cron.schedule('0 0 0 * * *', async () => {
        console.log('⏰ Token monitoring cron job triggered');
        await checkTokensAndSendAlerts();
    }, {
        timezone: "Asia/Kolkata" // Adjust to your timezone
    });

    console.log('✅ Token monitoring cron job initialized (runs daily at 12:00 AM)');
}

// Export for manual testing
export { checkTokensAndSendAlerts };
