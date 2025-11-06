import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { listAccounts, refreshAccountToken, disconnectAccount } from '../controllers/socialAccountsController.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/accounts/list
 * List all connected social accounts for the current user
 */
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.sub;
    const accounts = await listAccounts(userId);
    
    res.json({
      success: true,
      accounts
    });
  } catch (error) {
    console.error('Error listing accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list accounts'
    });
  }
});

/**
 * POST /api/accounts/refresh
 * Refresh access token for an account
 */
router.post('/refresh', async (req, res) => {
  try {
    const { accountId } = req.body;
    const userId = req.user.sub;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    const account = await refreshAccountToken(userId, accountId);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      account: {
        _id: account._id,
        provider: account.provider,
        accountName: account.accountName,
        expiresAt: account.expiresAt,
        lastSyncAt: account.lastSyncAt,
        isExpired: account.expiresAt ? account.expiresAt < new Date() : false
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh token'
    });
  }
});

/**
 * POST /api/accounts/disconnect
 * Disconnect a social account
 */
router.post('/disconnect', async (req, res) => {
  try {
    const { accountId } = req.body;
    const userId = req.user.sub;
    
    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }
    
    await disconnectAccount(userId, accountId);
    
    res.json({
      success: true,
      message: 'Account disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect account'
    });
  }
});

export default router;

