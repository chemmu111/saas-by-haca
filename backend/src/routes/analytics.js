import express from 'express';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import { updatePostEngagementMetrics, updateClientFollowerCount } from '../services/analyticsService.js';
import { fetchInstagramAnalytics, fetchAccountInsights, fetchInstagramMedia, clearUserCache } from '../services/instagramInsightsService.js';
import {
  createAnalyticsResponse,
  validateInstagramToken,
  createTokenErrorResponse,
  validateRealData,
  calculateEngagementRate,
  getCacheInfo
} from '../services/analyticsResponseHandler.js';
import { calculateGrowth } from '../services/followerSnapshotService.js';
import { getAggregatedViewSnapshots } from '../services/viewSnapshotService.js';

import { generateReportData } from '../services/reportGeneratorService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/analytics - Get analytics for all connected accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, refresh, mode, clientId } = req.query;

    // Enterprise Report Mode
    if (mode === 'report' && clientId) {
      try {
        const reportData = await generateReportData(clientId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate || new Date());
        return res.json({ success: true, data: reportData });
      } catch (err) {
        console.error('Error generating enterprise report:', err);
        return res.status(500).json({ success: false, error: 'Failed to generate report' });
      }
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);

    // Get analytics for all posts (handle case when there are no clients)
    // IMPORTANT: Scheduled posts should be included regardless of date range
    // Only apply date filter to published/draft/failed posts
    let posts = [];
    if (clientIds.length > 0) {
      // Base filter
      const baseFilter = {
        createdBy: userId,
        client: { $in: clientIds }
      };

      // If date filter is provided, use it but also include scheduled posts
      if (Object.keys(dateFilter).length > 0) {
        // Include scheduled posts OR posts within date range
        // Build proper MongoDB query
        const query = {
          ...baseFilter,
          $or: [
            { status: 'scheduled' }, // Always include scheduled posts regardless of date
            { ...dateFilter } // Include posts within date range
          ]
        };
        posts = await Post.find(query).populate('client', 'name email platform pageAccessToken igUserId pageId');
      } else {
        // No date filter - get all posts
        posts = await Post.find(baseFilter).populate('client', 'name email platform pageAccessToken igUserId pageId');
      }

      console.log(`📊 Found ${posts.length} total posts (including ${posts.filter(p => p.status === 'scheduled').length} scheduled)`);
    }

    // If refresh=true, fetch latest engagement metrics from APIs (limited to avoid rate limits)
    if (refresh === 'true') {
      // Update follower counts for clients (limit to 5 to avoid rate limits)
      // Parallelize updates to improve speed
      const updatePromises = [];

      // Update follower counts for clients (limit to 5)
      const clientsToUpdate = clients.slice(0, 5);
      updatePromises.push(...clientsToUpdate.map(async (client) => {
        try {
          const followerCount = await updateClientFollowerCount(client);
          if (followerCount !== null) {
            client.followerCount = followerCount;
            client.followerCountLastUpdated = new Date();
            await client.save();
          }
        } catch (error) {
          console.error(`Error updating follower count for client ${client._id}:`, error);
        }
      }));

      // Update engagement metrics for published posts (limit to 10)
      const publishedPosts = posts.filter(p => p.status === 'published' && (p.instagramPostId || p.facebookPostId));
      const postsToUpdate = publishedPosts.slice(0, 10);
      updatePromises.push(...postsToUpdate.map(async (post) => {
        try {
          const metrics = await updatePostEngagementMetrics(post, post.client);
          if (metrics) {
            post.engagement = {
              ...metrics,
              lastUpdated: new Date()
            };
            await post.save();
          }
        } catch (error) {
          console.error(`Error updating engagement metrics for post ${post._id}:`, error);
        }
      }));

      // Wait for all updates to complete
      await Promise.all(updatePromises);

      // Re-fetch posts after updates
      if (clientIds.length > 0) {
        posts = await Post.find({
          createdBy: userId,
          client: { $in: clientIds },
          ...dateFilter
        }).populate('client', 'name email platform pageAccessToken igUserId pageId');
      }
    }

    // Use real engagement data from posts (defaults to 0 if not set)
    const getEngagementMetrics = (post) => {
      const engagement = post.engagement || {};
      const likes = engagement.likes || 0;
      const comments = engagement.comments || 0;
      const shares = engagement.shares || 0;
      const saves = engagement.saves || 0;
      const views = engagement.views || 0;
      const engagements = likes + comments + shares + saves;

      return {
        likes,
        comments,
        shares,
        saves,
        views,
        engagements
      };
    };

    // Calculate daily trends from real data
    const dailyEngagementData = {};

    posts.forEach(post => {
      if (post.createdAt && post.status === 'published') {
        const date = new Date(post.createdAt).toISOString().split('T')[0];
        const metrics = getEngagementMetrics(post);

        if (!dailyEngagementData[date]) {
          dailyEngagementData[date] = { date, engagements: 0, views: 0 };
        }
        dailyEngagementData[date].engagements += metrics.engagements;
        dailyEngagementData[date].views += metrics.views;
      }
    });

    // Sort and format daily data
    const engagementTrend = Object.values(dailyEngagementData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 days

    // Calculate total engagement metrics from real data
    let totalEngagements = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;

    const postsWithMetrics = posts.map(post => {
      const metrics = getEngagementMetrics(post);
      totalEngagements += metrics.engagements;
      totalViews += metrics.views;
      totalLikes += metrics.likes;
      totalComments += metrics.comments;
      totalShares += metrics.shares;
      totalSaves += metrics.saves;

      return {
        ...post.toObject(),
        engagement: metrics
      };
    });

    // Fetch real Instagram data for Instagram clients - ONLY USE INSTAGRAM API DATA
    let totalFollowers = 0;
    let totalAccountReach = 0; // Account-level reach (daily trend)
    let totalMediaReach = 0;
    let totalMediaImpressions = 0;
    let totalMediaInteractions = 0;
    let totalWatchTimeAvgSum = 0;
    let totalWatchTimeTotal = 0;
    let watchTimeSampleCount = 0;
    let accountInsights = null; // Initialize accountInsights
    let profileActivity = {
      website_clicks: 0,
      email_contacts: 0,
      phone_call_clicks: 0,
      text_message_clicks: 0,
      get_directions_clicks: 0,
      profile_views: 0
    };


    if (accountInsights) {
      profileActivity = {
        website_clicks: accountInsights.website_clicks || 0,
        email_contacts: accountInsights.email_contacts || 0,
        phone_call_clicks: accountInsights.phone_call_clicks || 0,
        text_message_clicks: accountInsights.text_message_clicks || 0,
        get_directions_clicks: accountInsights.get_directions_clicks || 0,
        profile_views: accountInsights.profile_views || 0
      };
      totalMediaImpressions = accountInsights.impressions || 0;
    }
    let igTotalViews = 0;
    let igTotalInteractions = 0;
    let igTotalWatchTime = 0;
    let igAvgWatchTimeSum = 0;
    let igAvgWatchTimeCount = 0;
    let igTotalEngagements = 0;
    let igTotalLikes = 0;
    let igTotalComments = 0;
    let igTotalShares = 0;
    let igTotalSaves = 0;
    let totalFollowerGrowth = 0;
    let followersTrendData = [];
    let accountTrend = []; // Store impressions and reach trend data
    let postsByTypeFromIG = {
      IMAGE: 0,
      VIDEO: 0,
      CAROUSEL_ALBUM: 0,
      REELS: 0
    };

    const instagramClients = clients.filter(c =>
      c.platform === 'instagram' && c.igUserId && c.pageAccessToken
    );

    console.log(`📡 Fetching Instagram analytics for ${instagramClients.length} client(s)...`);
    console.log(`   Refresh mode: ${refresh === 'true' ? 'YES (bypassing cache)' : 'NO (using cache if available)'}`);

    // Clear cache if refresh requested
    if (refresh === 'true') {
      console.log(`🔄 Clearing Instagram cache for fresh data...`);
      for (const client of instagramClients) {
        if (client.igUserId) {
          clearUserCache(client.igUserId);
        }
      }
    }

    let allDetailedPosts = [];

    for (const client of instagramClients) {
      try {
        console.log(`   Fetching data for client: ${client.name} (IG User: ${client.igUserId})`);
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken, client);

        // Check if token expired
        if (igData && igData.needReLogin) {
          console.error(`   ❌ Token expired for ${client.name} — user must re-authenticate`);
          // Return error response requiring re-authentication
          return res.status(401).json({
            success: false,
            needReLogin: true,
            error: 'instagram_token_expired',
            message: `Instagram access token expired for ${client.name}. Please reconnect your Instagram account.`,
            clientName: client.name,
            timestamp: new Date().toISOString()
          });
        }

        if (igData && igData.success && igData.data) {
          const data = igData.data;

          // Collect detailed posts - ONLY REAL INSTAGRAM API DATA
          if (data.allPosts && Array.isArray(data.allPosts)) {
            // Ensure each post has proper metrics structure
            const formattedPosts = data.allPosts.map(post => ({
              id: post.id,
              media_type: post.media_type,
              media_url: post.media_url || null,
              thumbnail_url: post.thumbnail_url || post.media_url || null,
              caption: post.caption || '',
              permalink: post.permalink,
              timestamp: post.timestamp,
              clientId: client._id.toString(), // Convert to string for filtering
              clientName: client.name,
              platform: 'instagram',
              metrics: {
                likes: post.metrics?.likes || post.insights?.likes || 0,
                comments: post.metrics?.comments || post.insights?.comments || 0,
                saved: post.metrics?.saved || post.insights?.saved || 0,
                shares: post.metrics?.shares || post.insights?.shares || 0,
                reach: post.metrics?.reach || post.insights?.reach || 0,
                views: post.metrics?.views
                  || post.insights?.views
                  || post.insights?.video_views
                  || post.insights?.videoViews
                  || post.video_play_count
                  || 0,
                engagement: post.metrics?.engagement
                  || post.insights?.engagement
                  || post.insights?.interactions
                  || post.insights?.total_interactions
                  || ((post.insights?.likes || 0) + (post.insights?.comments || 0) + (post.insights?.saved || 0) + (post.insights?.shares || 0))
              }
            }));
            allDetailedPosts = [...allDetailedPosts, ...formattedPosts];
            console.log(`   📊 Added ${formattedPosts.length} posts with real metrics from Instagram API`);
          }

          // Extract account data
          totalFollowers += data.account?.follower_count || 0;
          totalAccountReach += data.account?.reach_28d || data.account?.reach || 0;

          // Extract profile activity metrics from account data
          if (data.account) {
            profileActivity.profile_views += data.account.profile_views || 0;
            profileActivity.website_clicks += data.account.website_clicks || 0;
            profileActivity.email_contacts += data.account.email_contacts || 0;
            profileActivity.phone_call_clicks += data.account.phone_call_clicks || 0;
            profileActivity.text_message_clicks += data.account.text_message_clicks || 0;
            profileActivity.get_directions_clicks += data.account.get_directions_clicks || 0;
          }

          // Check for latest ClickSnapshot (5-minute tracker data)
          // This helps if API data is stale or if we have better data in DB
          try {
            const { getLatestClickSnapshot } = await import('../services/clickSnapshotService.js');
            const snapshot = await getLatestClickSnapshot(client._id);
            if (snapshot) {
              console.log(`   📸 Found ClickSnapshot for ${client.name}:`, snapshot.website_clicks);
              // Use snapshot data if it's higher (cumulative logic)
              if (snapshot.website_clicks > profileActivity.website_clicks) profileActivity.website_clicks = snapshot.website_clicks;
              if (snapshot.email_contacts > profileActivity.email_contacts) profileActivity.email_contacts = snapshot.email_contacts;
              if (snapshot.phone_call_clicks > profileActivity.phone_call_clicks) profileActivity.phone_call_clicks = snapshot.phone_call_clicks;
              if (snapshot.text_message_clicks > profileActivity.text_message_clicks) profileActivity.text_message_clicks = snapshot.text_message_clicks;
              if (snapshot.get_directions_clicks > profileActivity.get_directions_clicks) profileActivity.get_directions_clicks = snapshot.get_directions_clicks;
            }
          } catch (err) {
            console.warn('   ⚠️ Failed to check ClickSnapshot:', err.message);
          }

          // Extract media metrics - ONLY FROM INSTAGRAM API
          if (data.media) {
            const mediaViews = data.media.totalViews || 0;
            const mediaInteractions = data.media.totalInteractions || 0;
            const mediaWatchTime = data.media.totalWatchTime || 0;
            const mediaAvgWatchTime = data.media.avgWatchTime || 0;

            igTotalViews += mediaViews;
            igTotalInteractions += mediaInteractions;
            igTotalWatchTime += mediaWatchTime;
            if (mediaAvgWatchTime > 0) {
              igAvgWatchTimeSum += mediaAvgWatchTime;
              igAvgWatchTimeCount += 1;
            }
            igTotalEngagements += data.media.totalEngagements || 0;
            igTotalLikes += data.media.totalLikes || 0;
            igTotalComments += data.media.totalComments || 0;
            igTotalShares += data.media.totalShares || 0;
            igTotalSaves += data.media.totalSaves || 0;

            // Log views extraction for debugging
            console.log(`   📊 Instagram API Response:`);
            console.log(`      Total Views: ${mediaViews}`);
            console.log(`      Total Interactions: ${mediaInteractions}`);
            console.log(`      Posts by Type (raw):`, data.media.postsByType || {});

            // NOTE: We DON'T use data.media.postsByType directly because it doesn't
            // distinguish between REELS and regular VIDEOs. We'll count from allDetailedPosts instead.
          }

          // Extract follower growth
          totalFollowerGrowth += data.followerGrowth || 0;

          // Extract followers trend data
          if (data.trends && data.trends.followers && Array.isArray(data.trends.followers)) {
            // Merge trend data from all clients
            data.trends.followers.forEach(day => {
              const existingDay = followersTrendData.find(d => d.date === day.date);
              if (existingDay) {
                existingDay.follower_count += day.follower_count || 0;
                existingDay.followers += day.followers || 0;
              } else {
                followersTrendData.push({
                  date: day.date,
                  follower_count: day.follower_count || 0,
                  followers: day.followers || day.follower_count || 0
                });
              }
            });
          }

          // Extract account trend data (impressions and reach)
          if (data.trends && data.trends.engagement && Array.isArray(data.trends.engagement)) {
            data.trends.engagement.forEach(day => {
              const existingDay = accountTrend.find(d => d.date === day.date);
              if (existingDay) {
                existingDay.reach += day.reach || 0;
                existingDay.impressions += day.impressions || 0;
              } else {
                accountTrend.push({
                  date: day.date,
                  reach: day.reach || 0,
                  impressions: day.impressions || 0
                });
              }
            });
          }

          console.log(`   ✅ Fetched: ${data.media?.total || 0} posts, ${data.account?.follower_count || 0} followers, ${data.account?.reach || 0} reach`);
        } else {
          console.warn(`   ⚠️  No data returned for client ${client.name}`);
        }
      } catch (error) {
        console.error(`   ❌ Error fetching IG data for client ${client._id}:`, error.message);
      }
    }

    // COUNT MEDIA TYPES FROM allDetailedPosts (after reel detection)
    // This ensures we properly distinguish between REELS and regular VIDEOs
    console.log(`\n📊 Counting media types from ${allDetailedPosts.length} posts...`);
    allDetailedPosts.forEach(post => {
      let mediaType = post.media_type;

      // Detect REELS from VIDEO type by checking permalink
      if (mediaType === 'VIDEO' && post.permalink && post.permalink.includes('/reel/')) {
        mediaType = 'REELS';
      }

      // Count by corrected media type
      if (mediaType === 'IMAGE') {
        postsByTypeFromIG.IMAGE = (postsByTypeFromIG.IMAGE || 0) + 1;
      } else if (mediaType === 'VIDEO') {
        postsByTypeFromIG.VIDEO = (postsByTypeFromIG.VIDEO || 0) + 1;
      } else if (mediaType === 'CAROUSEL_ALBUM') {
        postsByTypeFromIG.CAROUSEL_ALBUM = (postsByTypeFromIG.CAROUSEL_ALBUM || 0) + 1;
      } else if (mediaType === 'REELS') {
        postsByTypeFromIG.REELS = (postsByTypeFromIG.REELS || 0) + 1;
      }
    });

    console.log(`📊 Final media type counts:`, postsByTypeFromIG);


    // USE ONLY INSTAGRAM DATA - NO DATABASE FALLBACKS
    // However, if Instagram API returns 0 views but we have published REELS in database,
    // try to get views from database engagement data as a fallback (only for posts we published)
    if (igTotalViews === 0) {
      const publishedReels = posts.filter(p =>
        p.status === 'published' &&
        (p.instagramPostId || p.facebookPostId) &&
        p.engagement?.views > 0
      );

      if (publishedReels.length > 0) {
        const dbViews = publishedReels.reduce((sum, p) => sum + (p.engagement?.views || 0), 0);
        console.log(`   📊 Found ${publishedReels.length} published posts in database with ${dbViews} total views (using as fallback)`);
        totalViews = dbViews;
      } else {
        totalViews = igTotalViews;
        console.log(`   📊 No views found: Instagram API returned 0, and no published posts in database with views`);
      }
    } else {
      totalViews = igTotalViews;
      console.log(`   ✅ Using Instagram API views: ${igTotalViews}`);
    }

    totalEngagements = igTotalEngagements; // Always use Instagram engagements
    totalLikes = igTotalLikes; // Always use Instagram likes
    totalComments = igTotalComments; // Always use Instagram comments
    totalShares = igTotalShares; // Always use Instagram shares
    totalSaves = igTotalSaves; // Always use Instagram saves

    // Sort followers trend by date
    followersTrendData.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(`📊 Instagram Data Summary:`);
    console.log(`   Total Posts: ${Object.values(postsByTypeFromIG).reduce((sum, count) => sum + count, 0)}`);
    console.log(`   Total Followers: ${totalFollowers}`);
    console.log(`   Total Reach: ${totalAccountReach}`);
    console.log(`   Total Views: ${totalViews}`);
    console.log(`   Total Engagements: ${totalEngagements}`);
    console.log(`   Follower Growth: ${totalFollowerGrowth}`);

    // Find top performing post based on real engagement data
    const topPost = postsWithMetrics
      .filter(p => p.status === 'published' && p.engagement && p.engagement.engagements > 0)
      .sort((a, b) => (b.engagement?.engagements || 0) - (a.engagement?.engagements || 0))[0];

    // Calculate follower growth metrics from snapshots (Backend Logic)
    let followerMetrics = { hasData: false };
    try {
      let totalGained = 0;
      let totalLost = 0;
      let hasAnyData = false;

      for (const client of clients) {
        const metrics = await calculateGrowth(client._id, 30);
        if (metrics.hasData) {
          totalGained += metrics.gained;
          totalLost += metrics.lost;
          hasAnyData = true;
        }
      }

      if (hasAnyData) {
        followerMetrics = {
          current: totalFollowers,
          gained: totalGained,
          lost: totalLost,
          netGrowth: totalGained - totalLost,
          period: '30days',
          hasData: true
        };
      }
    } catch (err) {
      console.error('Error calculating aggregated growth:', err);
    }

    // Calculate analytics - ONLY USE INSTAGRAM API DATA
    const totalPostsFromIG = Object.values(postsByTypeFromIG).reduce((sum, count) => sum + count, 0);

    // Calculate engagement rate properly using Reach if available
    const engagementRate = calculateEngagementRate(totalEngagements, totalFollowers, totalAccountReach);

    // Count published posts - must have status='published' AND actually be published (has postId)
    // Use publishedTime for date filtering if available, otherwise createdAt
    const publishedPostsCount = posts.filter(p => {
      if (p.status !== 'published') return false;
      // Must have actually been published (has post ID)
      if (!p.instagramPostId && !p.facebookPostId) return false;

      // If date filter is applied, check publishedTime first, then createdAt
      if (startDate || endDate) {
        const dateToCheck = p.publishedTime || p.createdAt;
        if (!dateToCheck) return false;

        const postDate = new Date(dateToCheck);
        if (startDate && postDate < new Date(startDate)) return false;
        if (endDate && postDate > new Date(endDate)) return false;
      }

      return true;
    }).length;

    const analytics = {
      // ONLY Instagram API - NO DATABASE FALLBACK
      totalPosts: totalPostsFromIG, // Always use Instagram count (even if 0)
      publishedPosts: publishedPostsCount,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length || 0,
      draftPosts: posts.filter(p => p.status === 'draft').length || 0,
      failedPosts: posts.filter(p => p.status === 'failed').length || 0,
      postsByPlatform: {
        instagram: posts.filter(p => p.platform === 'instagram' || p.platform === 'both').length || 0,
        facebook: posts.filter(p => p.platform === 'facebook' || p.platform === 'both').length || 0,
      },
      postsByType: {
        post: posts.filter(p => p.postType === 'post').length || 0,
        story: posts.filter(p => p.postType === 'story').length || 0,
        reel: posts.filter(p => p.postType === 'reel').length || 0,
        // Add Instagram media types if available
        IMAGE: postsByTypeFromIG.IMAGE || 0,
        VIDEO: postsByTypeFromIG.VIDEO || 0,
        CAROUSEL_ALBUM: postsByTypeFromIG.CAROUSEL_ALBUM || 0,
        REELS: postsByTypeFromIG.REELS || 0,
      },
      // Real engagement metrics - ONLY FROM INSTAGRAM API (NO DATABASE FALLBACKS)
      totalEngagements: igTotalEngagements,
      totalViews: totalViews,
      totalReach: totalAccountReach,
      totalImpressions: totalMediaImpressions, // From Account Insights
      totalInteractions: igTotalInteractions || 0,
      avgWatchTime: igAvgWatchTimeCount > 0 ? igAvgWatchTimeSum / igAvgWatchTimeCount : 0,
      totalWatchTime: igTotalWatchTime,
      reelWatchTimeTotal: igTotalWatchTime,
      totalLikes: igTotalLikes, // Instagram API only
      totalComments: igTotalComments, // Instagram API only
      totalShares: igTotalShares, // Instagram API only
      totalSaves: igTotalSaves, // Instagram API only
      totalFollowers: totalFollowers, // Instagram API only
      engagementRate: engagementRate,
      // Follower growth - from Instagram API (calculated from trend data)
      totalFollowersGained: totalFollowerGrowth > 0 ? totalFollowerGrowth : 0,
      totalFollowersLost: totalFollowerGrowth < 0 ? Math.abs(totalFollowerGrowth) : 0,
      followerGrowth: totalFollowerGrowth,
      // Trends - FROM INSTAGRAM API ONLY
      // Note: engagementTrend from database is kept for historical data
      // But followersTrend is ONLY from Instagram API
      // Trends - Calculate engagement trend from API posts (allDetailedPosts)
      engagementTrend: (() => {
        const dailyEngagement = {};
        allDetailedPosts.forEach(post => {
          if (post.timestamp) {
            const date = new Date(post.timestamp).toISOString().split('T')[0];
            if (!dailyEngagement[date]) {
              dailyEngagement[date] = { date, engagements: 0, views: 0 };
            }
            dailyEngagement[date].engagements += post.metrics.engagement || 0;
            dailyEngagement[date].views += post.metrics.views || 0;
          }
        });
        return Object.values(dailyEngagement)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(-30);
      })(),
      followersTrend: followersTrendData, // ONLY from Instagram API - NO DATABASE FALLBACK
      followerMetrics,
      impressionsTrend: accountTrend.map(d => ({ date: d.date, impressions: d.impressions || 0, reach: d.reach || 0 })),
      // View trend data from snapshots (for real-time view tracking)
      viewsTrend: await getAggregatedViewSnapshots(clientIds, 30),
      profileActivity: profileActivity,
      // Top performing post
      topPost: topPost ? {
        id: topPost._id,
        caption: topPost.caption || topPost.content || '',
        mediaUrls: topPost.mediaUrls || [],
        platform: topPost.platform || 'instagram',
        postType: topPost.postType || 'post',
        clientName: topPost.client ? topPost.client.name : 'Unknown',
        engagement: topPost.engagement || {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          views: 0,
          engagements: 0
        },
        createdAt: topPost.createdAt
      } : null,
      clientAnalytics: clients.map(client => {
        const clientPosts = posts.filter(p => p.client && p.client._id && p.client._id.toString() === client._id.toString());
        return {
          clientId: client._id,
          clientName: client.name,
          platform: client.platform,
          totalPosts: clientPosts.length || 0,
          publishedPosts: clientPosts.filter(p => p.status === 'published').length || 0,
          scheduledPosts: clientPosts.filter(p => p.status === 'scheduled').length || 0,
        };
      }),
      recentPosts: posts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10)
        .map(p => ({
          id: p._id,
          caption: p.caption || '',
          status: p.status || 'draft',
          platform: p.platform || 'instagram',
          postType: p.postType || 'post',
          createdAt: p.createdAt,
          publishedTime: p.publishedTime || null,
          clientName: p.client ? p.client.name : 'Unknown',
        })),
    };

    // Validate no dummy data
    validateRealData(analytics);

    // Log real data confirmation
    console.log('📊 REAL INSTAGRAM ANALYTICS LOADED');
    console.log('   Total Posts:', analytics.totalPosts, '(from Instagram API)');
    console.log('   Published:', analytics.publishedPosts, '(from Database)');
    console.log('   Total Followers:', analytics.totalFollowers, '(from Instagram API)');
    console.log('   Total Views:', analytics.totalViews, '(from Instagram API - REEL/REELS only)');
    console.log('   Total Engagements:', analytics.totalEngagements, '(from Instagram API)');
    console.log('   Total Likes:', analytics.totalLikes, '(from Instagram API)');
    console.log('   Total Comments:', analytics.totalComments, '(from Instagram API)');
    console.log('   Total Shares:', analytics.totalShares, '(from Instagram API)');
    console.log('   Total Saves:', analytics.totalSaves, '(from Instagram API)');
    console.log('   Engagement Rate:', analytics.engagementRate + '% (Calculated)');
    console.log('   Follower Growth:', analytics.followerGrowth, '(from Instagram API trend)');
    console.log('   Followers Trend:', analytics.followersTrend.length, 'days (from Instagram API)');
    // Sort detailed posts by timestamp (most recent first) and ensure proper structure
    const sortedDetailedPosts = allDetailedPosts
      .filter(post => post && post.id) // Remove any invalid posts
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || 0);
        const dateB = new Date(b.timestamp || 0);
        return dateB - dateA; // Most recent first
      })
      .map(post => ({
        id: post.id,
        media_type: post.media_type,
        thumbnail_url: post.thumbnail_url,
        caption: post.caption || '',
        permalink: post.permalink,
        timestamp: post.timestamp,
        clientId: post.clientId?.toString() || post.clientId, // Ensure string for filtering
        clientName: post.clientName, // Include clientName for display
        platform: post.platform || 'instagram',
        metrics: {
          likes: post.metrics?.likes || 0,
          comments: post.metrics?.comments || 0,
          saved: post.metrics?.saved || 0,
          shares: post.metrics?.shares || 0,
          reach: post.metrics?.reach || 0,
          views: post.metrics?.views || 0,
          engagement: post.metrics?.engagement || 0
        }
      }));

    console.log(`📊 Final detailedPosts: ${sortedDetailedPosts.length} posts (sorted by timestamp, most recent first)`);
    if (sortedDetailedPosts.length > 0) {
      console.log(`   Sample post:`, {
        id: sortedDetailedPosts[0].id,
        type: sortedDetailedPosts[0].media_type,
        views: sortedDetailedPosts[0].metrics?.views,
        likes: sortedDetailedPosts[0].metrics?.likes,
        engagement: sortedDetailedPosts[0].metrics?.engagement
      });
    }

    // Return with metadata
    const responseData = {
      ...analytics,
      clients: clients.map(c => ({ id: c._id.toString(), name: c.name, platform: c.platform })), // All clients for dropdown
      detailedPosts: sortedDetailedPosts // Pass sorted and formatted posts with real Instagram API data
    };

    res.json(createAnalyticsResponse(responseData, false, 'mixed'));
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/client/:clientId - Get analytics for a specific client
router.get('/client/:clientId', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { clientId } = req.params;
    const { startDate, endDate, refresh } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Verify client belongs to user
    const client = await Client.findOne({
      _id: clientId,
      createdBy: userId
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    // Get posts for this client
    let posts = await Post.find({
      createdBy: userId,
      client: clientId,
      ...dateFilter
    }).populate('client', 'name email platform pageAccessToken igUserId pageId');

    // If refresh=true, fetch latest engagement metrics from APIs
    if (refresh === 'true') {
      // Update follower count
      try {
        const followerCount = await updateClientFollowerCount(client);
        if (followerCount !== null) {
          client.followerCount = followerCount;
          client.followerCountLastUpdated = new Date();
          await client.save();
        }
      } catch (error) {
        console.error(`Error updating follower count for client ${client._id}:`, error);
      }

      // Update engagement metrics for published posts (limit to 20)
      const publishedPosts = posts.filter(p => p.status === 'published' && (p.instagramPostId || p.facebookPostId));
      for (let i = 0; i < Math.min(publishedPosts.length, 20); i++) {
        const post = publishedPosts[i];
        try {
          const metrics = await updatePostEngagementMetrics(post, client);
          if (metrics) {
            post.engagement = {
              ...metrics,
              lastUpdated: new Date()
            };
            await post.save();
          }
        } catch (error) {
          console.error(`Error updating engagement metrics for post ${post._id}:`, error);
        }
      }

      // Re-fetch posts after updates
      posts = await Post.find({
        createdBy: userId,
        client: clientId,
        ...dateFilter
      }).populate('client', 'name email platform pageAccessToken igUserId pageId');
    }

    // Use real engagement data from posts
    const getEngagementMetrics = (post) => {
      const engagement = post.engagement || {};
      const likes = engagement.likes || 0;
      const comments = engagement.comments || 0;
      const shares = engagement.shares || 0;
      const saves = engagement.saves || 0;
      const views = engagement.views || 0;
      const engagements = likes + comments + shares + saves;

      return {
        likes,
        comments,
        shares,
        saves,
        views,
        engagements
      };
    };

    // Calculate daily trends from real data
    const dailyEngagementData = {};

    posts.forEach(post => {
      if (post.createdAt && post.status === 'published') {
        const date = new Date(post.createdAt).toISOString().split('T')[0];
        const metrics = getEngagementMetrics(post);

        if (!dailyEngagementData[date]) {
          dailyEngagementData[date] = { date, engagements: 0, views: 0 };
        }
        dailyEngagementData[date].engagements += metrics.engagements;
        dailyEngagementData[date].views += metrics.views;
      }
    });

    const engagementTrend = Object.values(dailyEngagementData)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);

    // Calculate totals from real data
    let totalEngagements = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalSaves = 0;

    const postsWithMetrics = posts.map(post => {
      const metrics = getEngagementMetrics(post);
      totalEngagements += metrics.engagements;
      totalViews += metrics.views;
      totalLikes += metrics.likes;
      totalComments += metrics.comments;
      totalShares += metrics.shares;
      totalSaves += metrics.saves;

      return {
        ...post.toObject(),
        engagement: metrics
      };
    });

    const topPost = postsWithMetrics
      .filter(p => p.status === 'published' && p.engagement && p.engagement.engagements > 0)
      .sort((a, b) => (b.engagement?.engagements || 0) - (a.engagement?.engagements || 0))[0];

    // Get client follower count
    const clientFollowerCount = client.followerCount || 0;

    // Calculate client-specific analytics
    // For single client route, we still need to fetch Instagram data if it's Instagram
    let clientTotalPosts = posts.length || 0;
    let clientTotalFollowers = clientFollowerCount || 0;
    let clientTotalViews = 0;
    let clientTotalEngagements = 0;

    // If Instagram client, fetch real data
    if (client.platform === 'instagram' && client.igUserId && client.pageAccessToken) {
      try {
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken, client);
        if (igData && igData.success && igData.data) {
          const data = igData.data;
          clientTotalPosts = data.media?.total || 0; // Use Instagram count
          clientTotalFollowers = data.account?.follower_count || 0; // Use Instagram count
          clientTotalViews = data.media?.totalViews || 0; // Only REELS
          clientTotalEngagements = data.media?.totalEngagements || 0;
        }
      } catch (error) {
        console.error(`Error fetching IG data for client ${client._id}:`, error);
      }
    }

    // Count published posts - must have status='published' AND actually be published (has postId)
    // Use publishedTime for date filtering if available, otherwise createdAt
    const clientPublishedPosts = posts.filter(p => {
      if (p.status !== 'published') return false;
      if (!p.instagramPostId && !p.facebookPostId) return false;

      // If date filter is applied, check publishedTime first, then createdAt
      if (startDate || endDate) {
        const dateToCheck = p.publishedTime || p.createdAt;
        if (!dateToCheck) return false;

        const postDate = new Date(dateToCheck);
        if (startDate && postDate < new Date(startDate)) return false;
        if (endDate && postDate > new Date(endDate)) return false;
      }

      return true;
    }).length;

    // Calculate follower growth metrics from snapshots
    let followerMetrics = { hasData: false };
    try {
      followerMetrics = await calculateGrowth(client._id, 30);
    } catch (err) {
      console.error('Error calculating client growth:', err);
    }

    const analytics = {
      clientId: client._id,
      clientName: client.name || 'Unknown Client',
      platform: client.platform || 'unknown',
      totalPosts: clientTotalPosts, // Instagram API if available, otherwise DB
      publishedPosts: clientPublishedPosts,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length || 0,
      draftPosts: posts.filter(p => p.status === 'draft').length || 0,
      failedPosts: posts.filter(p => p.status === 'failed').length || 0,
      postsByType: {
        post: posts.filter(p => !p.postType || p.postType === 'post').length || 0,
        story: posts.filter(p => p.postType === 'story').length || 0,
        reel: posts.filter(p => p.postType === 'reel').length || 0,
      },
      postsByMonth: getPostsByMonth(posts),
      // Real engagement metrics - Prioritize API data if available
      totalEngagements: clientTotalEngagements > 0 ? clientTotalEngagements : (totalEngagements || 0),
      totalViews: clientTotalViews > 0 ? clientTotalViews : (totalViews || 0),
      totalLikes: totalLikes || 0,
      totalComments: totalComments || 0,
      totalShares: totalShares || 0,
      totalSaves: totalSaves || 0,
      totalFollowers: clientTotalFollowers || 0,
      engagementRate: (clientTotalViews > 0 || totalViews > 0) ?
        (((clientTotalEngagements || totalEngagements) / (clientTotalViews || totalViews)) * 100).toFixed(2) : '0.00',
      // Follower growth - not available in database, set to 0
      totalFollowersGained: 0,
      totalFollowersLost: 0,
      followerGrowth: 0,
      followerMetrics,
      // Trends
      engagementTrend: engagementTrend || [],
      followersTrend: [], // Empty since we don't have follower data
      followerMetrics,
      // Top performing post
      topPost: topPost ? {
        id: topPost._id,
        caption: topPost.caption || topPost.content || '',
        mediaUrls: topPost.mediaUrls || [],
        platform: topPost.platform || 'instagram',
        postType: topPost.postType || 'post',
        clientName: topPost.client ? topPost.client.name : 'Unknown',
        engagement: topPost.engagement || {
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          views: 0,
          engagements: 0
        },
        createdAt: topPost.createdAt
      } : null,
      recentPosts: posts
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 10)
        .map(p => ({
          id: p._id,
          caption: p.caption || p.content || '',
          status: p.status || 'draft',
          platform: p.platform || 'instagram',
          postType: p.postType || 'post',
          createdAt: p.createdAt,
          publishedTime: p.publishedTime || null,
          clientName: p.client ? (p.client.name || 'Unknown') : 'Unknown',
        })),
    };

    res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Error fetching client analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client analytics' });
  }
});

