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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Public media proxy route for Instagram/Facebook API
// This route serves images and videos with proper headers so APIs can fetch them
// even when using ngrok or other tunneling services
app.get('/api/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);
  
  // Security: prevent directory traversal
  if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  // Determine MIME type based on file extension
  const ext = path.extname(filename).toLowerCase().slice(1);
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    'm4v': 'video/x-m4v',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/m4a',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  
  // Set proper headers for media serving
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow external APIs to fetch
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Accept-Ranges', 'bytes'); // Support range requests for videos
  
  // For images, also set Content-Length if possible for better compatibility
  try {
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);
  } catch (err) {
    // If we can't get stats, continue without Content-Length
  }
  
  // Send the file
  res.sendFile(filePath);
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

// Health
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

function listenWithFallback(app, startPort, remainingAttempts = 10) {
  return new Promise((resolve, reject) => {
    const server = app.listen(startPort, () => {
      resolve({ server, port: startPort });
    });
    server.on('error', (err) => {
      if ((err && (err.code === 'EADDRINUSE' || err.code === 'EACCES')) && remainingAttempts > 0) {
        const nextPort = Number(startPort) + 1;
        console.warn(`Port ${startPort} unavailable (${err.code}). Trying ${nextPort}...`);
        setTimeout(() => {
          listenWithFallback(app, nextPort, remainingAttempts - 1).then(resolve).catch(reject);
        }, 50);
      } else {
        reject(err);
      }
    });
  });
}

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
    
    // Start the server
    const basePort = parseInt(PORT, 10);
    const { port: boundPort } = await listenWithFallback(app, basePort, 15);
    console.log(`🚀 API listening on http://localhost:${boundPort}`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();


