/**
 * Token Refresh Cron Job
 * Automatically checks and refreshes Instagram tokens daily
 * Runs every 24 hours to ensure tokens never expire
 */

import cron from 'node-cron';
import { refreshAllExpiringTokens } from './instagramTokenService.js';

let cronJob = null;

/**
 * Start the token refresh cron job
 * Runs daily at 2:00 AM
 */
export function startTokenRefreshCron() {
  if (cronJob) {
    console.log('⚠️  Token refresh cron job is already running');
    return;
  }

  // Run every day at 2:00 AM
  // Cron pattern: second minute hour day month weekday
  // '0 2 * * *' = At 02:00 every day
  cronJob = cron.schedule('0 2 * * *', async () => {
    console.log('\n🔄 CRON JOB TRIGGERED: Daily token refresh check');
    console.log(`   Time: ${new Date().toLocaleString()}`);
    
    try {
      await refreshAllExpiringTokens();
    } catch (error) {
      console.error('❌ Error in token refresh cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC' // Use UTC timezone, adjust if needed
  });

  console.log('✅ Token refresh cron job started');
  console.log('   Schedule: Every day at 2:00 AM UTC');
  console.log('   Will check and refresh tokens expiring within 10 days');
}

/**
 * Stop the token refresh cron job
 */
export function stopTokenRefreshCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('🛑 Token refresh cron job stopped');
  }
}

/**
 * Manually trigger token refresh (for testing)
 */
export async function triggerManualRefresh() {
  console.log('🔧 Manual token refresh triggered');
  try {
    const results = await refreshAllExpiringTokens();
    return results;
  } catch (error) {
    console.error('❌ Manual token refresh failed:', error);
    throw error;
  }
}

/**
 * Get cron job status
 */
export function getCronStatus() {
  return {
    running: cronJob !== null,
    schedule: '0 2 * * *',
    description: 'Every day at 2:00 AM UTC',
    nextRun: cronJob ? 'Check cron.schedule for next execution' : 'Not running'
  };
}

