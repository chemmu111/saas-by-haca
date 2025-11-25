/**
 * Report Generation Service
 * Generates reports from posts and client data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fetchInstagramAnalytics } from './instagramInsightsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

export async function generateReport(userId, posts, clients, options = {}) {
  const { startDate, endDate, format = 'json' } = options;

  // Fetch Instagram analytics for all clients with Instagram accounts
  const instagramAnalytics = {};
  for (const client of clients) {
    if (client.igUserId && client.pageAccessToken) {
      try {
        const igData = await fetchInstagramAnalytics(
          client.igUserId,
          client.pageAccessToken,
          client,
          { forceRefresh: false }
        );
        if (igData?.success && igData?.data) {
          instagramAnalytics[client._id.toString()] = igData.data;
        }
      } catch (error) {
        console.error(`Error fetching Instagram analytics for client ${client._id}:`, error.message);
      }
    }
  }

  // Calculate statistics
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.status === 'published').length;
  const scheduledPosts = posts.filter(p => p.status === 'scheduled').length;
  const draftPosts = posts.filter(p => p.status === 'draft').length;
  const failedPosts = posts.filter(p => p.status === 'failed').length;

  // Posts by platform
  const postsByPlatform = {
    instagram: posts.filter(p => p.platform === 'instagram' || p.platform === 'both').length,
    facebook: posts.filter(p => p.platform === 'facebook' || p.platform === 'both').length,
  };

  // Posts by type (from database)
  const postsByType = {
    post: posts.filter(p => p.postType === 'post').length,
    story: posts.filter(p => p.postType === 'story').length,
    reel: posts.filter(p => p.postType === 'reel').length,
  };

  // Aggregate Instagram analytics data
  let totalInstagramPosts = 0;
  let totalInstagramViews = 0;
  let totalInstagramEngagements = 0;
  let totalInstagramLikes = 0;
  let totalInstagramComments = 0;
  let totalInstagramShares = 0;
  let totalInstagramSaves = 0;
  let totalInstagramReach = 0;
  let totalInstagramFollowers = 0;
  let totalInstagramWatchTime = 0;
  let avgInstagramWatchTime = 0;
  let totalFollowerGrowth = 0;
  let totalVideoCount = 0;
  let totalVideoViews = 0;
  let totalVideoEngagements = 0;
  const instagramPostsByType = {
    IMAGE: 0,
    VIDEO: 0,
    CAROUSEL_ALBUM: 0,
    REELS: 0,
    STORY: 0
  };

  // Aggregate analytics from all clients
  Object.values(instagramAnalytics).forEach(analytics => {
    if (analytics.media) {
      totalInstagramPosts += analytics.media.total || 0;
      totalInstagramViews += analytics.media.totalViews || 0;
      totalInstagramEngagements += analytics.media.totalEngagements || 0;
      totalInstagramLikes += analytics.media.totalLikes || 0;
      totalInstagramComments += analytics.media.totalComments || 0;
      totalInstagramShares += analytics.media.totalShares || 0;
      totalInstagramSaves += analytics.media.totalSaves || 0;
      totalInstagramReach += analytics.media.totalReach || 0;
      totalInstagramWatchTime += analytics.media.totalWatchTime || 0;
      
      if (analytics.media.postsByType) {
        Object.keys(instagramPostsByType).forEach(type => {
          instagramPostsByType[type] += analytics.media.postsByType[type] || 0;
        });
      }

      // Count videos
      if (analytics.media.postsByType?.VIDEO) {
        totalVideoCount += analytics.media.postsByType.VIDEO;
      }
      
      // Calculate video views and engagements from allPosts
      if (analytics.allPosts) {
        analytics.allPosts.forEach(post => {
          if (post.media_type === 'VIDEO') {
            totalVideoViews += post.metrics?.views || 0;
            totalVideoEngagements += post.metrics?.engagement || 0;
          }
        });
      }
    }
    
    if (analytics.account) {
      totalInstagramFollowers += analytics.account.follower_count || 0;
    }
    
    if (analytics.followerGrowth !== undefined) {
      totalFollowerGrowth += analytics.followerGrowth || 0;
    }
  });

  // Calculate average watch time
  const watchTimeCount = Object.values(instagramAnalytics).filter(a => a.media?.avgWatchTime > 0).length;
  if (watchTimeCount > 0) {
    const watchTimeSum = Object.values(instagramAnalytics).reduce((sum, a) => sum + (a.media?.avgWatchTime || 0), 0);
    avgInstagramWatchTime = watchTimeSum / watchTimeCount;
  }

  // Calculate real engagement metrics from posts
  const getEngagementMetrics = (post) => {
    const engagement = post.engagement || {};
    return {
      likes: engagement.likes || 0,
      comments: engagement.comments || 0,
      shares: engagement.shares || 0,
      saves: engagement.saves || 0,
      views: engagement.views || 0,
      reach: engagement.reach || 0,
      interactions: engagement.interactions || 0,
      watchTime: engagement.watchTime || 0,
      impressions: engagement.impressions || 0,
      engagements: (engagement.likes || 0) + (engagement.comments || 0) + (engagement.shares || 0) + (engagement.saves || 0)
    };
  };

  // Calculate total engagement metrics
  let totalEngagements = 0;
  let totalViews = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;
  let totalReach = 0;
  let totalInteractions = 0;
  let totalWatchTime = 0;
  let totalImpressions = 0;

  posts.forEach(post => {
    const metrics = getEngagementMetrics(post);
    totalEngagements += metrics.engagements;
    totalViews += metrics.views;
    totalLikes += metrics.likes;
    totalComments += metrics.comments;
    totalShares += metrics.shares;
    totalSaves += metrics.saves;
    totalReach += metrics.reach;
    totalInteractions += metrics.interactions;
    totalWatchTime += metrics.watchTime;
    totalImpressions += metrics.impressions;
  });

  // Calculate total followers from clients (use Instagram API data if available, otherwise fallback to client.followerCount)
  const totalFollowers = totalInstagramFollowers > 0 ? totalInstagramFollowers : clients.reduce((sum, client) => {
    return sum + (client.followerCount || 0);
  }, 0);

  // Use Instagram analytics data if available, otherwise use database data
  const finalTotalViews = totalInstagramViews > 0 ? totalInstagramViews : totalViews;
  const finalTotalEngagements = totalInstagramEngagements > 0 ? totalInstagramEngagements : totalEngagements;
  const finalTotalLikes = totalInstagramLikes > 0 ? totalInstagramLikes : totalLikes;
  const finalTotalComments = totalInstagramComments > 0 ? totalInstagramComments : totalComments;
  const finalTotalShares = totalInstagramShares > 0 ? totalInstagramShares : totalShares;
  const finalTotalSaves = totalInstagramSaves > 0 ? totalInstagramSaves : totalSaves;
  const finalTotalReach = totalInstagramReach > 0 ? totalInstagramReach : totalReach;

  // Calculate engagement rate
  const engagementRate = finalTotalViews > 0 ? ((finalTotalEngagements / finalTotalViews) * 100).toFixed(2) : 
                        (totalFollowers > 0 ? ((finalTotalEngagements / totalFollowers) * 100).toFixed(2) : '0.00');

  // Client breakdown - handle cases where client might be null or not populated
  const clientBreakdown = clients.map(client => {
    const clientPosts = posts.filter(p => {
      if (!p.client) return false;
      // Handle both populated and non-populated client references
      const clientId = p.client._id ? p.client._id.toString() : p.client.toString();
      return clientId === client._id.toString();
    });

    // Get Instagram analytics for this client
    const clientAnalytics = instagramAnalytics[client._id.toString()];
    const clientIgData = clientAnalytics || null;

    // Calculate client-specific engagement metrics from database
    let clientEngagements = 0;
    let clientViews = 0;
    let clientLikes = 0;
    let clientComments = 0;
    let clientShares = 0;
    let clientSaves = 0;
    let clientReach = 0;
    let clientWatchTime = 0;

    clientPosts.forEach(post => {
      const metrics = getEngagementMetrics(post);
      clientEngagements += metrics.engagements;
      clientViews += metrics.views;
      clientLikes += metrics.likes;
      clientComments += metrics.comments;
      clientShares += metrics.shares;
      clientSaves += metrics.saves;
      clientReach += metrics.reach;
      clientWatchTime += metrics.watchTime;
    });

    // Use Instagram analytics if available, otherwise use database metrics
    const finalClientViews = clientIgData?.media?.totalViews || clientViews;
    const finalClientEngagements = clientIgData?.media?.totalEngagements || clientEngagements;
    const finalClientLikes = clientIgData?.media?.totalLikes || clientLikes;
    const finalClientComments = clientIgData?.media?.totalComments || clientComments;
    const finalClientShares = clientIgData?.media?.totalShares || clientShares;
    const finalClientSaves = clientIgData?.media?.totalSaves || clientSaves;
    const finalClientReach = clientIgData?.media?.totalReach || clientReach;
    const finalClientWatchTime = clientIgData?.media?.totalWatchTime || clientWatchTime;
    const finalClientFollowers = clientIgData?.account?.follower_count || client.followerCount || 0;
    const finalClientFollowerGrowth = clientIgData?.followerGrowth || 0;

    const clientEngagementRate = finalClientViews > 0 ? ((finalClientEngagements / finalClientViews) * 100).toFixed(2) : 
                                 (finalClientFollowers > 0 ? ((finalClientEngagements / finalClientFollowers) * 100).toFixed(2) : '0.00');

    // Get posts by type from Instagram analytics
    const clientPostsByType = clientIgData?.media?.postsByType || {};

    return {
      clientId: client._id,
      clientName: client.name || 'Unknown Client',
      platform: client.platform || 'unknown',
      totalPosts: clientPosts.length || 0,
      publishedPosts: clientPosts.filter(p => p.status === 'published').length || 0,
      scheduledPosts: clientPosts.filter(p => p.status === 'scheduled').length || 0,
      draftPosts: clientPosts.filter(p => p.status === 'draft').length || 0,
      followerCount: finalClientFollowers,
      followerGrowth: finalClientFollowerGrowth,
      engagementMetrics: {
        totalEngagements: finalClientEngagements,
        totalViews: finalClientViews,
        totalLikes: finalClientLikes,
        totalComments: finalClientComments,
        totalShares: finalClientShares,
        totalSaves: finalClientSaves,
        totalReach: finalClientReach,
        totalWatchTime: finalClientWatchTime,
        avgWatchTime: clientIgData?.media?.avgWatchTime || 0,
        engagementRate: clientEngagementRate
      },
      postsByType: {
        IMAGE: clientPostsByType.IMAGE || 0,
        VIDEO: clientPostsByType.VIDEO || 0,
        CAROUSEL_ALBUM: clientPostsByType.CAROUSEL_ALBUM || 0,
        REELS: clientPostsByType.REELS || 0,
        STORY: clientPostsByType.STORY || 0
      },
      topPosts: clientIgData?.recentPosts?.slice(0, 5) || []
    };
  });

  // Monthly breakdown
  const monthlyBreakdown = getMonthlyBreakdown(posts, startDate, endDate);

  // Find top performing post
  let topPost = null;
  let maxEngagement = 0;
  posts.forEach(post => {
    const metrics = getEngagementMetrics(post);
    const engagement = metrics.engagements + metrics.views;
    if (engagement > maxEngagement) {
      maxEngagement = engagement;
      topPost = post;
    }
  });

  // Also check Instagram analytics for top posts
  Object.values(instagramAnalytics).forEach(analytics => {
    if (analytics.recentPosts) {
      analytics.recentPosts.forEach(post => {
        const engagement = (post.metrics?.engagement || 0) + (post.metrics?.views || 0);
        if (engagement > maxEngagement) {
          maxEngagement = engagement;
          topPost = {
            _id: post.id,
            caption: post.caption || '',
            mediaUrls: post.thumbnail_url ? [post.thumbnail_url] : [],
            platform: 'instagram',
            postType: post.media_type?.toLowerCase() || 'post',
            engagement: {
              likes: post.metrics?.likes || 0,
              comments: post.metrics?.comments || 0,
              shares: post.metrics?.shares || 0,
              saves: post.metrics?.saved || 0,
              views: post.metrics?.views || 0,
              reach: post.metrics?.reach || 0,
              engagements: post.metrics?.engagement || 0
            },
            createdAt: post.timestamp ? new Date(post.timestamp) : new Date()
          };
        }
      });
    }
  });

  // Generate report object with real analytics data
  const report = {
    generatedAt: new Date().toISOString(),
    period: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    summary: {
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts,
      failedPosts,
      successRate: totalPosts > 0 ? ((publishedPosts / totalPosts) * 100).toFixed(2) + '%' : '0%',
      // Real analytics metrics (prefer Instagram API data)
      totalEngagements: finalTotalEngagements,
      totalViews: finalTotalViews,
      totalLikes: finalTotalLikes,
      totalComments: finalTotalComments,
      totalShares: finalTotalShares,
      totalSaves: finalTotalSaves,
      totalReach: finalTotalReach,
      totalInteractions,
      totalWatchTime: totalInstagramWatchTime > 0 ? totalInstagramWatchTime : totalWatchTime,
      avgWatchTime: avgInstagramWatchTime,
      totalImpressions,
      totalFollowers,
      engagementRate: engagementRate + '%',
      // Instagram-specific analytics
      totalInstagramPosts,
      totalFollowerGrowth,
      totalFollowersGained: totalFollowerGrowth > 0 ? totalFollowerGrowth : 0,
      totalFollowersLost: totalFollowerGrowth < 0 ? Math.abs(totalFollowerGrowth) : 0,
      // Video analytics
      totalVideoCount,
      totalVideoViews,
      totalVideoEngagements,
    },
    breakdown: {
      byPlatform: postsByPlatform,
      byType: {
        ...postsByType,
        // Include Instagram media types
        IMAGE: instagramPostsByType.IMAGE,
        VIDEO: instagramPostsByType.VIDEO,
        CAROUSEL_ALBUM: instagramPostsByType.CAROUSEL_ALBUM,
        REELS: instagramPostsByType.REELS,
        STORY: instagramPostsByType.STORY
      },
      byClient: clientBreakdown,
      byMonth: monthlyBreakdown,
    },
    topClients: clientBreakdown
      .sort((a, b) => b.totalPosts - a.totalPosts)
      .slice(0, 5),
    topPost: topPost ? {
      id: topPost._id,
      caption: topPost.caption || topPost.content || '',
      mediaUrls: topPost.mediaUrls || [],
      platform: topPost.platform || 'instagram',
      postType: topPost.postType || 'post',
      clientName: topPost.client ? (topPost.client.name || 'Unknown') : 'Unknown',
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
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
      .slice(0, 10)
      .map(p => {
        const metrics = getEngagementMetrics(p);
        return {
          id: p._id,
          caption: (p.caption || p.content || '').substring(0, 100),
          status: p.status || 'draft',
          platform: p.platform || 'instagram',
          postType: p.postType || 'post',
          createdAt: p.createdAt || p.created_at,
          clientName: p.client ? (p.client.name || 'Unknown Client') : 'Unknown Client',
          engagement: metrics,
        };
      }),
    // Include raw Instagram analytics for detailed analysis
    instagramAnalytics: Object.keys(instagramAnalytics).length > 0 ? instagramAnalytics : null
  };

  return report;
}

function getMonthlyBreakdown(posts, startDate, endDate) {
  const monthly = {};

  posts.forEach(post => {
    const date = new Date(post.createdAt);
    const monthKey = date.toISOString().slice(0, 7); // YYYY-MM

    if (!monthly[monthKey]) {
      monthly[monthKey] = {
        month: monthKey,
        total: 0,
        published: 0,
        scheduled: 0,
        draft: 0,
      };
    }

    monthly[monthKey].total++;
    if (post.status === 'published') monthly[monthKey].published++;
    if (post.status === 'scheduled') monthly[monthKey].scheduled++;
    if (post.status === 'draft') monthly[monthKey].draft++;
  });

  return Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Generate report using HTML template
 */
