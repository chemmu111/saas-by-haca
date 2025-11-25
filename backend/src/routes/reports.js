import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import requireAuth from '../middleware/requireAuth.js';
import { sendMonthlyReportEmail, sendReportToClient } from '../services/emailService.js';
import {
  generateReport,
  generateReportWithTemplate,
  generatePDFFromTemplate,
  generateSimplePDFReport
} from '../services/reportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for template uploads
const templatesDir = path.join(__dirname, '../templates');
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, templatesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `template-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.html', '.htm', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML and PDF templates are allowed'));
    }
  }
});

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

function logReportSummary(label, { summary = {}, breakdown = {} }, extra = {}) {
  try {
    console.log(`[reports] ${label}`, {
      totalPosts: summary.totalPosts || 0,
      publishedPosts: summary.publishedPosts || 0,
      totalEngagements: summary.totalEngagements || 0,
      totalViews: summary.totalViews || 0,
      instagramPosts: breakdown.byPlatform?.instagram || 0,
      facebookPosts: breakdown.byPlatform?.facebook || 0,
      timestamp: new Date().toISOString(),
      ...extra
    });
  } catch (err) {
    console.warn('[reports] failed to log summary', err.message);
  }
}

function logReportRequest(label, req, extra = {}) {
  try {
    const userId = req.user?.sub || 'unknown';
    const payload = {
      query: req.query || {},
      body: req.body || {}
    };
    // Avoid logging huge objects
    const safePayload = JSON.parse(JSON.stringify(payload, (_, value) => {
      if (value && typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length > 20) {
          return keys.reduce((acc, key, index) => {
            if (index < 20) acc[key] = value[key];
            return acc;
          }, { __truncated: true, totalKeys: keys.length });
        }
      }
      return value;
    }));

    console.log(`[reports] request:${label}`, {
      userId,
      path: req.path,
      method: req.method,
      payload: safePayload,
      timestamp: new Date().toISOString(),
      ...extra
    });
  } catch (error) {
    console.warn('[reports] failed to log request', error.message);
  }
}

function buildReportScheduleResponse(user) {
  const settings = user.reportSettings || {};
  return {
    enabled: Boolean(settings.enabled),
    dayOfMonth: settings.dayOfMonth || 1,
    email: settings.email || user.email || '',
    lastSentAt: settings.lastSentAt || null,
    updatedAt: settings.updatedAt || null
  };
}

// GET /api/reports/schedule - Get report schedule settings
router.get('/schedule', async (req, res) => {
  try {
    const userId = req.user.sub;
    logReportRequest('get-schedule', req, { userId });
    const user = await User.findById(userId).select('reportSettings email');

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: buildReportScheduleResponse(user)
    });
  } catch (error) {
    console.error('Error fetching report schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report schedule' });
  }
});

// GET /api/reports - Get all reports for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, format } = req.query;
    logReportRequest('list', req, { userId, startDate, endDate, format });
    
    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);
    
    // Build query - handle case when there are no clients
    let posts = [];
    if (clientIds.length > 0) {
      const query = { 
        createdBy: userId,
        client: { $in: clientIds }
      };
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Get posts
      posts = await Post.find(query).populate('client', 'name email platform');
    }
    
    // Generate report (works even with empty posts/clients)
    const report = await generateReport(userId, posts, clients, { startDate, endDate, format });
    logReportSummary('generate-report', report, {
      userId,
      startDate,
      endDate,
      clientCount: clients.length,
      postCount: posts.length
    });

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report: ' + error.message });
  }
});

// POST /api/reports/schedule - Schedule monthly reports
router.post('/schedule', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { enabled, dayOfMonth = 1, email } = req.body;
    logReportRequest('save-schedule', req, { userId, enabled, dayOfMonth, email });
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const normalizedDay = Math.min(28, Math.max(1, parseInt(dayOfMonth, 10) || 1));
    const reportEmail = (email || user.email || '').trim();

    user.reportSettings = {
      ...(user.reportSettings || {}),
      enabled: Boolean(enabled),
      dayOfMonth: normalizedDay,
      email: reportEmail,
      updatedAt: new Date()
    };

    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Report schedule updated',
      data: {
        ...buildReportScheduleResponse(user)
      }
    });
  } catch (error) {
    console.error('Error scheduling reports:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule reports' });
  }
});

// POST /api/reports/send-test - Send test report email
router.post('/send-test', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { templateName, format = 'pdf' } = req.body;
    logReportRequest('send-test', req, { userId, templateName, format });
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);
    
    // Get posts from last 30 days - handle case when there are no clients
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    let posts = [];
    if (clientIds.length > 0) {
      posts = await Post.find({
        createdBy: userId,
        client: { $in: clientIds },
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }).populate('client', 'name email platform');
    }
    
    // Generate report with template if provided
    let report;
    if (templateName) {
      report = await generateReportWithTemplate(userId, posts, clients, { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString(),
        templateName,
        format
      });
    } else {
      report = await generateReport(userId, posts, clients, { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
    }
    logReportSummary('send-test-report', report, { userId, templateName, clientCount: clients.length });

    await sendMonthlyReportEmail(user.email, user.name, report, templateName, format);
    
    res.json({ success: true, message: 'Test report sent successfully' });
  } catch (error) {
    console.error('Error sending test report:', error);
    res.status(500).json({ success: false, error: 'Failed to send test report: ' + error.message });
  }
});

// POST /api/reports/upload-template - Upload a report template
router.post('/upload-template', upload.single('template'), async (req, res) => {
  try {
    logReportRequest('upload-template', req, { userId: req.user?.sub, filename: req.file?.originalname, size: req.file?.size });
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No template file uploaded' });
    }
    
    res.json({ 
      success: true, 
      message: 'Template uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({ success: false, error: 'Failed to upload template: ' + error.message });
  }
});

// GET /api/reports/templates - Get list of available templates
router.get('/templates', async (req, res) => {
  try {
    logReportRequest('list-templates', req, { userId: req.user?.sub });
    const files = fs.readdirSync(templatesDir);
    const templates = files
      .filter(file => file.startsWith('template-'))
      .map(file => {
        const filePath = path.join(templatesDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          originalName: file.replace(/^template-\d+-\d+/, '').replace(/\.(html|htm|pdf)$/, ''),
          size: stats.size,
          createdAt: stats.birthtime,
          type: path.extname(file).toLowerCase() === '.pdf' ? 'pdf' : 'html'
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// DELETE /api/reports/templates/:filename - Delete a template
router.delete('/templates/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    logReportRequest('delete-template', req, { userId: req.user?.sub, filename });
    const filePath = path.join(templatesDir, filename);
    
    // Security: prevent directory traversal
    if (!path.resolve(filePath).startsWith(path.resolve(templatesDir))) {
      return res.status(400).json({ success: false, error: 'Invalid file path' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: 'Failed to delete template' });
  }
});

// POST /api/reports/send-to-clients - Send report to all clients via email
router.post('/send-to-clients', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, templateName, format = 'pdf', clientIds } = req.body;
    logReportRequest('send-to-clients', req, {
      userId,
      clientIdsLength: Array.isArray(clientIds) ? clientIds.length : 0,
      startDate,
      endDate,
      templateName,
      format
    });
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get clients (all or specific ones)
    let clients;
    if (clientIds && clientIds.length > 0) {
      clients = await Client.find({ 
        createdBy: userId, 
        _id: { $in: clientIds } 
      });
    } else {
      clients = await Client.find({ createdBy: userId });
    }
    
    if (clients.length === 0) {
      return res.status(400).json({ success: false, error: 'No clients found' });
    }
    
    const clientIdsArray = clients.map(c => c._id);
    
    // Build query
    const query = { 
      createdBy: userId,
      client: { $in: clientIdsArray }
    };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get posts
    const posts = await Post.find(query).populate('client', 'name email platform');
    
    // Generate report for each client
    const results = [];
    for (const client of clients) {
      try {
        const clientPosts = posts.filter(p => {
          if (!p.client) return false;
          const postClientId = p.client._id ? p.client._id.toString() : p.client.toString();
          return postClientId === client._id.toString();
        });
        
        let pdfBuffer = null;
        let reportForEmail = await generateReport(userId, clientPosts, [client], { startDate, endDate });
        
        if (templateName && format === 'pdf') {
          pdfBuffer = await generatePDFFromTemplate(userId, clientPosts, [client], { 
            startDate, 
            endDate,
            templateName
          });
        } else if (templateName) {
          reportForEmail = await generateReportWithTemplate(userId, clientPosts, [client], { 
            startDate, 
            endDate,
            templateName,
            format: 'html'
          });
        } else if (format === 'pdf') {
          pdfBuffer = await generateSimplePDFReport(reportForEmail, {
            title: `${client.name || 'Client'} Report`,
            subtitle: startDate && endDate
              ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
              : 'All Time'
          });
        }
        
        logReportSummary('send-client-report', reportForEmail, {
          userId,
          clientId: client._id,
          clientName: client.name,
          templateName,
          format
        });
        await sendReportToClient(client.email, client.name, reportForEmail, templateName, format, pdfBuffer);

        results.push({
          clientId: client._id,
          clientName: client.name,
          email: client.email,
          status: 'sent'
        });
      } catch (error) {
        console.error(`Error sending report to client ${client._id}:`, error);
        results.push({
          clientId: client._id,
          clientName: client.name,
          email: client.email,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Reports sent to ${results.filter(r => r.status === 'sent').length} client(s)`,
      data: results
    });
  } catch (error) {
    console.error('Error sending reports to clients:', error);
    res.status(500).json({ success: false, error: 'Failed to send reports: ' + error.message });
  }
});

