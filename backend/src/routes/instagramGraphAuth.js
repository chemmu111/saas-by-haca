import express from 'express';
import { exchangeForLongLivedToken } from '../services/instagramTokenService.js';

const router = express.Router();

// GET /auth/instagram/login - Redirect to Facebook OAuth for Instagram Graph API
router.get('/login', (req, res) => {
  const FB_APP_ID = process.env.FB_APP_ID || '';
  const baseUrl = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || `${baseUrl}/api/auth/facebook/callback`;

  if (!FB_APP_ID) {
    return res.status(500).json({
      error: 'FB_APP_ID not configured. Please set FB_APP_ID in .env file.'
    });
  }

  // Generate authorization URL using Facebook OAuth endpoint with config_id
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&config_id=840928395225436&response_type=code`;

  console.log('📱 Instagram Graph API OAuth - Redirecting to Facebook OAuth');
  console.log('  App ID:', FB_APP_ID);
  console.log('  Redirect URI:', REDIRECT_URI);
  console.log('  Config ID: 840928395225436');
  console.log('  Auth URL:', authUrl.replace(/client_id=[^&]+/, 'client_id=***'));

  // Redirect to Facebook OAuth
  res.redirect(302, authUrl);
});

// GET /auth/instagram/callback - Exchange code for access token
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_reason, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('❌ OAuth Error:', { error, error_reason, error_description });
      return res.status(400).json({
        error: 'OAuth authorization failed',
        error_reason,
        error_description
      });
    }

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    const FB_APP_ID = process.env.FB_APP_ID || '';
    const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
    const baseUrl = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
    const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || `${baseUrl}/api/auth/facebook/callback`;

    if (!FB_APP_ID || !FB_APP_SECRET) {
      return res.status(500).json({
        error: 'Facebook OAuth not configured. Please set FB_APP_ID and FB_APP_SECRET in .env file.'
      });
    }

    console.log('🔄 Exchanging authorization code for access token...');
    console.log('  Code:', code.substring(0, 20) + '...');
    console.log('  Redirect URI:', REDIRECT_URI);

    // Exchange code for access token using Facebook Graph API
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code=${code}`;

    console.log('  Token URL:', tokenUrl.replace(/client_secret=[^&]+/, 'client_secret=***'));

    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorData);
      return res.status(400).json({
        error: 'Failed to exchange code for access token',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    console.log('✅ Access token received!');
    console.log('  Access Token:', accessToken.substring(0, 20) + '...');
    console.log('  Expires In:', expiresIn, 'seconds');

    // Exchange for long-lived token
    console.log('🔄 Exchanging short-lived token for long-lived token...');
    let finalAccessToken = accessToken;
    let finalExpiresIn = expiresIn;
    let tokenType = 'short-lived';

    try {
      const longLivedData = await exchangeForLongLivedToken(accessToken);
      finalAccessToken = longLivedData.accessToken;
      finalExpiresIn = longLivedData.expiresIn;
      tokenType = 'long-lived';
      console.log('✅ Successfully exchanged for long-lived token');
    } catch (exchangeError) {
      console.error('⚠️ Failed to exchange for long-lived token, using short-lived token:', exchangeError.message);
      // We continue with short-lived token but log the error
    }

    // Next steps information
    const nextSteps = {
      tokenInfo: {
        type: tokenType,
        expiresIn: finalExpiresIn,
        note: tokenType === 'long-lived'
          ? 'This is a long-lived token (60 days). It will be auto-refreshed.'
          : 'This is a SHORT-LIVED token. Exchange failed.'
      },
      connectInstagramAccount: {
        step1: 'Get user\'s Facebook Pages: GET /me/accounts',
        step2: 'Get Instagram Business Account ID from Page: GET /{page-id}?fields=instagram_business_account',
        step3: 'Use Instagram Business Account ID for Instagram API calls',
        note: 'The Instagram account must be connected to a Facebook Page'
      }
    };

    // Return success response with token and next steps
    res.json({
      success: true,
      access_token: finalAccessToken,
      expires_in: finalExpiresIn,
      token_type: tokenData.token_type || 'bearer',
      is_long_lived: tokenType === 'long-lived',
      next_steps: nextSteps,
      message: 'Access token received. ' + (tokenType === 'long-lived' ? 'Long-lived token secured.' : 'Warning: Short-lived token only.')
    });

  } catch (error) {
    console.error('❌ Callback error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;





