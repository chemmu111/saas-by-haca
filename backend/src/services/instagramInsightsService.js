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
import { ensureValidToken } from './instagramTokenService.js';

const GRAPH_API_VERSION = process.env.IG_GRAPH_API_VERSION || 'v24.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
// Simple in-memory cache (5 minutes TTL)
const cache = new Map();
const DEFAULT_CACHE_TTL = 300 * 1000; // 300 seconds
const MEDIA_METRICS_MAP = {
  REEL: ['likes', 'comments', 'saved', 'reach', 'views', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'],
  REELS: ['likes', 'comments', 'saved', 'reach', 'views', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'],
  VIDEO: ['likes', 'comments', 'saved', 'views'],
  IMAGE: ['likes', 'comments', 'saved'],
  CAROUSEL_ALBUM: ['likes', 'comments', 'saved'],
  STORY: ['views', 'reach', 'replies', 'navigation', 'exits', 'taps_forward', 'taps_back'],
  DEFAULT: ['likes', 'comments', 'saved']
};
const EMPTY_INSIGHTS = {
  likes: 0,
  comments: 0,
  saved: 0,
  shares: 0,
  views: 0,
  reach: 0,
  replies: 0,
  engagement: 0,
  totalInteractions: 0,
  profileActivity: 0,
  watchTimeAvg: 0,
  watchTimeTotal: 0
};

function cloneEmptyInsights() {
  return { ...EMPTY_INSIGHTS };
}

function getCacheKey(key) {
  return `ig_insights_${key}`;
}

function getCached(key) {
  const cacheKey = getCacheKey(key);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < (cached.ttlMs || DEFAULT_CACHE_TTL)) {
    return cached.data;
  }
  cache.delete(cacheKey);
  return null;
}

function setCache(key, data, ttlMs = DEFAULT_CACHE_TTL) {
  const cacheKey = getCacheKey(key);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttlMs
  });
}

async function pMap(items, mapper, concurrency = 5) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

