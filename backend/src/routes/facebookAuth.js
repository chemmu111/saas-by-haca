import express from 'express';

const router = express.Router();

// GET /auth/facebook/callback - Redirect to main OAuth callback handler
// This route exists to match the redirect_uri pattern: /auth/facebook/callback
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
    const redirectUrl = `/api/oauth/callback/facebook?${queryParams.toString()}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Facebook callback redirect error:', error);
    return res.redirect('/dashboard/clients?error=facebook_callback_error');
  }
});

export default router;

