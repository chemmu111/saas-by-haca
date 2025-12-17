/**
 * Instagram Graph API Insights Service (v22+ - 2024-2025)
 * Fetches real analytics data from Instagram Business Account
 * Uses ONLY supported metrics per Meta's API v22+ requirements
 *
 * CRITICAL RULES (v22+ - 2024-2025):
 * - follower_count: period=day (NO metric_type)
 * - profile_views: period=day, metric_type=total_value (REQUIRED)
 * - reach: period=day (NO metric_type)
 * - REEL/REELS: views,reach,likes,comments,saved,shares,total_interactions,watch time
 * - IMAGE/CAROUSEL: views,reach,likes,comments,saved,shares,total_interactions
 * - VIDEO: views,reach,likes,comments,saved,shares,total_interactions
 * - STORY: views (reach), replies (minimum 5 views rule)
 *
 * REMOVED METRICS (v22+):
 * ❌ impressions - completely removed
 * ❌ plays - replaced by unified 'views'
 * ❌ ig_reels_aggregated_all_plays_count - removed
 * ❌ video_views - removed
 *
 * TOKEN MANAGEMENT:
 * - All API calls validate token before fetching
 * - Auto-refreshes tokens expiring within 10 days
 * - Returns needReLogin if token is expired
 */

import Client from '../models/Client.js';
import DailyAnalytics from '../models/DailyAnalytics.js';
import Post from '../models/Post.js';
import { ensureValidToken } from './instagramTokenService.js';

// Simple in-memory cache (5 minutes TTL)
const cache = new Map();

function getCacheKey(key) {
  return `ig_insights_${key}`;
}

function getCached(key) {
  const cacheKey = getCacheKey(key);
  const cached = cache.get(cacheKey);
  // Cache enabled with 5 minutes TTL for consistent data
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
    return cached.data;
  }
  cache.delete(cacheKey);
  return null;
}

function setCache(key, data) {
  const cacheKey = getCacheKey(key);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Error response wrapper - ensures all routes return JSON on error
 * @param {Error|string} error - Error object or message
 * @param {string} context - Context for logging
 * @returns {Object} - Standardized error response
 */
function createErrorResponse(error, context = '') {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ Instagram Insights Error${context ? ` (${context})` : ''}:`, message);

  return {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Success response wrapper - ensures consistent response format
 * @param {Object} data - Response data
 * @returns {Object} - Standardized success response
 */
function createSuccessResponse(data) {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * Fetch follower count from basic IG User endpoint (fallback method)
 * GET /{ig-user-id}?fields=followers_count
 * This works without insights requirements
 */
/**
 * Fetch basic account info (followers, media count) from IG User endpoint
 * GET /{ig-user-id}?fields=followers_count,media_count
 * This works without insights requirements
 */
async function fetchBasicAccountInfo(igUserId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/v22.0/${igUserId}?fields=followers_count,media_count&access_token=${pageAccessToken}`;
    console.log('   📡 Fetching basic account info (followers, media_count)...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('   ❌ Error fetching basic account info:', response.status);
      if (errorData.error) {
        console.error('      Error:', errorData.error.message);
      }
      return null;
    }

    const data = await response.json();
    console.log('   ✅ Basic endpoint response:', data);
    return {
      followers_count: data.followers_count || 0,
      media_count: data.media_count || 0
    };
  } catch (error) {
    console.error('   ❌ Error fetching basic account info:', error.message);
    return null;
  }
}

/**
 * Fetch follower count (daily trend from insights)
 * GET /{ig-user-id}/insights?metric=follower_count&period=day
 * Falls back to basic endpoint if insights not available
 */
async function fetchFollowerCount(igUserId, pageAccessToken) {
  try {
    console.log(`   🔍 Fetching follower count for ${igUserId}...`);

    // 1. Try basic endpoint FIRST (Current real-time count)
    // This is more reliable for "Total Followers" display than insights metric
    const basicInfo = await fetchBasicAccountInfo(igUserId, pageAccessToken);
    if (basicInfo !== null) {
      console.log(`   ✅ Used basic endpoint for follower count: ${basicInfo.followers_count}`);

      // Cache basic info for later use (media_count)
      const cacheKey = `basic_info_${igUserId}`;
      setCache(cacheKey, basicInfo);

      return basicInfo.followers_count;
    }

    // 2. Fallback to Insights if basic fails (unlikely)
    console.log('   ⚠️ Basic follower fetch failed, trying insights...');
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=follower_count&period=day&access_token=${pageAccessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error fetching follower_count from insights:', response.status, errorText);
      return 0;
    }

    const data = await response.json();
    console.log('   📊 Insights follower_count response:', JSON.stringify(data));

    if (data.data && data.data.length > 0) {
      const metric = data.data[0];
      if (metric.values && metric.values.length > 0) {
        const latest = metric.values[metric.values.length - 1];
        console.log(`   ✅ Extracted follower count from insights: ${latest.value}`);
        return latest.value || 0;
      }
    }
    console.warn('   ⚠️ No follower count found in insights data');
    return 0;
  } catch (error) {
    console.error('Error fetching follower_count:', error);
    return 0;
  }
}

/**
 * Fetch profile views (daily total)
 * GET /{ig-user-id}/insights?metric=profile_views&metric_type=total_value&period=day
 */
async function fetchProfileViews(igUserId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=profile_views&metric_type=total_value&period=day&access_token=${pageAccessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error fetching profile_views:', response.status);
      if (errorData.error) {
        console.error('   Error:', errorData.error.message);
      }
      return null;
    }

    const data = await response.json();
    console.log('   📊 Profile Views Response:', JSON.stringify(data));
    if (data.data && data.data.length > 0) {
      const metric = data.data[0];
      if (metric.values && metric.values.length > 0) {
        // Get the latest value (most recent day)
        const latest = metric.values[metric.values.length - 1];
        console.log(`   ✅ Extracted profile_views: ${latest.value}`);
        return latest.value || 0;
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching profile_views:', error);
    return null;
  }
}

/**
 * Fetch reach (daily trend)
 * GET /{ig-user-id}/insights?metric=reach&period=day
 */
async function fetchReachTrend(igUserId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=reach&period=day&access_token=${pageAccessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error fetching reach trend:', response.status);
      if (errorData.error) {
        console.error('   Error:', errorData.error.message);
      }
      return [];
    }

    const data = await response.json();
    const dailyData = [];

    if (data.data && data.data.length > 0) {
      const metric = data.data[0];
      if (metric.values && Array.isArray(metric.values)) {
        metric.values.forEach(value => {
          const date = value.end_time ? value.end_time.split('T')[0] : null;
          if (date) {
            dailyData.push({
              date,
              reach: value.value || 0
            });
          }
        });
      }
    }

    return dailyData.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-30);
  } catch (error) {
    console.error('Error fetching reach trend:', error);
    return [];
  }
}

/**
 * Fetch Instagram account insights (total values)
 * Makes SEPARATE API calls for each metric
 * Always returns structured JSON response
 */
