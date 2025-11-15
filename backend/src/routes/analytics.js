import express from 'express';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';
import { updatePostEngagementMetrics, updateClientFollowerCount } from '../services/analyticsService.js';
import { fetchInstagramAnalytics, fetchAccountInsights, fetchInstagramMedia, clearUserCache } from '../services/instagramInsightsService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/analytics - Get analytics for all connected accounts
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
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
    
    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);
    
    // Get analytics for all posts (handle case when there are no clients)
    let posts = [];
    if (clientIds.length > 0) {
      const postFilter = {
        createdBy: userId,
        client: { $in: clientIds },
        ...dateFilter
      };
      posts = await Post.find(postFilter).populate('client', 'name email platform pageAccessToken igUserId pageId');
    }
    
    // If refresh=true, fetch latest engagement metrics from APIs (limited to avoid rate limits)
    if (refresh === 'true') {
      // Update follower counts for clients (limit to 5 to avoid rate limits)
      for (let i = 0; i < Math.min(clients.length, 5); i++) {
        const client = clients[i];
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
      }
      
      // Update engagement metrics for published posts (limit to 10 to avoid rate limits)
      const publishedPosts = posts.filter(p => p.status === 'published' && (p.instagramPostId || p.facebookPostId));
      for (let i = 0; i < Math.min(publishedPosts.length, 10); i++) {
        const post = publishedPosts[i];
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
      }
      
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
    
    // Fetch real Instagram data for Instagram clients
    let totalFollowers = 0;
    let igTotalViews = 0;
    let igTotalEngagements = 0;
    let postsByTypeFromIG = {
      IMAGE: 0,
      VIDEO: 0,
      CAROUSEL_ALBUM: 0,
      REELS: 0
    };

    const instagramClients = clients.filter(c => 
      c.platform === 'instagram' && c.igUserId && c.pageAccessToken
    );

    for (const client of instagramClients) {
      try {
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        if (igData) {
          totalFollowers += igData.account?.follower_count || 0;
          igTotalViews += igData.media?.totalViews || 0;
          igTotalEngagements += igData.media?.totalEngagements || 0;
          
          // Aggregate post types
          if (igData.media?.postsByType) {
            Object.keys(igData.media.postsByType).forEach(type => {
              postsByTypeFromIG[type] = (postsByTypeFromIG[type] || 0) + (igData.media.postsByType[type] || 0);
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching IG data for client ${client._id}:`, error);
      }
    }

    // Use Instagram data if available, otherwise use DB data
    if (igTotalViews > 0) {
      totalViews = igTotalViews;
    }
    if (igTotalEngagements > 0) {
      totalEngagements = igTotalEngagements;
    }

    // Fallback to DB follower count if no IG data
    if (totalFollowers === 0) {
      totalFollowers = clients.reduce((sum, client) => {
        return sum + (client.followerCount || 0);
      }, 0);
    }
    
    // Find top performing post based on real engagement data
    const topPost = postsWithMetrics
      .filter(p => p.status === 'published' && p.engagement && p.engagement.engagements > 0)
      .sort((a, b) => (b.engagement?.engagements || 0) - (a.engagement?.engagements || 0))[0];
    
    // Calculate analytics with safe defaults
    const analytics = {
      totalPosts: posts.length || 0,
      publishedPosts: posts.filter(p => p.status === 'published').length || 0,
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
      // Real engagement metrics from database
      totalEngagements: totalEngagements || 0,
      totalViews: totalViews || 0,
      totalLikes: totalLikes || 0,
      totalComments: totalComments || 0,
      totalShares: totalShares || 0,
      totalSaves: totalSaves || 0,
      totalFollowers: totalFollowers || 0,
      engagementRate: totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(2) : '0.00',
      // Follower growth - not available in database, set to 0
      // In production, this should be fetched from Instagram/Facebook APIs
      totalFollowersGained: 0,
      totalFollowersLost: 0,
      followerGrowth: 0,
      // Trends
      engagementTrend: engagementTrend || [],
      followersTrend: [], // Empty since we don't have follower data
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
    
    res.json({ success: true, data: analytics });
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
    const analytics = {
      clientId: client._id,
      clientName: client.name || 'Unknown Client',
      platform: client.platform || 'unknown',
      totalPosts: posts.length || 0,
      publishedPosts: posts.filter(p => p.status === 'published').length || 0,
      scheduledPosts: posts.filter(p => p.status === 'scheduled').length || 0,
      draftPosts: posts.filter(p => p.status === 'draft').length || 0,
      failedPosts: posts.filter(p => p.status === 'failed').length || 0,
      postsByType: {
        post: posts.filter(p => !p.postType || p.postType === 'post').length || 0,
        story: posts.filter(p => p.postType === 'story').length || 0,
        reel: posts.filter(p => p.postType === 'reel').length || 0,
      },
      postsByMonth: getPostsByMonth(posts),
      // Real engagement metrics from database
      totalEngagements: totalEngagements || 0,
      totalViews: totalViews || 0,
      totalLikes: totalLikes || 0,
      totalComments: totalComments || 0,
      totalShares: totalShares || 0,
      totalSaves: totalSaves || 0,
      totalFollowers: clientFollowerCount || 0,
      engagementRate: totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(2) : '0.00',
      // Follower growth - not available in database, set to 0
      totalFollowersGained: 0,
      totalFollowersLost: 0,
      followerGrowth: 0,
      // Trends
      engagementTrend: engagementTrend || [],
      followersTrend: [], // Empty since we don't have follower data
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
    for (const client of clients) {
      try {
        console.log(`\n📊 Fetching Instagram analytics for client: ${client.name}`);
        console.log(`   IG User ID: ${client.igUserId}`);
        console.log(`   Token: ${client.pageAccessToken ? client.pageAccessToken.substring(0, 30) + '...' : 'MISSING'}`);
        const igData = await fetchInstagramAnalytics(client.igUserId, client.pageAccessToken);
        if (igData) {
          console.log(`✅ Successfully fetched Instagram data for ${client.name}:`, {
            followers: igData.account?.follower_count,
            views: igData.media?.totalViews,
            engagements: igData.media?.totalEngagements
          });
          analyticsData.push({
            clientId: client._id,
            clientName: client.name,
            ...igData
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

    analyticsData.forEach(data => {
      totalPosts += data.media?.total || 0;
      totalFollowers += data.account?.follower_count || 0;
      totalViews += data.media?.totalViews || 0;
      totalEngagements += data.media?.totalEngagements || 0;
      totalFollowerGrowth += data.followerGrowth || 0;
    });

    // Get posts from database for scheduled/draft counts
    const clientIds = clients.map(c => c._id);
    const dbPosts = await Post.find({
      createdBy: userId,
      client: { $in: clientIds }
    });

    const publishedPosts = dbPosts.filter(p => p.status === 'published').length;
    const scheduledPosts = dbPosts.filter(p => p.status === 'scheduled').length;
    const draftPosts = dbPosts.filter(p => p.status === 'draft').length;

    // Fallback: If no Instagram data, use DB follower count
    if (totalFollowers === 0) {
      totalFollowers = clients.reduce((sum, client) => sum + (client.followerCount || 0), 0);
      console.log(`📊 Using DB follower count as fallback: ${totalFollowers}`);
    }

    // Calculate engagement rate
    const engagementRate = totalFollowers > 0
      ? ((totalEngagements / totalFollowers) * 100).toFixed(2)
      : '0.00';

    console.log(`📊 Analytics Summary:`, {
      totalPosts: totalPosts || publishedPosts,
      totalFollowers,
      totalViews,
      totalEngagements,
      engagementRate
    });

    res.json({
      success: true,
      data: {
        totalPosts: totalPosts || publishedPosts, // Use IG count or DB count
        publishedPosts,
        scheduledPosts,
        draftPosts,
        totalFollowers,
        totalViews,
        totalEngagements,
        engagementRate,
        followerGrowth: totalFollowerGrowth
      }
    });
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
        if (igData && igData.trends) {
          // Aggregate engagement trends
          igData.trends.engagement.forEach(day => {
            if (!engagementTrendMap[day.date]) {
              engagementTrendMap[day.date] = { date: day.date, engagements: 0, views: 0 };
            }
            engagementTrendMap[day.date].engagements += day.engagements || 0;
            engagementTrendMap[day.date].views += day.views || 0;
          });

          // Aggregate follower trends
          igData.trends.followers.forEach(day => {
            if (!followerTrendMap[day.date]) {
              followerTrendMap[day.date] = { date: day.date, followers: 0 };
            }
            followerTrendMap[day.date].followers += day.follower_count || day.followers || 0;
          });
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
        if (igData && igData.recentPosts) {
          igData.recentPosts.forEach(post => {
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

        const performance = {
          clientId: client._id,
          clientName: client.name,
          totalPosts: igData?.media?.total || clientDbPosts.length || 0,
          publishedPosts: clientDbPosts.filter(p => p.status === 'published').length,
          scheduledPosts: clientDbPosts.filter(p => p.status === 'scheduled').length,
          draftPosts: clientDbPosts.filter(p => p.status === 'draft').length,
          totalFollowers: igData?.account?.follower_count || 0,
          totalViews: igData?.media?.totalViews || 0,
          totalEngagements: igData?.media?.totalEngagements || 0,
          engagementRate: igData?.media?.engagementRate || '0.00',
          postsByType: igData?.media?.postsByType || {
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
          publishedPosts: clientDbPosts.filter(p => p.status === 'published').length,
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

export default router;
