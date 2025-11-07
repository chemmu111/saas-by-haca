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
    
    // Find posts scheduled for now or in the past
    const scheduledPosts = await Post.find({
      status: 'scheduled',
      scheduledTime: { $lte: now }
    }).populate('client');

    console.log(`⏰ Processing ${scheduledPosts.length} scheduled post(s)...`);

    for (const post of scheduledPosts) {
      try {
        console.log(`📅 Publishing scheduled post: ${post._id}`);
        console.log(`  Scheduled for: ${post.scheduledTime}`);
        console.log(`  Client: ${post.client?.name || 'Unknown'}`);

        if (!post.client) {
          console.error(`  ❌ No client found for post ${post._id}`);
          post.status = 'failed';
          post.errorMessage = 'Client not found';
          await post.save();
          continue;
        }

        // Publish the post
        const results = await publishPost(post, post.client);

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