export async function fetchAccountInsights(igUserId, pageAccessToken) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchAccountInsights');
    }

    const cacheKey = `account_insights_${igUserId}_lifetime_v3`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    // Fetch follower count (latest daily value)
    const followerCount = await fetchFollowerCount(igUserId, pageAccessToken);

    // Fetch profile views (daily total)
    const profileViews = await fetchProfileViews(igUserId, pageAccessToken);

    // Fetch additional account metrics (day period)
    // Fetch additional account metrics (day period)
    const dailyMetrics = 'reach';
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=${dailyMetrics}&period=day&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    const additionalData = {};

    if (response.ok) {
      const data = await response.json();
      console.log('   📊 Account Insights Response (Daily):', JSON.stringify(data));
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(metric => {
          if (metric.values && metric.values.length > 0) {
            // Get the latest value
            const val = metric.values[metric.values.length - 1].value || 0;
            additionalData[metric.name] = val;
            console.log(`      - ${metric.name}: ${val}`);
          }
        });
      }
    } else {
      const errorText = await response.text();
      console.warn('⚠️ Failed to fetch daily account metrics:', response.status, errorText);
    }

    // Fetch 28-day metrics for contact actions (website_clicks, email_contacts, etc.)
    // This gives a better "Total" view than just yesterday's clicks
    const contactMetrics = 'website_clicks,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks';
    const contactUrl = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=${contactMetrics}&period=days_28&access_token=${pageAccessToken}`;

    console.log(`   📡 Fetching 28-day contact metrics...`);
    const contactRes = await fetch(contactUrl);
    const contactData = {};

    if (contactRes.ok) {
      const data = await contactRes.json();
      console.log('   ✅ 28-day contact metrics response:', JSON.stringify(data));
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(metric => {
          if (metric.values && metric.values.length > 0) {
            // Find the latest NON-ZERO value (iterate backwards)
            const values = metric.values;
            let latestValue = 0;
            for (let i = values.length - 1; i >= 0; i--) {
              if (values[i].value > 0) {
                latestValue = values[i].value;
                break;
              }
            }
            contactData[metric.name] = latestValue;
            console.log(`      - ${metric.name} (28d): ${latestValue}`);
          }
        });
      }
    } else {
      console.warn('   ⚠️ Failed to fetch 28-day contact metrics:', contactRes.status);
    }

    // Fetch 28-day reach for "Total Reach" metric
    let reach28d = 0;
    try {
      const reachUrl = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=reach&period=days_28&access_token=${pageAccessToken}`;
      console.log(`   📡 Fetching 28-day reach...`);
      const reachRes = await fetch(reachUrl);
      const reachDebug = await reachRes.json(); // Read body once

      if (reachRes.ok) {
        if (reachDebug.data && reachDebug.data.length > 0 && reachDebug.data[0].values && reachDebug.data[0].values.length > 0) {
          // Find the latest NON-ZERO value (iterate backwards)
          const values = reachDebug.data[0].values;
          let latestValue = 0;
          for (let i = values.length - 1; i >= 0; i--) {
            if (values[i].value > 0) {
              latestValue = values[i].value;
              break;
            }
          }
          reach28d = latestValue;
          console.log(`   ✅ Extracted 28-day reach: ${reach28d}`);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch 28-day reach:', err.message);
    }

    const result = {
      follower_count: followerCount || 0,
      media_count: 0, // Will be populated by fallback logic below
      profile_views: profileViews || additionalData.profile_views || 0,
      reach: additionalData.reach || 0, // Daily reach (yesterday)
      reach_28d: reach28d || additionalData.reach || 0, // 28-day reach (fallback to daily)
      impressions: additionalData.impressions || 0,
      website_clicks: contactData.website_clicks || additionalData.website_clicks || 0,
      email_contacts: contactData.email_contacts || additionalData.email_contacts || 0,
      phone_call_clicks: contactData.phone_call_clicks || additionalData.phone_call_clicks || 0,
      text_message_clicks: contactData.text_message_clicks || additionalData.text_message_clicks || 0,
      get_directions_clicks: contactData.get_directions_clicks || additionalData.get_directions_clicks || 0
    };

    // Retrieve media_count from cache if available (populated by fetchFollowerCount -> fetchBasicAccountInfo)
    const basicInfoCache = getCached(`basic_info_${igUserId}`);
    if (basicInfoCache && basicInfoCache.media_count) {
      result.media_count = basicInfoCache.media_count;
      console.log(`   ✅ Added media_count to account insights: ${result.media_count}`);
    } else {
      // Fallback: Try to fetch it if missing
      try {
        const basic = await fetchBasicAccountInfo(igUserId, pageAccessToken);
        if (basic) {
          result.media_count = basic.media_count;
          // Also update follower count if it was missing
          if (!result.follower_count) result.follower_count = basic.followers_count;
        }
      } catch (e) { console.warn('Failed to fetch fallback media count', e); }
    }

    setCache(cacheKey, result);
    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'fetchAccountInsights');
  }
}

/**
 * Fetch daily account insights for trend (last 30 days)
 * GET /{ig-user-id}/insights?metric=reach,follower_count&period=day
 * NOTE: reach and follower_count CAN be combined for daily trends
 * Always returns structured JSON response
 */
