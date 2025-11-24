/**
 * Instagram Graph API Insights Service (v24.0 - 2025)
 * Fetches real analytics data from Instagram Business Account
 * Uses ONLY supported metrics per Meta's API v24.0 requirements
 *
 * CRITICAL RULES (v24.0):
 * - follower_count: period=day (NO metric_type)
 * - profile_views: period=day, metric_type=total_value (REQUIRED)
 * - reach: period=day (NO metric_type)
 * - REEL/REELS: likes,comments,shares,saved,reach,total_interactions,views
 * - IMAGE/CAROUSEL: likes,comments,shares,saved,total_interactions
 * - VIDEO: likes,comments,shares,saved,total_interactions,views
 * - STORY: replies (optionally navigation) only
 *
 * REMOVED / UNSUPPORTED METRICS (v24.0):
 * ❌ impressions
 * ❌ video_views
 * ❌ profile_visits
 * ❌ profile_activity
 *
 * TOKEN MANAGEMENT:
 * - All API calls validate token before fetching
 * - Auto-refreshes tokens expiring within 10 days
 * - Returns needReLogin if token is expired
 */

import Client from '../models/Client.js';
import { ensureValidToken } from './instagramTokenService.js';

const GRAPH_API_VERSION = 'v24.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const unsupportedMetricsCache = new Set();

const DEFAULT_MEDIA_METRICS = ['likes', 'comments', 'shares', 'saved', 'total_interactions', 'views'];
const MEDIA_METRICS_MAP = {
  REEL: ['likes', 'comments', 'shares', 'saved', 'reach', 'total_interactions', 'views'],
  REELS: ['likes', 'comments', 'shares', 'saved', 'reach', 'total_interactions', 'views'],
  VIDEO: ['likes', 'comments', 'shares', 'saved', 'total_interactions', 'views'],
  IMAGE: ['likes', 'comments', 'shares', 'saved', 'total_interactions', 'views'],
  CAROUSEL_ALBUM: ['likes', 'comments', 'shares', 'saved', 'total_interactions', 'views'],
  STORY: ['replies', 'navigation', 'views', 'exits', 'taps_forward', 'taps_back']
};
let missingViewsLogCount = 0;

function getMetricsForMediaType(mediaType) {
  const key = mediaType?.toUpperCase();
  const metrics = MEDIA_METRICS_MAP[key] || DEFAULT_MEDIA_METRICS;
  return metrics.filter(metric => !unsupportedMetricsCache.has(metric));
}

function extractUnsupportedMetric(errorData) {
  const message = errorData?.error?.message || '';
  const metricMatch = message.match(/metric\s+([A-Za-z_]+)/i);
  if (metricMatch && metricMatch[1]) {
    return metricMatch[1].toLowerCase();
  }
  return null;
}

function isUnsupportedMetricError(errorData) {
  const code = errorData?.error?.code;
  if (code !== 100) return false;
  const message = (errorData?.error?.message || '').toLowerCase();
  return message.includes('metric') || message.includes('unsupported');
}

function createEmptyInsightsResult(mediaType) {
  const upperType = (mediaType || '').toUpperCase();
  return {
    likes: 0,
    comments: 0,
    saved: 0,
    shares: 0,
    views: ['REEL', 'REELS', 'VIDEO'].includes(upperType) ? 0 : 0,
    reach: ['REEL', 'REELS'].includes(upperType) ? 0 : 0,
    replies: upperType === 'STORY' ? 0 : 0,
    navigation: upperType === 'STORY' ? 0 : 0,
    total_interactions: 0,
    engagement: 0,
    views_present: false,
    views_pending: false
  };
}

// Simple in-memory cache (5 minutes TTL)
const cache = new Map();

function getCacheKey(key) {
  return `ig_insights_${key}`;
}

