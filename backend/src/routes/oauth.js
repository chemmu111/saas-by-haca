import express from 'express';
import Client from '../models/Client.js';
import requireAuth from '../middleware/requireAuth.js';

const router = express.Router();

// Instagram OAuth Start - Public route
router.get('/instagram', (req, res) => {
  try {
    const { name, email } = req.query;
    
    // Encode client data in state parameter
    const state = Buffer.from(JSON.stringify({ name: name || '', email: email || '' })).toString('base64');
    
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/auth/instagram/callback';
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${state}`;
    
    console.log('✅ Instagram OAuth URL generated');
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Instagram Auth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_auth_failed`);
  }
});

// Instagram OAuth Callback
router.get('/instagram/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';

    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/clients?error=oauth_cancelled`);
    }

    // Extract client data from state
    let clientData = {};
    try {
      if (state) {
        clientData = JSON.parse(Buffer.from(state, 'base64').toString());
      }
    } catch (e) {
      console.error('Error parsing state:', e);
    }

    // Exchange code for access token
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:5000/auth/instagram/callback';
    
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID || '',
        client_secret: process.env.INSTAGRAM_APP_SECRET || '',
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Instagram token error:', errorData);
      return res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_token_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const socialMediaId = tokenData.user_id;
    
    // Get user info
    let socialMediaLink = `https://instagram.com/${socialMediaId}`;
    try {
      const userResponse = await fetch(`https://graph.instagram.com/${socialMediaId}?fields=id,username&access_token=${accessToken}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socialMediaLink = `https://instagram.com/${userData.username}`;
      }
    } catch (e) {
      console.error('Error fetching Instagram user:', e);
    }

    console.log('✅ Instagram connected:', socialMediaId);
    
    // Redirect to frontend - frontend will handle client creation
    const params = new URLSearchParams({
      connected: 'instagram',
      platform: 'instagram',
      user_id: socialMediaId,
      username: socialMediaLink.split('/').pop() || socialMediaId,
      name: clientData.name || 'Instagram User',
      email: clientData.email || `${socialMediaId}@instagram.com`
    });
    
    res.redirect(`${frontendUrl}/dashboard/clients?${params.toString()}`);
  } catch (error) {
    console.error('❌ Instagram Auth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.redirect(`${frontendUrl}/dashboard/clients?error=instagram_auth_failed`);
  }
});

// Facebook OAuth Start - Public route
router.get('/facebook', (req, res) => {
  try {
    const { name, email } = req.query;
    
    // Encode client data in state parameter
    const state = Buffer.from(JSON.stringify({ name: name || '', email: email || '' })).toString('base64');
    
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/auth/facebook/callback';
    const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,email&response_type=code&state=${state}`;
    
    console.log('✅ Facebook OAuth URL generated');
    res.redirect(authUrl);
  } catch (error) {
    console.error('❌ Facebook Auth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_auth_failed`);
  }
});

// Facebook OAuth Callback
router.get('/facebook/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';

    if (!code) {
      return res.redirect(`${frontendUrl}/dashboard/clients?error=oauth_cancelled`);
    }

    // Extract client data from state
    let clientData = {};
    try {
      if (state) {
        clientData = JSON.parse(Buffer.from(state, 'base64').toString());
      }
    } catch (e) {
      console.error('Error parsing state:', e);
    }

    // Exchange code for access token
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/auth/facebook/callback';
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Facebook token error:', errorData);
      return res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_token_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info
    let socialMediaId = '';
    let socialMediaLink = '';
    let userName = '';
    let userEmail = '';
    try {
      const userResponse = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${accessToken}&fields=id,name,email`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        socialMediaId = userData.id;
        socialMediaLink = `https://facebook.com/${userData.id}`;
        userName = userData.name || '';
        userEmail = userData.email || clientData.email || '';
      }
    } catch (e) {
      console.error('Error fetching Facebook user:', e);
    }

    console.log('✅ Facebook connected:', socialMediaId);
    
    // Redirect to frontend - frontend will handle client creation
    const params = new URLSearchParams({
      connected: 'facebook',
      platform: 'facebook',
      user_id: socialMediaId,
      name: clientData.name || userName || 'Facebook User',
      email: clientData.email || userEmail || `${socialMediaId}@facebook.com`
    });
    
    res.redirect(`${frontendUrl}/dashboard/clients?${params.toString()}`);
  } catch (error) {
    console.error('❌ Facebook Auth Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    res.redirect(`${frontendUrl}/dashboard/clients?error=facebook_auth_failed`);
  }
});

// Create client after OAuth (requires auth)
router.post('/create-client', requireAuth, async (req, res) => {
  try {
    const { name, email, platform, accessToken, socialMediaId, socialMediaLink } = req.body;

    if (!['instagram', 'facebook'].includes(platform)) {
      return res.status(400).json({ success: false, error: 'Invalid platform' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    // Create client with OAuth data
    const client = new Client({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      socialMediaLink: socialMediaLink || `https://${platform}.com/${socialMediaId}`,
      platform: platform,
      accessToken: accessToken,
      socialMediaId: socialMediaId,
      createdBy: req.user.sub,
    });

    await client.save();

    // Return client without sensitive data
    const clientData = client.toObject();
    delete clientData.createdBy;
    delete clientData.accessToken;
    delete clientData.refreshToken;

    res.json({ success: true, data: clientData });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ success: false, error: 'Failed to create client' });
  }
});

export default router;