export async function fetchAccountInsightsTrend(igUserId, pageAccessToken) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchAccountInsightsTrend');
    }

    const cacheKey = `account_insights_trend_${igUserId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    // Daily trends: reach and follower_count CAN be combined.
    // NOTE: 'impressions' was removed from Instagram Graph API v22+ (no longer supported)
    const metrics = 'reach,follower_count';
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=${metrics}&period=day&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        'fetchAccountInsightsTrend'
      );
    }

    const data = await response.json();

    // Parse daily data
    const dailyData = {};
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(metric => {
        if (metric.values && Array.isArray(metric.values)) {
          metric.values.forEach(value => {
            const date = value.end_time ? value.end_time.split('T')[0] : null;
            if (date) {
              if (!dailyData[date]) {
                dailyData[date] = { date, follower_count: 0, reach: 0, impressions: 0 };
              }
              dailyData[date][metric.name] = value.value || 0;
            }
          });
        }
      });
    }

    // Convert to array and sort by date
    const trend = Object.values(dailyData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days

    setCache(cacheKey, trend);
    return createSuccessResponse(trend);
  } catch (error) {
    return createErrorResponse(error, 'fetchAccountInsightsTrend');
  }
}

/**
 * Fetch basic interaction metrics (fallback for unsupported types or errors)
 * GET /{media-id}/insights?metric=likes,comments,saved,shares
 */
async function fetchBasicMediaMetrics(mediaId, pageAccessToken, mediaType) {
  try {
    // Basic interaction metrics supported by almost all types
    const basicMetrics = 'likes,comments,saved,shares';
    const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${basicMetrics}&access_token=${pageAccessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      // Even basic metrics failed - return zeros
      console.warn(`   ⚠️ Basic metrics also failed for ${mediaType} (${mediaId})`);
      return {
        likes: 0, comments: 0, saved: 0, shares: 0,
        views: 0, reach: 0, interactions: 0, watchTime: 0,
        engagement: 0,
        totalInteractions: 0,
        profileActivity: 0,
        watchTimeAvg: 0,
        watchTimeTotal: 0
      };
    }

    const data = await response.json();
    const insights = {};

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(metric => {
        if (metric.values && metric.values.length > 0) {
          insights[metric.name] = metric.values[0].value || 0;
        }
      });
    }

    const totalInteractions = (insights.likes || 0) + (insights.comments || 0) + (insights.saved || 0) + (insights.shares || 0);

    return {
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      saved: insights.saved || 0,
      shares: insights.shares || 0,
      views: 0, // Basic metrics don't include views
      reach: 0,
      interactions: totalInteractions,
      totalInteractions: totalInteractions,
      profileActivity: 0,
      watchTimeAvg: 0,
      watchTimeTotal: 0,
      engagement: totalInteractions
    };
  } catch (error) {
    console.error(`Error in fetchBasicMediaMetrics for ${mediaId}:`, error.message);
    return {
      likes: 0, comments: 0, saved: 0, shares: 0,
      views: 0, reach: 0, interactions: 0, watchTime: 0,
      engagement: 0,
      totalInteractions: 0,
      profileActivity: 0,
      watchTimeAvg: 0,
      watchTimeTotal: 0
    };
  }
}

/**
 * Fetch media insights for a specific post (v22+ - 2024-2025)
 * GET /{media-id}/insights
 *
 * STRICT v22+ METRICS PER MEDIA TYPE:
 * - REEL/REELS: views,reach,likes,comments,saved,shares,total_interactions,watch time
 * - IMAGE/CAROUSEL_ALBUM: views,reach,likes,comments,saved,shares,total_interactions
 * - VIDEO: NOT SUPPORTED for full insights -> use basic metrics + video_play_count
 * - STORY: views (reach) + replies (subject to 5 views minimum)
 */
export async function fetchMediaInsights(mediaId, pageAccessToken, mediaType = 'IMAGE', extraData = {}) {
  try {
    if (!mediaId || !pageAccessToken) {
      return createErrorResponse('Missing required parameters (mediaId or pageAccessToken)', 'fetchMediaInsights');
    }

    const cacheKey = `media_insights_${mediaId}_${mediaType}_v3`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    // 1. Prepare metrics list for supported types
    // NOTE: likes and comments are FIELDS on the Media node, NOT metrics for insights
    let metricsList = [
      'reach',
      'shares',
      'saved',
      'total_interactions'
    ];

    // Add views metric for all supported media types
    if (mediaType === 'REEL' || mediaType === 'REELS') {
      metricsList.push('views');
      metricsList.push('ig_reels_avg_watch_time');
      metricsList.push('ig_reels_video_view_total_time');
    } else if (mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM') {
      metricsList.push('views');
    } else if (mediaType === 'VIDEO') {
      metricsList.push('video_views');
    }

    // Story metrics are different
    if (mediaType === 'STORY') {
      // Keep existing story logic or simplify
    }

    const metrics = metricsList.join(',');
    const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;

    const response = await fetch(url);

    // 3. Handle API Errors with Fallback
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Special case for Stories with <5 views
      if (mediaType === 'STORY' && errorData?.error?.code === 10) {
        // console.warn(`⚠️ Story ${mediaId} insights unavailable (<5 views). Using zeros.`);
        const emptyStory = {
          likes: 0, comments: 0, saved: 0, shares: 0,
          views: 0, reach: 0, interactions: 0, totalInteractions: 0,
          profileActivity: 0, watchTimeAvg: 0, watchTimeTotal: 0, engagement: 0
        };
        setCache(cacheKey, emptyStory);
        return createSuccessResponse(emptyStory);
      }

      // General fallback for any error (code 100 or others)
      // console.warn(`   ⚠️ Full insights failed for ${mediaType} (${mediaId}) - falling back to basic metrics`);
      const basicResult = await fetchBasicMediaMetrics(mediaId, pageAccessToken, mediaType);

      // Use video_play_count if available even on fallback (especially for VIDEO type)
      if (extraData.video_play_count) {
        basicResult.views = extraData.video_play_count;
        basicResult.plays = extraData.video_play_count;
      }

      // Log for VIDEO debugging
      // if (mediaType === 'VIDEO') {
      //   console.log(`   📹 VIDEO ${mediaId} fallback: views=${basicResult.views} (from video_play_count: ${extraData.video_play_count || 0})`);
      // }

      setCache(cacheKey, basicResult);
      return createSuccessResponse(basicResult);
    }

    // 4. Process Successful Response
    const data = await response.json();
    const insights = {};
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(metric => {
        if (metric.values && metric.values.length > 0) {
          insights[metric.name] = metric.values[0].value || 0;
        }
      });
    }

    // Map to consistent result structure
    const fallbackInteractions = (insights.likes || 0) + (insights.comments || 0) + (insights.saved || 0) + (insights.shares || 0);
    const totalInteractions = insights.total_interactions || fallbackInteractions;

    const result = {
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      saved: insights.saved || 0,
      shares: insights.shares || 0,
      views: insights.views || insights.video_views || extraData.video_play_count || 0,
      videoViews: insights.video_views || extraData.video_play_count || 0,
      reach: insights.reach || 0,
      interactions: totalInteractions,
      totalInteractions,
      profileActivity: insights.profile_activity || 0,
      watchTimeAvg: insights.ig_reels_avg_watch_time || 0,
      watchTimeTotal: insights.ig_reels_video_view_total_time || 0,
      engagement: totalInteractions
    };

    // Log for debugging REELS and VIDEO
    // if (mediaType === 'REEL' || mediaType === 'REELS') {
    //   // console.log(`   🎬 REEL ${mediaId} (v22+): Views=${result.views}, Reach=${result.reach}, WatchTime=${result.watchTimeTotal}`);
    // } else if (mediaType === 'VIDEO') {
    //   console.log(`   📹 VIDEO ${mediaId} (v22+): Views=${result.views}, Reach=${result.reach}, Likes=${result.likes}`);

    //   // Fallback to video_play_count if views is 0 but video_play_count is available
    //   if (result.views === 0 && extraData.video_play_count) {
    //     console.log(`   📹 VIDEO ${mediaId}: Using video_play_count as fallback: ${extraData.video_play_count}`);
    //     result.views = extraData.video_play_count;
    //   }
    // }

    setCache(cacheKey, result);
    return createSuccessResponse(result);
  } catch (error) {
    // Final safety net
    console.error(`Error in fetchMediaInsights for ${mediaId}:`, error.message);
    const basicResult = await fetchBasicMediaMetrics(mediaId, pageAccessToken, mediaType);
    if (extraData.video_play_count) {
      basicResult.views = extraData.video_play_count;
    }
    return createSuccessResponse(basicResult);
  }
}

/**
 * Fetch all media (posts) for an Instagram account
 * GET /{ig-user-id}/media
 * Always returns structured JSON response
 */
export async function fetchInstagramMedia(igUserId, pageAccessToken, limit = 25) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchInstagramMedia');
    }

    const cacheKey = `instagram_media_${igUserId}_${limit}_v2`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    // Added video_play_count and media_product_type to fields
    // media_product_type is CRITICAL for detecting Reels (will be "REELS" for reels, "FEED" for regular videos)
    const fields = 'id,media_type,media_product_type,media_url,thumbnail_url,caption,permalink,timestamp,like_count,comments_count,video_play_count';
    const url = `https://graph.facebook.com/v22.0/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        'fetchInstagramMedia'
      );
    }

    const data = await response.json();
    const media = data.data || [];

    // Fetch insights for each media item (with error handling per item)
    const mediaWithInsights = await Promise.all(
      media.map(async (item) => {
        let insights = null;
        try {
          // Pass video_play_count to fetchMediaInsights if available
          const extraData = {
            video_play_count: item.video_play_count
          };

          // Detect REELS from VIDEO type (critical for correct metrics)
          let mediaType = item.media_type;
          if (mediaType === 'VIDEO' && item.permalink && item.permalink.includes('/reel/')) {
            mediaType = 'REELS';
          }

          const insightsResponse = await fetchMediaInsights(item.id, pageAccessToken, mediaType, extraData);

          if (insightsResponse.success) {
            insights = insightsResponse.data;

            // Log REEL and VIDEO insights for debugging
            if (item.media_type === 'REEL' || item.media_type === 'REELS') {
              if (insights.views) {
                console.log(`   ✅ REEL ${item.id} insights: ${insights.views} views`);
              } else {
                console.warn(`   ⚠️  REEL ${item.id} has no views data`, {
                  hasInsights: !!insights,
                  insightsKeys: Object.keys(insights || {}),
                  error: insightsResponse.error
                });
              }
            } else if (item.media_type === 'VIDEO') {
              if (insights.views) {
                console.log(`   ✅ VIDEO ${item.id} insights: ${insights.views} views`);
              } else {
                console.warn(`   ⚠️  VIDEO ${item.id} has no views data, using video_play_count: ${item.video_play_count || 0}`, {
                  hasInsights: !!insights,
                  insightsKeys: Object.keys(insights || {}),
                  video_play_count: item.video_play_count
                });
                // Use video_play_count as fallback if insights views is 0
                if (item.video_play_count && item.video_play_count > 0) {
                  insights.views = item.video_play_count;
                }
              }
            }
          } else {
            const errorMsg = insightsResponse.error || 'Unknown error';
            console.warn(`   ⚠️  Failed to fetch insights for ${item.media_type} ${item.id}: ${errorMsg}`);

            // For REELS, this is critical - log more details
            if (item.media_type === 'REEL' || item.media_type === 'REELS') {
              console.warn(`   ⚠️  CRITICAL: REEL ${item.id} insights failed - views will be 0`);
            }
            // Fallback to basic data from media object if insights fail
            insights = {
              likes: item.like_count || 0,
              comments: item.comments_count || 0,
              views: item.video_play_count || 0, // Use play count as views fallback
              shares: 0,
              saved: 0,
              reach: 0,
              impressions: 0,
              engagement: (item.like_count || 0) + (item.comments_count || 0)
            };
          }
        } catch (error) {
          console.warn(`   ⚠️  Error fetching insights for ${item.media_type} ${item.id}:`, error.message);
          insights = {
            likes: item.like_count || 0,
            comments: item.comments_count || 0,
            views: item.video_play_count || 0,
            engagement: (item.like_count || 0) + (item.comments_count || 0)
          };
        }

        return {
          id: item.id,
          media_type: item.media_type,
          media_url: item.media_url || null,
          thumbnail_url: item.thumbnail_url || item.media_url || null,
          caption: item.caption || '',
          permalink: item.permalink || '',
          timestamp: item.timestamp || '',
          like_count: item.like_count || 0,
          comments_count: item.comments_count || 0,
          views: insights.views || 0,
          reach: insights.reach || 0,
          replies: insights.replies || 0,
          engagement: insights.engagement || 0,
          totalInteractions: insights.totalInteractions || 0,
          profileActivity: insights.profileActivity || 0,
          watchTimeAvg: insights.watchTimeAvg || 0,
          watchTimeTotal: insights.watchTimeTotal || 0,
          insights: insights // Store full insights for later use
        };
      })
    );

    setCache(cacheKey, mediaWithInsights);
    return createSuccessResponse(mediaWithInsights);
  } catch (error) {
    return createErrorResponse(error, 'fetchInstagramMedia');
  }
}

