import requireAuth from './requireAuth.js';

/**
 * Middleware to require specific role(s) for access
 * @param {...string} allowedRoles - One or more roles that are allowed
 * @returns {Function} Express middleware function
 */
export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // First check authentication
    requireAuth(req, res, () => {
      // Check if user has required role
      const userRole = req.user?.role;
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          required: allowedRoles,
          current: userRole
        });
      }
      
      next();
    });
  };
}

/**
 * Convenience middleware for admin-only routes
 */
export const requireAdmin = requireRole('admin');

/**
 * Convenience middleware for social media manager-only routes
 */
export const requireSocialMediaManager = requireRole('social media manager');

