import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import Client from '../models/Client.js';
import User from '../models/User.js';
import ReportSchedule from '../models/ReportSchedule.js';
import requireAuth from '../middleware/requireAuth.js';
import { sendMonthlyReportEmail, sendReportToClient } from '../services/emailService.js';
import { generateReport, generateReportWithTemplate, generatePDFFromTemplate, generatePDFFromHTML, generateTextReport, sendToGoogleDoc } from '../services/reportService.js';
import { processSchedule } from '../cron/reportCron.js';

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

// GET /api/reports - Get all reports for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, format } = req.query;

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
    const {
      clientIds, // Array of client IDs
      interval = 'monthly',
      dayOfMonth = 1,
      dayOfWeek = 1, // 0-6 for weekly
      time = '09:00',
      emailRecipients = [],
      sendToClient = false,
      templateId,
      format = 'pdf',
      enabled = true
    } = req.body;

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // If clientIds is provided, create/update schedules for each client
    // If not provided, maybe it's a global schedule? For now assume per-client or all-clients logic
    // The UI sends "Monthly Schedule" which might imply a single setting for the selected client(s)

    // For this implementation, we'll handle single or multiple clients
    const clientsToSchedule = clientIds || [];

    const results = [];

    for (const clientId of clientsToSchedule) {
      // Calculate next run
      const now = new Date();
      let nextRun = new Date();
      const [hour, minute] = time.split(':').map(Number);
      nextRun.setHours(hour, minute, 0, 0);

      if (interval === 'monthly') {
        // Set to specific day of current month
        nextRun.setDate(dayOfMonth);
        // If passed, move to next month
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
      } else if (interval === 'weekly') {
        // Set to specific day of week
        const currentDay = nextRun.getDay();
        const distance = (dayOfWeek + 7 - currentDay) % 7;
        nextRun.setDate(nextRun.getDate() + distance);
        // If passed (today but earlier time), move to next week
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
      }

      // Update or create schedule
      const schedule = await ReportSchedule.findOneAndUpdate(
        { client: clientId, createdBy: userId },
        {
          interval,
          templateId,
          format,
          emailRecipients: emailRecipients && emailRecipients.length > 0 ? emailRecipients : [user.email],
          sendToClient,
          nextRun,
          isActive: enabled
        },
        { upsert: true, new: true }
      );
      results.push(schedule);
    }

    res.json({
      success: true,
      message: `Report schedule updated for ${results.length} client(s)`,
      data: results
    });
  } catch (error) {
    console.error('Error scheduling reports:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule reports' });
  }
});

// GET /api/reports/schedules - Get all report schedules for user
router.get('/schedules', async (req, res) => {
  try {
    const userId = req.user.sub;

    const schedules = await ReportSchedule.find({ createdBy: userId })
      .populate('client', 'name platform')
      .sort({ nextRun: 1 });

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch schedules' });
  }
});

// DELETE /api/reports/schedules/:id - Delete a schedule
router.delete('/schedules/:id', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;

    const schedule = await ReportSchedule.findOneAndDelete({
      _id: id,
      createdBy: userId
    });

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to delete schedule' });
  }
});

// POST /api/reports/schedules/:id/run - Manually run a schedule
router.post('/schedules/:id/run', async (req, res) => {
  try {
    const schedule = await ReportSchedule.findById(req.params.id)
      .populate('client')
      .populate('createdBy');

    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Schedule not found' });
    }

    if (schedule.createdBy._id.toString() !== req.user.sub) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    // Process immediately
    await processSchedule(schedule);

    res.json({ success: true, message: 'Schedule triggered successfully' });
  } catch (error) {
    console.error('Error running schedule:', error);
    res.status(500).json({ success: false, error: 'Failed to run schedule' });
  }
});

// POST /api/reports/export - Export report (PDF/PNG/etc)
router.post('/export', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { clients: clientIds, dateRange, templateId, format = 'pdf', sendToClient } = req.body;
    const { startDate, endDate } = dateRange || {};

    // Get clients
    const clients = await Client.find({
      createdBy: userId,
      _id: { $in: clientIds }
    });

    if (clients.length === 0) {
      return res.status(400).json({ success: false, error: 'No clients found' });
    }

    // Get posts
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

    const posts = await Post.find(query).populate('client', 'name email platform');

    // Generate report
    // Use generateReportWithTemplate or generatePDFFromTemplate
    // If templateId is provided, use it. Otherwise use default.

    let result;
    let buffer;
    let filename;
    let contentType;

    if (format === 'pdf') {
      if (templateId && templateId.endsWith('.pdf')) {
        buffer = await generatePDFFromTemplate(userId, posts, clients, {
          startDate,
          endDate,
          templateName: templateId
        });
      } else {
        // HTML to PDF
        const reportWithHtml = await generateReportWithTemplate(userId, posts, clients, {
          startDate,
          endDate,
          templateName: templateId || 'professional-modern.html',
          format: 'html'
        });
        buffer = await generatePDFFromHTML(reportWithHtml.html);
      }
      contentType = 'application/pdf';
      filename = `report-${startDate || 'all'}-${endDate || 'all'}.pdf`;
    } else if (format === 'json') {
      result = await generateReport(userId, posts, clients, { startDate, endDate });
      contentType = 'application/json';
      filename = `report-${startDate || 'all'}-${endDate || 'all'}.json`;
    } else {
      // Default to JSON for now if unknown format
      result = await generateReport(userId, posts, clients, { startDate, endDate });
      contentType = 'application/json';
      filename = `report.json`;
    }

    // If sendToClient is true, email it
    if (sendToClient) {
      // Send to each client
      // This logic might need to be per-client if we want individual reports
      // For now, if multiple clients are selected, we might be sending one aggregate report?
      // Or we should loop. The requirement says "Multi-client export is possible".
      // Usually "Send to Client" implies individual reports.
      // But "Export" implies one file. 
      // Let's assume "Export" returns the file (aggregate or first client), 
      // and "Send to Client" triggers the email loop.

      // If sending to client, we should probably loop and generate individual reports
      // But if we are just returning a download, it's the aggregate.

      // If the user clicked "Send to Client", we trigger the email loop and return success message.
      // If they clicked "Export", we return the file.

      // Re-using the logic from /send-to-clients but adapted
      // For now, let's just return the generated file for the "Export" case.
      // The frontend has a separate "Send to Client" button which calls /send-to-clients.
      // So this /export route is primarily for the "Export Report" button (Download).
    }

    if (buffer) {
      // Ensure buffer is a proper Buffer
      const pdfData = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', pdfData.length);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.end(pdfData);
    } else {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json(result);
    }

  } catch (error) {
    console.error('Error exporting report:', error);
    res.status(500).json({ success: false, error: 'Failed to export report: ' + error.message });
  }
});