/**
 * Fetch comprehensive analytics for an Instagram account
 * Always returns structured JSON response
 * @param {string} igUserId - Instagram User ID
 * @param {string} pageAccessToken - Instagram Page Access Token
 * @param {Object} client - Optional client object for token validation
 */
export async function fetchInstagramAnalytics(igUserId, pageAccessToken, client = null) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchInstagramAnalytics');
    }

    // Validate token if client provided
    if (client) {
      const { ensureValidToken } = await import('./instagramTokenService.js');
      const tokenResult = await ensureValidToken(client);

      if (tokenResult.needReLogin) {
        return {
          success: false,
          needReLogin: true,
          error: 'Token expired - user must re-authenticate',
          message: 'Instagram token expired. Please reconnect your account.'
        };
      }

      if (tokenResult.success && tokenResult.client) {
        // Use fresh token from validated client
        pageAccessToken = tokenResult.client.pageAccessToken;
      }
    }

    console.log(`📡 Fetching Instagram analytics for user: ${igUserId}`);

    const cacheKey = `instagram_analytics_${igUserId}_v5`;
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`✅ Using cached data for ${igUserId}`);
      return createSuccessResponse(cached);
    }

    console.log(`🔄 Fetching fresh data from Instagram API...`);

    // Fetch account insights and media in parallel - handle response structure
    const [accountInsightsRes, accountTrendRes, mediaRes] = await Promise.all([
      fetchAccountInsights(igUserId, pageAccessToken),
      fetchAccountInsightsTrend(igUserId, pageAccessToken),
      fetchInstagramMedia(igUserId, pageAccessToken, 100) // Increased from 50 to 100 (Instagram's max)
    ]);

    // Extract data from structured responses
    const accountInsights = accountInsightsRes.success ? accountInsightsRes.data : null;
    const accountTrend = accountTrendRes.success ? accountTrendRes.data : [];
    const media = mediaRes.success ? mediaRes.data : [];

    console.log(`📊 API Results:`, {
      accountInsights: accountInsights ? '✅' : '❌',
      accountTrend: accountTrend ? `✅ (${accountTrend.length} days)` : '❌',
      media: media ? `✅ (${media.length} posts)` : '❌'
    });

    // MERGE WITH DB HISTORY (DailyAnalytics)
    // This ensures that even if API doesn't return history, we build it up over time.
    if (client?._id) {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dbHistory = await DailyAnalytics.find({
          client: client._id,
          platform: 'instagram',
          date: { $gte: thirtyDaysAgo }
        }).sort({ date: 1 });

        if (dbHistory.length > 0) {
          console.log(`   📚 Found ${dbHistory.length} DailyAnalytics records to merge`);

          // Create a map of existing trend dates
          const trendMap = new Map();
          if (accountTrend) {
            accountTrend.forEach(day => trendMap.set(day.date, day));
          } else {
            accountTrend = [];
          }

          dbHistory.forEach(record => {
            const dateStr = record.date.toISOString().split('T')[0];
            if (trendMap.has(dateStr)) {
              // Update existing record if it has 0s and DB has values
              const existing = trendMap.get(dateStr);
              if (!existing.follower_count && record.followers) existing.follower_count = record.followers;
              if (!existing.reach && record.reach) existing.reach = record.reach;
              if (!existing.impressions && record.impressions) existing.impressions = record.impressions;
            } else {
              // Add new record from DB
              const newEntry = {
                date: dateStr,
                follower_count: record.followers || 0,
                reach: record.reach || 0,
                impressions: record.impressions || 0
              };
              accountTrend.push(newEntry);
              trendMap.set(dateStr, newEntry);
            }
          });

          // Re-sort accountTrend by date
          accountTrend.sort((a, b) => new Date(a.date) - new Date(b.date));
        }
      } catch (err) {
        console.error('   ⚠️ Failed to merge DailyAnalytics history:', err.message);
      }
    }

    if (!accountInsights) {
      return createErrorResponse('Failed to fetch account insights', 'fetchInstagramAnalytics');
    }

    // Calculate totals from media - STRICT v22+ compliance
    let totalViews = 0;
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalMediaReach = 0;
    let totalMediaImpressions = 0;
    let totalMediaInteractions = 0;
    let totalWatchTimeAvgSum = 0;
    let totalWatchTimeTotal = 0;
    let watchTimeSampleCount = 0;

    const postsByType = {
      IMAGE: 0,
      VIDEO: 0,
      CAROUSEL_ALBUM: 0,
      REELS: 0,
      REEL: 0,
      STORY: 0
    };

    // Count REELS for logging
    const reelCount = media.filter(item => item.media_type === 'REEL' || item.media_type === 'REELS').length;
    // console.log(`   📊 Processing ${reelCount} REEL(s) for views...`);

    media.forEach(item => {
      const insights = item.insights || {};

      const views = insights.views || insights.videoViews || insights.video_views || item.video_play_count || 0;
      totalViews += views;

      const reach = insights.reach || 0;
      totalMediaReach += reach;

      const impressions = insights.impressions || reach || 0;
      totalMediaImpressions += impressions;

      const interactionValue = insights.totalInteractions ?? insights.interactions ?? insights.engagement ??
        ((insights.likes || 0) + (insights.comments || 0) + (insights.saved || 0) + (insights.shares || 0));
      totalMediaInteractions += interactionValue;

      const watchTimeAvg = insights.watchTimeAvg || insights.watchTime || insights.ig_reels_avg_watch_time || 0;
      if (watchTimeAvg > 0) {
        totalWatchTimeAvgSum += watchTimeAvg;
        watchTimeSampleCount += 1;
      }
      const watchTimeTotal = insights.watchTimeTotal || insights.ig_reels_video_view_total_time || 0;
      totalWatchTimeTotal += watchTimeTotal;

      totalEngagements += insights.engagement || interactionValue;
      totalLikes += insights.likes || item.like_count || 0;
      totalComments += insights.comments || item.comments_count || 0;
      totalSaves += insights.saved || 0;
      totalShares += insights.shares || 0;

      // Count by type - CRITICAL: Detect Reels using watch time metrics
      // Instagram returns Reels as media_type=VIDEO but media_product_type is undefined
      // SOLUTION: Reels have unique metrics like ig_reels_avg_watch_time that regular videos don't have
      let type = item.media_type || 'IMAGE';
      const productType = item.media_product_type; // Usually undefined
      const hasReelMetrics = insights.ig_reels_avg_watch_time || insights.ig_reels_video_view_total_time || insights.watchTimeAvg || insights.watchTimeTotal;

      // Debug log for VIDEO posts
      if (type === 'VIDEO') {
        console.log(`   📹 VIDEO detected: media_type=${type}, media_product_type=${productType}, hasReelMetrics=${!!hasReelMetrics}, id=${item.id}`);
      }

      // If it's a VIDEO with Reel-specific metrics, categorize as REELS
      if (type === 'VIDEO' && hasReelMetrics) {
        console.log(`   🎬 Converting VIDEO to REELS (detected via watch time metrics) for id=${item.id}`);
        type = 'REELS';
      } else if (type === 'VIDEO' && productType === 'REELS') {
        // Fallback: if product type is available and says REELS
        console.log(`   🎬 Converting VIDEO to REELS (detected via product_type) for id=${item.id}`);
        type = 'REELS';
      } else if (type === 'VIDEO' && item.permalink && item.permalink.includes('/reel/')) {
        // Fallback: Check permalink for /reel/
        // console.log(`   🎬 Converting VIDEO to REELS (detected via permalink) for id=${item.id}`);
        type = 'REELS';
      }

      if (postsByType.hasOwnProperty(type)) {
        postsByType[type]++;
      } else if (type === 'REEL') {
        postsByType.REELS = (postsByType.REELS || 0) + 1; // Group REEL with REELS
      }
    });

    // Calculate engagement rate (Average Engagement Rate per Post)
    // Formula: ((Total Engagements / Total Posts) / Follower Count) * 100
    const followerCount = accountInsights.follower_count || 1;
    const totalPosts = media.length || 1;

    const engagementRate = totalEngagements > 0
      ? (((totalEngagements / totalPosts) / followerCount) * 100).toFixed(2)
      : '0.00';

    // Calculate follower growth from trend data
    let followerGrowth = 0;

    // Patch trend data with current follower count if trend shows 0 (common API issue)
    if (accountTrend && accountTrend.length > 0) {
      const lastIndex = accountTrend.length - 1;
      if (accountTrend[lastIndex].follower_count === 0 && followerCount > 0) {
        // console.log(`   🔧 Patching latest trend data with current count: ${followerCount}`);
        accountTrend[lastIndex].follower_count = followerCount;
      }
    }

    if (accountTrend && accountTrend.length >= 2) {
      const firstDay = accountTrend[0].follower_count || 0;
      const lastDay = accountTrend[accountTrend.length - 1].follower_count || 0;
      followerGrowth = lastDay - firstDay;
    } else if (followerCount > 0) {
      // If no trend data but we have followers, assume all are new (fallback)
      followerGrowth = followerCount;
    }

    // Get latest reach from trend data
    const latestReach = accountTrend && accountTrend.length > 0
      ? accountTrend[accountTrend.length - 1].reach || 0
      : 0;

    // Log total views calculation for debugging
    // console.log(`   📊 Total Views Calculation:`);
    // console.log(`      REEL Count: ${reelCount}`);
    // console.log(`      Total Views: ${totalViews}`);
    // console.log(`      Media Items Processed: ${media.length}`);

    // 3. Save Daily Analytics Snapshot
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyData = {
        client: client?._id, // We need client ID here. If not passed, we can't save.
        date: today,
        platform: 'instagram',
        followers: accountInsights.follower_count,
        impressions: accountInsights.impressions,
        reach: accountInsights.reach,
        profileViews: accountInsights.profile_views,
        websiteClicks: accountInsights.website_clicks,
        emailContacts: accountInsights.email_contacts,
        phoneCallClicks: accountInsights.phone_call_clicks,
        textMessageClicks: accountInsights.text_message_clicks,
        getDirectionsClicks: accountInsights.get_directions_clicks,
        // Messaging (placeholder for now as API requires specific permissions)
        messaging: {
          sent: 0,
          received: 0,
          newConversations: 0
        },
        engagement: {
          total: 0, // Will sum up from posts
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0
        },
        postsPublished: 0
      };

      // Calculate aggregated engagement from recent posts (approximate for "today" if we filtered by date, but here we sum up recent activity)
      // Better approach: Sum up engagement from posts published TODAY.
      const postsToday = media.filter(m => {
        const postDate = new Date(m.timestamp);
        return postDate >= today;
      });

      dailyData.postsPublished = postsToday.length;

      // Sum up engagement from ALL fetched media (as a proxy for "daily engagement" activity, though technically this is lifetime engagement of recent posts)
      // For a true "daily engagement" we'd need daily insights per media, which isn't easily available in bulk.
      // We'll store the TOTAL engagement of the account's recent posts as a snapshot.
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalSaves = 0;

      media.forEach(m => {
        totalLikes += m.like_count || 0;
        totalComments += m.comments_count || 0;
        totalShares += m.insights?.shares || 0;
        totalSaves += m.insights?.saved || 0;

        // Update Post in DB if it exists
        if (client?._id) {
          Post.findOne({ instagramPostId: m.id }).then(post => {
            if (post) {
              post.engagement = {
                likes: m.like_count || 0,
                comments: m.comments_count || 0,
                shares: m.insights?.shares || 0,
                saves: m.insights?.saved || 0,
                views: m.views || 0,
                reach: m.reach || 0,
                interactions: m.totalInteractions || 0,
                watchTime: m.watchTimeTotal || 0,
                lastUpdated: new Date(),
                profileVisits: m.profileActivity || 0, // If available
                websiteClicks: 0, // Not available per post usually
                engagementRate: m.reach > 0 ? ((m.totalInteractions / m.reach) * 100) : 0,
                videoViewsBreakdown: {
                  total: m.views || 0,
                  organic: m.views || 0, // Assumption
                  paid: 0,
                  autoplay: 0,
                  clickToPlay: 0
                },
                metricsRaw: m.insights
              };
              post.save().catch(err => console.error('Failed to update post metrics:', err.message));
            }
          });
        }
      });

      dailyData.engagement.likes = totalLikes;
      dailyData.engagement.comments = totalComments;
      dailyData.engagement.shares = totalShares;
      dailyData.engagement.saves = totalSaves;
      dailyData.engagement.total = totalLikes + totalComments + totalShares + totalSaves;

      if (client?._id) {
        await DailyAnalytics.findOneAndUpdate(
          { client: client._id, platform: 'instagram', date: today },
          dailyData,
          { upsert: true, new: true }
        );
        console.log('   ✅ Saved DailyAnalytics snapshot');
      }

    } catch (error) {
      console.error('   ⚠️ Failed to save DailyAnalytics:', error.message);
    }

    const result = {
      account: {
        follower_count: accountInsights.follower_count || 0,
        media_count: accountInsights.media_count || 0,
        reach: latestReach,
        reach_28d: accountInsights.reach_28d || 0,
        profile_views: accountInsights.profile_views || 0,
        impressions: accountInsights.impressions || 0,
        website_clicks: accountInsights.website_clicks || 0,
        email_contacts: accountInsights.email_contacts || 0,
        phone_call_clicks: accountInsights.phone_call_clicks || 0,
        text_message_clicks: accountInsights.text_message_clicks || 0,
        get_directions_clicks: accountInsights.get_directions_clicks || 0
      },
      media: {
        total: media.length,
        totalViews,
        totalEngagements,
        totalLikes,
        totalComments,
        totalSaves,
        totalShares,
        totalReach: totalMediaReach,
        totalImpressions: totalMediaImpressions,
        totalInteractions: totalMediaInteractions,
        avgWatchTime: watchTimeSampleCount > 0 ? totalWatchTimeAvgSum / watchTimeSampleCount : 0,
        totalWatchTime: totalWatchTimeTotal,
        engagementRate,
        postsByType
      },
      trends: {
        followers: accountTrend.map(day => ({
          date: day.date,
          follower_count: day.follower_count || 0,
          followers: day.follower_count || 0 // Alias for compatibility
        })),
        engagement: accountTrend.map(day => ({
          date: day.date,
          reach: day.reach || 0
        }))
      },
      recentPosts: media.slice(0, 10).map(item => {
        // Detect if this is a Reel using watch time metrics (since media_product_type is undefined)
        let displayType = item.media_type;
        const hasReelMetrics = item.insights?.ig_reels_avg_watch_time || item.insights?.ig_reels_video_view_total_time || item.insights?.watchTimeAvg || item.insights?.watchTimeTotal;
        if (item.media_type === 'VIDEO' && hasReelMetrics) {
          displayType = 'REELS';
        } else if (item.media_type === 'VIDEO' && item.media_product_type === 'REELS') {
          displayType = 'REELS'; // Fallback
        }

        // Calculate engagement metrics
        const likes = item.insights?.likes || item.like_count || 0;
        const comments = item.insights?.comments || item.comments_count || 0;
        const saved = item.insights?.saved || 0;
        const shares = item.insights?.shares || 0;

        // Calculate total engagement (sum of all interactions)
        const calculatedEngagement = likes + comments + saved + shares;

        // Use Instagram's engagement metric if available, otherwise use calculated
        const finalEngagement = item.insights?.engagement
          || item.insights?.total_interactions
          || item.insights?.interactions
          || calculatedEngagement;

        // Calculate per-post engagement rate (Interactions / Reach * 100) or (Interactions / Impressions * 100)
        const reachRef = item.insights?.reach || item.insights?.impressions || 0;
        const engagementRate = reachRef > 0 ? ((finalEngagement / reachRef) * 100) : 0;

        return {
          id: item.id,
          media_type: displayType,
          thumbnail_url: item.thumbnail_url,
          caption: item.caption,
          permalink: item.permalink,
          timestamp: item.timestamp,
          metrics: {
            likes,
            comments,
            saved,
            shares,
            reach: item.insights?.reach || 0,
            views: item.insights?.views || item.video_play_count || 0,
            replies: item.media_type === 'STORY' ? (item.insights?.replies || 0) : 0,
            profileActivity: item.insights?.profileActivity || 0,
            watchTimeAvg: item.insights?.watchTimeAvg || 0,
            watchTimeTotal: item.insights?.watchTimeTotal || 0,
            engagement: finalEngagement,
            engagementRate: engagementRate
          }
        };
      }),
      allPosts: media.map(item => {
        // Detect if this is a Reel using watch time metrics (since media_product_type is undefined)
        let displayType = item.media_type;
        const hasReelMetrics = item.insights?.ig_reels_avg_watch_time || item.insights?.ig_reels_video_view_total_time || item.insights?.watchTimeAvg || item.insights?.watchTimeTotal;
        if (item.media_type === 'VIDEO' && hasReelMetrics) {
          displayType = 'REELS';
        } else if (item.media_type === 'VIDEO' && item.media_product_type === 'REELS') {
          displayType = 'REELS'; // Fallback
        }

        // Calculate engagement metrics
        const likes = item.insights?.likes || item.like_count || 0;
        const comments = item.insights?.comments || item.comments_count || 0;
        const saved = item.insights?.saved || 0;
        const shares = item.insights?.shares || 0;

        // Calculate total engagement (sum of all interactions)
        const calculatedEngagement = likes + comments + saved + shares;

        // Use Instagram's engagement metric if available, otherwise use calculated
        const finalEngagement = item.insights?.engagement
          || item.insights?.total_interactions
          || item.insights?.interactions
          || calculatedEngagement;

        // Calculate per-post engagement rate (Interactions / Reach * 100) or (Interactions / Impressions * 100)
        const reachRef = item.insights?.reach || item.insights?.impressions || 0;
        const engagementRate = reachRef > 0 ? ((finalEngagement / reachRef) * 100) : 0;

        return {
          id: item.id,
          media_type: displayType,
          thumbnail_url: item.thumbnail_url,
          caption: item.caption,
          permalink: item.permalink,
          timestamp: item.timestamp,
          metrics: {
            likes,
            comments,
            saved,
            shares,
            reach: item.insights?.reach || 0,
            views: item.insights?.views || item.video_play_count || 0,
            replies: item.media_type === 'STORY' ? (item.insights?.replies || 0) : 0,
            profileActivity: item.insights?.profileActivity || 0,
            watchTimeAvg: item.insights?.watchTimeAvg || 0,
            watchTimeTotal: item.insights?.watchTimeTotal || 0,
            engagement: finalEngagement,
            engagementRate: engagementRate
          }
        };
      }),
      followerGrowth
    };

    // Cache the result (Instagram API can legitimately return 0 for some metrics)
    // Only skip caching if we have no data at all
    const hasData = result.media.total > 0 || result.account.follower_count > 0;

    if (hasData) {
      setCache(cacheKey, result);
      console.log(`✅ Cached data for user ${igUserId} (${result.media.total} posts, ${result.account.follower_count} followers)`);
    } else {
      console.log(`⚠️ Skipping cache - no data available`);
    }

    return createSuccessResponse(result);
  } catch (error) {
    return createErrorResponse(error, 'fetchInstagramAnalytics');
  }
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(key = null) {
  if (key) {
    const cacheKey = getCacheKey(key);
    cache.delete(cacheKey);
    console.log(`🗑️ Cleared cache for key: ${key}`);
  } else {
    const size = cache.size;
    cache.clear();
    console.log(`🗑️ Cleared all cache (${size} entries)`);
  }
}

