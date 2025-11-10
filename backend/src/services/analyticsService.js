/**
 * Service to fetch real engagement metrics and follower counts from Instagram/Facebook APIs
 */

/**
 * Fetch engagement metrics for a post from Instagram Graph API
 */
export async function fetchInstagramPostMetrics(igPostId, pageAccessToken) {
  try {
    if (!igPostId || !pageAccessToken) {
      return null;
    }

    const url = `https://graph.facebook.com/v18.0/${igPostId}?fields=like_count,comments_count,shares_count,saved,impressions,reach&access_token=${pageAccessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Instagram post metrics:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    return {
      likes: data.like_count || 0,
      comments: data.comments_count || 0,
      shares: data.shares_count || 0,
      saves: data.saved || 0,
      views: data.impressions || data.reach || 0,
      reach: data.reach || 0,
      impressions: data.impressions || 0
    };
  } catch (error) {
    console.error('Error fetching Instagram post metrics:', error);
    return null;
  }
}

/**
 * Fetch engagement metrics for a post from Facebook Graph API
 */
export async function fetchFacebookPostMetrics(fbPostId, pageAccessToken) {
  try {
    if (!fbPostId || !pageAccessToken) {
      return null;
    }

    const url = `https://graph.facebook.com/v18.0/${fbPostId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${pageAccessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Facebook post metrics:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    
    return {
      likes: data.likes?.summary?.total_count || data.reactions?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      saves: 0, // Facebook doesn't have saves
      views: 0, // Would need insights API for views
      reach: 0,
      impressions: 0
    };
  } catch (error) {
    console.error('Error fetching Facebook post metrics:', error);
    return null;
  }
}

/**
 * Fetch follower count for Instagram Business Account
 */
export async function fetchInstagramFollowerCount(igUserId, pageAccessToken) {
  try {
    if (!igUserId || !pageAccessToken) {
      return null;
    }

    const url = `https://graph.facebook.com/v18.0/${igUserId}?fields=followers_count&access_token=${pageAccessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Instagram follower count:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.followers_count || 0;
  } catch (error) {
    console.error('Error fetching Instagram follower count:', error);
    return null;
  }
}

/**
 * Fetch follower count for Facebook Page
 */
export async function fetchFacebookFollowerCount(pageId, pageAccessToken) {
  try {
    if (!pageId || !pageAccessToken) {
      return null;
    }

    const url = `https://graph.facebook.com/v18.0/${pageId}?fields=fan_count&access_token=${pageAccessToken}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Error fetching Facebook follower count:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.fan_count || 0;
  } catch (error) {
    console.error('Error fetching Facebook follower count:', error);
    return null;
  }
}

/**
 * Update post engagement metrics from API
 */
export async function updatePostEngagementMetrics(post, client) {
  try {
    if (!post || post.status !== 'published') {
      return null;
    }

    let metrics = null;

    if (post.platform === 'instagram' || post.platform === 'both') {
      if (post.instagramPostId && client.pageAccessToken) {
        metrics = await fetchInstagramPostMetrics(post.instagramPostId, client.pageAccessToken);
      }
    }

    if (post.platform === 'facebook' || post.platform === 'both') {
      if (post.facebookPostId && client.pageAccessToken) {
        const fbMetrics = await fetchFacebookPostMetrics(post.facebookPostId, client.pageAccessToken);
        if (fbMetrics) {
          // Merge metrics if both platforms
          if (metrics) {
            metrics.likes += fbMetrics.likes;
            metrics.comments += fbMetrics.comments;
            metrics.shares += fbMetrics.shares;
            metrics.views += fbMetrics.views;
          } else {
            metrics = fbMetrics;
          }
        }
      }
    }

    return metrics;
  } catch (error) {
    console.error('Error updating post engagement metrics:', error);
    return null;
  }
}

/**
 * Update client follower count from API
 */
export async function updateClientFollowerCount(client) {
  try {
    if (!client || !client.pageAccessToken) {
      return null;
    }

    let followerCount = null;

    if (client.platform === 'instagram' && client.igUserId) {
      followerCount = await fetchInstagramFollowerCount(client.igUserId, client.pageAccessToken);
    } else if (client.platform === 'facebook' && client.pageId) {
      followerCount = await fetchFacebookFollowerCount(client.pageId, client.pageAccessToken);
    }

    return followerCount;
  } catch (error) {
    console.error('Error updating client follower count:', error);
    return null;
  }
}



