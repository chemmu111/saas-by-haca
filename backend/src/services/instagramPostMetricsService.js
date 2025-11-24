/**
 * Instagram Post Metrics Service (v24.0 - 2025)
 * Fetches engagement metrics for individual Instagram posts
 * Uses ONLY supported metrics per Meta's API v24.0 requirements
 * 
 * CRITICAL RULES:
 * - REEL/REELS: views metric available
 * - IMAGE, VIDEO, STORY: views limited or unavailable per Meta docs
 * - NO fallback to impressions, video_views, profile metrics
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
      console.warn('[fetchInstagramPostMetrics] Missing igPostId or access token.');
      return null;
    }

    // Step 1: Get basic metrics from media object (if media_type not provided)
    let detectedMediaType = mediaType;
    if (!mediaType || mediaType === 'IMAGE') {
      try {
        const url = `https://graph.facebook.com/v24.0/${igPostId}?fields=like_count,comments_count,media_type&access_token=${pageAccessToken}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          detectedMediaType = data.media_type || mediaType;
        } else {
          const errorBody = await response.text();
          console.warn('[fetchInstagramPostMetrics] Failed to fetch media metadata:', {
            igPostId,
            status: response.status,
            statusText: response.statusText,
            body: errorBody
          });
        }
      } catch (error) {
        console.warn('[fetchInstagramPostMetrics] Could not fetch media_type, using default:', error.message);
      }
    }

    // Step 2: Fetch insights for advanced metrics (saved, shares, views, reach, replies)
    let insights = null;
    try {
      const insightsResponse = await fetchMediaInsights(igPostId, pageAccessToken, detectedMediaType);
      if (insightsResponse?.success) {
        insights = insightsResponse.data;
      } else {
        console.warn('[fetchInstagramPostMetrics] Insights request returned no data:', {
          igPostId,
          mediaType: detectedMediaType,
          error: insightsResponse?.error
        });
      }
    } catch (error) {
      console.error('[fetchInstagramPostMetrics] Could not fetch insights for post:', {
        igPostId,
        mediaType: detectedMediaType,
        message: error.message,
        stack: error.stack
      });
    }

    // Step 3: Use API-provided metrics whenever available
    const likes = insights?.likes ?? 0;
    const comments = insights?.comments ?? 0;
    const shares = insights?.shares ?? 0;
    const saves = insights?.saved ?? 0;
    const views = typeof insights?.views === 'number' ? insights.views : 0;
    const reach = typeof insights?.reach === 'number' ? insights.reach : 0;
    const replies = typeof insights?.replies === 'number' ? insights.replies : 0;
    const engagement = typeof insights?.total_interactions === 'number'
      ? insights.total_interactions
      : (likes + comments + shares + saves);
    const viewsPresent = insights?.views_present ?? (typeof insights?.views === 'number');
    const viewsPending = insights?.views_pending ?? false;

    if (!insights) {
      console.warn('[fetchInstagramPostMetrics] Insights missing; returning zeroed metrics for', igPostId);
    } else if (views === 0) {
      console.warn('[fetchInstagramPostMetrics] Views metric reported as 0 by API:', {
        igPostId,
        mediaType: detectedMediaType,
        insightsKeys: Object.keys(insights)
      });
    }

    // Step 4: Build result object
    return {
      likes,
      comments,
      shares,
      saves,
      views,
      reach,
      replies,
      engagement,
      impressions: 0, // Deprecated metric retained for backward compatibility
      views_present: viewsPresent,
      views_pending: viewsPending
    };
  } catch (error) {
    console.error('[fetchInstagramPostMetrics] Fatal error fetching post metrics:', {
      igPostId,
      message: error.message,
      stack: error.stack
    });
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

    // Use insights API to get follower count
    const url = `https://graph.facebook.com/v24.0/${igUserId}/insights?metric=follower_count&period=day&access_token=${pageAccessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Instagram follower count:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const metric = data.data[0];
      if (metric.values && metric.values.length > 0) {
        // Get the latest value
        const latest = metric.values[metric.values.length - 1];
        return latest.value || 0;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching Instagram follower count:', error);
    return null;
  }
}