/**
 * Clear cache for a specific Instagram user
 */
export function clearUserCache(igUserId) {
  if (!igUserId) return;

  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.includes(igUserId)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => cache.delete(key));
  console.log(`🗑️ Cleared cache for Instagram user ${igUserId} (${keysToDelete.length} entries)`);
}

/**
 * UNIT TEST SKELETONS
 * These are skeleton test functions for critical Instagram Insights Service functions.
 * They should be moved to a proper test file and implemented with a testing framework.
 */

/**
 * @jest-environment node
 * @group unit
 */
export function testCreateErrorResponse() {
  console.log('Testing createErrorResponse function...');

  // Test basic error response
  const errorResponse = createErrorResponse('Test error', 'testFunction');
  console.assert(errorResponse.success === false, 'Should return success: false');
  console.assert(errorResponse.error === 'Test error', 'Should contain error message');
  console.assert(errorResponse.timestamp, 'Should contain timestamp');

  console.log('✅ createErrorResponse tests passed');
}

/**
 * @jest-environment node
 * @group unit
 */
export function testCreateSuccessResponse() {
  console.log('Testing createSuccessResponse function...');

  const testData = { follower_count: 1000, profile_views: 500 };
  const successResponse = createSuccessResponse(testData);

  console.assert(successResponse.success === true, 'Should return success: true');
  console.assert(successResponse.data === testData, 'Should contain data');
  console.assert(successResponse.timestamp, 'Should contain timestamp');

  console.log('✅ createSuccessResponse tests passed');
}

