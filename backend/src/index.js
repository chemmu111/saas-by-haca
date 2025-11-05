import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import oauthRouter from './routes/oauth.js';
import { connectDB } from './database/connection.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files from frontend/public
const publicDir = path.resolve(__dirname, '../../frontend/public');

// Middleware
app.use(cors({ origin: true, credentials: true }));
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
    permissionsPolicy: {
      useDefaults: true,
      features: {
        'unload': ["'self'"],
      },
    },
  }));
} else {
  app.use(helmet({
    permissionsPolicy: {
      useDefaults: true,
      features: {
        'unload': ["'self'"],
      },
    },
  }));
}
app.use(express.json());

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


