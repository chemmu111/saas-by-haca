import jwt from 'jsonwebtoken';

export default function requireAuth(req, res, next) {
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
    req.user = payload;
    next();
  } catch (e) {
    console.error('❌ Auth error:', e.name, e.message);
    
    // Provide specific error messages for different JWT errors
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED'
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


