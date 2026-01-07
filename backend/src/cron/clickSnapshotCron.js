import cron from 'node-cron';
import { runAllClickSnapshots } from '../services/clickSnapshotService.js';

/**
 * Initialize click snapshot cron job
 * Runs every 5 minutes
 */
export const initClickSnapshotCron = () => {
    // Run every 5 minutes (*/5 * * * *)
    cron.schedule('*/5 * * * *', async () => {
        console.log('📸 Starting 5-minute click snapshot...');
        try {
            await runAllClickSnapshots();
        } catch (error) {
            console.error('❌ Click snapshot cron error:', error);
        }
    });

    console.log('✅ Click snapshot cron job initialized (runs every 5 minutes)');
};

/**
 * Manually trigger a snapshot cycle (for testing)
 */
export const manualClickSnapshot = async () => {
    console.log('📸 Manual click snapshot triggered...');
    return await runAllClickSnapshots();
};