// Helper function to get posts by month
function getPostsByMonth(posts) {
  const monthly = {};
  posts.forEach(post => {
    if (post.createdAt) {
      const month = new Date(post.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!monthly[month]) {
        monthly[month] = 0;
      }
      monthly[month]++;
    }
  });
  return monthly;
}

// GET /api/analytics/overview - Get overview analytics with real Instagram data
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { refresh } = req.query;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ANALYTICS OVERVIEW REQUEST`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Refresh: ${refresh === 'true' ? 'Yes (bypassing cache)' : 'No (using cache)'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get all Instagram clients
    const allClients = await Client.find({
      createdBy: userId,
      platform: 'instagram'
    });

    console.log(`📊 Found ${allClients.length} Instagram client(s) for user ${userId}`);

    // Log client details for debugging
    allClients.forEach(client => {
      console.log(`  - Client: ${client.name}`);
      console.log(`    igUserId: ${client.igUserId ? '✅ Set' : '❌ Missing'}`);
      console.log(`    pageAccessToken: ${client.pageAccessToken ? '✅ Set (' + client.pageAccessToken.substring(0, 20) + '...)' : '❌ Missing'}`);
    });

    const clients = allClients.filter(c =>
      c.igUserId && c.pageAccessToken
    );

    if (clients.length === 0) {
      console.warn(`⚠️ No Instagram clients with valid credentials found. Total clients: ${allClients.length}`);
      if (allClients.length > 0) {
        console.warn(`   Clients missing credentials:`);
        allClients.forEach(c => {
          if (!c.igUserId || !c.pageAccessToken) {
            console.warn(`     - ${c.name}: missing ${!c.igUserId ? 'igUserId' : ''} ${!c.pageAccessToken ? 'pageAccessToken' : ''}`);
          }
        });
      }
      return res.json({
        success: true,
        data: {
          totalPosts: 0,
          publishedPosts: 0,
          scheduledPosts: 0,
          draftPosts: 0,
          totalFollowers: 0,
          totalViews: 0,
          engagementRate: '0.00',
          followerGrowth: 0
        }
      });
    }

    console.log(`✅ Found ${clients.length} client(s) with valid Instagram credentials`);

    // Clear cache if refresh requested
    if (refresh === 'true') {
      console.log(`🔄 Refresh requested - clearing cache for all clients`);
      clients.forEach(client => {
        if (client.igUserId) {
          clearUserCache(client.igUserId);
        }
      });
    }

    // Fetch real Instagram data for all clients
    const analyticsData = [];
    const tokenErrors = [];

    for (const client of clients) {
      try {
        console.log(`\n📊 Fetching Instagram analytics for client: ${client.name}`);
        console.log(`   IG User ID: ${client.igUserId}`);
        console.log(`   Token: ${client.pageAccessToken ? client.pageAccessToken.substring(0, 30) + '...' : 'MISSING'}`);

        // Validate token first
        console.log(`   🔐 Validating Instagram access token...`);
        const tokenValidation = await validateInstagramToken(client.pageAccessToken, client.igUserId);

        if (!tokenValidation.valid) {
          console.error(`   ❌ Token validation failed for ${client.name}`);
          console.error(`      Error: ${tokenValidation.error}`);
          console.error(`      Message: ${tokenValidation.message}`);

          tokenErrors.push({
            clientId: client._id,
            clientName: client.name,
            ...tokenValidation
          });

          if (tokenValidation.expired) {
            // Token expired - return error requiring re-auth
            return res.status(401).json(createTokenErrorResponse(
              'token_expired',
              `Instagram access token expired for ${client.name}. Please re-authenticate.`
            ));
          }
          continue;
        }

        console.log(`   ✅ Token validated successfully (username: ${tokenValidation.username})`);

        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        if (igData && igData.success && igData.data) {
          const data = igData.data;
          console.log(`✅ Successfully fetched Instagram data for ${client.name}:`, {
            followers: data.account?.follower_count,
            views: data.media?.totalViews,
            engagements: data.media?.totalEngagements
          });
          analyticsData.push({
            clientId: client._id,
            clientName: client.name,
            ...data  // Spread the data object, not the full response
          });
        } else {
          console.warn(`⚠️ No Instagram data returned for client ${client.name}`);
        }
      } catch (error) {
        console.error(`❌ Error fetching analytics for client ${client._id}:`, error.message);
        console.error('Full error:', error);
      }
    }

    // Aggregate data from all clients
    let totalPosts = 0;
    let totalFollowers = 0;
    let totalViews = 0;
    let totalEngagements = 0;
    let totalFollowerGrowth = 0;

    analyticsData.forEach(item => {
      // item is now the data object directly (from spreading ...data above)
      totalPosts += item.media?.total || 0;
      totalFollowers += item.account?.follower_count || 0;
      totalViews += item.media?.totalViews || 0;
      totalEngagements += item.media?.totalEngagements || 0;
      totalFollowerGrowth += item.followerGrowth || 0;
    });

    // Get posts from database for scheduled/draft counts
    const clientIds = clients.map(c => c._id);
    const dbPosts = await Post.find({
      createdBy: userId,
      client: { $in: clientIds }
    });

    // Count published posts - must have status='published' AND actually be published (has postId)
    const publishedPosts = dbPosts.filter(p => {
      return p.status === 'published' && (p.instagramPostId || p.facebookPostId);
    }).length;
    const scheduledPosts = dbPosts.filter(p => p.status === 'scheduled').length;
    const draftPosts = dbPosts.filter(p => p.status === 'draft').length;

    // NO FALLBACK - Use ONLY Instagram API data
    // If totalFollowers is 0, it means the account has 0 followers (real data)

    // Calculate engagement rate using helper
    const engagementRate = calculateEngagementRate(totalEngagements, totalFollowers);

    const overviewData = {
      // ONLY Instagram API - NO DATABASE FALLBACK
      totalPosts: totalPosts, // Always use Instagram count (even if 0)
      publishedPosts,
      scheduledPosts,
      draftPosts,
      totalFollowers,
      totalViews,
      totalEngagements,
      engagementRate,
      followerGrowth: totalFollowerGrowth
    };

    console.log(`📊 REAL INSTAGRAM ANALYTICS LOADED (Overview)`);
    console.log(`   Total Posts: ${overviewData.totalPosts} (from Instagram)`);
    console.log(`   Published: ${overviewData.publishedPosts} (from Database)`);
    console.log(`   Scheduled: ${overviewData.scheduledPosts} (from Database)`);
    console.log(`   Draft: ${overviewData.draftPosts} (from Database)`);
    console.log(`   Total Followers: ${overviewData.totalFollowers} (from Instagram)`);
    console.log(`   Total Views: ${overviewData.totalViews} (from Instagram)`);
    console.log(`   Total Engagements: ${overviewData.totalEngagements} (from Instagram)`);
    console.log(`   Engagement Rate: ${overviewData.engagementRate}% (Calculated)`);
    console.log(`   Follower Growth: ${overviewData.followerGrowth} (from Instagram)`);

    // Validate no dummy data
    validateRealData(overviewData);

    // Calculate follower metrics from snapshots
    let followerMetrics = {
      current: totalFollowers,
      gained: totalFollowers,
      lost: 0,
      netGrowth: totalFollowers,
      period: '30days',
      hasData: false
    };

    try {
      const { calculateGrowth } = await import('../services/followerSnapshotService.js');

      // Calculate for all clients and aggregate
      let totalGained = 0;
      let totalLost = 0;
      let hasAnyData = false;

      for (const client of clients) {
        if (client.platform === 'instagram') {
          const metrics = await calculateGrowth(client._id, 30);
          if (metrics.hasData) {
            totalGained += metrics.gained;
            totalLost += metrics.lost;
            hasAnyData = true;
          }
        }
      }

      if (hasAnyData) {
        followerMetrics = {
          current: totalFollowers,
          gained: totalGained,
          lost: totalLost,
          netGrowth: totalGained - totalLost,
          period: '30days',
          hasData: true
        };
      }
    } catch (error) {
      console.warn('⚠️ Could not calculate follower metrics:', error.message);
    }

    // Add follower metrics to overview data
    const responseData = {
      ...overviewData,
      followerMetrics
    };

    res.json(createAnalyticsResponse(responseData, refresh !== 'true', 'instagram_api'));
  } catch (error) {
    console.error('Error fetching overview analytics:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overview analytics' });
  }
});

// GET /api/analytics/trends - Get trend data (last 30 days)
router.get('/trends', async (req, res) => {
  try {
    const userId = req.user.sub;

    const clients = await Client.find({
      createdBy: userId,
      platform: 'instagram',
      igUserId: { $exists: true, $ne: null },
      pageAccessToken: { $exists: true, $ne: null }
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        data: {
          engagementTrend: [],
          followerTrend: []
        }
      });
    }

    // Aggregate trends from all clients
    const engagementTrendMap = {};
    const followerTrendMap = {};

    for (const client of clients) {
      try {
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        if (igData && igData.success && igData.data && igData.data.trends) {
          const trends = igData.data.trends;
          // Aggregate engagement trends
          if (trends.engagement && Array.isArray(trends.engagement)) {
            trends.engagement.forEach(day => {
              if (!engagementTrendMap[day.date]) {
                engagementTrendMap[day.date] = { date: day.date, engagements: 0, views: 0 };
              }
              engagementTrendMap[day.date].engagements += day.engagements || 0;
              engagementTrendMap[day.date].views += day.views || 0;
            });
          }

          // Aggregate follower trends
          if (trends.followers && Array.isArray(trends.followers)) {
            trends.followers.forEach(day => {
              if (!followerTrendMap[day.date]) {
                followerTrendMap[day.date] = { date: day.date, followers: 0 };
              }
              followerTrendMap[day.date].followers += day.follower_count || day.followers || 0;
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching trends for client ${client._id}:`, error);
      }
    }

    const engagementTrend = Object.values(engagementTrendMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);

    const followerTrend = Object.values(followerTrendMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30);

    res.json({
      success: true,
      data: {
        engagementTrend,
        followerTrend
      }
    });
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

