import express from 'express';

const router = express.Router();

// GET /auth/instagram/login - Redirect to Facebook OAuth for Instagram Graph API
router.get('/login', (req, res) => {
  const FB_APP_ID = process.env.FB_APP_ID || '';
  const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/auth/instagram/callback';
  
  // Instagram Graph API scopes
  const SCOPES = [
    'pages_show_list',
    'instagram_basic',
    'instagram_content_publish',
    'pages_read_engagement'
  ].join(',');

  if (!FB_APP_ID) {
    return res.status(500).json({ 
      error: 'FB_APP_ID not configured. Please set FB_APP_ID in .env file.' 
    });
  }

  // Generate authorization URL using Facebook OAuth endpoint
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code`;

  console.log('📱 Instagram Graph API OAuth - Redirecting to Facebook OAuth');
  console.log('  App ID:', FB_APP_ID);
  console.log('  Redirect URI:', REDIRECT_URI);
  console.log('  Scopes:', SCOPES);
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
    const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:5000/auth/instagram/callback';

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

    // Next steps information
    const nextSteps = {
      shortLivedToken: {
        token: accessToken,
        expiresIn: expiresIn,
        note: 'This is a short-lived token (typically 1 hour). You need to exchange it for a long-lived token.'
      },
      exchangeForLongLived: {
        endpoint: 'https://graph.facebook.com/v18.0/oauth/access_token',
        method: 'GET',
        params: {
          grant_type: 'fb_exchange_token',
          client_id: FB_APP_ID,
          client_secret: FB_APP_SECRET,
          fb_exchange_token: accessToken
        },
        note: 'Exchange short-lived token for long-lived token (60 days)'
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
      access_token: accessToken,
      expires_in: expiresIn,
      token_type: tokenData.token_type || 'bearer',
      next_steps: nextSteps,
      message: 'Access token received. See next_steps for instructions on exchanging for long-lived token and connecting Instagram account.'
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





