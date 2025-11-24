/**
 * Token Refresh API Routes
 * Allows manual triggering of token refresh and status checks
 */

import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import Client from '../models/Client.js';
import { 
  refreshLongLivedToken, 
  validateToken, 
  ensureValidToken 
} from '../services/instagramTokenService.js';
import { 
  runTokenRefreshNow, 
  getTokenRefreshCronStatus 
} from '../cron/tokenRefreshCron.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/token-refresh/client/:clientId
 * Manually refresh token for a specific client
 */
router.post('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.sub;
    
    // Verify client belongs to user
    const client = await Client.findOne({
      _id: clientId,
      createdBy: userId
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    
    console.log(`🔄 Manual token refresh requested for: ${client.name}`);
    
    // Ensure valid token (will auto-refresh if needed)
    const result = await ensureValidToken(client);
    
    if (result.needReLogin) {
      return res.status(401).json({
        success: false,
        needReLogin: true,
        error: 'instagram_token_expired',
        message: 'Instagram token expired. Please reconnect your account.'
      });
    }
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Token refresh failed',
        message: result.error
      });
    }
    
    console.log(`✅ Token refresh successful for: ${client.name}`);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      client: {
        id: result.client._id,
        name: result.client.name,
        tokenExpiresAt: result.client.tokenExpiresAt,
        tokenStatus: result.client.tokenStatus
      }
    });
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

/**
 * GET /api/token-refresh/client/:clientId/status
 * Check token status for a specific client
 */
router.get('/client/:clientId/status', async (req, res) => {
  try {
    const { clientId } = req.params;
    const userId = req.user.sub;
    
    // Verify client belongs to user
    const client = await Client.findOne({
      _id: clientId,
      createdBy: userId
    });
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    
    // Validate token
    const validation = await validateToken(client);
    
    res.json({
      success: true,
      client: {
        id: client._id,
        name: client.name,
        platform: client.platform
      },
      token: {
        valid: validation.valid,
        needReLogin: validation.needReLogin || false,
        shouldRefresh: validation.shouldRefresh || false,
        daysUntilExpiry: validation.daysUntilExpiry,
        expiresAt: client.tokenExpiresAt,
        lastRefresh: client.lastTokenRefresh,
        status: client.tokenStatus,
        reason: validation.reason
      }
    });
  } catch (error) {
    console.error('❌ Error checking token status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check token status',
      message: error.message
    });
  }
});

/**
 * POST /api/token-refresh/all
 * Manually refresh all client tokens (admin only)
 */
router.post('/all', async (req, res) => {
  try {
    console.log('🔄 Manual token refresh for all clients triggered');
    
    const results = await runTokenRefreshNow();
    
    res.json({
      success: true,
      message: 'Token refresh completed',
      results
    });
  } catch (error) {
    console.error('❌ Error refreshing all tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh tokens',
      message: error.message
    });
  }
});

/**
 * GET /api/token-refresh/cron/status
 * Get cron job status
 */
router.get('/cron/status', (req, res) => {
  try {
    const status = getTokenRefreshCronStatus();
    
    res.json({
      success: true,
      cron: status
    });
  } catch (error) {
    console.error('❌ Error getting cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status',
      message: error.message
    });
  }
});

export default router;