// GET /api/analytics/posts - Get recent Instagram posts with metrics
router.get('/posts', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { limit = 10 } = req.query;

    const clients = await Client.find({
      createdBy: userId,
      platform: 'instagram',
      igUserId: { $exists: true, $ne: null },
      pageAccessToken: { $exists: true, $ne: null }
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get recent posts from all clients
    const allRecentPosts = [];

    for (const client of clients) {
      try {
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        if (igData && igData.success && igData.data && igData.data.recentPosts) {
          igData.data.recentPosts.forEach(post => {
            allRecentPosts.push({
              ...post,
              clientName: client.name,
              clientId: client._id
            });
          });
        }
      } catch (error) {
        console.error(`Error fetching posts for client ${client._id}:`, error);
      }
    }

    // Sort by timestamp and limit
    const sortedPosts = allRecentPosts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: sortedPosts
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch posts' });
  }
});

// GET /api/analytics/client-performance - Get performance metrics per client
router.get('/client-performance', async (req, res) => {
  try {
    const userId = req.user.sub;

    const clients = await Client.find({
      createdBy: userId,
      platform: 'instagram',
      igUserId: { $exists: true, $ne: null },
      pageAccessToken: { $exists: true, $ne: null }
    });

    if (clients.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get DB posts for scheduled/draft counts
    const clientIds = clients.map(c => c._id);
    const dbPosts = await Post.find({
      createdBy: userId,
      client: { $in: clientIds }
    });

    const clientPerformance = [];

    for (const client of clients) {
      try {
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        const clientDbPosts = dbPosts.filter(p =>
          p.client && p.client.toString() === client._id.toString()
        );

        // Extract data from structured response
        const data = (igData && igData.success && igData.data) ? igData.data : null;

        const performance = {
          clientId: client._id,
          clientName: client.name,
          // ONLY Instagram API - NO DATABASE FALLBACK
          totalPosts: data?.media?.total || 0, // Always use Instagram count
          publishedPosts: clientDbPosts.filter(p => p.status === 'published' && (p.instagramPostId || p.facebookPostId)).length,
          scheduledPosts: clientDbPosts.filter(p => p.status === 'scheduled').length,
          draftPosts: clientDbPosts.filter(p => p.status === 'draft').length,
          totalFollowers: data?.account?.follower_count || 0, // ONLY Instagram API
          totalViews: data?.media?.totalViews || 0, // ONLY Instagram API (REELS only)
          totalEngagements: data?.media?.totalEngagements || 0, // ONLY Instagram API
          engagementRate: data?.media?.engagementRate || '0.00',
          postsByType: data?.media?.postsByType || {
            IMAGE: 0,
            VIDEO: 0,
            CAROUSEL_ALBUM: 0,
            REELS: 0
          }
        };

        clientPerformance.push(performance);
      } catch (error) {
        console.error(`Error fetching performance for client ${client._id}:`, error);
        // Add client with zero metrics
        const clientDbPosts = dbPosts.filter(p =>
          p.client && p.client.toString() === client._id.toString()
        );
        clientPerformance.push({
          clientId: client._id,
          clientName: client.name,
          totalPosts: clientDbPosts.length,
          publishedPosts: clientDbPosts.filter(p => p.status === 'published' && (p.instagramPostId || p.facebookPostId)).length,
          scheduledPosts: clientDbPosts.filter(p => p.status === 'scheduled').length,
          draftPosts: clientDbPosts.filter(p => p.status === 'draft').length,
          totalFollowers: 0,
          totalViews: 0,
          totalEngagements: 0,
          engagementRate: '0.00',
          postsByType: {
            IMAGE: 0,
            VIDEO: 0,
            CAROUSEL_ALBUM: 0,
            REELS: 0
          }
        });
      }
    }

    res.json({
      success: true,
      data: clientPerformance
    });
  } catch (error) {
    console.error('Error fetching client performance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch client performance' });
  }
});