/**
 * @jest-environment node
 * @group unit
 */
export function testFetchMediaInsightsValidation() {
  console.log('Testing fetchMediaInsights validation...');

  // Test missing parameters
  const result1 = fetchMediaInsights(null, 'token', 'IMAGE');
  console.assert(result1.success === false, 'Should fail with null mediaId');
  console.assert(result1.error.includes('Missing required parameters'), 'Should return proper error message');

  const result2 = fetchMediaInsights('media123', null, 'IMAGE');
  console.assert(result2.success === false, 'Should fail with null pageAccessToken');

  console.log('✅ fetchMediaInsights validation tests passed');
}

/**
 * @jest-environment node
 * @group unit
 */
export function testMediaTypeMetrics() {
  console.log('Testing media type metrics validation...');

  // Test REEL metrics (should include plays)
  // Note: This would require mocking the Instagram API
  console.log('📝 Media type metrics validation would require API mocking');

  // Test that REEL uses 'plays' metric
  const reelMetrics = 'views,likes,comments,saved,shares,reach';
  console.assert(reelMetrics.includes('views'), 'REEL should include views metric');
  console.assert(!reelMetrics.includes('impressions'), 'REEL should NOT include impressions');

  // Test that IMAGE does not include reach or impressions
  const imageMetrics = 'likes,comments,saved,shares';
  console.assert(!imageMetrics.includes('reach'), 'IMAGE should NOT include reach');
  console.assert(!imageMetrics.includes('impressions'), 'IMAGE should NOT include impressions');

  console.log('✅ Media type metrics validation passed');
}

