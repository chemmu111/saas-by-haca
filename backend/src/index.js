import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import oauthRouter from './routes/oauth.js';
import accountsOAuthRouter from './routes/accountsOAuth.js';
import accountsRouter from './routes/accounts.js';
import postsRouter from './routes/posts.js';
import webhooksRouter from './routes/webhooks.js';
import instagramGraphAuthRouter from './routes/instagramGraphAuth.js';
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
// Security headers; relax CSP during local development to allow DevTools/connects
if (process.env.NODE_ENV !== 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*'],
      },
    },
    // Remove unload restriction to prevent browser warnings
    // This warning is often from Vite dev server or third-party libraries
    permissionsPolicy: false,
  }));
} else {
  app.use(helmet({
    // In production, use default permissions policy but allow unload
    permissionsPolicy: {
      useDefaults: true,
      features: {
        'unload': '*',
      },
    },
  }));
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

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

app.get('/dashboard/accounts', (req, res) => {
  res.sendFile(path.join(publicDir, 'accounts.html'));
});

app.get('/dashboard/accounts.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'accounts.html'));
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


