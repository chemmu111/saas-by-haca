/**
 * Cron Job for Automatic Instagram Token Refresh
 * Runs every 24 hours to check and refresh tokens that are expiring soon
 */

import cron from 'node-cron';
import { refreshAllClientTokens } from '../services/instagramTokenService.js';

let cronJob = null;

/**
 * Start the token refresh cron job
 * Runs every day at 2:00 AM
 */
export function startTokenRefreshCron() {
  // Stop existing job if running
  if (cronJob) {
    cronJob.stop();
  }
  
  // Run every day at 2:00 AM
  // Cron format: minute hour day month weekday
  // '0 2 * * *' = At 02:00 AM every day
  cronJob = cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ Token Refresh Cron Job Started');
    console.log(`   Time: ${new Date().toISOString()}`);
    
    try {
      const results = await refreshAllClientTokens();
      
      console.log('✅ Token Refresh Cron Job Completed Successfully');
      console.log(`   Refreshed: ${results.refreshed} clients`);
      console.log(`   Up-to-date: ${results.upToDate} clients`);
      console.log(`   Need re-login: ${results.needReLogin} clients`);
      console.log(`   Failed: ${results.failed} clients\n`);
    } catch (error) {
      console.error('❌ Token Refresh Cron Job Failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: "UTC" // Use UTC for consistency
  });
  
  console.log('✅ Token Refresh Cron Job Started');
  console.log('   Schedule: Every day at 2:00 AM UTC');
  
  return cronJob;
}

/**
 * Stop the token refresh cron job
 */
export function stopTokenRefreshCron() {
  if (cronJob) {
    cronJob.stop();
    console.log('⏹️  Token Refresh Cron Job Stopped');
    cronJob = null;
  }
}

/**
 * Run token refresh immediately (for manual trigger)
 */
export async function runTokenRefreshNow() {
  console.log('\n🔄 Manual Token Refresh Triggered');
  console.log(`   Time: ${new Date().toISOString()}`);
  
  try {
    const results = await refreshAllClientTokens();
    
    console.log('✅ Manual Token Refresh Completed');
    return results;
  } catch (error) {
    console.error('❌ Manual Token Refresh Failed:', error.message);
    throw error;
  }
}

/**
 * Get cron job status
 */
export function getTokenRefreshCronStatus() {
  if (!cronJob) {
    return {
      running: false,
      message: 'Cron job not started'
    };
  }
  
  return {
    running: true,
    schedule: 'Every day at 2:00 AM UTC',
    message: 'Cron job is active'
  };
}

