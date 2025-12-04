// Server entry point - Render compatible
import dotenv from 'dotenv';
dotenv.config(); // Load environment variables FIRST

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import { connectDB } from './database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import oauthRouter from './routes/oauth.js';
import accountsOAuthRouter from './routes/accountsOAuth.js';
import accountsRouter from './routes/accounts.js';
import postsRouter from './routes/posts.js';
import webhooksRouter from './routes/webhooks.js';
import instagramGraphAuthRouter from './routes/instagramGraphAuth.js';
import tagsRouter from './routes/tags.js';
import analyticsRouter from './routes/analytics.js';
import reportsRouter from './routes/reports.js';
import tokenRefreshRouter from './routes/tokenRefresh.js';
import settingsRouter from './routes/settings.js';
import foldersRouter from './routes/folders.js';
import captionsRouter from './routes/captions.js';
import aiRouter from './routes/ai.js';
import adminRouter from './routes/admin.js';
import followerSnapshotsRouter from './routes/followerSnapshots.js';

// Create Express app
const app = express();

// Serve static files from frontend/public
const publicDir = path.resolve(__dirname, '../../frontend/public');

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for API
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Middleware
// CORS configuration with cookie support for cross-origin requests
const allowedOrigins = [
  "https://haca-social-x.onrender.com", // Frontend URL
  "https://haca-social-x-backend.onrender.com", // Backend URL (Render internal call)
  "http://localhost:3000", // Development frontend
  "http://localhost:5000", // Development backend
  "http://localhost:5173", // Vite dev server
];

// Add production frontend URL from environment
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Add local frontend URL from environment (ngrok)
if (process.env.FRONTEND_URL_LOCAL && !allowedOrigins.includes(process.env.FRONTEND_URL_LOCAL)) {
  allowedOrigins.push(process.env.FRONTEND_URL_LOCAL);
}

// Add ngrok URL from environment
if (process.env.NGROK_URL && !allowedOrigins.includes(process.env.NGROK_URL)) {
  allowedOrigins.push(process.env.NGROK_URL);
}

console.log('✅ CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed or if it's an ngrok domain
      if (allowedOrigins.includes(origin) || origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) {
        callback(null, true);
      } else {
        console.log("❌ Blocked CORS origin:", origin);
        console.log("   Allowed origins:", allowedOrigins);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Trust proxy for deployment cookie/session compatibility
app.set('trust proxy', 1);
// Security headers with CSP configuration
// Build connectSrc based on environment
const connectSrc = process.env.NODE_ENV !== 'production'
  ? ["'self'", 'http://localhost:*', 'ws://localhost:*', 'https://*']
  : ["'self'", 'https://*'];

// Build CSP directives
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'blob:', '*'],
  mediaSrc: ["'self'", 'data:', 'blob:', '*', 'https://*.ngrok-free.dev', 'https://*.ngrok.io'],
  videoSrc: ["'self'", 'data:', 'blob:', '*', 'https://*.ngrok-free.dev', 'https://*.ngrok.io'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  connectSrc: connectSrc,
  objectSrc: ["'none'"],
};

// Only upgrade insecure requests in production
if (process.env.NODE_ENV === 'production') {
  cspDirectives.upgradeInsecureRequests = [];
}

const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: cspDirectives,
  },
  permissionsPolicy: {
    useDefaults: true,
    features: {
      'unload': '*',
    },
  },
};

app.use(helmet(helmetConfig));
// Increase body parser limits for large file uploads and JSON payloads
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Serve uploaded files statically
const uploadsDir = path.resolve(__dirname, '../uploads');

// Add middleware to set proper headers for all static files
app.use('/uploads', (req, res, next) => {
  // Set comprehensive CORS headers
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.setHeader('Accept-Ranges', 'bytes');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Log file requests for debugging
  console.log(`📂 Uploads request: ${req.path} (Origin: ${origin || 'none'})`);

  next();
}, express.static(uploadsDir, {
  // Enable proper MIME types
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();

    // Ensure correct Content-Type for images
    if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.jpg' || ext === '.jpeg') {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }
    // Ensure correct Content-Type for videos (critical for Instagram)
    else if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (ext === '.mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (ext === '.webm') {
      res.setHeader('Content-Type', 'video/webm');
    } else if (ext === '.avi') {
      res.setHeader('Content-Type', 'video/x-msvideo');
    }

    // Log what we're serving
    console.log(`   ✅ Serving: ${path.basename(filePath)} (${res.getHeader('Content-Type')})`);
  }
}));

