import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export default async function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  if (!token) {
    console.error('❌ Auth error: No token provided');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
      code: 'NO_TOKEN'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);

    // Check session validity if sessionId is present
    if (payload.sessionId) {
      const user = await User.findById(payload.sub).select('sessions');
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User no longer exists.',
          code: 'USER_NOT_FOUND'
        });
      }

      const sessionExists = user.sessions.some(s => s._id.toString() === payload.sessionId);
      if (!sessionExists) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Session has been revoked or expired.',
          code: 'SESSION_REVOKED'
        });
      }

      // Optional: Update lastActive (debounced or skip for performance)
    }

    req.user = payload;
    next();
  } catch (e) {
    console.error('❌ Auth error:', e.name, e.message);

    // Provide specific error messages for different JWT errors
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message: "Session expired. Please log in again."
      });
    } else if (e.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    } else {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication failed. Please login again.',
        code: 'AUTH_FAILED'
      });
    }
  }
}