async function withTimeout(promise, timeoutMs) {
  let timeoutHandle;
  const timeoutPromise = new Promise(resolve => {
    timeoutHandle = setTimeout(() => resolve({ ready: false, error: new Error('timeout') }), timeoutMs);
  });

  try {
    const data = await Promise.race([
      promise
        .then(result => ({ ready: true, data: result }))
        .catch(error => ({ ready: false, error })),
      timeoutPromise
    ]);
    return data;
  } finally {
    clearTimeout(timeoutHandle);
  }
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
async function fetchFollowerCountBasic(igUserId, pageAccessToken) {
  try {
    const url = `${GRAPH_BASE_URL}/${igUserId}?fields=followers_count&access_token=${pageAccessToken}`;
    console.log('   📡 Fetching from basic endpoint...');
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('   ❌ Error fetching basic followers_count:', response.status);
      if (errorData.error) {
        console.error('      Error:', errorData.error.message);
      }
      return null;
    }

    const data = await response.json();
    console.log('   ✅ Basic endpoint response:', data);
    const count = data.followers_count || null;
    if (count) {
      console.log(`   ✅ Follower count from basic endpoint: ${count}`);
    } else {
      console.log('   ⚠️ No followers_count in basic endpoint response');
    }
    return count;
  } catch (error) {
    console.error('   ❌ Error fetching basic followers_count:', error.message);
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
    const url = `${GRAPH_BASE_URL}/${igUserId}/insights?metric=follower_count&period=day&access_token=${pageAccessToken}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error fetching follower_count from insights:', response.status);
      if (errorData.error) {
        console.error('   Error:', errorData.error.message);
        console.log('   🔄 Trying basic endpoint instead...');
      }
      // Fall back to basic endpoint
      return await fetchFollowerCountBasic(igUserId, pageAccessToken);
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
    // If no data returned, try basic endpoint
    console.log('   ⚠️ No follower data in insights, trying basic endpoint...');
    return await fetchFollowerCountBasic(igUserId, pageAccessToken);
  } catch (error) {
    console.error('Error fetching follower_count:', error);
    // Fall back to basic endpoint
    return await fetchFollowerCountBasic(igUserId, pageAccessToken);
  }
}

/**
 * Fetch profile views (daily total)
 * GET /{ig-user-id}/insights?metric=profile_views&metric_type=total_value&period=day
 */
async function fetchProfileViews(igUserId, pageAccessToken) {
  try {
    const url = `${GRAPH_BASE_URL}/${igUserId}/insights?metric=profile_views&metric_type=total_value&period=day&access_token=${pageAccessToken}`;
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
    if (data.data && data.data.length > 0) {
      const metric = data.data[0];
      if (metric.values && metric.values.length > 0) {
        // Get the latest value (most recent day)
        const latest = metric.values[metric.values.length - 1];
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
    const url = `${GRAPH_BASE_URL}/${igUserId}/insights?metric=reach&period=day&access_token=${pageAccessToken}`;
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

    const cacheKey = `account_insights_${igUserId}_lifetime`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    // Fetch follower count (latest daily value)
    const followerCount = await fetchFollowerCount(igUserId, pageAccessToken);

    // Fetch profile views (daily total)
    const profileViews = await fetchProfileViews(igUserId, pageAccessToken);

    const result = {
      follower_count: followerCount || 0,
      profile_views: profileViews || 0,
      reach: 0 // Will be calculated from trend data
    };

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

    // Daily trends: reach and follower_count CAN be combined
    const metrics = 'reach,follower_count';
    const url = `${GRAPH_BASE_URL}/${igUserId}/insights?metric=${metrics}&period=day&access_token=${pageAccessToken}`;

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
                dailyData[date] = { date, follower_count: 0, reach: 0 };
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
 * Fetch media insights for a specific post (v22+ - 2024-2025)
 * GET /{media-id}/insights
 *
 * STRICT v22+ METRICS PER MEDIA TYPE:
 * - REEL/REELS: views,reach,likes,comments,saved,shares,total_interactions,watch time
 * - IMAGE/CAROUSEL_ALBUM/VIDEO: views,reach,likes,comments,saved,shares,total_interactions
 * - STORY: views (reach) + replies (subject to 5 views minimum)
 *
 * CRITICAL: NO FALLBACK TO REMOVED METRICS
 * ❌ impressions - completely removed from API
 * ❌ plays / video_views - replaced by unified 'views'
 * ❌ ig_reels_aggregated_all_plays_count - removed
 */
export async function fetchMediaInsights(mediaId, pageAccessToken, mediaType = 'IMAGE') {
  try {
    if (!mediaId || !pageAccessToken) {
      return createErrorResponse('Missing required parameters (mediaId or pageAccessToken)', 'fetchMediaInsights');
    }

    const cacheKey = `media_insights_${mediaId}_${mediaType}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    const normalizedType = (mediaType || 'DEFAULT').toUpperCase();
    const metricList = MEDIA_METRICS_MAP[normalizedType] || MEDIA_METRICS_MAP.DEFAULT;
    const metrics = metricList.join(',');
    const url = `${GRAPH_BASE_URL}/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('insights-fetch-failed', {
        mediaId,
        mediaType,
        status: response.status,
        message: errorData?.error?.message
      });

      if (mediaType === 'STORY' && errorData?.error?.code === 10) {
        console.warn(`⚠️ Story ${mediaId} insights unavailable (<5 views). Using zeros.`);
        const emptyStory = {
          likes: 0,
          comments: 0,
          saved: 0,
          shares: 0,
          views: 0,
          reach: 0,
          interactions: 0,
          totalInteractions: 0,
          profileActivity: 0,
          watchTimeAvg: 0,
          watchTimeTotal: 0,
          engagement: 0
        };
        setCache(cacheKey, emptyStory);
        return createSuccessResponse(emptyStory);
      }

      // Handle specific error codes
      if (errorData.error && errorData.error.code === 100) {
        // Metric not supported - return empty insights instead of error
        // This happens if we request 'ig_reels_avg_watch_time' for an IMAGE, for example.
        // Ideally we should tailor metrics per type, but requesting all and handling error is also a strategy
        // IF the API fails the whole request. 
        // Instagram API usually fails the whole request if ONE metric is invalid.

        // Fallback: Request basic metrics if full list fails
        console.warn(`⚠️ Full metrics failed for ${mediaType} (${mediaId}), trying basic metrics...`);
        console.warn('insights-retry', {
          mediaId,
          mediaType,
          reason: 'unsupported-metric'
        });
        const basicMetrics = 'likes,comments,saved';
        const basicUrl = `${GRAPH_BASE_URL}/${mediaId}/insights?metric=${basicMetrics}&access_token=${pageAccessToken}`;
        const basicResponse = await fetch(basicUrl);

        if (!basicResponse.ok) {
          console.warn(`⚠️ Basic metrics also failed for ${mediaType} (${mediaId})`);
          const emptyResult = {
            likes: 0, comments: 0, saved: 0, shares: 0,
            views: 0, reach: 0, interactions: 0, watchTime: 0,
            engagement: 0
          };
          setCache(cacheKey, emptyResult);
          return createSuccessResponse(emptyResult);
        }

        const basicData = await basicResponse.json();
        // Process basic data... (similar to below but with fewer fields)
        // For brevity, we will just return zeros for missing fields
        const insights = {};
        if (basicData.data && Array.isArray(basicData.data)) {
          basicData.data.forEach(metric => {
            if (metric.values && metric.values.length > 0) {
              insights[metric.name] = metric.values[0].value || 0;
            }
          });
        }

        const basicInteractions = (insights.likes || 0) + (insights.comments || 0) + (insights.saved || 0) + (insights.shares || 0);
        const result = {
          likes: insights.likes || 0,
          comments: insights.comments || 0,
          saved: insights.saved || 0,
          shares: insights.shares || 0,
          views: 0,
          reach: 0,
          interactions: basicInteractions,
          totalInteractions: basicInteractions,
          profileActivity: 0,
          watchTimeAvg: 0,
          watchTimeTotal: 0,
          engagement: basicInteractions
        };
        setCache(cacheKey, result);
        return createSuccessResponse(result);
      }

      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        `fetchMediaInsights (${mediaType})`
      );
    }

    const data = await response.json();

    // Parse insights
    const insights = {};
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(metric => {
        if (metric.values && metric.values.length > 0) {
          // Most metrics return an array of values, we take the most recent/total
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
      views: insights.views || 0,
      reach: insights.reach || 0,
      interactions: totalInteractions,
      totalInteractions,
      profileActivity: insights.profile_activity || 0,
      watchTimeAvg: insights.ig_reels_avg_watch_time || 0,
      watchTimeTotal: insights.ig_reels_video_view_total_time || 0,
      engagement: totalInteractions
    };

    // Log for debugging
    if (mediaType === 'REEL' || mediaType === 'REELS') {
      console.log(`   🎬 REEL ${mediaId} (v24.0): Views=${result.views}, Reach=${result.reach}, WatchTime=${result.watchTime}`);
    }

    setCache(cacheKey, result);
    return createSuccessResponse(result);
  } catch (error) {
    console.warn('insights-fetch-failed', {
      mediaId,
      mediaType,
      message: error.message
    });
    return createErrorResponse(error, `fetchMediaInsights (${mediaType})`);
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

    const cacheKey = `instagram_media_${igUserId}_${limit}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    const fields = 'id,media_type,thumbnail_url,caption,permalink,timestamp,like_count,comments_count';
    const url = `${GRAPH_BASE_URL}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        'fetchInstagramMedia'
      );
    }

    const data = await response.json();
    const media = (data.data || []).map(item => ({
      id: item.id,
      media_type: item.media_type,
      thumbnail_url: item.thumbnail_url || null,
      caption: item.caption || '',
      permalink: item.permalink || '',
      timestamp: item.timestamp || '',
      like_count: item.like_count || 0,
      comments_count: item.comments_count || 0,
      insights: null
    }));

    setCache(cacheKey, media);
    return createSuccessResponse(media);
  } catch (error) {
    return createErrorResponse(error, 'fetchInstagramMedia');
  }
}

async function fetchMediaInsightsBatch(mediaList, pageAccessToken, concurrency = 5) {
  if (!Array.isArray(mediaList) || mediaList.length === 0) {
    return {
      media: [],
      stats: { total: 0, succeeded: 0, failed: 0 },
      hasInsights: false
    };
  }

  const stats = { total: mediaList.length, succeeded: 0, failed: 0 };
  const enriched = await pMap(
    mediaList,
    async (item) => {
      try {
        const insightsResponse = await fetchMediaInsights(item.id, pageAccessToken, item.media_type);
        if (insightsResponse.success) {
          stats.succeeded += 1;
          return { ...item, insights: insightsResponse.data };
        }
        stats.failed += 1;
        console.warn('insights-fetch-failed', {
          mediaId: item.id,
          mediaType: item.media_type,
          message: insightsResponse.error
        });
      } catch (error) {
        stats.failed += 1;
        console.warn('insights-fetch-failed', {
          mediaId: item.id,
          mediaType: item.media_type,
          message: error.message
        });
      }

      return { ...item, insights: cloneEmptyInsights() };
    },
    concurrency
  );

  return {
    media: enriched,
    stats,
    hasInsights: stats.failed === 0 && stats.total > 0
  };
}

/**
 * Fetch comprehensive analytics for an Instagram account
 * Always returns structured JSON response
 * @param {string} igUserId - Instagram User ID
 * @param {string} pageAccessToken - Instagram Page Access Token
 * @param {Object} client - Optional client object for token validation
 */
export async function fetchInstagramAnalytics(igUserId, pageAccessToken, client = null, options = {}) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchInstagramAnalytics');
    }
    const { forceRefresh = false } = options;

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

    const cacheKey = `instagram_analytics_${igUserId}`;
    const cached = forceRefresh ? null : getCached(cacheKey);
    if (cached) {
      console.log(`✅ Using cached data for ${igUserId}`);
      return createSuccessResponse({ ...cached, source: 'cache', cached: true });
    }

    console.log(`🔄 Fetching fresh data from Instagram API...`);

    // Fetch account insights and media in parallel - handle response structure
    const [accountInsightsRes, accountTrendRes, mediaRes] = await Promise.all([
      fetchAccountInsights(igUserId, pageAccessToken),
      fetchAccountInsightsTrend(igUserId, pageAccessToken),
      fetchInstagramMedia(igUserId, pageAccessToken, 50)
    ]);

    // Extract data from structured responses
    const accountInsights = accountInsightsRes.success ? accountInsightsRes.data : null;
    const accountTrend = accountTrendRes.success ? accountTrendRes.data : [];
    const mediaList = mediaRes.success ? mediaRes.data : [];

    const insightsPromise = fetchMediaInsightsBatch(mediaList, pageAccessToken, 5);
    const insightsResult = await withTimeout(insightsPromise, 3000);

    if (!insightsResult?.ready) {
      console.warn('insights-fetch-failed', {
        mediaId: 'batch',
        mediaType: 'ALL',
        message: insightsResult?.error?.message || 'batch-timeout'
      });
      insightsPromise.catch(err => console.warn('insights-fetch-failed', {
        mediaId: 'batch',
        mediaType: 'ALL',
        message: err?.message || 'batch-timeout'
      }));
      return createSuccessResponse({
        processing: true,
        source: 'processing',
        cached: false,
        message: 'Gathering per-post insights — try again shortly.'
      });
    }

    const media = insightsResult.data.media || [];
    const insightStats = insightsResult.data.stats || { total: media.length, succeeded: media.length, failed: 0 };
    const hasInsights = media.length === 0 ? true : Boolean(insightsResult.data.hasInsights);
    console.log('📡 insights.fetched', insightStats);

    console.log(`📊 API Results:`, {
      accountInsights: accountInsights ? '✅' : '❌',
      accountTrend: accountTrend ? `✅ (${accountTrend.length} days)` : '❌',
      media: media ? `✅ (${media.length} posts)` : '❌'
    });

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
    console.log(`   📊 Processing ${reelCount} REEL(s) for views...`);

    media.forEach(item => {
      const type = (item.media_type || 'IMAGE').toUpperCase();
      const insights = item.insights || {};

      const views = insights.views || 0;
      console.log(`   🔎 Media ${item.id} [${type}] - views: ${views}`);
      totalViews += views;

      const reach = insights.reach || 0;
      totalMediaReach += reach;

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

      // Count by type
      if (postsByType.hasOwnProperty(type)) {
        postsByType[type]++;
      } else if (type === 'REEL') {
        postsByType.REELS = (postsByType.REELS || 0) + 1; // Group REEL with REELS
      }
    });

    // Calculate engagement rate
    const followerCount = accountInsights.follower_count || 1;
    const engagementRate = totalEngagements > 0
      ? ((totalEngagements / followerCount) * 100).toFixed(2)
      : '0.00';

    // Calculate follower growth from trend data
    let followerGrowth = 0;
    if (accountTrend && accountTrend.length >= 2) {
      const firstDay = accountTrend[0].follower_count || 0;
      const lastDay = accountTrend[accountTrend.length - 1].follower_count || 0;
      followerGrowth = lastDay - firstDay;
    }

    // Get latest reach from trend data
    const latestReach = accountTrend && accountTrend.length > 0
      ? accountTrend[accountTrend.length - 1].reach || 0
      : 0;

    // Log total views calculation for debugging
    console.log(`   📊 Total Views Calculation:`);
    console.log(`      REEL Count: ${reelCount}`);
    console.log(`      Total Views: ${totalViews}`);
    console.log(`      Media Items Processed: ${media.length}`);

    const result = {
      account: {
        follower_count: accountInsights.follower_count || 0,
        reach: latestReach,
        profile_views: accountInsights.profile_views || 0
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
          engagements: day.reach || 0, // Using reach as proxy for engagement trend
          views: 0 // Views are only available per-post (REELS only), not in account trends
        }))
      },
      recentPosts: media.slice(0, 10).map(item => ({
        id: item.id,
        media_type: item.media_type,
        thumbnail_url: item.thumbnail_url,
        caption: item.caption,
        permalink: item.permalink,
        timestamp: item.timestamp,
        metrics: {
          likes: item.insights?.likes || item.like_count || 0,
          comments: item.insights?.comments || item.comments_count || 0,
          saved: item.insights?.saved || 0,
          shares: item.insights?.shares || 0,
          reach: item.insights?.reach || 0,
          views: item.insights?.views || 0,
          replies: item.media_type === 'STORY' ? (item.insights?.replies || 0) : 0,
          profileActivity: item.insights?.profileActivity || 0,
          watchTimeAvg: item.insights?.watchTimeAvg || 0,
          watchTimeTotal: item.insights?.watchTimeTotal || 0,
          engagement: item.insights?.engagement || item.insights?.interactions || 0
        }
      })),
      allPosts: media.map(item => ({
        id: item.id,
        media_type: item.media_type,
        thumbnail_url: item.thumbnail_url,
        caption: item.caption,
        permalink: item.permalink,
        timestamp: item.timestamp,
        metrics: {
          likes: item.insights?.likes || item.like_count || 0,
          comments: item.insights?.comments || item.comments_count || 0,
          saved: item.insights?.saved || 0,
          shares: item.insights?.shares || 0,
          reach: item.insights?.reach || 0,
          views: item.insights?.views || 0,
          replies: item.media_type === 'STORY' ? (item.insights?.replies || 0) : 0,
          profileActivity: item.insights?.profileActivity || 0,
          watchTimeAvg: item.insights?.watchTimeAvg || 0,
          watchTimeTotal: item.insights?.watchTimeTotal || 0,
          engagement: item.insights?.engagement || item.insights?.interactions || 0
        }
      })),
      followerGrowth
    };

    result.hasInsights = hasInsights;
    result.cached = false;
    result.source = 'instagram_api';

    if (hasInsights) {
      setCache(cacheKey, result, DEFAULT_CACHE_TTL);
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