// Handle missing upload files - return 404 after static middleware
app.use('/uploads', (req, res, next) => {
  // Only handle if request hasn't been handled by static middleware
  if (!res.headersSent) {
    const filename = path.basename(req.path);
    console.warn(`⚠️  File not found in uploads: ${filename} (requested: ${req.path})`);

    // Check if file actually exists
    const filePath = path.join(uploadsDir, filename);

    // Debug logging for 404s
    if (!fs.existsSync(filePath)) {
      console.warn(`  ❌ File check failed:`);
      console.warn(`    Uploads Dir: ${uploadsDir}`);
      console.warn(`    Filename: ${filename}`);
      console.warn(`    Full Path: ${filePath}`);

      return res.status(404).json({
        success: false,
        error: 'File not found',
        filename: filename,
        path: req.path,
        message: 'The requested media file does not exist on the server'
      });
    } else {
      // File exists but wasn't served by static middleware
      // Try to serve it manually
      console.log(`  ⚠️ File exists but static middleware missed it. Serving manually: ${filename}`);
      return res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`  ❌ Error sending file manually: ${err.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error serving file' });
          }
        }
      });
    }
  }
  next();
});

// DEPRECATED: Redirect /api/images to /uploads for backward compatibility
// Instagram should use /uploads directly
app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log(`⚠️  DEPRECATED: /api/images/${filename} - Redirecting to /uploads/${filename}`);
  console.log('   Please update URLs to use /uploads directly');

  // Permanent redirect to /uploads
  res.redirect(301, `/uploads/${filename}`);
});

// DevTools probe path: return 204 to avoid noisy 404s
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Root test route - returns JSON for production health check
app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    time: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check route for Render - Includes DB status
app.get('/healthz', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  if (dbStatus === 1) {
    res.json({ status: 'ok', database: 'connected' });
  } else {
    res.status(500).json({
      status: 'error',
      database: statusMap[dbStatus] || 'unknown',
      message: 'Database not connected'
    });
  }
});

// Serve static website (login/signup)
app.use(express.static(publicDir));

// Serve dashboard assets
app.use('/dashboard/assets', express.static(path.join(publicDir, 'dashboard', 'assets')));

// Root → React App (Login) - Only serve HTML if not an API route
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});


// Redirect old HTML files to React routes
app.get('/login.html', (req, res) => {
  res.redirect(301, '/login');
});

app.get('/signup.html', (req, res) => {
  res.redirect(301, '/signup');
});

// Signup page route → React App
app.get('/signup', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});

// Login page route → React App
app.get('/login', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});


// Dashboard routes - React dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});


app.get('/dashboard/create-post', (req, res) => {
  res.sendFile(path.join(publicDir, 'create-post.html'));
});

app.get('/dashboard/create-post.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'create-post.html'));
});

app.get('/dashboard/*', (req, res) => {
  // For any route under /dashboard, serve index.html for client-side routing
  // Assets are handled by the static middleware above
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});

// Home route - redirect to dashboard for social media managers
app.get('/home', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard', 'index.html'));
});

// API Routes - All prefixed with /api
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/oauth/accounts', accountsOAuthRouter); // Fixed: added /api prefix
app.use('/api/posts', postsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/auth/facebook', instagramGraphAuthRouter); // Updated to match user request
app.use('/api/tags', tagsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/token-refresh', tokenRefreshRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/captions', captionsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/admin', adminRouter);
app.use('/api/follower-snapshots', followerSnapshotsRouter);

// 404 handler for API routes - returns JSON instead of HTML
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
    path: req.path
  });
});

// Global error handler - ensures all errors return JSON
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // If response was already sent, don't send again
  if (res.headersSent) {
    return next(error);
  }

  // Return JSON error response with debug info
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.path,
    method: req.method
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000; // Use Render's assigned port or 5000 for local
const MONGODB_URI = process.env.MONGODB_URI;

async function start() {
  try {
    if (!MONGODB_URI) {
      console.error('Missing MONGODB_URI. Create a backend/.env file with your MongoDB connection string.');
      process.exit(1);
    }

    // Connect to MongoDB database
    await connectDB(MONGODB_URI);

    // Start the post scheduler (processes scheduled posts)
    try {
      const { startScheduler } = await import('./services/postScheduler.js');
      startScheduler();
    } catch (error) {
      console.warn('⚠️ Failed to start post scheduler:', error.message);
      // Continue even if scheduler fails
    }

    // Start the token monitoring cron job
    try {
      const { initTokenMonitoringCron } = await import('./cron/tokenCron.js');
      initTokenMonitoringCron();
    } catch (error) {
      console.warn('⚠️ Failed to start token monitoring cron:', error.message);
      // Continue even if cron fails
    }

    // Start the follower snapshot cron job
    try {
      const { initFollowerSnapshotCron } = await import('./cron/followerSnapshotCron.js');
      initFollowerSnapshotCron();
    } catch (error) {
      console.warn('⚠️ Failed to start follower snapshot cron:', error.message);
      // Continue even if cron fails
    }

    // Start the report scheduler cron job
    try {
      const { initReportScheduler } = await import('./cron/reportCron.js');
      initReportScheduler();
    } catch (error) {
      console.warn('⚠️ Failed to start report scheduler:', error.message);
    }

    // Start the server on dynamic port (Render assigns this)
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please free up port ${PORT} and try again.`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    // Configure server for long-running uploads and keep-alive
    server.timeout = 15 * 60 * 1000; // 15 minutes
    server.keepAliveTimeout = 10 * 60 * 1000; // 10 minutes
    server.headersTimeout = 15 * 60 * 1000; // 15 minutes
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();


