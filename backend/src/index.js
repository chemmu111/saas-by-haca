import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import authRouter from './routes/auth.js';
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
  }));
} else {
  app.use(helmet());
}
app.use(express.json());

// DevTools probe path: return 204 to avoid noisy 404s
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Serve static website (login/signup)
app.use(express.static(publicDir));

// Root → login page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// Signup page route for convenience
app.get('/signup', (req, res) => {
  res.sendFile(path.join(publicDir, 'signup.html'));
});

// Home page - handle both /home and /home.html
app.get('/home', (req, res) => {
  res.sendFile(path.join(publicDir, 'home.html'));
});

app.get('/home.html', (req, res) => {
  res.sendFile(path.join(publicDir, 'home.html'));
});

// Routes
app.use('/api/auth', authRouter);

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


