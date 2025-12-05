/**
 * Report Generation Service
 * Generates reports from posts and client data
 * Updated to support Enterprise Reporting Structure (10 Sections)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import { generateReportData } from './reportGeneratorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.join(__dirname, '../templates');

/**
 * Generate report data using the new Enterprise structure
 */
export async function generateReport(userId, posts, clients, options = {}) {
  const { startDate, endDate } = options;

  // The new Enterprise Report structure is designed for a single client.
  // If multiple clients are passed, we generate the report for the first one.
  // This matches the typical use case of "Send to Client" or "Export Client Report".
  if (!clients || clients.length === 0) {
    throw new Error('No client selected for report generation.');
  }

  const client = clients[0];
  console.log(`📊 Generating Enterprise Report for client: ${client.name} (${client._id})`);

  // Use the new centralized report generator service
  const reportData = await generateReportData(client._id, startDate, endDate);

  return reportData;
}

/**
 * Generate report using HTML template
 */
export async function generateReportWithTemplate(userId, posts, clients, options = {}) {
  const { startDate, endDate, templateName, format = 'html' } = options;

  // Generate base report data using the new structure
  const report = await generateReport(userId, posts, clients, { startDate, endDate, format });
  const client = clients[0];

  // Default Enterprise HTML Template
  const defaultTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; color: #1e293b; max-width: 900px; margin: 0 auto; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; padding: 40px 0; border-bottom: 2px solid #f1f5f9; margin-bottom: 40px; }
          .logo-area { display: flex; align-items: center; gap: 15px; }
          .client-avatar { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #f1f5f9; }
          .client-info h1 { margin: 0; font-size: 24px; color: #0f172a; }
          .client-info p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          .report-meta { text-align: right; }
          .report-meta h2 { margin: 0; font-size: 18px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
          .report-meta p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          
          .section { margin-bottom: 50px; page-break-inside: avoid; }
          .section-title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
          .section-title span { color: #3b82f6; }
          
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          
          .metric-card { background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
          .metric-title { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 10px; }
          .metric-value { font-size: 28px; font-weight: 800; color: #0f172a; }
          .metric-sub { font-size: 13px; color: #10b981; margin-top: 5px; font-weight: 500; }
          .metric-sub.negative { color: #ef4444; }
          .metric-sub.neutral { color: #64748b; }

          .highlight-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; }
          .highlight-list { list-style: none; padding: 0; margin: 0; }
          .highlight-list li { position: relative; padding-left: 20px; margin-bottom: 10px; color: #334155; }
          .highlight-list li::before { content: "•"; color: #0ea5e9; font-weight: bold; position: absolute; left: 0; }

          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; padding: 15px; background: #f8fafc; color: #475569; font-weight: 600; border-bottom: 2px solid #e2e8f0; }
          td { padding: 15px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
          tr:last-child td { border-bottom: none; }
          .rank-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
          .rank-top { background: #dcfce7; color: #166534; }
          .rank-avg { background: #f1f5f9; color: #475569; }
          .rank-low { background: #fee2e2; color: #991b1b; }

          .insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .insight-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .insight-panel h4 { margin-top: 0; color: #0f172a; }
          .insight-item { margin-bottom: 15px; }
          .insight-label { font-weight: 700; color: #475569; font-size: 13px; display: block; margin-bottom: 4px; }
          .insight-text { color: #334155; }

          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-area">
            <div class="client-avatar" style="background-image: url('{{clientAvatar}}'); background-size: cover;"></div>
            <div class="client-info">
              <h1>{{clientName}}</h1>
              <p>Social Media Performance Report</p>
            </div>
          </div>
          <div class="report-meta">
            <h2>{{reportMonth}}</h2>
            <p>{{startDate}} - {{endDate}}</p>
          </div>
        </div>

        <!-- 1. EXECUTIVE SUMMARY -->
        <div class="section">
          <div class="section-title"><span>01.</span> Executive Summary</div>
          <div class="grid-4">
            <div class="metric-card">
              <div class="metric-title">Total Followers</div>
              <div class="metric-value">{{totalFollowers}}</div>
              <div class="metric-sub">{{newFollowers}} new</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Total Reach</div>
              <div class="metric-value">{{totalReach}}</div>
              <div class="metric-sub neutral">Unique Accounts</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Engagement Rate</div>
              <div class="metric-value">{{engagementRate}}</div>
              <div class="metric-sub neutral">Per Impression</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Total Engagements</div>
              <div class="metric-value">{{totalEngagements}}</div>
              <div class="metric-sub neutral">Interactions</div>
            </div>
          </div>
          <div style="margin-top: 20px;">
            <div class="highlight-box">
              <h4 style="margin-top: 0; margin-bottom: 15px; color: #0369a1;">✨ Performance Highlights</h4>
              <ul class="highlight-list">
                {{highlightsList}}
              </ul>
            </div>
          </div>
        </div>

        <!-- 2. AUDIENCE & GROWTH -->
        <div class="section">
          <div class="section-title"><span>02.</span> Audience & Growth</div>
          <div class="grid-3">
            <div class="metric-card">
              <div class="metric-title">Net Growth</div>
              <div class="metric-value">{{netGrowth}}</div>
              <div class="metric-sub">{{growthRate}}% growth</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Instagram Followers</div>
              <div class="metric-value">{{igFollowers}}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Facebook Followers</div>
              <div class="metric-value">{{fbFollowers}}</div>
            </div>
          </div>
        </div>

        <!-- 3. REACH & IMPRESSIONS -->
        <div class="section">
          <div class="section-title"><span>03.</span> Reach & Impressions</div>
          <div class="grid-2">
            <div class="metric-card">
              <div class="metric-title">Total Impressions</div>
              <div class="metric-value">{{totalImpressions}}</div>
              <div class="metric-sub neutral">Total Views</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Reach Source</div>
              <div style="margin-top: 10px; font-size: 14px; color: #475569;">
                <div><strong>Reels:</strong> {{reachReels}}</div>
                <div><strong>Profile Visits:</strong> {{reachProfile}}</div>
                <div><strong>Other:</strong> {{reachOther}}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. ENGAGEMENT BREAKDOWN -->
        <div class="section">
          <div class="section-title"><span>04.</span> Engagement Breakdown</div>
          <div class="grid-4">
            <div class="metric-card"><div class="metric-title">Likes</div><div class="metric-value">{{totalLikes}}</div></div>
            <div class="metric-card"><div class="metric-title">Comments</div><div class="metric-value">{{totalComments}}</div></div>
            <div class="metric-card"><div class="metric-title">Shares</div><div class="metric-value">{{totalShares}}</div></div>
            <div class="metric-card"><div class="metric-title">Saves</div><div class="metric-value">{{totalSaves}}</div></div>
          </div>
          <div class="grid-3" style="margin-top: 20px;">
             <div class="metric-card"><div class="metric-title">Save-to-View</div><div class="metric-value" style="font-size: 20px;">{{saveToView}}%</div></div>
             <div class="metric-card"><div class="metric-title">Share-to-View</div><div class="metric-value" style="font-size: 20px;">{{shareToView}}%</div></div>
             <div class="metric-card"><div class="metric-title">Eng. per Reach</div><div class="metric-value" style="font-size: 20px;">{{engPerReach}}%</div></div>
          </div>
        </div>

        <!-- 5. CONTENT PERFORMANCE -->
        <div class="section">
          <div class="section-title"><span>05.</span> Content Performance</div>
          <div class="grid-4">
            <div class="metric-card"><div class="metric-title">Images</div><div class="metric-value">{{cntImages}}</div></div>
            <div class="metric-card"><div class="metric-title">Videos</div><div class="metric-value">{{cntVideos}}</div></div>
            <div class="metric-card"><div class="metric-title">Carousels</div><div class="metric-value">{{cntCarousels}}</div></div>
            <div class="metric-card"><div class="metric-title">Reels</div><div class="metric-value">{{cntReels}}</div></div>
          </div>
          <div style="margin-top: 20px; background: #fff7ed; border: 1px solid #ffedd5; padding: 15px; border-radius: 8px; text-align: center;">
            <span style="color: #c2410c; font-weight: bold;">🔥 Best Posting Time:</span> <span style="color: #9a3412;">{{bestPostingTime}}</span>
          </div>
        </div>

        <!-- 7. VIDEO PERFORMANCE -->
        <div class="section">
          <div class="section-title"><span>07.</span> Video Performance</div>
          <div class="grid-4">
            <div class="metric-card"><div class="metric-title">Total Video Views</div><div class="metric-value">{{totalVideoViews}}</div></div>
            <div class="metric-card"><div class="metric-title">Reel Views</div><div class="metric-value">{{reelViews}}</div></div>
            <div class="metric-card"><div class="metric-title">Avg Watch Time</div><div class="metric-value">{{avgWatchTime}}s</div></div>
            <div class="metric-card"><div class="metric-title">Completion Rate</div><div class="metric-value">{{completionRate}}%</div></div>
          </div>
        </div>

        <!-- 6. POST PERFORMANCE TABLE -->
        <div class="section">
          <div class="section-title"><span>06.</span> Top Posts</div>
          <table>
            <thead>
              <tr>
                <th width="40%">Content</th>
                <th>Type</th>
                <th>Reach</th>
                <th>Eng. Rate</th>
                <th>Ranking</th>
              </tr>
            </thead>
            <tbody>
              {{postRows}}
            </tbody>
          </table>
        </div>

        <!-- 8. TRAFFIC -->
        <div class="section">
          <div class="section-title"><span>08.</span> Traffic & CTA</div>
          <div class="grid-4">
            <div class="metric-card"><div class="metric-title">Website Clicks</div><div class="metric-value">{{websiteClicks}}</div></div>
            <div class="metric-card"><div class="metric-title">Email Clicks</div><div class="metric-value">{{emailClicks}}</div></div>
            <div class="metric-card"><div class="metric-title">Call Clicks</div><div class="metric-value">{{callClicks}}</div></div>
            <div class="metric-card"><div class="metric-title">Directions</div><div class="metric-value">{{directionClicks}}</div></div>
          </div>
        </div>

        <!-- 10. AI INSIGHTS -->
        <div class="section">
          <div class="section-title"><span>10.</span> AI Insights & Recommendations</div>
          <div class="insights-grid">
            <div class="insight-panel">
              <h4>📊 Performance Analysis</h4>
              <div class="insight-item">
                <span class="insight-label">Best Format</span>
                <span class="insight-text">{{aiBestFormat}} performs best for your audience.</span>
              </div>
              <div class="insight-item">
                <span class="insight-label">Growth Driver</span>
                <span class="insight-text">{{aiGrowthDriver}}</span>
              </div>
              <div class="insight-item">
                <span class="insight-label">Weakness</span>
                <span class="insight-text">{{aiWeakness}}</span>
              </div>
            </div>
            <div class="insight-panel">
              <h4>🚀 Strategic Recommendations</h4>
              <div class="insight-item">
                <span class="insight-label">Action</span>
                <span class="insight-text">{{aiAction}}</span>
              </div>
              <div class="insight-item">
                <span class="insight-label">Content Mix</span>
                <span class="insight-text">Try {{aiMix}} for next month.</span>
              </div>
              <div class="insight-item">
                <span class="insight-label">Timing</span>
                <span class="insight-text">Schedule posts around {{aiTiming}} for max engagement.</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          Generated by Haris&Co. Social Media Dashboard • {{generatedAt}}
        </div>
      </body>
      </html>
    `;

  // Use the default template logic below
  let templateContent = defaultTemplate;

  // If custom template is provided, try to load it
  if (templateName) {
    const templatePath = path.join(templatesDir, templateName);
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
    }
  }

  // Replace placeholders with real data
  let html = templateContent;

  // Helper to format numbers
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  // --- Header ---
  html = html.replace(/\{\{clientName\}\}/g, client.name || 'Client Report');
  html = html.replace(/\{\{clientAvatar\}\}/g, client.profilePictureUrl || '');
  html = html.replace(/\{\{reportMonth\}\}/g, new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  html = html.replace(/\{\{startDate\}\}/g, startDate ? new Date(startDate).toLocaleDateString() : 'Start');
  html = html.replace(/\{\{endDate\}\}/g, endDate ? new Date(endDate).toLocaleDateString() : 'End');
  html = html.replace(/\{\{generatedAt\}\}/g, new Date().toLocaleString());

  // --- 1. Executive Summary ---
  const exec = report.executiveSummary;
  html = html.replace(/\{\{totalFollowers\}\}/g, formatNumber(exec.totalFollowers));
  html = html.replace(/\{\{newFollowers\}\}/g, (exec.newFollowers > 0 ? '+' : '') + formatNumber(exec.newFollowers));
  html = html.replace(/\{\{totalReach\}\}/g, formatNumber(exec.totalReach));
  html = html.replace(/\{\{engagementRate\}\}/g, exec.engagementRate + '%');
  html = html.replace(/\{\{totalEngagements\}\}/g, formatNumber(exec.totalEngagements));

  const highlightsHtml = exec.highlights.map(h => `<li>${h}</li>`).join('') || '<li>No significant highlights for this period.</li>';
  html = html.replace(/\{\{highlightsList\}\}/g, highlightsHtml);

  // --- 2. Audience & Growth ---
  const aud = report.audienceGrowth;
  html = html.replace(/\{\{netGrowth\}\}/g, (aud.netGrowth > 0 ? '+' : '') + formatNumber(aud.netGrowth));
  html = html.replace(/\{\{growthRate\}\}/g, aud.growthRate || '0.0');
  html = html.replace(/\{\{igFollowers\}\}/g, formatNumber(aud.platformSplit.instagram));
  html = html.replace(/\{\{fbFollowers\}\}/g, formatNumber(aud.platformSplit.facebook));

  // --- 3. Reach & Impressions ---
  const reach = report.reachImpressions;
  html = html.replace(/\{\{totalImpressions\}\}/g, formatNumber(reach.totalImpressions));
  html = html.replace(/\{\{reachReels\}\}/g, formatNumber(reach.breakdown.reels));
  html = html.replace(/\{\{reachProfile\}\}/g, formatNumber(reach.breakdown.profileVisits));
  html = html.replace(/\{\{reachOther\}\}/g, formatNumber(reach.totalReach - reach.breakdown.reels - reach.breakdown.profileVisits));

  // --- 4. Engagement Breakdown ---
  const eng = report.engagementBreakdown;
  html = html.replace(/\{\{totalLikes\}\}/g, formatNumber(eng.breakdown.likes));
  html = html.replace(/\{\{totalComments\}\}/g, formatNumber(eng.breakdown.comments));
  html = html.replace(/\{\{totalShares\}\}/g, formatNumber(eng.breakdown.shares));
  html = html.replace(/\{\{totalSaves\}\}/g, formatNumber(eng.breakdown.saves));
  html = html.replace(/\{\{saveToView\}\}/g, eng.ratios.saveToView);
  html = html.replace(/\{\{shareToView\}\}/g, eng.ratios.shareToView);
  html = html.replace(/\{\{engPerReach\}\}/g, eng.rates.perReach);

  // --- 5. Content Performance ---
  const cont = report.contentPerformance;
  html = html.replace(/\{\{cntImages\}\}/g, cont.byFormat.image);
  html = html.replace(/\{\{cntVideos\}\}/g, cont.byFormat.video);
  html = html.replace(/\{\{cntCarousels\}\}/g, cont.byFormat.carousel);
  html = html.replace(/\{\{cntReels\}\}/g, cont.byFormat.reel);
  html = html.replace(/\{\{bestPostingTime\}\}/g, cont.bestPostingTime);

  // --- 7. Video Performance ---
  const vid = report.videoPerformance;
  html = html.replace(/\{\{totalVideoViews\}\}/g, formatNumber(vid.totalViews));
  html = html.replace(/\{\{reelViews\}\}/g, formatNumber(vid.split.reels));
  html = html.replace(/\{\{avgWatchTime\}\}/g, vid.avgWatchTime);
  html = html.replace(/\{\{completionRate\}\}/g, vid.completionRate);

  // --- 6. Post Performance Table ---
  const postRows = report.detailedPosts.slice(0, 10).map(post => `
      <tr>
        <td>${post.caption ? post.caption.substring(0, 60) + (post.caption.length > 60 ? '...' : '') : 'No caption'}</td>
        <td style="text-transform: capitalize">${post.type}</td>
        <td>${formatNumber(post.reach)}</td>
        <td>${post.engagementRate}%</td>
        <td><span class="rank-badge ${post.ranking === 'Top Performer' ? 'rank-top' : post.ranking === 'Needs Improvement' ? 'rank-low' : 'rank-avg'}">${post.ranking}</span></td>
      </tr>
    `).join('');
  html = html.replace(/\{\{postRows\}\}/g, postRows || '<tr><td colspan="5" style="text-align: center;">No posts found</td></tr>');

  // --- 8. Traffic ---
  const traf = report.traffic;
  html = html.replace(/\{\{websiteClicks\}\}/g, formatNumber(traf.websiteClicks));
  html = html.replace(/\{\{emailClicks\}\}/g, formatNumber(traf.emailClicks));
  html = html.replace(/\{\{callClicks\}\}/g, formatNumber(traf.callClicks));
  html = html.replace(/\{\{directionClicks\}\}/g, formatNumber(traf.directionClicks));

  // --- 10. AI Insights ---
  const ai = report.insights;
  html = html.replace(/\{\{aiBestFormat\}\}/g, ai.bestFormat);
  html = html.replace(/\{\{aiGrowthDriver\}\}/g, ai.growthCause);
  html = html.replace(/\{\{aiWeakness\}\}/g, ai.weakPattern);
  html = html.replace(/\{\{aiAction\}\}/g, ai.suggestion);
  html = html.replace(/\{\{aiMix\}\}/g, ai.ratio);
  html = html.replace(/\{\{aiTiming\}\}/g, ai.bestTime);

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

  const templatePath = path.join(templatesDir, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const ext = path.extname(templateName).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error('PDF template must be a PDF file');
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error('Template PDF has no pages');
  }

  const report = await generateReport(userId, posts, clients, { startDate, endDate });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  // Map new Enterprise metrics to potential PDF form fields
  // This attempts to support old templates while adding new fields
  const fieldMap = {
    // Executive Summary
    'totalFollowers': report.executiveSummary.totalFollowers,
    'newFollowers': report.executiveSummary.newFollowers,
    'totalReach': report.executiveSummary.totalReach,
    'engagementRate': report.executiveSummary.engagementRate + '%',
    'totalEngagements': report.executiveSummary.totalEngagements,

    // Audience
    'netGrowth': report.audienceGrowth.netGrowth,
    'igFollowers': report.audienceGrowth.platformSplit.instagram,
    'fbFollowers': report.audienceGrowth.platformSplit.facebook,

    // Reach
    'totalImpressions': report.reachImpressions.totalImpressions,

    // Engagement
    'totalLikes': report.engagementBreakdown.breakdown.likes,
    'totalComments': report.engagementBreakdown.breakdown.comments,
    'totalShares': report.engagementBreakdown.breakdown.shares,
    'totalSaves': report.engagementBreakdown.breakdown.saves,

    // Content
    'cntImages': report.contentPerformance.byFormat.image,
    'cntVideos': report.contentPerformance.byFormat.video,
    'cntReels': report.contentPerformance.byFormat.reel,

    // Video
    'totalVideoViews': report.videoPerformance.totalViews,
    'reelViews': report.videoPerformance.split.reels,
    'avgWatchTime': report.videoPerformance.avgWatchTime,

    // Traffic
    'websiteClicks': report.traffic.websiteClicks,
    'emailClicks': report.traffic.emailClicks,

    // Legacy support (mapping new values to old keys where possible)
    'totalPosts': report.detailedPosts.length,
    'successRate': '100%',
    'totalInteractions': report.executiveSummary.totalEngagements,
    'totalWatchTime': report.videoPerformance.totalViews * report.videoPerformance.avgWatchTime, // Approx
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
        console.log(`Could not fill field ${fieldName}:`, error.message);
      }
    }
  });

  form.flatten();
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Generate PDF from HTML content using Puppeteer
 */
export async function generatePDFFromHTML(htmlContent) {
  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Puppeteer launched, creating new page...');
    const page = await browser.newPage();

    console.log('Setting page content...');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    console.log('PDF generated successfully');

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate text report
 */
export async function generateTextReport(userId, posts, clients, options = {}) {
  const { startDate, endDate } = options;
  const report = await generateReport(userId, posts, clients, { startDate, endDate });

  let text = `ENTERPRISE SOCIAL MEDIA REPORT\n`;
  text += `==============================\n\n`;
  text += `Period: ${startDate ? new Date(startDate).toLocaleDateString() : 'All Time'} to ${endDate ? new Date(endDate).toLocaleDateString() : 'All Time'}\n`;
  text += `Generated: ${new Date().toLocaleString()}\n\n`;

  text += `1. EXECUTIVE SUMMARY\n`;
  text += `--------------------\n`;
  text += `Total Followers:  ${report.executiveSummary.totalFollowers} (${report.executiveSummary.newFollowers > 0 ? '+' : ''}${report.executiveSummary.newFollowers})\n`;
  text += `Total Reach:      ${report.executiveSummary.totalReach}\n`;
  text += `Engagement Rate:  ${report.executiveSummary.engagementRate}%\n`;
  text += `Total Engagements:${report.executiveSummary.totalEngagements}\n\n`;

  text += `2. AUDIENCE & GROWTH\n`;
  text += `--------------------\n`;
  text += `Net Growth:       ${report.audienceGrowth.netGrowth}\n`;
  text += `Instagram:        ${report.audienceGrowth.platformSplit.instagram}\n`;
  text += `Facebook:         ${report.audienceGrowth.platformSplit.facebook}\n\n`;

  text += `3. ENGAGEMENT BREAKDOWN\n`;
  text += `-----------------------\n`;
  text += `Likes:    ${report.engagementBreakdown.breakdown.likes}\n`;
  text += `Comments: ${report.engagementBreakdown.breakdown.comments}\n`;
  text += `Shares:   ${report.engagementBreakdown.breakdown.shares}\n`;
  text += `Saves:    ${report.engagementBreakdown.breakdown.saves}\n\n`;

  text += `4. TOP POSTS\n`;
  text += `------------\n`;
  if (report.detailedPosts.length > 0) {
    report.detailedPosts.slice(0, 5).forEach((post, index) => {
      text += `${index + 1}. ${post.caption ? post.caption.substring(0, 50) : '(No caption)'}...\n`;
      text += `   Type: ${post.type} | Reach: ${post.reach} | Eng: ${post.engagementRate}%\n`;
    });
  } else {
    text += `No posts found.\n`;
  }
  text += `\n`;

  text += `5. AI INSIGHTS\n`;
  text += `--------------\n`;
  text += `Best Format: ${report.insights.bestFormat}\n`;
  text += `Suggestion:  ${report.insights.suggestion}\n`;

  return text;
}

/**
 * Send report data to Google Doc script
 */
export async function sendToGoogleDoc(userId, posts, clients, options = {}) {
  const { startDate, endDate } = options;
  const report = await generateReport(userId, posts, clients, { startDate, endDate });

  // Format data for Google Script using new Enterprise metrics
  let googleData = {
    startDate: startDate || 'All Time',
    endDate: endDate || 'All Time',

    // Executive
    totalFollowers: report.executiveSummary.totalFollowers,
    newFollowers: report.executiveSummary.newFollowers,
    totalReach: report.executiveSummary.totalReach,
    engagementRate: report.executiveSummary.engagementRate,
    totalEngagements: report.executiveSummary.totalEngagements,

    // Audience
    netGrowth: report.audienceGrowth.netGrowth,
    igFollowers: report.audienceGrowth.platformSplit.instagram,
    fbFollowers: report.audienceGrowth.platformSplit.facebook,

    // Reach
    totalImpressions: report.reachImpressions.totalImpressions,

    // Engagement
    totalLikes: report.engagementBreakdown.breakdown.likes,
    totalComments: report.engagementBreakdown.breakdown.comments,
    totalShares: report.engagementBreakdown.breakdown.shares,
    totalSaves: report.engagementBreakdown.breakdown.saves,

    // Video
    totalVideoViews: report.videoPerformance.totalViews,
    reelViews: report.videoPerformance.split.reels,
    avgWatchTime: report.videoPerformance.avgWatchTime,

    // Traffic
    websiteClicks: report.traffic.websiteClicks,
    emailClicks: report.traffic.emailClicks
  };

  const scriptUrl = 'https://script.google.com/macros/s/AKfycbz8suFCztQ4Al8NfH-nuPiudOuG5RUZP8MxdTQY0A3r9LlQtDNbrsgubcxV-WOpuNg/exec';

  try {
    console.log('Sending data to Google Doc script:', JSON.stringify(googleData));
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleData),
      redirect: 'follow'
    });

    const text = await response.text();
    console.log('Google Doc script response:', text);

    try {
      const result = JSON.parse(text);
      return result;
    } catch (e) {
      throw new Error('Invalid JSON response from Google Script: ' + text.substring(0, 100) + '...');
    }
  } catch (error) {
    console.error('Error sending to Google Doc:', error);
    throw new Error('Failed to generate Google Doc: ' + error.message);
  }
}
