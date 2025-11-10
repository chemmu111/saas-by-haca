/**
 * Report Generation Service
 * Generates reports from posts and client data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

export async function generateReport(userId, posts, clients, options = {}) {
  const { startDate, endDate, format = 'json' } = options;
  
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
  
  // Posts by type
  const postsByType = {
    post: posts.filter(p => p.postType === 'post').length,
    story: posts.filter(p => p.postType === 'story').length,
    reel: posts.filter(p => p.postType === 'reel').length,
  };
  
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
    totalImpressions += metrics.impressions;
  });
  
  // Calculate total followers from clients
  const totalFollowers = clients.reduce((sum, client) => {
    return sum + (client.followerCount || 0);
  }, 0);
  
  // Calculate engagement rate
  const engagementRate = totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(2) : '0.00';
  
  // Client breakdown - handle cases where client might be null or not populated
  const clientBreakdown = clients.map(client => {
    const clientPosts = posts.filter(p => {
      if (!p.client) return false;
      // Handle both populated and non-populated client references
      const clientId = p.client._id ? p.client._id.toString() : p.client.toString();
      return clientId === client._id.toString();
    });
    
    // Calculate client-specific engagement metrics
    let clientEngagements = 0;
    let clientViews = 0;
    let clientLikes = 0;
    let clientComments = 0;
    let clientShares = 0;
    let clientSaves = 0;
    
    clientPosts.forEach(post => {
      const metrics = getEngagementMetrics(post);
      clientEngagements += metrics.engagements;
      clientViews += metrics.views;
      clientLikes += metrics.likes;
      clientComments += metrics.comments;
      clientShares += metrics.shares;
      clientSaves += metrics.saves;
    });
    
    const clientEngagementRate = clientViews > 0 ? ((clientEngagements / clientViews) * 100).toFixed(2) : '0.00';
    
    return {
      clientId: client._id,
      clientName: client.name || 'Unknown Client',
      platform: client.platform || 'unknown',
      totalPosts: clientPosts.length || 0,
      publishedPosts: clientPosts.filter(p => p.status === 'published').length || 0,
      scheduledPosts: clientPosts.filter(p => p.status === 'scheduled').length || 0,
      draftPosts: clientPosts.filter(p => p.status === 'draft').length || 0,
      followerCount: client.followerCount || 0,
      engagementMetrics: {
        totalEngagements: clientEngagements,
        totalViews: clientViews,
        totalLikes: clientLikes,
        totalComments: clientComments,
        totalShares: clientShares,
        totalSaves: clientSaves,
        engagementRate: clientEngagementRate
      }
    };
  });
  
  // Monthly breakdown
  const monthlyBreakdown = getMonthlyBreakdown(posts, startDate, endDate);
  
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
      // Real analytics metrics
      totalEngagements,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalSaves,
      totalReach,
      totalImpressions,
      totalFollowers,
      engagementRate: engagementRate + '%',
    },
    breakdown: {
      byPlatform: postsByPlatform,
      byType: postsByType,
      byClient: clientBreakdown,
      byMonth: monthlyBreakdown,
    },
    topClients: clientBreakdown
      .sort((a, b) => b.totalPosts - a.totalPosts)
      .slice(0, 5),
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
  html = html.replace(/\{\{totalEngagements\}\}/g, report.summary.totalEngagements || 0);
  html = html.replace(/\{\{totalViews\}\}/g, report.summary.totalViews || 0);
  html = html.replace(/\{\{totalLikes\}\}/g, report.summary.totalLikes || 0);
  html = html.replace(/\{\{totalComments\}\}/g, report.summary.totalComments || 0);
  html = html.replace(/\{\{totalShares\}\}/g, report.summary.totalShares || 0);
  html = html.replace(/\{\{totalSaves\}\}/g, report.summary.totalSaves || 0);
  html = html.replace(/\{\{totalFollowers\}\}/g, report.summary.totalFollowers || 0);
  html = html.replace(/\{\{engagementRate\}\}/g, report.summary.engagementRate || '0.00%');
  html = html.replace(/\{\{startDate\}\}/g, startDate ? new Date(startDate).toLocaleDateString() : 'All Time');
  html = html.replace(/\{\{endDate\}\}/g, endDate ? new Date(endDate).toLocaleDateString() : 'All Time');
  html = html.replace(/\{\{generatedAt\}\}/g, new Date(report.generatedAt).toLocaleString());
  
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
    'totalFollowers': report.summary.totalFollowers || 0,
    'engagementRate': report.summary.engagementRate || '0.00%',
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