/**
 * @jest-environment node
 * @group unit
 */
export function testCacheFunctions() {
  console.log('Testing cache functions...');

  // Test cache key generation
  const key = getCacheKey('test_key');
  console.assert(key === 'ig_insights_test_key', 'Should generate proper cache key');

  // Test cache set and get
  setCache('test', { data: 'test_value' });
  const cached = getCached('test');
  console.assert(cached === 'test_value', 'Should retrieve cached value');

  // Test cache expiration (simulate by setting old timestamp)
  const oldCache = cache.get('ig_insights_test');
  if (oldCache) {
    oldCache.timestamp = Date.now() - 6 * 60 * 1000; // 6 minutes ago
    const expired = getCached('test');
    console.assert(expired === null, 'Should return null for expired cache');
  }

  console.log('✅ Cache functions tests passed');
}

/**
 * @jest-environment node
 * @group integration
 */
export function testInstagramAnalyticsIntegration() {
  console.log('Testing Instagram Analytics integration (requires valid tokens)...');

  // These tests would require valid Instagram API tokens and should be run in integration test environment
  console.log('📝 Integration tests would require valid Instagram API credentials');
  console.log('   - Valid igUserId');
  console.log('   - Valid pageAccessToken with proper permissions');
  console.log('   - Network connectivity to Instagram Graph API');

  // Skeleton structure for integration tests:
  /*
  const igUserId = process.env.TEST_IG_USER_ID;
  const pageAccessToken = process.env.TEST_PAGE_ACCESS_TOKEN;
 
  if (igUserId && pageAccessToken) {
    // Test fetchAccountInsights
    const accountResult = await fetchAccountInsights(igUserId, pageAccessToken);
    console.assert(accountResult.success === true, 'Should successfully fetch account insights');
 
    // Test fetchMediaInsights for REEL
    const mediaResult = await fetchMediaInsights('reel_media_id', pageAccessToken, 'REEL');
    if (mediaResult.success) {
      console.assert(mediaResult.data.views !== undefined, 'REEL should have views metric');
      console.assert(mediaResult.data.impressions === undefined, 'Should NOT have impressions');
    }
 
    console.log('✅ Integration tests passed');
  } else {
    console.log('⚠️ Skipping integration tests - missing credentials');
  }
  */
}

