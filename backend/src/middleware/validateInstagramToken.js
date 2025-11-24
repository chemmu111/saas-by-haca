/**
 * Middleware to validate and refresh Instagram tokens before API calls
 * Ensures all Instagram API requests use valid, non-expired tokens
 */

import { ensureValidToken } from '../services/instagramTokenService.js';

/**
 * Middleware to validate Instagram token for a client
 * Usage: Add this middleware before any Instagram API call
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export async function validateInstagramToken(req, res, next) {
  try {
    // Get client from request (should be attached by previous middleware)
    const client = req.client;
    
    if (!client) {
      return res.status(400).json({
        success: false,
        error: 'No client provided for token validation'
      });
    }
    
    console.log(`🔐 Validating Instagram token for client: ${client.name}`);
    
    // Ensure token is valid (will auto-refresh if needed)
    const result = await ensureValidToken(client);
    
    // Token expired - user must re-login
    if (result.needReLogin) {
      console.log(`❌ Token expired for ${client.name} — user must re-login`);
      return res.status(401).json({
        success: false,
        needReLogin: true,
        error: 'instagram_token_expired',
        message: result.message || 'Instagram token expired. Please reconnect your account.'
      });
    }
    
    // Token validation failed
    if (!result.success) {
      console.error(`❌ Token validation failed for ${client.name}:`, result.error);
      return res.status(500).json({
        success: false,
        error: 'token_validation_failed',
        message: result.error || 'Failed to validate Instagram token'
      });
    }
    
    // Token is valid - attach updated client to request
    req.client = result.client;
    console.log(`✅ Token valid for ${client.name}`);
    
    next();
  } catch (error) {
    console.error('❌ Error in validateInstagramToken middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'token_validation_error',
      message: error.message || 'Error validating Instagram token'
    });
  }
}

/**
 * Middleware to validate Instagram token from client ID
 * Fetches client from DB by ID and validates token
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export async function validateInstagramTokenFromClientId(req, res, next) {
  try {
    const clientId = req.params.clientId || req.body.clientId || req.query.clientId;
    
    if (!clientId) {
      return res.status(400).json({
        success: false,
        error: 'Client ID required for token validation'
      });
    }
    
    // Import Client model
    const Client = (await import('../models/Client.js')).default;
    
    // Fetch client from database
    const client = await Client.findById(clientId);
    
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }
    
    // Attach client to request
    req.client = client;
    
    // Continue to token validation
    return validateInstagramToken(req, res, next);
  } catch (error) {
    console.error('❌ Error in validateInstagramTokenFromClientId middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching client for token validation',
      message: error.message
    });
  }
}

