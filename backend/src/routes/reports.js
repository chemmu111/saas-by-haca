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
import { generateReport, generateReportWithTemplate, generatePDFFromTemplate } from '../services/reportService.js';

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

// POST /api/reports/download - Download report
router.post('/download', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { startDate, endDate, format = 'json' } = req.body;
    
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
    
    // Set response headers for download
    const filename = `report-${startDate || 'all'}-${endDate || 'all'}.${format}`;
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'json') {
      res.json({ success: true, data: report });
    } else {
      // For PDF, you would use a library like pdfkit or puppeteer
      // For now, return JSON
      res.json({ success: true, data: report, message: 'PDF generation coming soon' });
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ success: false, error: 'Failed to download report: ' + error.message });
  }
});

// POST /api/reports/schedule - Schedule monthly reports
router.post('/schedule', async (req, res) => {
  try {
    const userId = req.user.sub;
    const { enabled, dayOfMonth = 1, email } = req.body;
    
    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Save report schedule settings (you might want to add this to User model)
    // For now, we'll just validate and return success
    const reportEmail = email || user.email;
    
    res.json({ 
      success: true, 
      message: 'Report schedule updated',
      data: {
        enabled,
        dayOfMonth,
        email: reportEmail
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
    const { startDate, endDate, templateName, format = 'pdf', clientIds } = req.body;
    
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
            }
            
            // Send email to client with PDF attachment if available
            await sendReportToClient(client.email, client.name, report, templateName, format, pdfBuffer);
        
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
    
    if (templateName && format === 'pdf') {
      // Generate PDF from template
      pdfBuffer = await generatePDFFromTemplate(userId, posts, clients, { 
        startDate, 
        endDate,
        templateName
      });
    } else if (templateName) {
      // Generate HTML from template
      report = await generateReportWithTemplate(userId, posts, clients, { 
        startDate, 
        endDate,
        templateName,
        format: 'html'
      });
    } else {
      // Generate regular report
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

export default router;