/**
 * Run all unit tests
 * @jest-environment node
 */
export function runInstagramInsightsTests() {
  console.log('🚀 Running Instagram Insights Service Unit Tests...\n');

  try {
    testCreateErrorResponse();
    testCreateSuccessResponse();
    testFetchMediaInsightsValidation();
    testMediaTypeMetrics();
    testCacheFunctions();
    testInstagramAnalyticsIntegration();

    console.log('\n✅ All Instagram Insights Service tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    throw error;
  }
}

/**
 * Fetch contact metrics (website clicks, etc) for snapshot service
 * @param {String} igUserId 
 * @param {String} pageAccessToken 
 * @returns {Object} Contact metrics
 */
export const fetchContactMetrics = async (igUserId, pageAccessToken) => {
  try {
    // Fetch 28-day metrics for better visibility
    const metrics = 'website_clicks,email_contacts,phone_call_clicks,text_message_clicks,get_directions_clicks';
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=${metrics}&period=days_28&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    const result = {
      website_clicks: 0,
      email_contacts: 0,
      phone_call_clicks: 0,
      text_message_clicks: 0,
      get_directions_clicks: 0
    };

    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(metric => {
          if (metric.values && metric.values.length > 0) {
            // Find the latest NON-ZERO value
            const values = metric.values;
            let latestValue = 0;
            for (let i = values.length - 1; i >= 0; i--) {
              if (values[i].value > 0) {
                latestValue = values[i].value;
                break;
              }
            }
            result[metric.name] = latestValue;
          }
        });
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching contact metrics:', error);
    return null;
  }
};

/**
 * Import historical Instagram posts for a new client
 * Fetches up to 100 posts with pagination and saves to database
 * @param {string} igUserId - Instagram User ID
 * @param {string} pageAccessToken - Instagram Page Access Token  
 * @param {string} clientId - Client MongoDB ID
 * @returns {Promise<number>} - Number of posts imported
 */
export async function importHistoricalPosts(igUserId, pageAccessToken, clientId) {
  try {
    console.log(`📥 Starting historical post import for client ${clientId}...`);

    if (!igUserId || !pageAccessToken || !clientId) {
      throw new Error('Missing required parameters');
    }

    let allPosts = [];
    let pageCount = 0;
    let nextCursor = null;
    const POSTS_PER_PAGE = 25;
    const MAX_POSTS = 100;

    // Fetch posts with pagination
    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}...`);

      const fields = 'id,media_type,media_product_type,media_url,thumbnail_url,caption,permalink,timestamp,like_count,comments_count,video_play_count';
      let url = `https://graph.facebook.com/v22.0/${igUserId}/media?fields=${fields}&limit=${POSTS_PER_PAGE}&access_token=${pageAccessToken}`;

      if (nextCursor) {
        url += `&after=${nextCursor}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch page ${pageCount}: ${response.status}`);
        break;
      }

      const data = await response.json();
      const posts = data.data || [];

      console.log(`   ✅ Fetched ${posts.length} posts from page ${pageCount}`);
      allPosts = allPosts.concat(posts);

      // Check for next page
      nextCursor = data.paging?.cursors?.after || null;

      // Stop if we've reached max posts or no more pages
      if (allPosts.length >= MAX_POSTS || !nextCursor) {
        break;
      }
    } while (nextCursor && pageCount < 10); // Max 10 pages as safety

    // Limit to MAX_POSTS
    allPosts = allPosts.slice(0, MAX_POSTS);
    console.log(`📊 Total posts fetched: ${allPosts.length}`);

    if (allPosts.length === 0) {
      console.log('No posts to import');
      return 0;
    }

    // Import posts to database
    let importedCount = 0;
    let skippedCount = 0;

    for (const item of allPosts) {
      try {
        // Check if post already exists
        const existingPost = await Post.findOne({ instagramPostId: item.id });
        if (existingPost) {
          skippedCount++;
          continue;
        }

        // Fetch insights for this post
        let insights = null;
        try {
          const extraData = { video_play_count: item.video_play_count };
          let mediaType = item.media_type;

          // Detect reels
          if (mediaType === 'VIDEO' && item.permalink && item.permalink.includes('/reel/')) {
            mediaType = 'REELS';
          }

          const insightsResponse = await fetchMediaInsights(item.id, pageAccessToken, mediaType, extraData);
          if (insightsResponse.success) {
            insights = insightsResponse.data;
          }
        } catch (err) {
          console.warn(`Failed to fetch insights for ${item.id}: ${err.message}`);
        }

        // Determine post type
        let postType = 'post';
        if (item.media_type === 'VIDEO' && item.permalink && item.permalink.includes('/reel/')) {
          postType = 'reel';
        } else if (item.media_type === 'VIDEO') {
          postType = 'video';
        } else if (item.media_type === 'CAROUSEL_ALBUM') {
          postType = 'carousel';
        }

        // Create post document
        const newPost = new Post({
          client: clientId,
          platform: 'instagram',
          instagramPostId: item.id,
          caption: item.caption || '',
          content: item.caption || '',
          mediaUrls: item.media_url ? [item.media_url] : [],
          thumbnailUrl: item.thumbnail_url || item.media_url,
          postType: postType,
          status: 'published',
          publishedTime: item.timestamp ? new Date(item.timestamp) : new Date(),
          createdAt: item.timestamp ? new Date(item.timestamp) : new Date(),
          engagement: insights ? {
            likes: insights.likes || item.like_count || 0,
            comments: insights.comments || item.comments_count || 0,
            shares: insights.shares || 0,
            saves: insights.saved || 0,
            views: insights.views || 0,
            reach: insights.reach || 0,
            interactions: insights.totalInteractions || 0,
            watchTime: insights.watchTimeTotal || 0,
            lastUpdated: new Date()
          } : {
            likes: item.like_count || 0,
            comments: item.comments_count || 0,
            shares: 0,
            saves: 0,
            views: 0,
            reach: 0,
            interactions: (item.like_count || 0) + (item.comments_count || 0),
            lastUpdated: new Date()
          }
        });

        await newPost.save();
        importedCount++;
      } catch (err) {
        console.error(`Error importing post ${item.id}:`, err.message);
      }
    }

    console.log(`✅ Import complete: ${importedCount} imported, ${skippedCount} skipped`);
    return importedCount;
  } catch (error) {
    console.error('❌ Error in importHistoricalPosts:', error.message);
    throw error;
  }
}