export async function generateReportWithTemplate(userId, posts, clients, options = {}) {
  const { startDate, endDate, templateName, format = 'html' } = options;

  // Generate base report data
  const report = await generateReport(userId, posts, clients, { startDate, endDate, format });

  if (!templateName) {
    return report;
  }

  // Load template file
  const templatePath = path.join(templatesDir, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders with real data
  let html = templateContent;

  // Replace common placeholders
  html = html.replace(/\{\{totalPosts\}\}/g, report.summary.totalPosts || 0);
  html = html.replace(/\{\{publishedPosts\}\}/g, report.summary.publishedPosts || 0);
  html = html.replace(/\{\{scheduledPosts\}\}/g, report.summary.scheduledPosts || 0);
  html = html.replace(/\{\{draftPosts\}\}/g, report.summary.draftPosts || 0);
  html = html.replace(/\{\{successRate\}\}/g, report.summary.successRate || '0%');
  html = html.replace(/\{\{instagramPosts\}\}/g, report.breakdown.byPlatform.instagram || 0);
  html = html.replace(/\{\{facebookPosts\}\}/g, report.breakdown.byPlatform.facebook || 0);
  html = html.replace(/\{\{postTypePosts\}\}/g, report.breakdown.byType.post || 0);
  html = html.replace(/\{\{storyTypePosts\}\}/g, report.breakdown.byType.story || 0);
  html = html.replace(/\{\{reelTypePosts\}\}/g, report.breakdown.byType.reel || 0);
  // Real analytics data placeholders
  html = html.replace(/\{\{startDate\}\}/g, startDate ? new Date(startDate).toLocaleDateString() : 'All Time');
  html = html.replace(/\{\{endDate\}\}/g, endDate ? new Date(endDate).toLocaleDateString() : 'All Time');
  html = html.replace(/\{\{generatedAt\}\}/g, new Date(report.generatedAt).toLocaleString());
  // Engagement metrics
  html = html.replace(/\{\{totalEngagements\}\}/g, report.summary.totalEngagements || 0);
  html = html.replace(/\{\{totalViews\}\}/g, report.summary.totalViews || 0);
  html = html.replace(/\{\{totalLikes\}\}/g, report.summary.totalLikes || 0);
  html = html.replace(/\{\{totalComments\}\}/g, report.summary.totalComments || 0);
  html = html.replace(/\{\{totalShares\}\}/g, report.summary.totalShares || 0);
  html = html.replace(/\{\{totalSaves\}\}/g, report.summary.totalSaves || 0);
  html = html.replace(/\{\{totalReach\}\}/g, report.summary.totalReach || 0);
  html = html.replace(/\{\{totalFollowers\}\}/g, report.summary.totalFollowers || 0);
  html = html.replace(/\{\{engagementRate\}\}/g, report.summary.engagementRate || '0%');
  // Video analytics
  html = html.replace(/\{\{totalVideoCount\}\}/g, report.summary.totalVideoCount || 0);
  html = html.replace(/\{\{totalVideoViews\}\}/g, report.summary.totalVideoViews || 0);
  html = html.replace(/\{\{totalVideoEngagements\}\}/g, report.summary.totalVideoEngagements || 0);
  // Watch time
  html = html.replace(/\{\{totalWatchTime\}\}/g, report.summary.totalWatchTime ? `${(report.summary.totalWatchTime / 60).toFixed(2)} min` : '0');
  html = html.replace(/\{\{avgWatchTime\}\}/g, report.summary.avgWatchTime ? `${(report.summary.avgWatchTime / 60).toFixed(2)} min` : '0');
  // Follower growth
  html = html.replace(/\{\{totalFollowersGained\}\}/g, report.summary.totalFollowersGained || 0);
  html = html.replace(/\{\{totalFollowersLost\}\}/g, report.summary.totalFollowersLost || 0);
  html = html.replace(/\{\{followerGrowth\}\}/g, (report.summary.totalFollowersGained || 0) - (report.summary.totalFollowersLost || 0));

  // Replace client data
  if (clients.length > 0) {
    const client = clients[0];
    html = html.replace(/\{\{clientName\}\}/g, client.name || 'Client');
    html = html.replace(/\{\{clientEmail\}\}/g, client.email || '');
  }

  // Replace top clients list
  const topClientsHtml = report.topClients.map((client, index) =>
    `<li>${index + 1}. ${client.clientName}: ${client.totalPosts} posts (${client.publishedPosts} published)</li>`
  ).join('');
  html = html.replace(/\{\{topClients\}\}/g, topClientsHtml || '<li>No clients</li>');

  // Replace recent posts list
  const recentPostsHtml = report.recentPosts.map(post =>
    `<li>${post.caption || 'No caption'} - ${post.status} (${post.platform})</li>`
  ).join('');
  html = html.replace(/\{\{recentPosts\}\}/g, recentPostsHtml || '<li>No posts</li>');

  return {
    ...report,
    html: html
  };
}

/**
 * Generate PDF from template using pdf-lib
 */
export async function generatePDFFromTemplate(userId, posts, clients, options = {}) {
  const { startDate, endDate, templateName } = options;

  if (!templateName) {
    throw new Error('Template name is required for PDF generation');
  }

  // Load template file
  const templatePath = path.join(templatesDir, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  // Check if template is PDF
  const ext = path.extname(templateName).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error('PDF template must be a PDF file');
  }

  // Load PDF template
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Get pages
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('Template PDF has no pages');
  }

  // Generate report data
  const report = await generateReport(userId, posts, clients, { startDate, endDate });

  // Fill form fields if template has form fields
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  // Try to fill common form fields with real analytics data
  const fieldMap = {
    'totalPosts': report.summary.totalPosts || 0,
    'publishedPosts': report.summary.publishedPosts || 0,
    'scheduledPosts': report.summary.scheduledPosts || 0,
    'successRate': report.summary.successRate || '0%',
    'instagramPosts': report.breakdown.byPlatform.instagram || 0,
    'facebookPosts': report.breakdown.byPlatform.facebook || 0,
    // Real analytics data
    'totalEngagements': report.summary.totalEngagements || 0,
    'totalViews': report.summary.totalViews || 0,
    'totalLikes': report.summary.totalLikes || 0,
    'totalComments': report.summary.totalComments || 0,
    'totalShares': report.summary.totalShares || 0,
    'totalSaves': report.summary.totalSaves || 0,
    'totalReach': report.summary.totalReach || 0,
    'totalInteractions': report.summary.totalInteractions || 0,
    'totalWatchTime': report.summary.totalWatchTime || 0,
    'avgWatchTime': report.summary.avgWatchTime || 0,
    'totalFollowers': report.summary.totalFollowers || 0,
    'engagementRate': report.summary.engagementRate || '0.00%',
    // Video analytics
    'totalVideoCount': report.summary.totalVideoCount || 0,
    'totalVideoViews': report.summary.totalVideoViews || 0,
    'totalVideoEngagements': report.summary.totalVideoEngagements || 0,
    // Follower growth
    'totalFollowersGained': report.summary.totalFollowersGained || 0,
    'totalFollowersLost': report.summary.totalFollowersLost || 0,
    'followerGrowth': (report.summary.totalFollowersGained || 0) - (report.summary.totalFollowersLost || 0),
  };

  fields.forEach(field => {
    const fieldName = field.getName();
    const value = fieldMap[fieldName];
    if (value !== undefined) {
      try {
        if (field.constructor.name === 'PDFTextField') {
          field.setText(String(value));
        }
      } catch (error) {
        // Field might not be a text field, skip
        console.log(`Could not fill field ${fieldName}:`, error.message);
      }
    }
  });

  // Flatten form to prevent editing
  form.flatten();

  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
}

