import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import { generateStateToken } from '../utils/crypto.js';
import { buildAuthUrl } from '../utils/oauthProviders.js';
import { storeState, getState, connectAccount } from '../controllers/socialAccountsController.js';

const router = express.Router();

const ALLOWED_PROVIDERS = ['meta', 'linkedin', 'x'];

/**
 * GET /oauth/connect/:provider
 * Generate OAuth authorization URL and redirect user
 */
router.get('/connect/:provider', requireAuth, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user.sub;
    
    // Validate provider
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider. Allowed: ${ALLOWED_PROVIDERS.join(', ')}`
      });
    }
    
    // Check if provider is configured
    try {
      // Build OAuth URL - this will throw if not configured
      const state = generateStateToken();
      storeState(state, userId, provider);
      const redirectUrl = buildAuthUrl(provider, state);
      
      res.json({
        success: true,
        redirectUrl
      });
    } catch (configError) {
      console.error(`OAuth configuration error for ${provider}:`, configError);
      return res.status(500).json({
        success: false,
        error: `${provider} OAuth not configured. Please set ${provider.toUpperCase()}_APP_ID and ${provider.toUpperCase()}_APP_SECRET in .env file.`
      });
    }
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate OAuth URL'
    });
  }
});

/**
 * GET /oauth/callback/:provider
 * Handle OAuth callback from provider
 */
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state, error, error_description } = req.query;
    
    // Check for OAuth errors
    if (error) {
      console.error(`OAuth error from ${provider}:`, error, error_description);
      return res.redirect(`/dashboard/accounts?error=oauth_denied&provider=${provider}`);
    }
    
    // Validate provider
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.redirect(`/dashboard/accounts?error=invalid_provider`);
    }
    
    // Validate state
    if (!state) {
      return res.redirect(`/dashboard/accounts?error=missing_state`);
    }
    
    // Retrieve state
    const stateData = getState(state);
    if (!stateData) {
      return res.redirect(`/dashboard/accounts?error=invalid_state`);
    }
    
    const { userId } = stateData;
    
    // Validate code
    if (!code) {
      return res.redirect(`/dashboard/accounts?error=missing_code`);
    }
    
    // Connect account
    await connectAccount(userId, provider, code);
    
    // Redirect to accounts page with success
    return res.redirect(`/dashboard/accounts?connected=${provider}`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const errorMessage = error.message || 'Connection failed';
    return res.redirect(`/dashboard/accounts?error=connection_failed&msg=${encodeURIComponent(errorMessage)}`);
  }
});

export default router;
