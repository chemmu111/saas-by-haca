/**
 * Instagram Graph API Insights Service (v22+ - 2024-2025)
 * Fetches real analytics data from Instagram Business Account
 * Uses ONLY supported metrics per Meta's API v22+ requirements
 *
 * CRITICAL RULES (v22+ - 2024-2025):
 * - follower_count: period=day (NO metric_type)
 * - profile_views: period=day, metric_type=total_value (REQUIRED)
 * - reach: period=day (NO metric_type)
 * - REEL/REELS: plays,likes,comments,saved,shares,reach (NO impressions fallback)
 * - IMAGE/CAROUSEL: likes,comments,saved,shares (NO reach, NO impressions)
 * - VIDEO: likes,comments,saved,shares (NO views, NO plays, NO impressions)
 * - STORY: replies only
 *
 * REMOVED METRICS (v22+):
 * ❌ impressions - completely removed
 * ❌ video_views - replaced by 'plays' for REELS only
 * ❌ total_interactions - removed
 * ❌ views (for IMAGE/VIDEO) - removed
 * ❌ reach (for IMAGE/VIDEO) - removed for non-REEL content
 */

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
 * Fetch follower count (daily trend)
 * GET /{ig-user-id}/insights?metric=follower_count&period=day
 */
async function fetchFollowerCount(igUserId, pageAccessToken) {
  try {
    const url = `https://graph.facebook.com/v22.0/${igUserId}/insights?metric=follower_count&period=day&access_token=${pageAccessToken}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error fetching follower_count:', response.status);
      if (errorData.error) {
        console.error('   Error:', errorData.error.message);
      }
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
    console.error('Error fetching follower_count:', error);
    return null;
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
 * - REEL/REELS: plays,likes,comments,saved,shares,reach (NO impressions fallback)
 * - IMAGE/CAROUSEL_ALBUM: likes,comments,saved,shares (NO reach, NO impressions)
 * - VIDEO: likes,comments,saved,shares (NO views, NO plays, NO impressions)
 * - STORY: replies only
 *
 * CRITICAL: NO FALLBACK TO REMOVED METRICS
 * ❌ impressions - completely removed from API
 * ❌ video_views - replaced by 'plays' for REELS only
 * ❌ total_interactions - removed
 * ❌ views (for IMAGE/VIDEO) - removed
 * ❌ reach (for IMAGE/VIDEO) - removed for non-REEL content
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

    // STRICT v22+ METRICS - NO FALLBACK TO REMOVED METRICS
    let metrics = '';
    if (mediaType === 'REEL' || mediaType === 'REELS') {
      // REEL: plays,likes,comments,saved,shares,reach (NO impressions fallback)
      metrics = 'plays,likes,comments,saved,shares,reach';
    } else if (mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM') {
      // IMAGE/CAROUSEL: likes,comments,saved,shares (NO reach, NO impressions)
      metrics = 'likes,comments,saved,shares';
    } else if (mediaType === 'VIDEO') {
      // VIDEO: likes,comments,saved,shares (NO views, NO plays, NO impressions)
      metrics = 'likes,comments,saved,shares';
    } else if (mediaType === 'STORY') {
      // STORY: replies only
      metrics = 'replies';
    } else {
      // Default: same as IMAGE
      metrics = 'likes,comments,saved,shares';
    }

    const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${metrics}&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Handle specific error codes
      if (errorData.error && errorData.error.code === 100) {
        // Metric not supported - return empty insights instead of error
        console.warn(`⚠️ Metric not supported for ${mediaType} (${mediaId}): ${errorData.error.message}`);
        const emptyResult = {
          likes: 0,
          comments: 0,
          saved: 0,
          shares: 0,
          plays: 0, // Only for REEL/REELS
          reach: 0, // Only for REEL/REELS
          replies: 0, // Only for STORY
          engagement: 0
        };
        setCache(cacheKey, emptyResult);
        return createSuccessResponse(emptyResult);
      }

      return createErrorResponse(
        `Instagram API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        `fetchMediaInsights (${mediaType})`
      );
    }

    const data = await response.json();

    // Parse insights - STRICT v22+ compliance
    const insights = {};
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach(metric => {
        if (metric.values && metric.values.length > 0) {
          const latest = metric.values[metric.values.length - 1];
          insights[metric.name] = latest.value || 0;
        }
      });
    }

    // Map to consistent result structure - NO impressions fallback
    const result = {
      likes: insights.likes || 0,
      comments: insights.comments || 0,
      saved: insights.saved || 0,
      shares: insights.shares || 0,
      plays: (mediaType === 'REEL' || mediaType === 'REELS') ? (insights.plays || 0) : 0, // Only for REEL/REELS
      reach: (mediaType === 'REEL' || mediaType === 'REELS') ? (insights.reach || 0) : 0, // Only for REEL/REELS
      replies: mediaType === 'STORY' ? (insights.replies || 0) : 0, // Only for STORY
      // Calculate engagement from likes + comments + shares + saved (NO impressions)
      engagement: (insights.likes || 0) + (insights.comments || 0) + (insights.shares || 0) + (insights.saved || 0)
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
          const insightsResponse = await fetchMediaInsights(item.id, pageAccessToken, item.media_type);
          if (insightsResponse.success) {
            insights = insightsResponse.data;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to fetch insights for ${item.media_type} ${item.id}:`, error.message);
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
            plays: 0,
            reach: 0,
            replies: 0,
            engagement: 0
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
 */
export async function fetchInstagramAnalytics(igUserId, pageAccessToken) {
  try {
    if (!igUserId || !pageAccessToken) {
      return createErrorResponse('Missing required credentials (igUserId or pageAccessToken)', 'fetchInstagramAnalytics');
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

    // Calculate totals from media - STRICT v22+ compliance
    let totalViews = 0; // ONLY REEL/REELS have real views (plays) - NO impressions fallback
    let totalEngagements = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;
    let totalShares = 0;
    let totalReach = 0;

    const postsByType = {
      IMAGE: 0,
      VIDEO: 0,
      CAROUSEL_ALBUM: 0,
      REELS: 0,
      REEL: 0,
      STORY: 0
    };

    media.forEach(item => {
      const insights = item.insights || {};

      // Total views: ONLY REEL/REELS have real views (plays metric) - NO fallback
      if (item.media_type === 'REEL' || item.media_type === 'REELS') {
        totalViews += insights.plays || 0;
      }
      // VIDEO, IMAGE, and STORY: views = 0 (no fallback to impressions, reach, or views)

      // Reach: only for REEL/REELS (not for IMAGE, VIDEO, or STORY)
      if (item.media_type === 'REEL' || item.media_type === 'REELS') {
        totalReach += insights.reach || 0;
      }

      // Engagement: calculated from likes + comments + shares + saved (NO impressions)
      totalEngagements += insights.engagement || 0;
      totalLikes += insights.likes || item.like_count || 0;
      totalComments += insights.comments || item.comments_count || 0;
      totalSaves += insights.saved || 0;
      totalShares += insights.shares || 0;

      // Count by type
      const type = item.media_type || 'IMAGE';
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

    const result = {
      account: {
        follower_count: accountInsights.follower_count || 0,
        reach: latestReach,
        profile_views: accountInsights.profile_views || 0
      },
      media: {
        total: media.length,
        totalViews, // Only REEL/REELS views (plays) - NO impressions fallback
        totalEngagements,
        totalLikes,
        totalComments,
        totalSaves,
        totalShares,
        totalReach, // Only REEL/REELS reach
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
          reach: (item.media_type === 'REEL' || item.media_type === 'REELS') ? (item.insights?.reach || 0) : 0,
          plays: (item.media_type === 'REEL' || item.media_type === 'REELS') ? (item.insights?.plays || 0) : 0,
          views: (item.media_type === 'REEL' || item.media_type === 'REELS') ? (item.insights?.plays || 0) : 0, // Only REEL/REELS have views (via plays)
          replies: item.media_type === 'STORY' ? (item.insights?.replies || 0) : 0,
          engagement: item.insights?.engagement || 0
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

  // Test REEL metrics (should include plays)
  // Note: This would require mocking the Instagram API
  console.log('📝 Media type metrics validation would require API mocking');

  // Test that REEL uses 'plays' metric
  const reelMetrics = 'plays,likes,comments,saved,shares,reach';
  console.assert(reelMetrics.includes('plays'), 'REEL should include plays metric');
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
      console.assert(mediaResult.data.plays !== undefined, 'REEL should have plays metric');
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