// POST /api/reports/download - Download report
router.post('/download', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, format = 'pdf', templateName } = req.body;
    logReportRequest('download', req, { userId, startDate, endDate, format, templateName });
    
    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);
    
    // Build query - handle case when there are no clients
    let posts = [];
    if (clientIds.length > 0) {
      const query = { 
        createdBy: userId,
        client: { $in: clientIds }
      };
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      // Get posts
      posts = await Post.find(query).populate('client', 'name email platform');
    }
    
    const baseReport = await generateReport(userId, posts, clients, { startDate, endDate });
    logReportSummary('download-base-report', baseReport, {
      userId,
      clientCount: clients.length,
      postCount: posts.length,
      startDate,
      endDate
    });
    let payload = baseReport;
    let pdfBuffer = null;
    
    if (templateName && format === 'pdf') {
      pdfBuffer = await generatePDFFromTemplate(userId, posts, clients, { 
        startDate, 
        endDate,
        templateName
      });
    } else if (templateName && format === 'html') {
      payload = await generateReportWithTemplate(userId, posts, clients, { 
        startDate, 
        endDate,
        templateName,
        format: 'html'
      });
    } else if (format === 'pdf') {
      pdfBuffer = await generateSimplePDFReport(baseReport, {
        title: 'Social Media Report',
        subtitle: startDate && endDate
          ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
          : 'All Time'
      });
    }
    
    const filename = `report-${startDate || 'all'}-${endDate || 'all'}.${format}`;
    
    if (format === 'pdf') {
      if (!pdfBuffer) {
        pdfBuffer = await generateSimplePDFReport(payload, {
          title: 'Social Media Report',
          subtitle: startDate && endDate
            ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
            : 'All Time'
        });
      }

      if (!pdfBuffer || !pdfBuffer.length) {
        console.error('report-download: missing PDF buffer', { format, templateName, buffer: pdfBuffer });
        return res.status(500).json({ success: false, error: 'Failed to generate PDF report' });
      }

      console.log('report-download', {
        format,
        templateName: templateName || null,
        pdfBytes: pdfBuffer.length
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      return res.end(pdfBuffer);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json({ success: true, data: payload });
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(payload.html || payload);
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, error: 'Failed to download report: ' + error.message });
  }
});

export default router;

