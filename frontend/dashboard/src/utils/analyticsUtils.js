/**
 * Analytics Utility Functions
 * Helper functions for analytics calculations and data processing
 */

/**
 * Calculate month-over-month percentage change
 */
export const calculateMonthOverMonth = (current, previous) => {
    if (!previous || previous === 0) return { percentage: 0, direction: 'neutral' };

    const change = ((current - previous) / previous) * 100;
    return {
        percentage: Math.abs(change).toFixed(1),
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
};

/**
 * Extract hashtags from caption text
 */
export const extractHashtags = (caption) => {
    if (!caption) return [];
    const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
    const matches = caption.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
};

/**
 * Calculate engagement rate
 */
export const calculateEngagementRate = (engagement, reach, followers) => {
    const base = reach > 0 ? reach : followers;
    if (!base || base === 0) return 0;
    return ((engagement / base) * 100).toFixed(2);
};

/**
 * Find best posting times based on historical data
 */
export const findBestPostingTimes = (posts) => {
    if (!posts || posts.length === 0) return { bestHours: [], bestDays: [], heatmapData: [] };

    const hourlyEngagement = Array(24).fill(0).map((_, i) => ({ hour: i, engagement: 0, count: 0 }));
    const dailyEngagement = Array(7).fill(0).map((_, i) => ({ day: i, engagement: 0, count: 0 }));
    const heatmapData = [];

    posts.forEach(post => {
        if (!post.timestamp || !post.metrics) return;

        const date = new Date(post.timestamp);
        const hour = date.getHours();
        const day = date.getDay();
        const engagement = post.metrics.engagement ||
            (post.metrics.likes + post.metrics.comments + post.metrics.shares + post.metrics.saved);

        hourlyEngagement[hour].engagement += engagement;
        hourlyEngagement[hour].count += 1;

        dailyEngagement[day].engagement += engagement;
        dailyEngagement[day].count += 1;

        // Build heatmap data
        const key = `${day}-${hour}`;
        const existing = heatmapData.find(d => d.day === day && d.hour === hour);
        if (existing) {
            existing.engagement += engagement;
            existing.count += 1;
        } else {
            heatmapData.push({ day, hour, engagement, count: 1 });
        }
    });

    // Calculate averages
    hourlyEngagement.forEach(h => {
        h.avgEngagement = h.count > 0 ? h.engagement / h.count : 0;
    });
    dailyEngagement.forEach(d => {
        d.avgEngagement = d.count > 0 ? d.engagement / d.count : 0;
    });
    heatmapData.forEach(d => {
        d.avgEngagement = d.count > 0 ? d.engagement / d.count : 0;
    });

    // Find top 3 hours and days
    const bestHours = [...hourlyEngagement]
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3)
        .filter(h => h.count > 0);

    const bestDays = [...dailyEngagement]
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, 3)
        .filter(d => d.count > 0);

    return { bestHours, bestDays, heatmapData };
};

/**
 * Group posts by platform
 */
export const groupPostsByPlatform = (posts) => {
    const platforms = { instagram: [], facebook: [], both: [] };

    posts.forEach(post => {
        const platform = post.platform || 'instagram';
        if (platforms[platform]) {
            platforms[platform].push(post);
        }
    });

    return platforms;
};

/**
 * Group posts by content type
 */
export const groupPostsByContentType = (posts) => {
    const types = {
        REELS: [],
        IMAGE: [],
        CAROUSEL_ALBUM: [],
        VIDEO: []
    };

    posts.forEach(post => {
        let mediaType = post.media_type || post.postType;

        // Normalize type names
        if (mediaType === 'reel') mediaType = 'REELS';
        if (mediaType === 'post') mediaType = 'IMAGE';
        if (mediaType === 'carousel') mediaType = 'CAROUSEL_ALBUM';
        if (mediaType === 'video') mediaType = 'VIDEO';

        // Detect reels from video type
        if (mediaType === 'VIDEO' && post.permalink && post.permalink.includes('/reel/')) {
            mediaType = 'REELS';
        }

        if (types[mediaType]) {
            types[mediaType].push(post);
        }
    });

    return types;
};

/**
 * Format large numbers (1.2K, 1.5M)
 */
export const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
};

/**
 * Calculate trend direction and percentage
 */
export const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) {
        return { direction: current > 0 ? 'up' : 'neutral', percentage: 0 };
    }

    const change = ((current - previous) / previous) * 100;
    return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
        percentage: Math.abs(change).toFixed(1)
    };
};

/**
 * Get day name from day number
 */
export const getDayName = (dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
};

/**
 * Format hour to 12-hour format
 */
export const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
};

/**
 * Calculate engagement metrics for a post
 */
export const getPostEngagement = (post) => {
    const metrics = post.metrics || post.engagement || {};
    return {
        likes: metrics.likes || 0,
        comments: metrics.comments || 0,
        shares: metrics.shares || 0,
        saves: metrics.saved || metrics.saves || 0,
        views: metrics.views || 0,
        reach: metrics.reach || 0,
        total: (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0) + (metrics.saved || metrics.saves || 0)
    };
};

/**
 * Analyze hashtag performance
 */
export const analyzeHashtags = (posts) => {
    const hashtagStats = {};

    posts.forEach(post => {
        const caption = post.caption || '';
        const hashtags = extractHashtags(caption);
        const engagement = getPostEngagement(post).total;

        hashtags.forEach(tag => {
            if (!hashtagStats[tag]) {
                hashtagStats[tag] = { tag, count: 0, totalEngagement: 0, posts: [] };
            }
            hashtagStats[tag].count += 1;
            hashtagStats[tag].totalEngagement += engagement;
            hashtagStats[tag].posts.push(post.id);
        });
    });

    // Calculate average engagement and sort
    const hashtagArray = Object.values(hashtagStats).map(stat => ({
        ...stat,
        avgEngagement: stat.count > 0 ? stat.totalEngagement / stat.count : 0
    }));

    return hashtagArray.sort((a, b) => b.avgEngagement - a.avgEngagement);
};
