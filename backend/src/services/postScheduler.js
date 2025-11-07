/**
 * Post Scheduler Service
 * Checks for scheduled posts and publishes them when due
 */

import Post from '../models/Post.js';
import Client from '../models/Client.js';
import { publishPost } from './postingService.js';

let schedulerInterval = null;

/**
 * Process scheduled posts that are due
 */
export async function processScheduledPosts() {
  try {
    const now = new Date();
    console.log(`⏰ Checking for scheduled posts at ${now.toISOString()} (${now.toLocaleString()})...`);
    
    // Find posts scheduled for now or in the past
    const scheduledPosts = await Post.find({
      status: 'scheduled',
      scheduledTime: { $lte: now }
    }).populate('client');

    console.log(`⏰ Found ${scheduledPosts.length} scheduled post(s) ready to publish`);

    if (scheduledPosts.length === 0) {
      // Log some debug info about scheduled posts
      const allScheduled = await Post.find({ status: 'scheduled' }).select('_id scheduledTime').limit(5);
      if (allScheduled.length > 0) {
        console.log(`  📋 Upcoming scheduled posts (next 5):`);
        allScheduled.forEach(p => {
          const timeUntil = new Date(p.scheduledTime) - now;
          const minutesUntil = Math.floor(timeUntil / 60000);
          console.log(`    - Post ${p._id}: ${new Date(p.scheduledTime).toLocaleString()} (${minutesUntil > 0 ? `in ${minutesUntil} minutes` : 'overdue'})`);
        });
      }
    }

    for (const post of scheduledPosts) {
      try {
        console.log(`📅 Publishing scheduled post: ${post._id}`);
        console.log(`  Scheduled for: ${post.scheduledTime} (${new Date(post.scheduledTime).toLocaleString()})`);
        console.log(`  Current time: ${now.toISOString()} (${now.toLocaleString()})`);
        console.log(`  Client: ${post.client?.name || post.client?.email || 'Unknown'}`);
        console.log(`  Platform: ${post.platform}`);
        console.log(`  Media URLs: ${post.mediaUrls?.length || 0}`);

        if (!post.client) {
          console.error(`  ❌ No client found for post ${post._id}`);
          post.status = 'failed';
          post.errorMessage = 'Client not found';
          await post.save();
          continue;
        }

        // Check if client has required credentials
        if (post.platform === 'instagram' || post.platform === 'both') {
          if (!post.client.igUserId || !post.client.pageAccessToken) {
            console.error(`  ❌ Instagram credentials missing for client ${post.client._id}`);
            post.status = 'failed';
            post.errorMessage = 'Instagram credentials not found. Please reconnect the account.';
            await post.save();
            continue;
          }
        }

        // Publish the post
        console.log(`  🚀 Starting publish process...`);
        const results = await publishPost(post, post.client);
        console.log(`  📊 Publish results:`, JSON.stringify(results, null, 2));

        // Update post status
        const updateData = {
          status: 'published',
          publishedTime: new Date()
        };

        if (results.instagram) {
          updateData.instagramPostId = results.instagram.postId;
        }

        if (results.facebook) {
          updateData.facebookPostId = results.facebook.postId;
        }

        // If there were errors for all platforms, mark as failed
        if (results.errors.length > 0) {
          if ((post.platform === 'instagram' || post.platform === 'both') && !results.instagram) {
            if ((post.platform === 'facebook' || post.platform === 'both') && !results.facebook) {
              updateData.status = 'failed';
              updateData.errorMessage = results.errors.map(e => e.error).join('; ');
            }
          } else if ((post.platform === 'facebook' || post.platform === 'both') && !results.facebook) {
            if (post.platform === 'facebook') {
              updateData.status = 'failed';
              updateData.errorMessage = results.errors.map(e => e.error).join('; ');
            }
          }
        }

        Object.assign(post, updateData);
        await post.save();

        console.log(`✅ Scheduled post ${post._id} published successfully`);
      } catch (error) {
        console.error(`❌ Error publishing scheduled post ${post._id}:`, error.message);
        post.status = 'failed';
        post.errorMessage = error.message;
        await post.save();
      }
    }
  } catch (error) {
    console.error('❌ Error processing scheduled posts:', error);
  }
}

/**
 * Start the post scheduler
 * Checks every minute for scheduled posts
 */
export function startScheduler() {
  if (schedulerInterval) {
    console.log('⚠️ Scheduler already running');
    return;
  }

  console.log('⏰ Starting post scheduler (checking every 60 seconds)...');
  
  // Process immediately on start
  processScheduledPosts();
  
  // Then check every 60 seconds
  schedulerInterval = setInterval(() => {
    processScheduledPosts();
  }, 60 * 1000); // 60 seconds
}

/**
 * Stop the post scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ Post scheduler stopped');
  }
}