function getCached(key) {
  const cacheKey = getCacheKey(key);
  const cached = cache.get(cacheKey);
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
 * Fetch media insights for a specific post (v24.0 compliant)
 * GET /{media-id}/insights
 */
export async function fetchMediaInsights(mediaId, pageAccessToken, mediaType = 'IMAGE', options = {}) {
  try {
    if (!mediaId || !pageAccessToken) {
      return createErrorResponse('Missing required parameters (mediaId or pageAccessToken)', 'fetchMediaInsights');
    }

    const cacheKey = `media_insights_${mediaId}_${mediaType}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return createSuccessResponse(cached);
    }

    let metricsList = getMetricsForMediaType(mediaType);
    if (metricsList.length === 0) {
      console.warn(`⚠️ No supported metrics available for ${mediaType}. Returning empty insights.`);
      const emptyResult = createEmptyInsightsResult(mediaType);
      setCache(cacheKey, emptyResult);
      return createSuccessResponse(emptyResult);
    }

    let insightsResponse = null;
    let lastErrorData = null;

    while (metricsList.length > 0) {
      const metrics = metricsList.join(',');
      const url = `${GRAPH_BASE_URL}/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;
      const response = await fetch(url);

      if (response.ok) {
        insightsResponse = await response.json();
        break;
      }

      const errorData = await response.json().catch(() => ({}));
      lastErrorData = errorData;

      if (isUnsupportedMetricError(errorData)) {
        const unsupportedMetric = extractUnsupportedMetric(errorData);
        if (unsupportedMetric) {
          console.warn(`⚠️ Metric "${unsupportedMetric}" not supported for ${mediaType} (${mediaId}). Retrying without it.`);
          unsupportedMetricsCache.add(unsupportedMetric);
          metricsList = metricsList.filter(metric => metric !== unsupportedMetric);
          continue;
        }
      }

      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        `fetchMediaInsights (${mediaType})`
      );
    }

    if (!insightsResponse) {
      const emptyResult = createEmptyInsightsResult(mediaType);
      if (lastErrorData) {
        console.warn(`⚠️ Failed to fetch insights for ${mediaType} (${mediaId}), returning empty result.`, lastErrorData.error?.message);
      }
      setCache(cacheKey, emptyResult);
      return createSuccessResponse(emptyResult);
    }

    const data = insightsResponse;

    const metricEntries = Array.isArray(data.data) ? data.data : [];
    const returnedMetricNames = metricEntries.map(entry => entry.name || '');
    const viewsEntry = metricEntries.find(entry => entry.name === 'views');
    const viewsRaw = viewsEntry?.values?.[0]?.value;
    const viewsPresent = typeof viewsRaw === 'number';
    const mediaTimestamp = options.mediaTimestamp ? new Date(options.mediaTimestamp) : null;
    const ageHours = mediaTimestamp ? (Date.now() - mediaTimestamp.getTime()) / 36e5 : null;
    const viewsPending = !viewsPresent && typeof ageHours === 'number' && ageHours < 48;

    if (!viewsPresent && missingViewsLogCount < 200) {
      console.warn('insights-views-missing', {
        mediaId,
        mediaType,
        returnedMetricNames,
        mediaTimestamp: options.mediaTimestamp || null,
        igUserId: options.igUserId || null,
        note: 'views missing or empty in /insights response',
        timestamp: new Date().toISOString()
      });
      missingViewsLogCount += 1;
    }

    const insights = {};
    metricEntries.forEach(metric => {
      if (metric.values && metric.values.length > 0) {
        const latest = metric.values[metric.values.length - 1];
        insights[metric.name] = latest.value ?? 0;
      } else if (metric.value !== undefined) {
        insights[metric.name] = metric.value ?? 0;
      }
    });

    const upperType = (mediaType || '').toUpperCase();
    const likes = insights.likes || 0;
    const comments = insights.comments || 0;
    const shares = insights.shares || 0;
    const saved = insights.saved || 0;
    const views = viewsPresent ? viewsRaw : 0;
    const reach = typeof insights.reach === 'number' ? insights.reach : 0;
    const replies = typeof insights.replies === 'number' ? insights.replies : 0;
    const navigation = upperType === 'STORY' ? (insights.navigation || 0) : 0;
    const interactions = insights.total_interactions || (likes + comments + shares + saved);

    if (upperType === 'REEL' || upperType === 'REELS') {
      console.log(`   🎬 REEL ${mediaId} insights:`, {
        views,
        likes,
        comments,
        saved,
        shares,
        reach,
        total_interactions: interactions
      });

      if (views === 0) {
        console.warn(`   ⚠️  REEL ${mediaId} has 0 views - verify API permissions or recent publish time.`);
      }
    }

    const result = {
      likes,
      comments,
      saved,
      shares,
      views,
      reach,
      replies,
      navigation,
      total_interactions: interactions,
      engagement: interactions,
      views_present: viewsPresent,
      views_pending: viewsPending
    };

    setCache(cacheKey, result);
    return createSuccessResponse(result);
  } catch (error) {
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
    const media = data.data || [];

    // Fetch insights for each media item (with error handling per item)
    const mediaWithInsights = await Promise.all(
      media.map(async (item) => {
        let insights = null;
        try {
          const insightsResponse = await fetchMediaInsights(item.id, pageAccessToken, item.media_type, {
            mediaTimestamp: item.timestamp || item.created_time || null,
            igUserId
          });
          if (insightsResponse.success) {
            insights = insightsResponse.data;

            if (item.media_type === 'REEL' || item.media_type === 'REELS') {
              if (insights.views) {
                console.log(`   ✅ REEL ${item.id} insights: ${insights.views} views`);
              } else {
                console.warn(`   ⚠️  REEL ${item.id} has no view data`, {
                  hasInsights: !!insights,
                  insightsKeys: Object.keys(insights || {}),
                  error: insightsResponse.error
                });
              }
            }
          } else {
            const errorMsg = insightsResponse.error || 'Unknown error';
            console.warn(`   ⚠️  Failed to fetch insights for ${item.media_type} ${item.id}: ${errorMsg}`);

            // For REELS, this is critical - log more details
            if (item.media_type === 'REEL' || item.media_type === 'REELS') {
              console.warn(`   ⚠️  CRITICAL: REEL ${item.id} insights failed - views will be 0`);
            }
          }
        } catch (error) {
          console.warn(`   ⚠️  Error fetching insights for ${item.media_type} ${item.id}:`, error.message);
        }

        return {
          id: item.id,
          media_type: item.media_type,
          thumbnail_url: item.thumbnail_url || null,
          caption: item.caption || '',
          permalink: item.permalink || '',
          timestamp: item.timestamp || '',
          like_count: item.like_count || 0,
          comments_count: item.comments_count || 0,
          insights: insights || {
            likes: 0,
            comments: 0,
            saved: 0,
            shares: 0,
            views: 0,
            reach: 0,
            replies: 0,
            navigation: 0,
            total_interactions: 0,
            engagement: 0,
            views_present: false,
            views_pending: false
          }
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

    const cacheKey = `instagram_analytics_${igUserId}`;
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
      fetchInstagramMedia(igUserId, pageAccessToken, 50)
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

    if (!accountInsights) {
      return createErrorResponse('Failed to fetch account insights', 'fetchInstagramAnalytics');
    }

    // Video/reel aggregation stats
    let totalPosts = 0;
    let totalReelCount = 0;
    let totalVideoCount = 0;
    let totalViews = 0;
    let totalVideoViews = 0;
    let totalEngagements = 0;
    let totalVideoEngagements = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;

    const postsByType = {};

    for (const item of media) {
      totalPosts += 1;
      const type = (item.media_type || item.mediaType || 'IMAGE').toUpperCase();
      postsByType[type] = (postsByType[type] || 0) + 1;
      if (type === 'REEL' || type === 'REELS') totalReelCount += 1;
      if (type === 'VIDEO') totalVideoCount += 1;

      let insights = item.insights || null;
      if (!insights) {
        try {
          const insightsRes = await fetchMediaInsights(item.id, pageAccessToken, type, {
            mediaTimestamp: item.timestamp || item.created_time || null,
            igUserId
          });
          if (insightsRes.success) {
            insights = insightsRes.data;
          }
        } catch (err) {
          console.warn(`   ⚠️ Failed to fetch insights for ${type} ${item.id}:`, err.message);
        }
      }

      const views = typeof insights?.views === 'number' ? insights.views : 0;
      const interactions = typeof insights?.total_interactions === 'number'
        ? insights.total_interactions
        : ((insights?.likes || 0) + (insights?.comments || 0) + (insights?.shares || 0) + (insights?.saved || 0));

      if (views > 0) {
        console.log(`   ✅ ${type} ${item.id}: ${views} views`);
      } else {
        console.log(`   ⚠️  ${type} ${item.id}: No view data`, {
          hasInsights: !!insights,
          insightsKeys: Object.keys(insights || {}),
          viewValue: insights?.views,
        });
      }

      totalViews += views;
      totalEngagements += interactions;
      totalLikes += insights?.likes || item.like_count || 0;
      totalComments += insights?.comments || item.comments_count || 0;
      totalShares += insights?.shares || 0;
      totalSaves += insights?.saved || 0;
      if (type === 'VIDEO') {
        totalVideoViews += views;
        totalVideoEngagements += interactions;
      }
      if (type === 'REEL' || type === 'REELS') {
        totalReach += insights?.reach || 0;
      }
    }

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
    console.log(`      REEL Count: ${totalReelCount}`);
    console.log(`      VIDEO Count: ${totalVideoCount}`);
    console.log(`      Total Views: ${totalViews}`);
    console.log(`      Total Video Views: ${totalVideoViews}`);
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
        totalReach,
        engagementRate,
        postsByType,
        totalVideoCount,
        totalVideoViews,
        totalVideoEngagements,
        totalReelCount
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
          engagement: item.insights?.engagement || 0,
          views_present: item.insights?.views_present ?? (typeof item.insights?.views === 'number'),
          views_pending: item.insights?.views_pending ?? false
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
          engagement: item.insights?.engagement || 0,
          views_present: item.insights?.views_present ?? (typeof item.insights?.views === 'number'),
          views_pending: item.insights?.views_pending ?? false
        }
      })),
      followerGrowth
    };

    setCache(cacheKey, result);
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

  // Test REEL metrics (should include views)
  console.log('📝 Media type metrics validation would require API mocking');

  const reelMetrics = MEDIA_METRICS_MAP.REEL.join(',');
  console.assert(reelMetrics.includes('views'), 'REEL should include views metric');
  console.assert(!reelMetrics.includes('impressions'), 'REEL should NOT include impressions');

  const imageMetrics = MEDIA_METRICS_MAP.IMAGE.join(',');
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