/**
 * Generate a simple PDF report (no template required)
 */
export async function generateSimplePDFReport(report, options = {}) {
  const { title = 'Social Media Report', subtitle = '' } = options;

  const pdfDoc = await PDFDocument.create();
  const pageSize = [612, 792]; // Letter
  let page = pdfDoc.addPage(pageSize);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = height - 50;
  const lineHeight = 16;

  const addLine = (text, opts = {}) => {
    if (cursorY < 60) {
      page = pdfDoc.addPage(pageSize);
      cursorY = height - 50;
    }
    page.drawText(String(text), {
      x: opts.x || 50,
      y: cursorY,
      size: opts.size || 12,
      font: opts.bold ? boldFont : font,
      color: opts.color || rgb(0, 0, 0)
    });
    cursorY -= opts.spacing || lineHeight;
  };

  addLine(title, { size: 20, bold: true });
  if (subtitle) {
    addLine(subtitle, { size: 14, color: rgb(0.3, 0.3, 0.3) });
  }
  addLine(`Generated: ${new Date(report.generatedAt || Date.now()).toLocaleString()}`, {
    size: 10,
    color: rgb(0.4, 0.4, 0.4),
    spacing: 24
  });

  addLine('Summary', { bold: true, spacing: 20 });
  const summary = report.summary || {};
  const summaryEntries = [
    ['Total Posts', summary.totalPosts || 0],
    ['Published Posts', summary.publishedPosts || 0],
    ['Scheduled Posts', summary.scheduledPosts || 0],
    ['Draft Posts', summary.draftPosts || 0],
    ['Success Rate', summary.successRate || '0%'],
    ['', ''],
    ['--- Engagement Metrics ---', ''],
    ['Total Engagements', summary.totalEngagements || 0],
    ['Total Views', summary.totalViews || 0],
    ['Total Likes', summary.totalLikes || 0],
    ['Total Comments', summary.totalComments || 0],
    ['Total Shares', summary.totalShares || 0],
    ['Total Saves', summary.totalSaves || 0],
    ['Total Reach', summary.totalReach || 0],
    ['Total Followers', summary.totalFollowers || 0],
    ['Engagement Rate', summary.engagementRate || '0%'],
    ['', ''],
    ['--- Video Analytics ---', ''],
    ['Total Videos', summary.totalVideoCount || 0],
    ['Total Video Views', summary.totalVideoViews || 0],
    ['Total Video Engagements', summary.totalVideoEngagements || 0],
    ['', ''],
    ['--- Watch Time ---', ''],
    ['Total Watch Time', summary.totalWatchTime ? `${(summary.totalWatchTime / 60).toFixed(2)} minutes` : '0'],
    ['Average Watch Time', summary.avgWatchTime ? `${(summary.avgWatchTime / 60).toFixed(2)} minutes` : '0'],
    ['', ''],
    ['--- Follower Growth ---', ''],
    ['Followers Gained', summary.totalFollowersGained || 0],
    ['Followers Lost', summary.totalFollowersLost || 0],
    ['Net Growth', (summary.totalFollowersGained || 0) - (summary.totalFollowersLost || 0)]
  ];
  summaryEntries.forEach(([label, value]) => {
    if (label === '' && value === '') {
      addLine('', { spacing: 5 });
    } else if (label.startsWith('---')) {
      addLine(label, { bold: true, spacing: 10 });
    } else {
      addLine(`${label}: ${value}`);
    }
  });

  const breakdown = report.breakdown || {};
  if (breakdown.byPlatform) {
    addLine('', { spacing: 10 });
    addLine('Platform Breakdown', { bold: true, spacing: 20 });
    Object.entries(breakdown.byPlatform).forEach(([platform, count]) => {
      addLine(`${platform}: ${count}`);
    });
  }

  if (breakdown.byType) {
    addLine('', { spacing: 10 });
    addLine('Content Type Breakdown', { bold: true, spacing: 20 });
    const typeLabels = {
      post: 'Posts',
      story: 'Stories',
      reel: 'Reels',
      IMAGE: 'Images',
      VIDEO: 'Videos',
      CAROUSEL_ALBUM: 'Carousels',
      REELS: 'Reels (IG)',
      STORY: 'Stories (IG)'
    };
    Object.entries(breakdown.byType).forEach(([type, count]) => {
      if (count > 0) {
        const label = typeLabels[type] || type;
        addLine(`${label}: ${count}`);
      }
    });
  }

  if (report.topClients && report.topClients.length > 0) {
    addLine('', { spacing: 10 });
    addLine('Top Clients', { bold: true, spacing: 20 });
    report.topClients.slice(0, 5).forEach((client, index) => {
      addLine(`${index + 1}. ${client.clientName}`, { bold: true });
      addLine(`   Posts: ${client.totalPosts} (${client.publishedPosts} published)`, { x: 60 });
      if (client.engagementMetrics) {
        addLine(`   Views: ${client.engagementMetrics.totalViews || 0}`, { x: 60 });
        addLine(`   Engagements: ${client.engagementMetrics.totalEngagements || 0}`, { x: 60 });
        addLine(`   Followers: ${client.followerCount || 0}`, { x: 60 });
        if (client.followerGrowth !== undefined) {
          addLine(`   Follower Growth: ${client.followerGrowth > 0 ? '+' : ''}${client.followerGrowth}`, { x: 60 });
        }
      }
    });
  }

  if (report.topPost) {
    addLine('', { spacing: 10 });
    addLine('Top Performing Post', { bold: true, spacing: 20 });
    const top = report.topPost;
    addLine(`Caption: ${(top.caption || '').substring(0, 80)}${top.caption && top.caption.length > 80 ? '...' : ''}`);
    addLine(`Platform: ${top.platform || 'instagram'} | Type: ${top.postType || 'post'}`);
    if (top.engagement) {
      addLine(`Views: ${top.engagement.views || 0} | Likes: ${top.engagement.likes || 0} | Comments: ${top.engagement.comments || 0}`);
      addLine(`Engagements: ${top.engagement.engagements || 0}`);
    }
  }

  if (report.recentPosts && report.recentPosts.length > 0) {
    addLine('', { spacing: 10 });
    addLine('Recent Posts', { bold: true, spacing: 20 });
    report.recentPosts.slice(0, 5).forEach((post) => {
      const createdAt = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date';
      addLine(`• ${createdAt} - ${post.status || 'status'} (${post.platform || 'platform'})`);
      if (post.engagement) {
        addLine(`  Views: ${post.engagement.views || 0} | Engagements: ${post.engagement.engagements || 0}`, { x: 60 });
      }
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