// POST /api/reports/send-test - Send test report email
router.post('/send-test', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { templateName, format = 'pdf' } = req.body;

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
    const { startDate, endDate, templateName, format = 'pdf', clientIds, additionalRecipients } = req.body;

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
    const results = await Promise.all(clients.map(async (client) => {
      try {
        const clientPosts = posts.filter(p => {
          if (!p.client) return false;
          const postClientId = p.client._id ? p.client._id.toString() : p.client.toString();
          return postClientId === client._id.toString();
        });

        let report;
        let pdfBuffer = null;

        if (templateName && format === 'pdf') {
          // Generate PDF from template with real data
          pdfBuffer = await generatePDFFromTemplate(userId, clientPosts, [client], {
            startDate,
            endDate,
            templateName
          });
          // Also generate regular report for email content
          report = await generateReport(userId, clientPosts, [client], {
            startDate,
            endDate
          });
        } else if (templateName) {
          // Generate HTML from template
          report = await generateReportWithTemplate(userId, clientPosts, [client], {
            startDate,
            endDate,
            templateName,
            format: 'html'
          });
        } else {
          // Generate regular report
          report = await generateReport(userId, clientPosts, [client], {
            startDate,
            endDate
          });

          // If format is PDF but no template name, generate from default HTML
          if (format === 'pdf') {
            const reportWithHtml = await generateReportWithTemplate(userId, clientPosts, [client], {
              startDate,
              endDate,
              format: 'html'
            });
            pdfBuffer = await generatePDFFromHTML(reportWithHtml.html);
            // console.log('Generated PDF Buffer:', { length: pdfBuffer ? pdfBuffer.length : 0 });
          }
        }

        // Send email to client with PDF attachment if available
        console.log('Sending email to client...', { email: client.email, hasPdf: !!pdfBuffer, additionalRecipients });
        await sendReportToClient(client.email, client.name, report, templateName, format, pdfBuffer, additionalRecipients);

        return {
          clientId: client._id,
          clientName: client.name,
          email: client.email,
          status: 'sent'
        };
      } catch (error) {
        console.error(`Error sending report to client ${client._id}:`, error);
        return {
          clientId: client._id,
          clientName: client.name,
          email: client.email,
          status: 'failed',
          error: error.message
        };
      }
    }));

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

    // Generate report with template if provided
    let report;
    let pdfBuffer = null;

    if (templateName && format === 'pdf' && templateName.endsWith('.pdf')) {
      // Generate PDF from PDF template
      pdfBuffer = await generatePDFFromTemplate(userId, posts, clients, {
        startDate,
        endDate,
        templateName
      });
    } else if (format === 'pdf') {
      console.log('Generating PDF from HTML...');
      // Generate PDF from HTML (custom template or default)
      const reportWithHtml = await generateReportWithTemplate(userId, posts, clients, {
        startDate,
        endDate,
        templateName: templateName || 'professional-modern.html',
        format: 'html'
      });

      console.log('HTML content generated, length:', reportWithHtml.html?.length);
      pdfBuffer = await generatePDFFromHTML(reportWithHtml.html);
      console.log('PDF buffer generated, length:', pdfBuffer?.length);
    } else if (format === 'txt') {
      // Generate text report
      const textReport = await generateTextReport(userId, posts, clients, { startDate, endDate });
      // Send as text file
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(textReport);
    } else {
      // Generate regular report (JSON)
      report = await generateReport(userId, posts, clients, { startDate, endDate, format });
    }

    // Set response headers for download
    const filename = `report-${startDate || 'all'}-${endDate || 'all'}.${format}`;

    if (format === 'pdf' && pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({ success: true, data: report });
    } else {
      // HTML format
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(report.html || report);
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, error: 'Failed to download report: ' + error.message });
  }
});

// POST /api/reports/google-doc - Generate Google Doc report
router.post('/google-doc', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate } = req.body;

    // Get all clients for the user
    const clients = await Client.find({ createdBy: userId });
    const clientIds = clients.map(c => c._id);

    // Build query
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

      posts = await Post.find(query).populate('client', 'name email platform');
    }

    const result = await sendToGoogleDoc(userId, posts, clients, { startDate, endDate });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating Google Doc:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Google Doc: ' + error.message });
  }
});

export default router;

