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
    // Use $lte to catch posts that are due (including those scheduled for the exact current minute)
    const scheduledPosts = await Post.find({
      status: 'scheduled',
      scheduledTime: { $lte: now }
    }).populate('client');

    // Also check for posts scheduled within the next minute (to catch edge cases)
    const nextMinute = new Date(now.getTime() + 60000);
    const upcomingPosts = await Post.find({
      status: 'scheduled',
      scheduledTime: { $gt: now, $lte: nextMinute }
    }).populate('client');

    // Combine both (deduplicate by _id)
    const allDuePosts = [...scheduledPosts];
    upcomingPosts.forEach(post => {
      if (!allDuePosts.find(p => p._id.toString() === post._id.toString())) {
        allDuePosts.push(post);
      }
    });

    console.log(`⏰ Found ${allDuePosts.length} scheduled post(s) ready to publish`);

    if (allDuePosts.length === 0) {
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

    for (const post of allDuePosts) {
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

        // LOCK THE POST: Mark as processing immediately to prevent duplicate pickups
        post.status = 'processing';
        await post.save();
        console.log(`  🔒 Post ${post._id} locked (status: processing)`);

        // Publish the post
        console.log(`  🚀 Starting publish process...`);
        const results = await publishPost(post, post.client);
        console.log(`  📊 Publish results:`, JSON.stringify(results, null, 2));

        // Determine if posting succeeded based on platform requirements
        // Only mark as published if at least one platform successfully published (has postId)
        const instagramSuccess = results.instagram && results.instagram.postId;
        const facebookSuccess = results.facebook && results.facebook.postId;

        let finalStatus = 'failed';
        const errorMessages = [];

        // Determine final status based on what was requested vs what succeeded
        if (post.platform === 'instagram') {
          finalStatus = instagramSuccess ? 'published' : 'failed';
          if (!instagramSuccess) {
            const instagramError = results.errors.find(e => e.platform === 'instagram');
            errorMessages.push(instagramError ? `Instagram: ${instagramError.error}` : 'Instagram: Posting failed - no post ID returned');
          }
        } else if (post.platform === 'facebook') {
          finalStatus = facebookSuccess ? 'published' : 'failed';
          if (!facebookSuccess) {
            const facebookError = results.errors.find(e => e.platform === 'facebook');
            errorMessages.push(facebookError ? `Facebook: ${facebookError.error}` : 'Facebook: Posting failed - no post ID returned');
          }
        } else if (post.platform === 'both') {
          // For 'both', need at least one to succeed
          finalStatus = (instagramSuccess || facebookSuccess) ? 'published' : 'failed';
          if (!instagramSuccess) {
            const instagramError = results.errors.find(e => e.platform === 'instagram');
            errorMessages.push(instagramError ? `Instagram: ${instagramError.error}` : 'Instagram: Posting failed - no post ID returned');
          }
          if (!facebookSuccess) {
            const facebookError = results.errors.find(e => e.platform === 'facebook');
            errorMessages.push(facebookError ? `Facebook: ${facebookError.error}` : 'Facebook: Posting failed - no post ID returned');
          }
        }

        // Update post status based on posting results
        const updateData = {
          status: finalStatus,
          publishedTime: finalStatus === 'published' ? new Date() : undefined
        };

        if (finalStatus === 'published') {
          // At least one platform succeeded
          if (instagramSuccess) {
            updateData.instagramPostId = results.instagram.postId;
            updateData.instagramPostUrl = results.instagram.url;
          } else {
            // Clear Instagram IDs if publishing failed
            updateData.instagramPostId = null;
            updateData.instagramPostUrl = null;
          }

          if (facebookSuccess) {
            updateData.facebookPostId = results.facebook.postId;
            updateData.facebookPostUrl = results.facebook.url;
          } else {
            // Clear Facebook IDs if publishing failed
            updateData.facebookPostId = null;
            updateData.facebookPostUrl = null;
          }

          // If there were partial failures (e.g., 'both' platform but one failed)
          // Store error message but still mark as published
          if (errorMessages.length > 0) {
            updateData.errorMessage = `Partial success. Errors: ${errorMessages.join('; ')}`;
            updateData.publishingErrors = results.errors.map(e => e.error);
            console.log(`  ⚠️ Post published with partial failures: ${updateData.errorMessage}`);
          } else {
            // Clear any previous error messages on success
            updateData.errorMessage = null;
            updateData.publishingErrors = [];
          }
        } else {
          // All required platforms failed
          updateData.errorMessage = errorMessages.join('; ');
          updateData.publishingErrors = results.errors.map(e => e.error);
          console.error(`  ❌ Post failed: ${updateData.errorMessage}`);
        }

        // Log the final status for debugging
        console.log(`  📊 Final Status: ${finalStatus}`);
        console.log(`  📊 Instagram Success: ${instagramSuccess ? 'Yes' : 'No'}`);
        console.log(`  📊 Facebook Success: ${facebookSuccess ? 'Yes' : 'No'}`);
        if (errorMessages.length > 0) {
          console.log(`  ❌ Errors: ${errorMessages.join(', ')}`);
        }

        // Handle edge case (shouldn't happen)
        if (!finalStatus) {
          updateData.status = 'failed';
          updateData.errorMessage = 'Unknown error during posting';
          console.error(`  ❌ Post failed: Unknown error`);
        }

        Object.assign(post, updateData);
        await post.save();

        if (updateData.status === 'published') {
          console.log(`✅ Scheduled post ${post._id} published successfully`);
        } else {
          console.log(`❌ Scheduled post ${post._id} failed to publish`);
        }
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

  console.log('⏰ Starting post scheduler (checking every 30 seconds)...');

  // Process immediately on start
  processScheduledPosts();

  // Then check every 30 seconds for more accurate timing
  schedulerInterval = setInterval(() => {
    processScheduledPosts();
  }, 30 * 1000); // 30 seconds - more frequent checks for better accuracy
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

