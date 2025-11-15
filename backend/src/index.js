import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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
import { connectDB } from './database/connection.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files from frontend/public
const publicDir = path.resolve(__dirname, '../../frontend/public');

// Middleware
// CORS configuration with cookie support for cross-origin requests
const corsOptions = {
  origin: true,
  credentials: true,
  // Cookie settings for cross-origin requests
  exposedHeaders: ['Authorization'],
};
app.use(cors(corsOptions));
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
  // Set CORS and caching headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  res.setHeader('Accept-Ranges', 'bytes');
  
  // Log file requests for debugging
  console.log(`📂 Uploads request: ${req.path}`);
  
  next();
}, express.static(uploadsDir, {
  // Enable proper MIME types
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // Ensure correct Content-Type for videos (critical for Instagram)
    if (ext === '.mp4') {
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

// Serve static website (login/signup)
app.use(express.static(publicDir));

// Serve dashboard assets
app.use('/dashboard/assets', express.static(path.join(publicDir, 'dashboard', 'assets')));

// Root → login page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// Reset password page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(publicDir, 'reset-password.html'));
});

app.get('/reset-password.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'reset-password.html'));
});

// Signup page route for convenience
app.get('/signup', (req, res) => {
  res.sendFile(path.join(publicDir, 'signup.html'));
});

// Admin home page
app.get('/admin-home', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin-home.html'));
});

app.get('/admin-home.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin-home.html'));
});

// Social Media Manager home page (legacy)
app.get('/social-media-manager-home', (req, res) => {
  res.sendFile(path.join(publicDir, 'social-media-manager-home.html'));
});

app.get('/social-media-manager-home.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'social-media-manager-home.html'));
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

// Routes
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/oauth', oauthRouter);
app.use('/api/accounts', accountsRouter);
app.use('/oauth', accountsOAuthRouter);
app.use('/api/posts', postsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/auth/instagram', instagramGraphAuthRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reports', reportsRouter);

// Global error handler - ensures all errors return JSON
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  // If response was already sent, don't send again
  if (res.headersSent) {
    return next(error);
  }

  // Return JSON error response
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = 5000; // Fixed port - do not change
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
      console.error('Failed to start post scheduler:', error);
    }
    
    // Start the server on port 5000 only
    const server = app.listen(PORT, () => {
      console.log(`🚀 API listening on http://localhost:${PORT}`);
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