// GET /api/analytics/best-posting-times - Get best posting times based on historical engagement
router.get('/best-posting-times', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { clientId, days = 30 } = req.query;

    // Build query for published posts with engagement data
    const query = {
      createdBy: userId,
      status: 'published',
      'metrics.engagement': { $exists: true, $gt: 0 }
    };

    if (clientId) {
      query.client = clientId;
    }

    // Get posts from last N days
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    query.createdAt = { $gte: daysAgo };

    const posts = await Post.find(query)
      .select('scheduledTime createdAt metrics.engagement')
      .lean();

    if (posts.length === 0) {
      return res.json({
        success: true,
        data: {
          bestDays: [],
          bestHours: [],
          recommendedTimes: []
        }
      });
    }

    // Analyze by day of week (0 = Sunday, 6 = Saturday)
    const dayEngagement = {};
    const hourEngagement = {};

    posts.forEach(post => {
      const postDate = post.scheduledTime ? new Date(post.scheduledTime) : new Date(post.createdAt);
      const dayOfWeek = postDate.getDay();
      const hour = postDate.getHours();
      const engagement = post.metrics?.engagement || 0;

      if (!dayEngagement[dayOfWeek]) {
        dayEngagement[dayOfWeek] = { total: 0, count: 0 };
      }
      dayEngagement[dayOfWeek].total += engagement;
      dayEngagement[dayOfWeek].count += 1;

      if (!hourEngagement[hour]) {
        hourEngagement[hour] = { total: 0, count: 0 };
      }
      hourEngagement[hour].total += engagement;
      hourEngagement[hour].count += 1;
    });

    // Calculate average engagement per day
    const bestDays = Object.entries(dayEngagement)
      .map(([day, data]) => ({
        day: parseInt(day),
        dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(day)],
        avgEngagement: data.total / data.count,
        postCount: data.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 3); // Top 3 days

    // Calculate average engagement per hour
    const bestHours = Object.entries(hourEngagement)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgEngagement: data.total / data.count,
        postCount: data.count
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5); // Top 5 hours

    // Generate recommended times (combinations of best days and hours)
    const recommendedTimes = [];
    bestDays.forEach(dayData => {
      bestHours.forEach(hourData => {
        recommendedTimes.push({
          day: dayData.day,
          dayName: dayData.dayName,
          hour: hourData.hour,
          hourDisplay: `${hourData.hour}:00`,
          score: (dayData.avgEngagement + hourData.avgEngagement) / 2
        });
      });
    });

    recommendedTimes.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: {
        bestDays,
        bestHours,
        recommendedTimes: recommendedTimes.slice(0, 10) // Top 10 recommended times
      }
    });
  } catch (error) {
    console.error('Error fetching best posting times:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch best posting times' });
  }
});

export default router;
