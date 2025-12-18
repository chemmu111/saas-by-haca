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

  // If multiple clients, return an array of reports
  if (clients.length > 1) {
    console.log(`📊 Generating Enterprise Reports for ${clients.length} clients`);
    const reports = await Promise.all(clients.map(async (client) => {
      return await generateReportData(client._id, startDate, endDate);
    }));
    return reports;
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

  // Handle multiple clients
  if (clients.length > 1) {
    console.log(`📑 Generating combined report for ${clients.length} clients`);

    // Generate individual reports
    const individualReports = await Promise.all(clients.map(async (client) => {
      // Recursive call for single client
      const singleReport = await generateReportWithTemplate(userId, posts, [client], options);
      return singleReport.html;
    }));

    // Combine HTMLs with page breaks
    // We need to strip the <html><head><body> tags from subsequent reports to make a valid document?
    // Or Puppeteer might handle concatenated full HTMLs poorly.
    // Better strategy: Use the first report as the container, and append the body content of others.

    // Actually, simply concatenating full HTMLs is invalid.
    // We'll extract the <body> content from each.

    let combinedBodyContent = '';
    const styleBlock = individualReports[0].match(/<style>([\s\S]*?)<\/style>/)?.[0] || '';

    individualReports.forEach((html, index) => {
      const bodyContentMatch = html.match(/<body>([\s\S]*?)<\/body>/);
      let bodyContent = bodyContentMatch ? bodyContentMatch[1] : html;

      // Add page break before subsequent reports
      if (index > 0) {
        bodyContent = `<div style="page-break-before: always; height: 0; margin: 0; padding: 0;"></div>` + bodyContent;
      }
      combinedBodyContent += bodyContent;
    });

    // Construct final HTML using the structure of the first report but with combined body
    const finalHtml = individualReports[0]
      .replace(/<body>[\s\S]*?<\/body>/, `<body>${combinedBodyContent}</body>`);

    return { html: finalHtml };
  }

  // Single Client Logic
  // Generate base report data using the new structure
  const report = await generateReport(userId, posts, clients, { startDate, endDate, format });
  const client = clients[0];

  // Default Enterprise HTML Template - Premium Design
  const defaultTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #1e293b; 
            max-width: 900px; 
            margin: 0 auto; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px;
          }
          .report-container {
            background: #ffffff;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            overflow: hidden;
          }
          
          /* Cover Page */
          .cover-page {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: white;
            padding: 80px 60px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .cover-page::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></svg>') repeat;
            opacity: 0.5;
          }
          .company-logo {
            width: 120px;
            height: 120px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            font-size: 48px;
            font-weight: 800;
            color: white;
            box-shadow: 0 20px 40px rgba(59, 130, 246, 0.4);
            position: relative;
            z-index: 1;
          }
          .cover-title {
            font-size: 42px;
            font-weight: 800;
            margin: 0 0 10px;
            position: relative;
            z-index: 1;
          }
          .cover-subtitle {
            font-size: 20px;
            color: #94a3b8;
            margin: 0 0 40px;
            position: relative;
            z-index: 1;
          }
          .cover-client {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 16px;
            padding: 30px;
            display: inline-block;
            position: relative;
            z-index: 1;
          }
          .cover-client-name {
            font-size: 28px;
            font-weight: 700;
            margin: 0 0 10px;
          }
          .cover-period {
            font-size: 16px;
            color: #94a3b8;
            margin: 0;
          }
          
          /* Content Area */
          .content { padding: 60px; }
          
          .section { 
            margin-bottom: 50px; 
            page-break-inside: avoid;
          }
          .section-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
          }
          .section-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
          }
          .section-title { 
            font-size: 24px; 
            font-weight: 700; 
            color: #0f172a; 
            margin: 0;
          }
          .section-subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 5px 0 0;
          }
          
          /* Metric Cards */
          .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
          .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          
          .metric-card { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 24px; 
            border-radius: 16px; 
            border: 1px solid #e2e8f0;
            position: relative;
            overflow: hidden;
          }
          .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          }
          .metric-card.blue::before { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
          .metric-card.purple::before { background: linear-gradient(90deg, #8b5cf6, #a855f7); }
          .metric-card.green::before { background: linear-gradient(90deg, #10b981, #34d399); }
          .metric-card.rose::before { background: linear-gradient(90deg, #f43f5e, #fb7185); }
          .metric-card.amber::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
          
          .metric-title { 
            font-size: 12px; 
            color: #64748b; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            margin-bottom: 12px; 
          }
          .metric-value { 
            font-size: 32px; 
            font-weight: 800; 
            color: #0f172a;
            line-height: 1;
          }
          .metric-sub { 
            font-size: 13px; 
            color: #10b981; 
            margin-top: 8px; 
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .metric-sub.negative { color: #ef4444; }
          .metric-sub.neutral { color: #64748b; }

          /* Charts */
          .chart-container {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 30px;
            margin-top: 20px;
          }
          .chart-title {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 20px;
          }
          .bar-chart {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 120px;
            padding: 10px 0;
          }
          .bar {
            flex: 1;
            background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
            border-radius: 4px 4px 0 0;
            position: relative;
            min-height: 20px;
            transition: all 0.3s;
          }
          .bar.purple { background: linear-gradient(180deg, #8b5cf6 0%, #a855f7 100%); }
          .bar.green { background: linear-gradient(180deg, #10b981 0%, #34d399 100%); }
          .bar.rose { background: linear-gradient(180deg, #f43f5e 0%, #fb7185 100%); }
          .bar-label {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #64748b;
            white-space: nowrap;
          }
          
          /* Line Chart (CSS) */
          .line-chart {
            height: 100px;
            background: linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);
            border-radius: 8px;
            position: relative;
            margin-bottom: 30px;
          }
          .chart-line {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 60%;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            clip-path: polygon(0% 100%, 5% 80%, 15% 60%, 25% 70%, 35% 40%, 45% 50%, 55% 30%, 65% 45%, 75% 20%, 85% 35%, 95% 10%, 100% 25%, 100% 100%);
            opacity: 0.8;
          }
          .chart-dates {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 10px;
          }

          /* Highlights */
          .highlight-box { 
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border: 1px solid #93c5fd;
            border-radius: 16px; 
            padding: 25px;
          }
          .highlight-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e40af;
            margin: 0 0 15px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .highlight-list { list-style: none; padding: 0; margin: 0; }
          .highlight-list li { 
            position: relative; 
            padding-left: 24px; 
            margin-bottom: 12px; 
            color: #334155;
            font-size: 14px;
          }
          .highlight-list li::before { 
            content: "✓"; 
            color: #3b82f6;
            font-weight: bold; 
            position: absolute; 
            left: 0;
            background: #dbeafe;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
          }

          /* Table */
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { 
            text-align: left; 
            padding: 16px; 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            color: #475569; 
            font-weight: 700; 
            border-bottom: 2px solid #e2e8f0;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td { 
            padding: 16px; 
            border-bottom: 1px solid #f1f5f9; 
            color: #334155;
          }
          tr:hover { background: #f8fafc; }
          .rank-badge { 
            display: inline-block; 
            padding: 6px 14px; 
            border-radius: 20px; 
            font-size: 11px; 
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .rank-top { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); color: #166534; }
          .rank-avg { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color: #475569; }
          .rank-low { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b; }

          /* Insights */
          .insights-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .insight-panel { 
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border: 1px solid #e2e8f0; 
            border-radius: 16px; 
            padding: 30px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .insight-panel h4 { 
            margin: 0 0 20px; 
            color: #0f172a;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .insight-item { margin-bottom: 18px; }
          .insight-label { 
            font-weight: 700; 
            color: #3b82f6; 
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block; 
            margin-bottom: 6px; 
          }
          .insight-text { color: #334155; font-size: 14px; }

          /* Footer */
          .footer-page {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            padding: 60px;
            text-align: center;
          }
          .footer-logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 25px;
            font-size: 32px;
            font-weight: 800;
          }
          .footer-text {
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
          }
          .footer-brand {
            font-size: 24px;
            font-weight: 700;
            color: white;
            margin: 0 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          <!-- COVER PAGE -->
          <div class="cover-page">
            <div class="company-logo">H&C</div>
            <h1 class="cover-title">Social Media Report</h1>
            <p class="cover-subtitle">Performance Analytics & Insights</p>
            <div class="cover-client">
              <h2 class="cover-client-name">{{clientName}}</h2>
              <p class="cover-period">📅 {{startDate}} - {{endDate}}</p>
            </div>
          </div>

          <div class="content">
            <!-- 1. EXECUTIVE SUMMARY -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📊</div>
                <div>
                  <h2 class="section-title">Executive Summary</h2>
                  <p class="section-subtitle">Key performance metrics at a glance</p>
                </div>
              </div>
              <div class="grid-4">
                <div class="metric-card blue">
                  <div class="metric-title">Total Followers</div>
                  <div class="metric-value">{{totalFollowers}}</div>
                  <div class="metric-sub">{{newFollowers}} new</div>
                </div>
                <div class="metric-card purple">
                  <div class="metric-title">Total Reach</div>
                  <div class="metric-value">{{totalReach}}</div>
                  <div class="metric-sub neutral">Unique accounts</div>
                </div>
                <div class="metric-card green">
                  <div class="metric-title">Engagement Rate</div>
                  <div class="metric-value">{{engagementRate}}</div>
                  <div class="metric-sub neutral">Per impression</div>
                </div>
                <div class="metric-card rose">
                  <div class="metric-title">Total Engagements</div>
                  <div class="metric-value">{{totalEngagements}}</div>
                  <div class="metric-sub neutral">All interactions</div>
                </div>
              </div>
              <div style="margin-top: 25px;">
                <div class="highlight-box">
                  <h4 class="highlight-title">✨ Performance Highlights</h4>
                  <ul class="highlight-list">
                    {{highlightsList}}
                  </ul>
                </div>
              </div>
            </div>

            <!-- 2. AUDIENCE & GROWTH with Chart -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">👥</div>
                <div>
                  <h2 class="section-title">Audience & Growth</h2>
                  <p class="section-subtitle">Follower growth and platform breakdown</p>
                </div>
              </div>
              <div class="grid-3">
                <div class="metric-card green">
                  <div class="metric-title">Net Growth</div>
                  <div class="metric-value">{{netGrowth}}</div>
                  <div class="metric-sub">{{growthRate}}% growth</div>
                </div>
                <div class="metric-card purple">
                  <div class="metric-title">Instagram Followers</div>
                  <div class="metric-value">{{igFollowers}}</div>
                </div>
                <div class="metric-card blue">
                  <div class="metric-title">Facebook Followers</div>
                  <div class="metric-value">{{fbFollowers}}</div>
                </div>
              </div>
              <div class="chart-container">
                <div class="chart-title">📈 Follower Growth Trend</div>
                <div class="line-chart">
                  <div class="chart-line"></div>
                </div>
                <div class="chart-dates">
                  <span>{{startDate}}</span>
                  <span>{{endDate}}</span>
                </div>
              </div>
            </div>

            <!-- 3. REACH & IMPRESSIONS with Chart -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">👁️</div>
                <div>
                  <h2 class="section-title">Reach & Impressions</h2>
                  <p class="section-subtitle">Content visibility and exposure</p>
                </div>
              </div>
              <div class="grid-2">
                <div class="metric-card purple">
                  <div class="metric-title">Total Impressions</div>
                  <div class="metric-value">{{totalImpressions}}</div>
                  <div class="metric-sub neutral">Total views</div>
                </div>
                <div class="metric-card">
                  <div class="metric-title">Reach Source</div>
                  <div style="margin-top: 10px; font-size: 14px; color: #475569;">
                    <div style="margin-bottom: 8px;"><strong>Reels:</strong> {{reachReels}}</div>
                    <div style="margin-bottom: 8px;"><strong>Profile Visits:</strong> {{reachProfile}}</div>
                    <div><strong>Other:</strong> {{reachOther}}</div>
                  </div>
                </div>
              </div>
              <div class="chart-container">
                <div class="chart-title">📊 Impressions Trend</div>
                <div class="bar-chart">
                  {{impressionsChart}}
                </div>
              </div>
            </div>

            <!-- 4. ENGAGEMENT BREAKDOWN with Chart -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">❤️</div>
                <div>
                  <h2 class="section-title">Engagement Breakdown</h2>
                  <p class="section-subtitle">Interaction analytics</p>
                </div>
              </div>
              <div class="grid-4">
                <div class="metric-card rose"><div class="metric-title">Likes</div><div class="metric-value">{{totalLikes}}</div></div>
                <div class="metric-card blue"><div class="metric-title">Comments</div><div class="metric-value">{{totalComments}}</div></div>
                <div class="metric-card green"><div class="metric-title">Shares</div><div class="metric-value">{{totalShares}}</div></div>
                <div class="metric-card amber"><div class="metric-title">Saves</div><div class="metric-value">{{totalSaves}}</div></div>
              </div>
              <div class="grid-3" style="margin-top: 20px;">
                <div class="metric-card"><div class="metric-title">Save-to-View</div><div class="metric-value" style="font-size: 24px;">{{saveToView}}%</div></div>
                <div class="metric-card"><div class="metric-title">Share-to-View</div><div class="metric-value" style="font-size: 24px;">{{shareToView}}%</div></div>
                <div class="metric-card"><div class="metric-title">Eng. per Reach</div><div class="metric-value" style="font-size: 24px;">{{engPerReach}}%</div></div>
              </div>
              <div class="chart-container">
                <div class="chart-title">📊 Engagement Trend</div>
                <div class="bar-chart">
                  <div class="bar rose" style="height: {{likesBarHeight}}%;"><span class="bar-label">Likes</span></div>
                  <div class="bar blue" style="height: {{commentsBarHeight}}%;"><span class="bar-label">Comments</span></div>
                  <div class="bar green" style="height: {{sharesBarHeight}}%;"><span class="bar-label">Shares</span></div>
                  <div class="bar purple" style="height: {{savesBarHeight}}%;"><span class="bar-label">Saves</span></div>
                </div>
              </div>
            </div>

            <!-- 5. CONTENT PERFORMANCE -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">📝</div>
                <div>
                  <h2 class="section-title">Content Performance</h2>
                  <p class="section-subtitle">Content mix and format analysis</p>
                </div>
              </div>
              <div class="grid-4">
                <div class="metric-card blue"><div class="metric-title">Images</div><div class="metric-value">{{cntImages}}</div></div>
                <div class="metric-card purple"><div class="metric-title">Videos</div><div class="metric-value">{{cntVideos}}</div></div>
                <div class="metric-card green"><div class="metric-title">Carousels</div><div class="metric-value">{{cntCarousels}}</div></div>
                <div class="metric-card rose"><div class="metric-title">Reels</div><div class="metric-value">{{cntReels}}</div></div>
              </div>
            </div>

            <!-- 6. VIDEO PERFORMANCE -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🎬</div>
                <div>
                  <h2 class="section-title">Video Performance</h2>
                  <p class="section-subtitle">Video engagement metrics</p>
                </div>
              </div>
              <div class="grid-4">
                <div class="metric-card amber"><div class="metric-title">Total Video Views</div><div class="metric-value">{{totalVideoViews}}</div></div>
                <div class="metric-card rose"><div class="metric-title">Reel Views</div><div class="metric-value">{{reelViews}}</div></div>
                <div class="metric-card blue"><div class="metric-title">Avg Watch Time</div><div class="metric-value">{{avgWatchTime}}s</div></div>
                <div class="metric-card green"><div class="metric-title">Completion Rate</div><div class="metric-value">{{completionRate}}%</div></div>
              </div>
              <div class="chart-container">
                <div class="chart-title">📊 Video Views Trend</div>
                <div class="line-chart">
                  <div class="chart-line" style="background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
                </div>
                <div class="chart-dates">
                  <span>{{startDate}}</span>
                  <span>{{endDate}}</span>
                </div>
              </div>
            </div>

            <!-- 7. TOP POSTS TABLE -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🏆</div>
                <div>
                  <h2 class="section-title">Top Posts</h2>
                  <p class="section-subtitle">Best performing content</p>
                </div>
              </div>
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

            <!-- 8. TRAFFIC & CTA -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🔗</div>
                <div>
                  <h2 class="section-title">Traffic & CTA</h2>
                  <p class="section-subtitle">Call-to-action performance</p>
                </div>
              </div>
              <div class="grid-4">
                <div class="metric-card blue"><div class="metric-title">Website Clicks</div><div class="metric-value">{{websiteClicks}}</div></div>
                <div class="metric-card purple"><div class="metric-title">Email Clicks</div><div class="metric-value">{{emailClicks}}</div></div>
                <div class="metric-card green"><div class="metric-title">Call Clicks</div><div class="metric-value">{{callClicks}}</div></div>
                <div class="metric-card amber"><div class="metric-title">Directions</div><div class="metric-value">{{directionClicks}}</div></div>
              </div>
            </div>

            <!-- 9. AI INSIGHTS -->
            <div class="section">
              <div class="section-header">
                <div class="section-icon">🤖</div>
                <div>
                  <h2 class="section-title">AI Insights & Recommendations</h2>
                  <p class="section-subtitle">Data-driven suggestions for growth</p>
                </div>
              </div>
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
                    <span class="insight-label">Area to Improve</span>
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
          </div>

          <!-- FOOTER PAGE -->
          <div class="footer-page">
            <div class="footer-logo">H&C</div>
            <p class="footer-brand">Haris & Co.</p>
            <p class="footer-text">Social Media Management Dashboard</p>
            <p class="footer-text" style="margin-top: 20px;">Generated on {{generatedAt}}</p>
          </div>
        </div>
      </body>
      </html>
    `;

  // Use professional-modern.html by default
  let templateContent;
  const defaultTemplatePath = path.join(templatesDir, 'professional-modern.html');

  if (templateName) {
    const templatePath = path.join(templatesDir, templateName);
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, 'utf-8');
    } else {
      templateContent = defaultTemplate;
    }
  } else if (fs.existsSync(defaultTemplatePath)) {
    templateContent = fs.readFileSync(defaultTemplatePath, 'utf-8');
  } else {
    templateContent = defaultTemplate;
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
  html = html.replace(/\{\{netGrowthClass\}\}/g, aud.netGrowth >= 0 ? 'trend-up' : 'trend-down');
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

  // Calculate bar heights for engagement chart (normalize to 100%)
  const engMax = Math.max(eng.breakdown.likes || 1, eng.breakdown.comments || 1, eng.breakdown.shares || 1, eng.breakdown.saves || 1);
  const likesBarHeight = Math.round((eng.breakdown.likes / engMax) * 100);
  const commentsBarHeight = Math.round((eng.breakdown.comments / engMax) * 100);
  const sharesBarHeight = Math.round((eng.breakdown.shares / engMax) * 100);
  const savesBarHeight = Math.round((eng.breakdown.saves / engMax) * 100);
  html = html.replace(/\{\{likesBarHeight\}\}/g, likesBarHeight || 20);
  html = html.replace(/\{\{commentsBarHeight\}\}/g, commentsBarHeight || 20);
  html = html.replace(/\{\{sharesBarHeight\}\}/g, sharesBarHeight || 20);
  html = html.replace(/\{\{savesBarHeight\}\}/g, savesBarHeight || 20);


  // Follower Growth Chart (simple CSS bars)
  const growthData = report.audienceGrowth.chartData || [];
  // Take last 30 points max to fit
  const recentGrowth = growthData.slice(-30);
  const maxGrowth = Math.max(...recentGrowth.map(d => d.followers), 1);
  const minGrowth = Math.min(...recentGrowth.map(d => d.followers), 0);
  const spread = maxGrowth - minGrowth || 1;

  let followerGrowthChart = recentGrowth.map(d => {
    const height = Math.round(((d.followers - minGrowth) / spread) * 80) + 10; // Min 10% height
    return `<div class="bar" style="height: ${height}%; width: 3%; background: #6366f1; border-radius: 2px;" title="${d.date}: ${d.followers}"></div>`;
  }).join('');

  if (!followerGrowthChart) {
    followerGrowthChart = '<div style="width:100%; text-align:center; color:#9ca3af; padding-top:40px;">No growth data available</div>';
  }

  html = html.replace(/\{\{followerGrowthChart\}\}/g, followerGrowthChart);


  // Impressions chart (simplified bar chart representation)
  const impressionsChart = '<div class="bar" style="height: 80%;"></div><div class="bar purple" style="height: 60%;"></div><div class="bar green" style="height: 90%;"></div><div class="bar rose" style="height: 70%;"></div><div class="bar" style="height: 75%;"></div><div class="bar purple" style="height: 85%;"></div>';
  html = html.replace(/\{\{impressionsChart\}\}/g, impressionsChart);

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
  html = html.replace(/\{\{aiBestFormat\}\}/g, ai.bestFormat || "N/A");
  html = html.replace(/\{\{aiGrowthDriver\}\}/g, ai.growthCause || "N/A");
  html = html.replace(/\{\{aiWeakness\}\}/g, ai.weakPattern || "N/A");
  html = html.replace(/\{\{aiAction\}\}/g, ai.suggestion || "N/A");
  html = html.replace(/\{\{aiMix\}\}/g, ai.ratio || "N/A");
  html = html.replace(/\{\{aiTiming\}\}/g, ai.bestTime || "N/A");

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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });
    console.log('Puppeteer launched, creating new page...');
    const page = await browser.newPage();

    console.log('Setting page content...');
    await page.setViewport({ width: 1280, height: 1600 });
    await page.emulateMediaType('screen');
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

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

    console.log('PDF generated successfully, buffer length:', pdfBuffer.length);

    // Ensure we return a proper Buffer
    return Buffer.from(pdfBuffer);
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
