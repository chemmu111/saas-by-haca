import express from 'express';

const router = express.Router();

// GET /auth/instagram/login - Redirect to Facebook OAuth for Instagram Graph API
router.get('/login', (req, res) => {
  const FB_APP_ID = process.env.FB_APP_ID || '';
  const API_URL = process.env.API_URL || 'http://localhost:5001';
  const REDIRECT_URI = `${API_URL}/auth/instagram/callback`;
  
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

  // Generate authorization URL using Facebook OAuth endpoint (v18.0)
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=code`;

  console.log('📱 Instagram Graph API OAuth - Redirecting to Facebook OAuth');
  console.log('  App ID:', FB_APP_ID);
  console.log('  Redirect URI:', REDIRECT_URI);
  console.log('  Scopes:', SCOPES);
  console.log('  Auth URL:', authUrl.replace(/client_id=[^&]+/, 'client_id=***'));

  // Redirect to Facebook OAuth
  res.redirect(302, authUrl);
});

// GET /auth/instagram/callback - Redirect to main OAuth callback handler
// This route exists to match the redirect_uri pattern: /auth/instagram/callback
router.get('/callback', async (req, res) => {
  try {
    const { code, error, error_reason, error_description, state } = req.query;

    // Build query string with all parameters
    const queryParams = new URLSearchParams();
    if (code) queryParams.append('code', code);
    if (state) queryParams.append('state', state);
    if (error) queryParams.append('error', error);
    if (error_reason) queryParams.append('error_reason', error_reason);
    if (error_description) queryParams.append('error_description', error_description);

    // Redirect to the main OAuth callback handler which has all the logic
    const redirectUrl = `/api/oauth/callback/instagram?${queryParams.toString()}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Instagram callback redirect error:', error);
    return res.redirect('/dashboard/clients?error=instagram_callback_error');
  }
});

export default router;
