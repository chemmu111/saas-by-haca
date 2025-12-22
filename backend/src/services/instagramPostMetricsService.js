/**
 * Instagram Post Metrics Service (v22+ - 2024-2025)
 * Fetches engagement metrics for individual Instagram posts
 * Uses ONLY supported metrics per Meta's API v22+ requirements
 * 
 * CRITICAL RULES:
 * - REEL/REELS: views = plays metric (ONLY real views)
 * - IMAGE, VIDEO, STORY: views = 0 (NO real views)
 * - NO fallback to impressions, reach, or video_views
 */

import { fetchMediaInsights } from './instagramInsightsService.js';

/**
 * Fetch engagement metrics for a post from Instagram Graph API
 * 
 * @param {string} igPostId - Instagram post ID
 * @param {string} pageAccessToken - Page access token
 * @param {string} mediaType - Media type (IMAGE, VIDEO, REEL, REELS, STORY)
 * @returns {Object|null} - Post metrics or null on error
 */
export async function fetchInstagramPostMetrics(igPostId, pageAccessToken, mediaType = 'IMAGE') {
  try {
    if (!igPostId || !pageAccessToken) {
      return null;
    }

    // Step 1: Get basic metrics from media object (if media_type not provided)
    let detectedMediaType = mediaType;
    if (!mediaType || mediaType === 'IMAGE') {
      try {
        const url = `https://graph.facebook.com/v18.0/${igPostId}?fields=like_count,comments_count,media_type&access_token=${pageAccessToken}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          detectedMediaType = data.media_type || mediaType;
        }
      } catch (error) {
        console.warn('Could not fetch media_type, using default:', error.message);
      }
    }

    // Step 2: Fetch insights for advanced metrics (saved, shares, plays, reach, replies)
    let insights = null;
    try {
      insights = await fetchMediaInsights(igPostId, pageAccessToken, detectedMediaType);
    } catch (error) {
      console.warn('Could not fetch insights for post:', error.message);
    }

    // Step 4: Build result object (API v24.0)
    return {
      likes: insights?.likes || 0,
      comments: insights?.comments || 0,
      shares: insights?.shares || 0,
      saves: insights?.saved || 0,
      views: insights?.views || 0, // Unified views
      reach: insights?.reach || 0, // Unified reach
      interactions: insights?.interactions || 0, // Unified interactions
      watchTime: insights?.watchTime || 0, // Only for Reels
      replies: detectedMediaType === 'STORY' ? (insights?.replies || 0) : 0,
      engagement: insights?.engagement || 0,
      impressions: 0 // Deprecated
    };
  } catch (error) {
    console.error('Error fetching Instagram post metrics:', error);
    return null;
  }
}

/**
 * Fetch follower count for Instagram Business Account
 * Uses insights API: metric=follower_count&period=day (latest value)
 * 
 * @param {string} igUserId - Instagram user ID
 * @param {string} pageAccessToken - Page access token
 * @returns {number|null} - Follower count or null on error
 */
export async function fetchInstagramFollowerCount(igUserId, pageAccessToken) {
  try {
    if (!igUserId || !pageAccessToken) {
      return null;
    }

    // Use IG User Node to get current total follower count (more reliable than insights)
    const url = `https://graph.facebook.com/v22.0/${igUserId}?fields=followers_count&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Instagram follower count:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    // Return the count
    return data.followers_count || 0;
  } catch (error) {
    console.error('Error fetching Instagram follower count:', error);
    return null;
  }
}


